from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from models.database_models import SessionLocal, HedgingResult
from services.hedging_services.dynamic_delta_hedging_engine import DynamicDeltaHedgingEngine

router = APIRouter(prefix="/api/v1/hedging", tags=["Delta Hedging"])

# Pydantic models
class HedgingSimulationRequest(BaseModel):
    warrant_symbol: str
    initial_spot_price: float
    target_delta: float = 0.0
    rebalancing_frequency: int = 1  # days
    simulation_days: int = 30
    transaction_cost: float = 0.00156  # VN market cost
    volatility: float = 0.25

class HedgingSimulationResponse(BaseModel):
    warrant_symbol: str
    strategy_type: str
    initial_delta: float
    target_delta: float
    hedge_ratio: float
    transaction_cost: float
    total_pnl: float
    hedging_error: float
    rebalancing_frequency: int
    simulation_days: int
    daily_results: List[dict]
    summary_stats: dict
    timestamp: datetime

class RebalancingOptimizationRequest(BaseModel):
    warrant_symbol: str
    initial_spot_price: float
    target_delta: float = 0.0
    simulation_days: int = 30
    transaction_cost: float = 0.00156
    volatility: float = 0.25
    min_frequency: int = 1
    max_frequency: int = 10

class RebalancingOptimizationResponse(BaseModel):
    warrant_symbol: str
    optimal_frequency: int
    optimal_cost: float
    frequency_analysis: List[dict]
    recommendations: dict
    timestamp: datetime

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/simulate", response_model=HedgingSimulationResponse)
async def simulate_hedging(request: HedgingSimulationRequest, db: Session = Depends(get_db)):
    """
    Simulate dynamic delta hedging for a warrant
    """
    try:
        # Initialize hedging engine
        hedging_engine = DynamicDeltaHedgingEngine()
        
        # Run hedging simulation
        results = hedging_engine.simulate_hedging(
            warrant_symbol=request.warrant_symbol,
            initial_spot_price=request.initial_spot_price,
            target_delta=request.target_delta,
            rebalancing_frequency=request.rebalancing_frequency,
            simulation_days=request.simulation_days,
            transaction_cost=request.transaction_cost,
            volatility=request.volatility
        )
        
        # Save results to database
        hedging_result = HedgingResult(
            warrant_symbol=request.warrant_symbol,
            strategy_type="Delta Hedging",
            initial_delta=results['initial_delta'],
            target_delta=request.target_delta,
            hedge_ratio=results['hedge_ratio'],
            transaction_cost=request.transaction_cost,
            total_pnl=results['total_pnl'],
            hedging_error=results['hedging_error'],
            rebalancing_frequency=request.rebalancing_frequency,
            simulation_days=request.simulation_days
        )
        db.add(hedging_result)
        db.commit()
        
        return HedgingSimulationResponse(
            warrant_symbol=request.warrant_symbol,
            strategy_type="Delta Hedging",
            initial_delta=results['initial_delta'],
            target_delta=request.target_delta,
            hedge_ratio=results['hedge_ratio'],
            transaction_cost=request.transaction_cost,
            total_pnl=results['total_pnl'],
            hedging_error=results['hedging_error'],
            rebalancing_frequency=request.rebalancing_frequency,
            simulation_days=request.simulation_days,
            daily_results=results['daily_results'],
            summary_stats=results['summary_stats'],
            timestamp=datetime.now()
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/optimize-rebalancing", response_model=RebalancingOptimizationResponse)
async def optimize_rebalancing(request: RebalancingOptimizationRequest, db: Session = Depends(get_db)):
    """
    Optimize rebalancing frequency for delta hedging
    """
    try:
        # Initialize hedging engine
        hedging_engine = DynamicDeltaHedgingEngine()
        
        # Run optimization
        optimization_results = hedging_engine.optimize_rebalancing_frequency(
            warrant_symbol=request.warrant_symbol,
            initial_spot_price=request.initial_spot_price,
            target_delta=request.target_delta,
            simulation_days=request.simulation_days,
            transaction_cost=request.transaction_cost,
            volatility=request.volatility,
            min_frequency=request.min_frequency,
            max_frequency=request.max_frequency
        )
        
        return RebalancingOptimizationResponse(
            warrant_symbol=request.warrant_symbol,
            optimal_frequency=optimization_results['optimal_frequency'],
            optimal_cost=optimization_results['optimal_cost'],
            frequency_analysis=optimization_results['frequency_analysis'],
            recommendations=optimization_results['recommendations'],
            timestamp=datetime.now()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/results/{warrant_symbol}", response_model=List[dict])
async def get_hedging_results(warrant_symbol: str, db: Session = Depends(get_db)):
    """
    Get historical hedging results for a warrant
    """
    try:
        results = db.query(HedgingResult).filter(
            HedgingResult.warrant_symbol == warrant_symbol
        ).order_by(HedgingResult.created_at.desc()).all()
        
        return [
            {
                "id": result.id,
                "strategy_type": result.strategy_type,
                "initial_delta": result.initial_delta,
                "target_delta": result.target_delta,
                "hedge_ratio": result.hedge_ratio,
                "transaction_cost": result.transaction_cost,
                "total_pnl": result.total_pnl,
                "hedging_error": result.hedging_error,
                "rebalancing_frequency": result.rebalancing_frequency,
                "simulation_days": result.simulation_days,
                "created_at": result.created_at
            }
            for result in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

print(" Hedging API endpoints created!")
