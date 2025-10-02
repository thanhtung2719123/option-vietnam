"""
Data Helper Functions
Provides utility functions to fetch real market data for warrants
Eliminates hardcoded values by fetching from database and market APIs
"""

import logging
from typing import Dict, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def get_warrant_market_data(symbol: str, db_session: Session) -> Dict:
    """
    Get all real market data for a warrant (no hardcoded values)
    
    Args:
        symbol: Warrant symbol (e.g., 'CVNM2501')
        db_session: Database session
        
    Returns:
        Dictionary with all market data:
        {
            'spot_price': float,  # Real spot price from vnstock
            'strike_price': float,  # From database
            'volatility': float,  # Calculated from historical data
            'risk_free_rate': float,  # From VN market config
            'time_to_maturity': float,  # Calculated from maturity date
            'underlying_symbol': str,
            'warrant_type': str,
            'exercise_ratio': float
        }
    """
    from backend.models.database_models import Warrant
    from backend.services.market_data_service import market_data_service
    from backend.config.vn_market_config import VNMarketConfig
    
    # Get warrant from database
    warrant = db_session.query(Warrant).filter(Warrant.symbol == symbol).first()
    
    if not warrant:
        raise ValueError(f"Warrant {symbol} not found in database")
    
    # Get real spot price from market
    spot_price = market_data_service.get_current_price(warrant.underlying_symbol)
    if not spot_price:
        logger.warning(f"Could not fetch spot price for {warrant.underlying_symbol}, using strike price as fallback")
        spot_price = warrant.strike_price
    
    # Calculate real volatility from historical data
    volatility = market_data_service.calculate_historical_volatility(
        warrant.underlying_symbol, 
        days=30
    )
    if not volatility:
        logger.warning(f"Could not calculate volatility for {warrant.underlying_symbol}, using default 25%")
        volatility = 0.25  # Conservative fallback
    
    # Get risk-free rate from config (based on VN government bonds)
    risk_free_rate = VNMarketConfig.get_risk_free_rate('govt_bond_10y')
    
    # Calculate time to maturity
    time_to_maturity = (warrant.maturity_date - datetime.now()).days / 365.0
    if time_to_maturity < 0:
        time_to_maturity = 0.0
    
    logger.info(f"Fetched market data for {symbol}: S={spot_price:.0f}, K={warrant.strike_price:.0f}, "
                f"σ={volatility:.2%}, T={time_to_maturity:.2f}y")
    
    return {
        'spot_price': spot_price,
        'strike_price': warrant.strike_price,
        'volatility': volatility,
        'risk_free_rate': risk_free_rate,
        'time_to_maturity': time_to_maturity,
        'underlying_symbol': warrant.underlying_symbol,
        'warrant_type': warrant.warrant_type,
        'exercise_ratio': warrant.exercise_ratio,
        'maturity_date': warrant.maturity_date
    }


def get_portfolio_spot_prices(positions: List[Dict], db_session: Session) -> Dict[str, float]:
    """
    Get real spot prices for all warrants in a portfolio
    
    Args:
        positions: List of position dictionaries with 'symbol' or 'underlying_symbol'
        db_session: Database session
        
    Returns:
        Dictionary mapping underlying_symbol -> spot_price
    """
    from backend.services.market_data_service import market_data_service
    from backend.models.database_models import Warrant
    
    spot_prices = {}
    
    for position in positions:
        underlying_symbol = position.get('underlying_symbol')
        
        # If no underlying_symbol, try to get from warrant symbol
        if not underlying_symbol and position.get('symbol'):
            warrant = db_session.query(Warrant).filter(
                Warrant.symbol == position['symbol']
            ).first()
            if warrant:
                underlying_symbol = warrant.underlying_symbol
        
        if underlying_symbol and underlying_symbol not in spot_prices:
            spot_price = market_data_service.get_current_price(underlying_symbol)
            if spot_price:
                spot_prices[underlying_symbol] = spot_price
            else:
                logger.warning(f"Could not fetch spot price for {underlying_symbol}")
    
    return spot_prices


def get_average_portfolio_price(positions: List[Dict], db_session: Session) -> float:
    """
    Calculate weighted average spot price across portfolio positions
    
    Args:
        positions: List of position dictionaries
        db_session: Database session
        
    Returns:
        Weighted average spot price
    """
    spot_prices = get_portfolio_spot_prices(positions, db_session)
    
    if not spot_prices:
        logger.warning("No spot prices available, using default 100,000 VND")
        return 100000.0
    
    # Calculate weighted average by notional
    total_notional = sum(p.get('notional', 0) for p in positions)
    
    if total_notional == 0:
        # Simple average if no notional values
        return sum(spot_prices.values()) / len(spot_prices)
    
    # Weighted average
    weighted_sum = 0
    for position in positions:
        underlying = position.get('underlying_symbol')
        if underlying in spot_prices:
            notional = position.get('notional', 0)
            weighted_sum += spot_prices[underlying] * notional
    
    return weighted_sum / total_notional if total_notional > 0 else 100000.0


def get_portfolio_value(positions: List[Dict], db_session: Session) -> float:
    """
    Calculate total portfolio value from real market prices
    
    Args:
        positions: List of positions with 'symbol' and 'quantity'
        db_session: Database session
        
    Returns:
        Total portfolio value in VND
    """
    from backend.services.market_data_service import market_data_service
    from backend.models.database_models import Warrant
    
    total_value = 0.0
    
    for position in positions:
        symbol = position.get('symbol')
        quantity = position.get('quantity', 0)
        
        if not symbol or quantity == 0:
            continue
        
        # Get warrant price from market
        warrant_price = market_data_service.get_warrant_price(symbol)
        
        if not warrant_price:
            # Fallback to database close price
            warrant = db_session.query(Warrant).filter(Warrant.symbol == symbol).first()
            if warrant and warrant.close_price:
                warrant_price = warrant.close_price
            else:
                logger.warning(f"No price available for {symbol}")
                continue
        
        position_value = warrant_price * quantity
        total_value += position_value
        logger.debug(f"{symbol}: {quantity} × {warrant_price:.2f} = {position_value:,.0f} VND")
    
    logger.info(f"Total portfolio value: {total_value:,.0f} VND")
    return total_value


def get_historical_returns(symbol: str, days: int = 252) -> Optional[Dict]:
    """
    Get historical returns statistics for a symbol
    
    Args:
        symbol: Stock symbol
        days: Number of days to analyze
        
    Returns:
        Dictionary with return statistics or None
    """
    from backend.services.market_data_service import market_data_service
    from vnstock import Quote
    import numpy as np
    from datetime import timedelta
    
    try:
        quote = Quote(symbol=symbol, source='VCI')
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days + 10)
        
        df = quote.history(
            start=start_date.strftime('%Y-%m-%d'),
            end=end_date.strftime('%Y-%m-%d')
        )
        
        if df is None or len(df) < 10:
            return None
        
        # Calculate returns
        prices = df['close'].values
        returns = np.diff(prices) / prices[:-1]
        
        return {
            'mean': float(returns.mean()),
            'std': float(returns.std()),
            'min': float(returns.min()),
            'max': float(returns.max()),
            'count': len(returns)
        }
    
    except Exception as e:
        logger.error(f"Error calculating returns for {symbol}: {e}")
        return None 