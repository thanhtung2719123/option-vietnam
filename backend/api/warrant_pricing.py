from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.database_models import SessionLocal, Warrant, PricingResult, GreeksResult
from services.pricing_services.black_scholes_engine import BlackScholesEngine
from services.pricing_services.heston_engine import HestonEngine
from services.market_data_service import market_data_service
import logging

router = APIRouter(prefix="/api/v1/warrants", tags=["Warrant Pricing"])
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class WarrantPricingRequest(BaseModel):
    symbol: str
    spot_price: float
    risk_free_rate: Optional[float] = 0.0376  # VN 10Y Bond rate
    volatility: Optional[float] = None
    model_type: str = "black_scholes"  # black_scholes, heston, monte_carlo

class WarrantPricingResponse(BaseModel):
    symbol: str
    model_type: str
    theoretical_price: float
    market_price: Optional[float] = None
    pricing_error: Optional[float] = None
    greeks: dict
    parameters: dict
    timestamp: datetime

class GreeksResponse(BaseModel):
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float
    lambda_greek: Optional[float] = None
    vanna: Optional[float] = None
    volga: Optional[float] = None

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/price", response_model=WarrantPricingResponse)
async def price_warrant(request: WarrantPricingRequest, db: Session = Depends(get_db)):
    """
    Price a Vietnamese warrant using specified model
    """
    try:
        # Get warrant from database
        warrant = db.query(Warrant).filter(Warrant.symbol == request.symbol).first()
        if not warrant:
            raise HTTPException(status_code=404, detail=f"Warrant {request.symbol} not found")
        
        # Calculate time to maturity
        time_to_maturity = (warrant.maturity_date - datetime.now()).days / 365.0
        
        if time_to_maturity <= 0:
            raise HTTPException(status_code=400, detail="Warrant has expired")
        
        # Get or estimate volatility
        volatility = request.volatility
        if not volatility:
            # Use historical volatility estimation (simplified)
            volatility = 0.25  # 25% default for Vietnamese warrants
        
        # Price using specified model
        if request.model_type == "black_scholes":
            engine = BlackScholesEngine()
            price, greeks = engine.price_warrant(
                spot_price=request.spot_price,
                strike_price=warrant.strike_price,
                time_to_maturity=time_to_maturity,
                risk_free_rate=request.risk_free_rate,
                volatility=volatility,
                warrant_type=warrant.warrant_type.lower()
            )
        elif request.model_type == "heston":
            engine = HestonEngine()
            price, greeks = engine.price_warrant(
                spot_price=request.spot_price,
                strike_price=warrant.strike_price,
                time_to_maturity=time_to_maturity,
                risk_free_rate=request.risk_free_rate,
                volatility=volatility,
                warrant_type=warrant.warrant_type.lower()
            )
        else:
            raise HTTPException(status_code=400, detail="Unsupported model type")
        
        # IMPORTANT: Convert from OPTION Greeks to WARRANT Greeks
        # Divide by conversion ratio to get per-warrant sensitivity
        conversion_ratio = warrant.exercise_ratio
        
        warrant_greeks = {
            "delta": greeks.get('delta', 0) / conversion_ratio,
            "gamma": greeks.get('gamma', 0) / conversion_ratio,
            "vega": greeks.get('vega', 0) / conversion_ratio,
            "theta": greeks.get('theta', 0) / conversion_ratio,
            "rho": greeks.get('rho', 0) / conversion_ratio,
            "lambda": greeks.get('lambda', None) / conversion_ratio if greeks.get('lambda') else None,
            "vanna": greeks.get('vanna', None) / conversion_ratio if greeks.get('vanna') else None,
            "volga": greeks.get('volga', None) / conversion_ratio if greeks.get('volga') else None
        }
        
        # Save pricing result to database
        pricing_result = PricingResult(
            warrant_id=warrant.id,
            model_type=request.model_type,
            spot_price=request.spot_price,
            risk_free_rate=request.risk_free_rate,
            volatility=volatility,
            time_to_maturity=time_to_maturity,
            theoretical_price=price
        )
        db.add(pricing_result)
        
        # Save Greeks result to database (save warrant Greeks, not option Greeks)
        greeks_result = GreeksResult(
            warrant_id=warrant.id,
            model_type=request.model_type,
            delta=warrant_greeks.get('delta', 0),
            gamma=warrant_greeks.get('gamma', 0),
            vega=warrant_greeks.get('vega', 0),
            theta=warrant_greeks.get('theta', 0),
            rho=warrant_greeks.get('rho', 0),
            lambda_greek=warrant_greeks.get('lambda', None),
            vanna=warrant_greeks.get('vanna', None),
            volga=warrant_greeks.get('volga', None)
        )
        db.add(greeks_result)
        db.commit()
        
        return WarrantPricingResponse(
            symbol=request.symbol,
            model_type=request.model_type,
            theoretical_price=price,
            greeks=warrant_greeks,
            parameters={
                "spot_price": request.spot_price,
                "strike_price": warrant.strike_price,
                "time_to_maturity": time_to_maturity,
                "risk_free_rate": request.risk_free_rate,
                "volatility": volatility
            },
            timestamp=datetime.now()
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{symbol}/greeks")
async def get_warrant_greeks(
    symbol: str, 
    spot_price: float = None,
    db: Session = Depends(get_db)
):
    """
    Get Greeks for a warrant (calculates on-the-fly with all Black-Scholes parameters)
    """
    try:
        warrant = db.query(Warrant).filter(Warrant.symbol == symbol).first()
        if not warrant:
            raise HTTPException(status_code=404, detail=f"Warrant {symbol} not found")
        
        # Calculate time to maturity
        time_to_maturity = (warrant.maturity_date - datetime.now()).days / 365.0
        
        if time_to_maturity <= 0:
            raise HTTPException(status_code=400, detail="Warrant has expired")
        
        # Get spot price: provided > vnstock > strike price fallback
        if not spot_price:
            # Try to fetch current price from vnstock
            logger.info(f"No spot price provided, fetching from vnstock for {warrant.underlying_symbol}")
            spot_price = market_data_service.get_current_price(warrant.underlying_symbol)
            
            if not spot_price:
                # Fallback to strike price if vnstock fails
                logger.warning(f"Could not fetch price from vnstock, using strike price as fallback")
                spot_price = warrant.strike_price
        
        # Default parameters for Vietnamese market
        risk_free_rate = 0.0376  # VN 10Y Bond rate
        dividend_yield = 0.0  # Default (can be improved with dividend service)
        
        # Calculate historical volatility from underlying stock (30-day)
        logger.info(f"Calculating volatility for {warrant.underlying_symbol}")
        volatility = market_data_service.calculate_historical_volatility(
            warrant.underlying_symbol, 
            days=30
        )
        
        # Fallback to default if calculation fails
        if not volatility or volatility <= 0 or volatility > 5.0:  # Sanity check
            logger.warning(f"Invalid volatility for {warrant.underlying_symbol}, using default 25%")
            volatility = 0.25  # Default 25% volatility
        else:
            logger.info(f"Using calculated volatility: {volatility:.2%}")
        
        # Get warrant market price from database (scraped from Vietstock)
        # If not available, try vnstock as fallback
        market_warrant_price = warrant.close_price
        if not market_warrant_price:
            logger.info(f"No close_price in DB, trying vnstock for {warrant.symbol}")
            market_warrant_price = market_data_service.get_warrant_price(warrant.symbol)
        
        # Calculate Greeks using Black-Scholes
        engine = BlackScholesEngine()
        price, greeks = engine.price_warrant(
            spot_price=spot_price,
            strike_price=warrant.strike_price,
            time_to_maturity=time_to_maturity,
            risk_free_rate=risk_free_rate,
            volatility=volatility,
            warrant_type=warrant.warrant_type.lower()
        )
        
        # IMPORTANT: Convert from OPTION Greeks to WARRANT Greeks
        # All Greeks must be divided by conversion ratio (exercise_ratio)
        # This gives the actual sensitivity PER WARRANT, not per underlying option
        conversion_ratio = warrant.exercise_ratio
        
        # Adjust Greeks for warrant (divide by conversion ratio)
        warrant_greeks = {
            "delta": greeks.get('delta', 0) / conversion_ratio,
            "gamma": greeks.get('gamma', 0) / conversion_ratio,
            "vega": greeks.get('vega', 0) / conversion_ratio,
            "theta": greeks.get('theta', 0) / conversion_ratio,
            "rho": greeks.get('rho', 0) / conversion_ratio,
            "lambda": greeks.get('lambda', None) / conversion_ratio if greeks.get('lambda') else None,
            "vanna": greeks.get('vanna', None) / conversion_ratio if greeks.get('vanna') else None,
            "volga": greeks.get('volga', None) / conversion_ratio if greeks.get('volga') else None
        }
        
        # Return Greeks with ALL Black-Scholes parameters
        return {
            "greeks": warrant_greeks,
            "parameters": {
                "market_option_price": market_warrant_price,  # From Vietstock scraper
                "theoretical_price": price,
                "spot_price": spot_price,
                "spot_price_source": "vnstock",
                "strike_price": warrant.strike_price,
                "time_to_maturity": time_to_maturity,
                "time_to_maturity_days": int(time_to_maturity * 365),
                "risk_free_rate": risk_free_rate,
                "volatility": volatility,
                "volatility_source": "vnstock_30d_historical" if volatility != 0.25 else "default",
                "volatility_period": "30 ngày" if volatility != 0.25 else "N/A",
                "dividend_yield": dividend_yield,
                "underlying_symbol": warrant.underlying_symbol,
                "warrant_type": warrant.warrant_type,
                "conversion_ratio": warrant.exercise_ratio
            },
            "warrant_info": {
                "symbol": warrant.symbol,
                "underlying": warrant.underlying_symbol,
                "type": warrant.warrant_type,
                "issuer": warrant.issuer,
                "maturity_date": warrant.maturity_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error calculating Greeks for {symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[dict])
async def list_warrants(db: Session = Depends(get_db)):
    """
    List all available warrants
    """
    try:
        warrants = db.query(Warrant).filter(Warrant.is_active == True).all()
        return [
            {
                "symbol": warrant.symbol,
                "underlying_symbol": warrant.underlying_symbol,
                "warrant_type": warrant.warrant_type,
                "strike_price": float(warrant.strike_price),
                "maturity_date": warrant.maturity_date.isoformat() if warrant.maturity_date else None,
                "listing_date": warrant.listing_date.isoformat() if warrant.listing_date else None,
                "exercise_ratio": float(warrant.exercise_ratio),
                "issuer": warrant.issuer,
                "close_price": float(warrant.close_price) if warrant.close_price else None,
                "is_active": warrant.is_active
            }
            for warrant in warrants
        ]
    except Exception as e:
        logger.error(f"Error listing warrants: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/market-price/{underlying_symbol}")
async def get_market_price(underlying_symbol: str):
    """Get current market data for an underlying stock from vnstock"""
    try:
        market_data = market_data_service.get_market_data(underlying_symbol)
        if not market_data:
            raise HTTPException(status_code=404, detail=f"Market data not found for {underlying_symbol}")
        return market_data
    except Exception as e:
        logger.error(f"Error fetching market price for {underlying_symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/volatility-metrics/{underlying_symbol}")
async def get_volatility_metrics(underlying_symbol: str, db: Session = Depends(get_db)):
    """
    Calculate real implied volatility metrics for an underlying from warrant market prices
    
    Uses py_vollib to back-solve for implied volatility from market prices
    """
    try:
        import numpy as np
        from backend.services.pricing_services.black_scholes_pricer import BlackScholesPricer
        
        # Get all warrants for this underlying
        warrants = db.query(Warrant).filter(
            Warrant.underlying_symbol == underlying_symbol,
            Warrant.is_active == True
        ).all()
        
        if not warrants:
            raise HTTPException(status_code=404, detail=f"No warrants found for {underlying_symbol}")
        
        # Get current underlying price from vnstock
        spot_price = market_data_service.get_current_price(underlying_symbol)
        if not spot_price:
            raise HTTPException(status_code=404, detail=f"Cannot fetch spot price for {underlying_symbol}")
        
        # Calculate implied volatility for each warrant
        pricer = BlackScholesPricer(use_vn_config=True)
        risk_free_rate = 0.0376
        
        warrant_ivs = []
        atm_ivs = []
        otm_put_ivs = []
        otm_call_ivs = []
        
        for warrant in warrants:
            # Skip if no market price available
            if not warrant.close_price or warrant.close_price <= 0:
                continue
            
            # Calculate time to maturity
            time_to_maturity = (warrant.maturity_date - datetime.now()).days / 365.0
            if time_to_maturity <= 0:
                continue
            
            # Calculate moneyness
            moneyness = spot_price / warrant.strike_price
            
            # Determine option type
            option_type = 'c' if warrant.warrant_type == 'Call' else 'p'
            
            try:
                # Use py_vollib to calculate implied volatility
                # Convert warrant price to option price (adjust for conversion ratio if needed)
                option_price = warrant.close_price / (warrant.exercise_ratio if warrant.exercise_ratio > 0 else 1.0)
                
                iv = pricer.implied_volatility(
                    option_price=option_price,
                    S=spot_price,
                    K=warrant.strike_price,
                    T=time_to_maturity,
                    r=risk_free_rate,
                    option_type=option_type,
                    method='vollib'
                )
                
                if iv and 0.05 < iv < 2.0:  # Sanity check (5% to 200%)
                    warrant_ivs.append({
                        'symbol': warrant.symbol,
                        'implied_volatility': iv,
                        'moneyness': moneyness,
                        'warrant_type': warrant.warrant_type,
                        'time_to_maturity': time_to_maturity,
                        'market_price': warrant.close_price,
                        'strike': warrant.strike_price
                    })
                    
                    # Categorize for metrics
                    if 0.95 <= moneyness <= 1.05:  # ATM
                        atm_ivs.append(iv)
                    elif moneyness < 0.95 and warrant.warrant_type == 'Put':  # OTM Put
                        otm_put_ivs.append(iv)
                    elif moneyness > 1.05 and warrant.warrant_type == 'Call':  # OTM Call
                        otm_call_ivs.append(iv)
                        
            except Exception as e:
                logger.warning(f"Failed to calculate IV for {warrant.symbol}: {e}")
                continue
        
        # Calculate aggregated metrics
        if not warrant_ivs:
            raise HTTPException(status_code=404, detail="No valid implied volatilities calculated")
        
        # ATM implied volatility
        implied_vol_atm = sum(atm_ivs) / len(atm_ivs) if atm_ivs else sum([w['implied_volatility'] for w in warrant_ivs]) / len(warrant_ivs)
        
        # Historical volatility from vnstock
        historical_vol_30d = market_data_service.calculate_historical_volatility(underlying_symbol, days=30)
        historical_vol_60d = market_data_service.calculate_historical_volatility(underlying_symbol, days=60)
        
        # Volatility skew - Calculate using linear regression slope
        # Theory: OTM puts (low strike) should have HIGHER IV than OTM calls (high strike)
        # Skew measures the slope of IV vs moneyness/strike
        
        if len(warrant_ivs) >= 2:  # Need at least 2 points
            # Sort warrants by moneyness
            sorted_warrants = sorted(warrant_ivs, key=lambda x: x['moneyness'])
            
            # Extract moneyness and IV arrays
            moneyness_array = np.array([w['moneyness'] for w in sorted_warrants])
            iv_array = np.array([w['implied_volatility'] for w in sorted_warrants])
            
            # Calculate skew using linear regression slope: IV = a + b*moneyness
            # Negative slope (b < 0) means reverse skew (typical for equities)
            if len(moneyness_array) >= 2:
                # Simple linear fit
                coeffs = np.polyfit(moneyness_array, iv_array, 1)
                slope = coeffs[0]  # This is the skew coefficient
                
                # Alternative: Use difference between extremes (normalized)
                # This is more intuitive: (Low Strike IV - High Strike IV)
                lowest_moneyness_iv = iv_array[0]
                highest_moneyness_iv = iv_array[-1]
                
                # Skew as absolute difference (should be positive for reverse skew)
                volatility_skew = abs(lowest_moneyness_iv - highest_moneyness_iv)
                
                # Log for debugging
                logger.info(f"Volatility Skew for {underlying_symbol}: "
                           f"Slope={slope:.4f}, "
                           f"Low Moneyness IV={lowest_moneyness_iv:.2%}, "
                           f"High Moneyness IV={highest_moneyness_iv:.2%}, "
                           f"Skew={volatility_skew:.4f}")
            else:
                volatility_skew = 0.0
        else:
            # Not enough data points
            volatility_skew = 0.0
        
        # Vol of Vol (volatility of implied volatilities)
        iv_values = [w['implied_volatility'] for w in warrant_ivs]
        vol_of_vol = np.std(iv_values, ddof=1) if len(iv_values) > 1 else 0.0
        
        return {
            'underlying_symbol': underlying_symbol,
            'spot_price': spot_price,
            'metrics': {
                'implied_vol_atm': implied_vol_atm,
                'historical_vol_30d': historical_vol_30d or 0.25,
                'historical_vol_60d': historical_vol_60d or 0.25,
                'volatility_skew': volatility_skew,
                'vol_of_vol': vol_of_vol,
                'num_warrants_analyzed': len(warrant_ivs)
            },
            'warrant_ivs': warrant_ivs[:20]  # Return top 20 for reference
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating volatility metrics for {underlying_symbol}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

print(" Warrant pricing API endpoints created!")
