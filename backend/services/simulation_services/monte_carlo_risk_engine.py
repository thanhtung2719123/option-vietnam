"""
Monte Carlo Risk Engine
Advanced risk metrics using Monte Carlo simulation

This module provides comprehensive risk analysis:
- Value at Risk (VaR) - Historical and Monte Carlo
- Expected Shortfall (CVaR)
- Stress testing framework
- Scenario analysis and ranking
- Performance optimization for large portfolios

Vietnamese Market Specifics:
    - VaR calculation for warrant portfolios
    - Stress scenarios for Vietnamese market conditions
    - Integration with Heston stochastic volatility
"""

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass
from scipy import stats

logger = logging.getLogger(__name__)


@dataclass
class VaRResult:
    """
    Value at Risk calculation result
    
    Attributes:
        var_value: VaR at specified confidence level
        confidence_level: Confidence level (e.g., 0.95)
        method: Calculation method ('historical', 'monte_carlo', 'parametric')
        time_horizon: Time horizon in days
        expected_shortfall: CVaR (Expected Shortfall)
        timestamp: Calculation timestamp
    """
    var_value: float
    confidence_level: float
    method: str
    time_horizon: int
    expected_shortfall: float
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'var_value': self.var_value,
            'confidence_level': self.confidence_level,
            'method': self.method,
            'time_horizon_days': self.time_horizon,
            'expected_shortfall': self.expected_shortfall,
            'timestamp': self.timestamp.isoformat()
        }


@dataclass
class StressTestResult:
    """
    Stress test result container
    
    Attributes:
        scenario_name: Name of stress scenario
        portfolio_value: Portfolio value under scenario
        pnl: Profit and loss under scenario
        pnl_pct: P&L percentage
        max_drawdown: Maximum drawdown
        timestamp: Calculation timestamp
    """
    scenario_name: str
    portfolio_value: float
    pnl: float
    pnl_pct: float
    max_drawdown: float
    timestamp: datetime


class MonteCarloRiskEngine:
    """
    Monte Carlo-based risk engine for portfolio risk analysis
    
    This class provides comprehensive risk metrics:
    - Value at Risk (VaR)
    - Expected Shortfall (CVaR)
    - Stress testing
    - Scenario analysis
    
    Optimized for Vietnamese warrant portfolios.
    """
    
    def __init__(self, n_scenarios: int = 10000):
        """
        Initialize Monte Carlo risk engine
        
        Args:
            n_scenarios: Number of Monte Carlo scenarios
        """
        self.n_scenarios = n_scenarios
        logger.info(f"MonteCarloRiskEngine initialized with {n_scenarios} scenarios")
    
    def calculate_var_historical(self,
                                 returns: np.ndarray,
                                 confidence_level: float = 0.95,
                                 time_horizon: int = 1) -> VaRResult:
        """
        Calculate Value at Risk using historical simulation
        
        Historical VaR: Percentile of historical return distribution
        
        Args:
            returns: Historical returns (daily)
            confidence_level: Confidence level (0.95 = 95%)
            time_horizon: Time horizon in days
            
        Returns:
            VaRResult with VaR and Expected Shortfall
        """
        # Scale returns for time horizon
        if time_horizon > 1:
            returns_scaled = returns * np.sqrt(time_horizon)
        else:
            returns_scaled = returns
        
        # Calculate VaR (negative because we want loss)
        var_percentile = 1 - confidence_level
        var_value = -np.percentile(returns_scaled, var_percentile * 100)
        
        # Calculate Expected Shortfall (CVaR)
        # Average of losses beyond VaR threshold
        threshold = -var_value
        tail_losses = returns_scaled[returns_scaled <= threshold]
        expected_shortfall = -np.mean(tail_losses) if len(tail_losses) > 0 else var_value
        
        result = VaRResult(
            var_value=var_value,
            confidence_level=confidence_level,
            method='historical',
            time_horizon=time_horizon,
            expected_shortfall=expected_shortfall,
            timestamp=datetime.now()
        )
        
        logger.info(f"Historical VaR ({confidence_level*100:.0f}%, {time_horizon}d): "
                   f"{var_value*100:.2f}%, CVaR: {expected_shortfall*100:.2f}%")
        
        return result
    
    def calculate_var_monte_carlo(self,
                                 scenarios: np.ndarray,
                                 initial_value: float,
                                 confidence_level: float = 0.95) -> VaRResult:
        """
        Calculate Value at Risk using Monte Carlo scenarios
        
        Monte Carlo VaR: Percentile of simulated portfolio value distribution
        
        Args:
            scenarios: Simulated portfolio values (n_scenarios, n_steps+1)
            initial_value: Initial portfolio value
            confidence_level: Confidence level
            
        Returns:
            VaRResult with VaR and Expected Shortfall
        """
        # Get terminal values
        terminal_values = scenarios[:, -1]
        
        # Calculate P&L
        pnl = terminal_values - initial_value
        pnl_pct = pnl / initial_value
        
        # Calculate VaR (loss, so negative)
        var_percentile = 1 - confidence_level
        var_value = -np.percentile(pnl_pct, var_percentile * 100)
        
        # Calculate Expected Shortfall
        threshold = -var_value
        tail_losses = pnl_pct[pnl_pct <= threshold]
        expected_shortfall = -np.mean(tail_losses) if len(tail_losses) > 0 else var_value
        
        result = VaRResult(
            var_value=var_value,
            confidence_level=confidence_level,
            method='monte_carlo',
            time_horizon=scenarios.shape[1] - 1,
            expected_shortfall=expected_shortfall,
            timestamp=datetime.now()
        )
        
        logger.info(f"Monte Carlo VaR ({confidence_level*100:.0f}%): {var_value*100:.2f}%, "
                   f"CVaR: {expected_shortfall*100:.2f}%")
        
        return result
    
    def calculate_var_parametric(self,
                                mean_return: float,
                                volatility: float,
                                confidence_level: float = 0.95,
                                time_horizon: int = 1) -> VaRResult:
        """
        Calculate Value at Risk using parametric method (assumes normal distribution)
        
        Parametric VaR: -μT + σ√T × z_α
        
        Args:
            mean_return: Expected daily return
            volatility: Daily volatility
            confidence_level: Confidence level
            time_horizon: Time horizon in days
            
        Returns:
            VaRResult with VaR estimate
        """
        # Z-score for confidence level
        z_score = stats.norm.ppf(confidence_level)
        
        # Scale for time horizon
        mean_scaled = mean_return * time_horizon
        vol_scaled = volatility * np.sqrt(time_horizon)
        
        # VaR calculation
        var_value = -mean_scaled + vol_scaled * z_score
        
        # Expected Shortfall (analytical for normal distribution)
        # CVaR = -μT + σ√T × φ(z_α) / (1-α)
        pdf_at_var = stats.norm.pdf(z_score)
        expected_shortfall = -mean_scaled + vol_scaled * pdf_at_var / (1 - confidence_level)
        
        result = VaRResult(
            var_value=var_value,
            confidence_level=confidence_level,
            method='parametric',
            time_horizon=time_horizon,
            expected_shortfall=expected_shortfall,
            timestamp=datetime.now()
        )
        
        logger.info(f"Parametric VaR ({confidence_level*100:.0f}%, {time_horizon}d): "
                   f"{var_value*100:.2f}%, CVaR: {expected_shortfall*100:.2f}%")
        
        return result
    
    def run_stress_tests(self,
                        portfolio_value: float,
                        scenarios: Dict[str, np.ndarray],
                        scenario_names: Optional[List[str]] = None) -> pd.DataFrame:
        """
        Run comprehensive stress tests on portfolio
        
        Args:
            portfolio_value: Initial portfolio value
            scenarios: Dictionary of scenario_name -> price_scenarios
            scenario_names: Optional list of scenario names to include
            
        Returns:
            DataFrame with stress test results
        """
        if scenario_names is None:
            scenario_names = list(scenarios.keys())
        
        results = []
        
        for name in scenario_names:
            if name not in scenarios:
                logger.warning(f"Scenario {name} not found, skipping")
                continue
            
            scenario_paths = scenarios[name]
            terminal_values = scenario_paths[:, -1]
            
            # Calculate statistics
            mean_final = np.mean(terminal_values)
            pnl = mean_final - portfolio_value
            pnl_pct = pnl / portfolio_value
            
            # Calculate maximum drawdown
            cummax = np.maximum.accumulate(scenario_paths, axis=1)
            drawdowns = (scenario_paths - cummax) / cummax
            max_drawdown = np.min(drawdowns)
            
            results.append({
                'scenario': name,
                'portfolio_value': mean_final,
                'pnl': pnl,
                'pnl_pct': pnl_pct * 100,
                'max_drawdown': max_drawdown * 100,
                'percentile_5': np.percentile(terminal_values, 5),
                'percentile_95': np.percentile(terminal_values, 95),
                'std': np.std(terminal_values)
            })
        
        df = pd.DataFrame(results)
        df = df.sort_values('pnl_pct', ascending=False)
        
        logger.info(f"Stress tests complete for {len(results)} scenarios")
        
        return df
    
    def calculate_portfolio_var(self,
                               portfolio_scenarios: List[np.ndarray],
                               weights: np.ndarray,
                               initial_value: float,
                               confidence_level: float = 0.95) -> VaRResult:
        """
        Calculate VaR for multi-asset portfolio
        
        Args:
            portfolio_scenarios: List of scenarios for each asset
            weights: Portfolio weights (sum to 1)
            initial_value: Initial portfolio value
            confidence_level: Confidence level
            
        Returns:
            VaRResult for portfolio
        """
        # Aggregate portfolio value across scenarios
        portfolio_values = np.zeros_like(portfolio_scenarios[0])
        
        for i, asset_scenarios in enumerate(portfolio_scenarios):
            portfolio_values += weights[i] * asset_scenarios
        
        # Calculate VaR
        result = self.calculate_var_monte_carlo(
            scenarios=portfolio_values,
            initial_value=initial_value,
            confidence_level=confidence_level
        )
        
        return result
    
    def expected_shortfall_breakdown(self,
                                    scenarios: np.ndarray,
                                    initial_value: float,
                                    confidence_level: float = 0.95) -> Dict:
        """
        Detailed Expected Shortfall analysis
        
        Args:
            scenarios: Simulated scenarios
            initial_value: Initial value
            confidence_level: Confidence level
            
        Returns:
            Dictionary with CVaR breakdown
        """
        # Calculate returns
        terminal_values = scenarios[:, -1]
        returns = (terminal_values - initial_value) / initial_value
        
        # Find VaR threshold
        var_percentile = 1 - confidence_level
        var_threshold = np.percentile(returns, var_percentile * 100)
        
        # Tail scenarios (worse than VaR)
        tail_returns = returns[returns <= var_threshold]
        
        breakdown = {
            'expected_shortfall': -np.mean(tail_returns),
            'var_threshold': -var_threshold,
            'tail_scenarios': len(tail_returns),
            'tail_percentage': len(tail_returns) / len(returns) * 100,
            'worst_loss': -np.min(tail_returns),
            'tail_volatility': np.std(tail_returns),
            'confidence_level': confidence_level
        }
        
        return breakdown 