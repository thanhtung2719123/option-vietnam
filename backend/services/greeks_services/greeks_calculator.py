"""
Greeks Calculator Service
Comprehensive sensitivity analysis for Vietnamese warrants

Provides:
- Complete Greeks calculation (Delta, Gamma, Vega, Theta, Rho)
- Greeks evolution over time
- Risk analysis and alerts
- Portfolio Greeks aggregation
"""

import logging
from datetime import datetime, date
from typing import List, Dict, Optional
import numpy as np

# Try different import methods
try:
    from ...models.greeks_models import (
        Greeks, PortfolioGreeks, GammaRiskAnalysis, VegaRiskAnalysis,
        GreeksEvolution, RiskLevel, RiskAlert
    )
    from ...models.warrant_models import WarrantSpecification
    from ..pricing_services.black_scholes_pricer import BlackScholesPricer
except ImportError:
    from models.greeks_models import (
        Greeks, PortfolioGreeks, GammaRiskAnalysis, VegaRiskAnalysis,
        GreeksEvolution, RiskLevel, RiskAlert
    )
    from models.warrant_models import WarrantSpecification
    from services.pricing_services.black_scholes_pricer import BlackScholesPricer

logger = logging.getLogger(__name__)


class GreeksCalculator:
    """
    Greeks calculation and risk analysis service
    
    Wraps Black-Scholes pricer to provide structured Greeks output
    and risk management analytics
    """
    
    def __init__(self, use_vn_config: bool = True):
        """
        Initialize Greeks calculator
        
        Args:
            use_vn_config: Use Vietnamese market configuration
        """
        self.pricer = BlackScholesPricer(use_vn_config=use_vn_config)
        logger.info("GreeksCalculator initialized")
    
    def calculate_greeks(self, symbol: str, underlying_price: float, strike_price: float,
                        time_to_maturity: float, volatility: float, risk_free_rate: float,
                        option_type: str = 'c', dividend_yield: float = 0.0) -> Greeks:
        """
        Calculate complete Greeks for a single warrant
        
        Args:
            symbol: Warrant symbol
            underlying_price: Current underlying price
            strike_price: Strike price
            time_to_maturity: Time to maturity (years)
            volatility: Annualized volatility
            risk_free_rate: Risk-free rate
            option_type: 'c' for call, 'p' for put
            dividend_yield: Dividend yield
            
        Returns:
            Greeks model with all sensitivities
        """
        result = self.pricer.price_with_greeks(
            S=underlying_price,
            K=strike_price,
            T=time_to_maturity,
            sigma=volatility,
            r=risk_free_rate,
            option_type=option_type,
            q=dividend_yield
        )
        
        # Calculate lambda (elasticity)
        if result.price > 0:
            lambda_elasticity = result.delta * underlying_price / result.price
        else:
            lambda_elasticity = None
        
        return Greeks(
            symbol=symbol,
            timestamp=datetime.now(),
            delta=result.delta,
            gamma=result.gamma,
            vega=result.vega,
            theta=result.theta,
            rho=result.rho,
            lambda_elasticity=lambda_elasticity,
            calculation_method='black_scholes_analytical',
            model_parameters={
                'underlying_price': underlying_price,
                'strike_price': strike_price,
                'time_to_maturity': time_to_maturity,
                'volatility': volatility,
                'risk_free_rate': risk_free_rate,
                'dividend_yield': dividend_yield,
                'option_type': option_type
            }
        )
    
    def calculate_portfolio_greeks(self, positions: List[Dict]) -> PortfolioGreeks:
        """
        Calculate aggregated Greeks for a portfolio of warrants
        
        Args:
            positions: List of position dictionaries with warrant details and quantities
            
        Returns:
            PortfolioGreeks with aggregated sensitivities
        """
        total_delta = 0.0
        total_gamma = 0.0
        total_vega = 0.0
        total_theta = 0.0
        total_rho = 0.0
        
        delta_exposure = 0.0
        gamma_exposure = 0.0
        vega_exposure = 0.0
        
        total_value = 0.0
        notional_exposure = 0.0
        
        long_positions = 0
        short_positions = 0
        
        for position in positions:
            quantity = position.get('quantity', 0)
            
            # Calculate Greeks for this position
            greeks = self.calculate_greeks(
                symbol=position['symbol'],
                underlying_price=position['underlying_price'],
                strike_price=position['strike_price'],
                time_to_maturity=position['time_to_maturity'],
                volatility=position['volatility'],
                risk_free_rate=position.get('risk_free_rate', 0.04),
                option_type=position.get('option_type', 'c'),
                dividend_yield=position.get('dividend_yield', 0.0)
            )
            
            # Aggregate Greeks
            total_delta += greeks.delta * quantity
            total_gamma += greeks.gamma * quantity
            total_vega += greeks.vega * quantity
            total_theta += greeks.theta * quantity
            total_rho += greeks.rho * quantity
            
            # Calculate exposures
            option_price = position.get('option_price', 0)
            underlying_price = position['underlying_price']
            
            delta_exposure += greeks.delta * quantity * underlying_price
            gamma_exposure += greeks.gamma * quantity * underlying_price * underlying_price
            vega_exposure += greeks.vega * quantity
            
            total_value += option_price * quantity
            notional_exposure += underlying_price * quantity
            
            # Count positions
            if quantity > 0:
                long_positions += 1
            elif quantity < 0:
                short_positions += 1
        
        return PortfolioGreeks(
            portfolio_id=f"portfolio_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            timestamp=datetime.now(),
            total_delta=total_delta,
            total_gamma=total_gamma,
            total_vega=total_vega,
            total_theta=total_theta,
            total_rho=total_rho,
            delta_exposure=delta_exposure,
            gamma_exposure=gamma_exposure,
            vega_exposure=vega_exposure,
            number_of_positions=len(positions),
            long_positions=long_positions,
            short_positions=short_positions,
            total_portfolio_value=total_value,
            notional_exposure=notional_exposure
        )
    
    def analyze_gamma_risk(self, symbol: str, current_gamma: float, 
                          underlying_price: float, position_size: int,
                          price_shocks: List[float] = None) -> GammaRiskAnalysis:
        """
        Analyze gamma risk for a position
        
        Args:
            symbol: Warrant symbol
            current_gamma: Current gamma value
            underlying_price: Current underlying price
            position_size: Position size (shares)
            price_shocks: List of price shock scenarios (%)
            
        Returns:
            GammaRiskAnalysis with risk assessment
        """
        if price_shocks is None:
            price_shocks = [-0.10, -0.05, -0.02, 0.02, 0.05, 0.10]
        
        gamma_dollars = current_gamma * position_size * underlying_price
        
        # Calculate gamma P&L for each scenario
        gamma_pnl_scenarios = []
        for shock in price_shocks:
            price_change = underlying_price * shock
            gamma_pnl = 0.5 * current_gamma * (price_change ** 2) * position_size
            gamma_pnl_scenarios.append(gamma_pnl)
        
        max_gamma_loss = min(gamma_pnl_scenarios)
        
        # Assess risk level
        if abs(gamma_dollars) < 1000:
            risk_level = RiskLevel.LOW
        elif abs(gamma_dollars) < 10000:
            risk_level = RiskLevel.MEDIUM
        elif abs(gamma_dollars) < 50000:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL
        
        # Generate recommendations
        recommendations = []
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            recommendations.append("Consider reducing position size")
            recommendations.append("Implement more frequent delta rebalancing")
        
        if abs(max_gamma_loss) > 5000:
            recommendations.append("Gamma risk significant - monitor closely")
        
        return GammaRiskAnalysis(
            symbol=symbol,
            timestamp=datetime.now(),
            gamma=current_gamma,
            gamma_dollars=gamma_dollars,
            price_scenarios=price_shocks,
            gamma_pnl_scenarios=gamma_pnl_scenarios,
            max_gamma_loss=max_gamma_loss,
            risk_level=risk_level,
            hedge_recommendations=recommendations,
            rebalancing_frequency="daily" if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL] else "weekly",
            convexity_adjustment=gamma_dollars * 0.01,
            second_order_approximation=abs(max_gamma_loss)
        )
    
    def calculate_greeks_evolution(self, symbol: str, underlying_price: float,
                                   strike_price: float, current_maturity_days: int,
                                   volatility: float, risk_free_rate: float,
                                   option_type: str = 'c', dividend_yield: float = 0.0,
                                   time_steps: int = 20) -> GreeksEvolution:
        """
        Calculate how Greeks evolve as warrant approaches expiration
        
        Args:
            symbol: Warrant symbol
            underlying_price: Current underlying price
            strike_price: Strike price
            current_maturity_days: Current days to maturity
            volatility: Volatility
            risk_free_rate: Risk-free rate
            option_type: 'c' or 'p'
            dividend_yield: Dividend yield
            time_steps: Number of time steps to calculate
            
        Returns:
            GreeksEvolution showing Greeks over time
        """
        time_to_expiry_days = np.linspace(current_maturity_days, 0, time_steps).tolist()
        
        delta_evolution = []
        gamma_evolution = []
        vega_evolution = []
        theta_evolution = []
        
        for days in time_to_expiry_days:
            T = days / 365.0
            if T < 0.001:  # Near expiration
                T = 0.001
            
            result = self.pricer.price_with_greeks(
                S=underlying_price,
                K=strike_price,
                T=T,
                sigma=volatility,
                r=risk_free_rate,
                option_type=option_type,
                q=dividend_yield
            )
            
            delta_evolution.append(result.delta)
            gamma_evolution.append(result.gamma)
            vega_evolution.append(result.vega)
            theta_evolution.append(result.theta)
        
        # Find key inflection points
        gamma_peak_idx = np.argmax(gamma_evolution)
        gamma_peak_day = int(time_to_expiry_days[gamma_peak_idx])
        
        theta_accel_idx = np.argmin(theta_evolution)
        theta_acceleration_day = int(time_to_expiry_days[theta_accel_idx])
        
        # Identify high risk periods
        high_gamma_threshold = np.percentile(gamma_evolution, 75)
        high_gamma_periods = [int(days) for days, gamma in zip(time_to_expiry_days, gamma_evolution) 
                             if gamma > high_gamma_threshold]
        
        high_theta_threshold = np.percentile([abs(t) for t in theta_evolution], 75)
        high_theta_periods = [int(days) for days, theta in zip(time_to_expiry_days, theta_evolution) 
                             if abs(theta) > high_theta_threshold]
        
        return GreeksEvolution(
            symbol=symbol,
            calculation_date=datetime.now(),
            time_to_expiry_days=[int(d) for d in time_to_expiry_days],
            delta_evolution=delta_evolution,
            gamma_evolution=gamma_evolution,
            vega_evolution=vega_evolution,
            theta_evolution=theta_evolution,
            gamma_peak_day=gamma_peak_day,
            theta_acceleration_day=theta_acceleration_day,
            high_gamma_periods=high_gamma_periods,
            high_theta_periods=high_theta_periods
        ) 