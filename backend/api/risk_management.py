from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.database_models import SessionLocal, RiskMetrics
from services.risk_services.monte_carlo_risk_engine import MonteCarloRiskEngine
from services.risk_services.taylor_series_analyzer import TaylorSeriesAnalyzer

router = APIRouter(prefix="/api/v1/risk", tags=["Risk Management"])

# Pydantic models
class VaRCalculationRequest(BaseModel):
    portfolio_symbols: List[str]
    confidence_level: float = 0.95
    time_horizon: int = 1  # days
    method: str = "monte_carlo"  # historical, monte_carlo, parametric
    num_simulations: int = 10000

class VaRCalculationResponse(BaseModel):
    portfolio_symbols: List[str]
    confidence_level: float
    time_horizon: int
    method: str
    var_value: float
    expected_shortfall: float
    portfolio_value: float
    risk_metrics: dict
    timestamp: datetime

class StressTestRequest(BaseModel):
    portfolio_symbols: List[str]
    stress_scenarios: List[dict]
    base_portfolio_value: float

class StressTestResponse(BaseModel):
    portfolio_symbols: List[str]
    base_portfolio_value: float
    stress_results: List[dict]
    worst_case_scenario: dict | None = None  # ✅ Pydantic v2 syntax
    recommendations: dict | None = None  # ✅ Pydantic v2 syntax
    timestamp: datetime
    
    class Config:
        arbitrary_types_allowed = True

class TaylorSeriesAnalysisRequest(BaseModel):
    warrant_symbol: str
    spot_price: float
    price_shock: float
    volatility_shock: float
    time_decay: float = 1.0  # days

class TaylorSeriesAnalysisResponse(BaseModel):
    warrant_symbol: str
    spot_price: float
    price_shock: float
    volatility_shock: float
    time_decay: float
    hedging_error: float
    error_breakdown: dict
    gamma_contribution: float
    vega_contribution: float
    theta_contribution: float
    recommendations: dict
    timestamp: datetime

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/var", response_model=VaRCalculationResponse)
async def calculate_var(request: VaRCalculationRequest, db: Session = Depends(get_db)):
    """
    Calculate Value at Risk (VaR) for a portfolio
    """
    try:
        # Initialize risk engine
        risk_engine = MonteCarloRiskEngine()
        
        # Calculate VaR
        var_results = risk_engine.calculate_var(
            symbols=request.portfolio_symbols,
            confidence_level=request.confidence_level,
            time_horizon=request.time_horizon,
            method=request.method,
            num_simulations=request.num_simulations
        )
        
        # Save results to database
        risk_metric = RiskMetrics(
            portfolio_id=",".join(request.portfolio_symbols),
            metric_type="VaR",
            confidence_level=request.confidence_level,
            time_horizon=request.time_horizon,
            metric_value=var_results['var_value'],
            calculation_method=request.method
        )
        db.add(risk_metric)
        
        # Save Expected Shortfall
        es_metric = RiskMetrics(
            portfolio_id=",".join(request.portfolio_symbols),
            metric_type="Expected_Shortfall",
            confidence_level=request.confidence_level,
            time_horizon=request.time_horizon,
            metric_value=var_results['expected_shortfall'],
            calculation_method=request.method
        )
        db.add(es_metric)
        db.commit()
        
        return VaRCalculationResponse(
            portfolio_symbols=request.portfolio_symbols,
            confidence_level=request.confidence_level,
            time_horizon=request.time_horizon,
            method=request.method,
            var_value=var_results['var_value'],
            expected_shortfall=var_results['expected_shortfall'],
            portfolio_value=var_results['portfolio_value'],
            risk_metrics=var_results['risk_metrics'],
            timestamp=datetime.now()
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stress-test", response_model=StressTestResponse)
async def stress_test(request: StressTestRequest, db: Session = Depends(get_db)):
    """
    Perform stress testing on a portfolio
    """
    try:
        # Initialize risk engine
        risk_engine = MonteCarloRiskEngine()
        
        # Run stress tests
        stress_results = risk_engine.stress_test(
            symbols=request.portfolio_symbols,
            stress_scenarios=request.stress_scenarios,
            base_portfolio_value=request.base_portfolio_value
        )
        
        # ✅ FIXED: Ensure worst_case and recommendations are never None
        worst_case = stress_results.get('worst_case_scenario')
        if worst_case is None:
            worst_case = stress_results['stress_results'][0] if stress_results['stress_results'] else {}
        
        recommendations = stress_results.get('recommendations')
        if recommendations is None:
            recommendations = {'risk_level': 'UNKNOWN', 'recommended_action': 'No recommendation available'}
        
        return StressTestResponse(
            portfolio_symbols=request.portfolio_symbols,
            base_portfolio_value=request.base_portfolio_value,
            stress_results=stress_results['stress_results'],
            worst_case_scenario=worst_case,  # ✅ Never None
            recommendations=recommendations,  # ✅ Never None
            timestamp=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/taylor-series", response_model=TaylorSeriesAnalysisResponse)
async def analyze_taylor_series(request: TaylorSeriesAnalysisRequest, db: Session = Depends(get_db)):
    """
    Analyze hedging error using Taylor series expansion
    """
    try:
        # Initialize Taylor series analyzer
        analyzer = TaylorSeriesAnalyzer()
        
        # Analyze hedging error
        analysis_results = analyzer.analyze_hedging_error(
            warrant_symbol=request.warrant_symbol,
            spot_price=request.spot_price,
            price_shock=request.price_shock,
            volatility_shock=request.volatility_shock,
            time_decay=request.time_decay
        )
        
        return TaylorSeriesAnalysisResponse(
            warrant_symbol=request.warrant_symbol,
            spot_price=request.spot_price,
            price_shock=request.price_shock,
            volatility_shock=request.volatility_shock,
            time_decay=request.time_decay,
            hedging_error=analysis_results['hedging_error'],
            error_breakdown=analysis_results['error_breakdown'],
            gamma_contribution=analysis_results['gamma_contribution'],
            vega_contribution=analysis_results['vega_contribution'],
            theta_contribution=analysis_results['theta_contribution'],
            recommendations=analysis_results['recommendations'],
            timestamp=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics/{portfolio_id}", response_model=List[dict])
async def get_risk_metrics(portfolio_id: str, db: Session = Depends(get_db)):
    """
    Get historical risk metrics for a portfolio
    """
    try:
        metrics = db.query(RiskMetrics).filter(
            RiskMetrics.portfolio_id == portfolio_id
        ).order_by(RiskMetrics.created_at.desc()).all()
        
        return [
            {
                "id": metric.id,
                "metric_type": metric.metric_type,
                "confidence_level": metric.confidence_level,
                "time_horizon": metric.time_horizon,
                "metric_value": metric.metric_value,
                "calculation_method": metric.calculation_method,
                "created_at": metric.created_at
            }
            for metric in metrics
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

print(" Risk management API endpoints created!")
