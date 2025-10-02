"""
Taylor Series Analysis for Hedging Error Decomposition

This module provides mathematical analysis of hedging errors using Taylor series expansion.
It decomposes total hedging error into contributions from different Greeks.

Mathematical Foundation:
    Taylor Series Expansion of Option Price:
    ΔV ≈ Δ·ΔS + ½·Γ·(ΔS)² + Θ·Δt + ν·Δσ + ρ·Δr + ...
    
    Hedging Error Analysis:
    - Perfect delta hedge eliminates Δ·ΔS term
    - Residual error from:
      • Gamma contribution: ½·Γ·(ΔS)²
      • Theta decay: Θ·Δt
      • Vega: ν·Δσ
      • Rho: ρ·Δr
      • Higher-order terms

Vietnamese Market Application:
    - Analyze hedging performance for Vietnamese warrants
    - Optimize rebalancing frequency
    - Balance transaction costs vs hedging error
    - High-volatility adaptation (VN market: 83%-352%)
"""

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging
from dataclasses import dataclass
from scipy.optimize import minimize_scalar

logger = logging.getLogger(__name__)


@dataclass
class HedgingErrorAnalysis:
    """
    Comprehensive hedging error analysis result
    
    Attributes:
        total_error: Total hedging error
        delta_contribution: First-order (should be ~0 if hedged)
        gamma_contribution: Second-order Gamma term
        theta_contribution: Time decay contribution
        vega_contribution: Volatility change contribution
        rho_contribution: Interest rate contribution
        higher_order: Residual higher-order terms
        timestamp: Analysis timestamp
    """
    total_error: float
    delta_contribution: float
    gamma_contribution: float
    theta_contribution: float
    vega_contribution: float
    rho_contribution: float
    higher_order: float
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'total_error': self.total_error,
            'delta_contribution': self.delta_contribution,
            'gamma_contribution': self.gamma_contribution,
            'theta_contribution': self.theta_contribution,
            'vega_contribution': self.vega_contribution,
            'rho_contribution': self.rho_contribution,
            'higher_order': self.higher_order,
            'timestamp': self.timestamp.isoformat()
        }
    
    def get_percentage_breakdown(self) -> Dict:
        """Get percentage contribution of each term"""
        total_abs = abs(self.total_error)
        
        if total_abs < 1e-10:
            return {term: 0.0 for term in ['delta', 'gamma', 'theta', 'vega', 'rho', 'higher_order']}
        
        return {
            'delta_pct': abs(self.delta_contribution) / total_abs * 100,
            'gamma_pct': abs(self.gamma_contribution) / total_abs * 100,
            'theta_pct': abs(self.theta_contribution) / total_abs * 100,
            'vega_pct': abs(self.vega_contribution) / total_abs * 100,
            'rho_pct': abs(self.rho_contribution) / total_abs * 100,
            'higher_order_pct': abs(self.higher_order) / total_abs * 100
        }


@dataclass
class RebalancingOptimization:
    """
    Optimal rebalancing frequency analysis
    
    Attributes:
        optimal_frequency: Optimal rebalancing frequency (times per period)
        total_cost: Total cost (hedging error + transaction costs)
        hedging_error_cost: Cost from hedging errors
        transaction_cost: Total transaction costs
        cost_breakdown: Detailed cost components
    """
    optimal_frequency: float
    total_cost: float
    hedging_error_cost: float
    transaction_cost: float
    cost_breakdown: Dict
    timestamp: datetime


class TaylorSeriesAnalyzer:
    """
    Taylor Series Analysis for Hedging Error Decomposition
    
    This class provides comprehensive mathematical analysis of hedging strategies
    using Taylor series expansion of option prices.
    
    Key Features:
    - Hedging error decomposition into Greek components
    - Gamma contribution analysis (second-order effects)
    - Rebalancing frequency optimization
    - Transaction cost vs hedging error tradeoff
    - Mathematical validation of hedging strategies
    
    Based on delta_hedging_jupyter.ipynb methodology.
    """
    
    def __init__(self, transaction_cost_bps: float = 15.6):
        """
        Initialize Taylor Series Analyzer
        
        Args:
            transaction_cost_bps: Transaction cost in basis points (default: 15.6 for HOSE)
        """
        self.transaction_cost_bps = transaction_cost_bps
        self.transaction_cost_rate = transaction_cost_bps / 10000
        
        logger.info(f"TaylorSeriesAnalyzer initialized with {transaction_cost_bps} bps transaction cost")
    
    def decompose_hedging_error(self,
                               price_change: float,
                               vol_change: float,
                               time_change: float,
                               rate_change: float,
                               delta: float,
                               gamma: float,
                               theta: float,
                               vega: float,
                               rho: float,
                               actual_pnl: Optional[float] = None) -> HedgingErrorAnalysis:
        """
        Decompose hedging error using Taylor series expansion
        
        Taylor Series:
        ΔV ≈ Δ·ΔS + ½·Γ·(ΔS)² + Θ·Δt + ν·Δσ + ρ·Δr
        
        For delta-hedged position:
        Hedging Error = ΔV - Δ·ΔS (delta hedge eliminates first term)
                      ≈ ½·Γ·(ΔS)² + Θ·Δt + ν·Δσ + ρ·Δr
        
        Args:
            price_change: Change in underlying price (ΔS)
            vol_change: Change in volatility (Δσ)
            time_change: Time elapsed (Δt, in years)
            rate_change: Change in interest rate (Δr)
            delta: Delta (∂V/∂S)
            gamma: Gamma (∂²V/∂S²)
            theta: Theta (∂V/∂t)
            vega: Vega (∂V/∂σ)
            rho: Rho (∂V/∂r)
            actual_pnl: Actual P&L (optional, for validation)
            
        Returns:
            HedgingErrorAnalysis with decomposed contributions
        """
        # First-order (Delta) contribution
        delta_contrib = delta * price_change
        
        # Second-order (Gamma) contribution
        gamma_contrib = 0.5 * gamma * (price_change ** 2)
        
        # Time decay (Theta) contribution
        theta_contrib = theta * time_change
        
        # Volatility (Vega) contribution
        vega_contrib = vega * vol_change
        
        # Interest rate (Rho) contribution
        rho_contrib = rho * rate_change
        
        # Total Taylor series approximation
        taylor_total = delta_contrib + gamma_contrib + theta_contrib + vega_contrib + rho_contrib
        
        # Higher-order terms (if actual P&L provided)
        if actual_pnl is not None:
            higher_order = actual_pnl - taylor_total
        else:
            higher_order = 0.0
        
        # For delta-hedged position, total error excludes delta term
        hedging_error = taylor_total - delta_contrib
        
        analysis = HedgingErrorAnalysis(
            total_error=hedging_error,
            delta_contribution=delta_contrib,
            gamma_contribution=gamma_contrib,
            theta_contribution=theta_contrib,
            vega_contribution=vega_contrib,
            rho_contribution=rho_contrib,
            higher_order=higher_order,
            timestamp=datetime.now()
        )
        
        logger.info(f"Hedging error decomposed: Total={hedging_error:.4f}, "
                   f"Gamma={gamma_contrib:.4f}, Theta={theta_contrib:.4f}")
        
        return analysis
    
    def analyze_gamma_contribution(self,
                                   gamma: float,
                                   price_scenarios: np.ndarray,
                                   initial_price: float) -> Dict:
        """
        Detailed analysis of Gamma contribution to hedging error
        
        Gamma P&L = ½·Γ·(ΔS)²
        
        This is the primary source of hedging error in delta-neutral portfolios.
        
        Args:
            gamma: Gamma value
            price_scenarios: Simulated price paths (n_scenarios, n_steps)
            initial_price: Initial price
            
        Returns:
            Dictionary with Gamma analysis
        """
        # Calculate price changes
        price_changes = np.diff(price_scenarios, axis=1)
        
        # Gamma contribution at each step
        gamma_pnl = 0.5 * gamma * (price_changes ** 2)
        
        # Aggregate statistics
        cumulative_gamma_pnl = np.cumsum(gamma_pnl, axis=1)
        
        analysis = {
            'gamma': gamma,
            'mean_gamma_pnl_per_step': np.mean(gamma_pnl),
            'std_gamma_pnl_per_step': np.std(gamma_pnl),
            'total_gamma_pnl': np.mean(cumulative_gamma_pnl[:, -1]),
            'max_gamma_pnl': np.max(cumulative_gamma_pnl[:, -1]),
            'min_gamma_pnl': np.min(cumulative_gamma_pnl[:, -1]),
            'gamma_pnl_percentile_5': np.percentile(cumulative_gamma_pnl[:, -1], 5),
            'gamma_pnl_percentile_95': np.percentile(cumulative_gamma_pnl[:, -1], 95)
        }
        
        # Interpretation
        if gamma > 0:
            analysis['interpretation'] = 'Long Gamma: Benefits from volatility (convexity gain)'
        else:
            analysis['interpretation'] = 'Short Gamma: Loses from volatility (convexity loss)'
        
        logger.info(f"Gamma analysis: Mean P&L={analysis['mean_gamma_pnl_per_step']:.4f}, "
                   f"Total={analysis['total_gamma_pnl']:.4f}")
        
        return analysis
    
    def optimize_rebalancing_frequency(self,
                                      gamma: float,
                                      volatility: float,
                                      underlying_price: float,
                                      time_horizon: float = 1.0,
                                      max_frequency: int = 252) -> RebalancingOptimization:
        """
        Find optimal rebalancing frequency balancing error and costs
        
        Mathematical Framework:
        - Hedging error cost ∝ Γ·σ²·S²·T / n (decreases with frequency)
        - Transaction cost ∝ c·n (increases with frequency)
        - Optimal frequency minimizes total cost
        
        Inverse Square Root Law:
        Optimal n* ∝ √(Γ·σ²·S²·T / c)
        
        Args:
            gamma: Portfolio Gamma
            volatility: Volatility (annualized)
            underlying_price: Underlying asset price
            time_horizon: Time horizon in years
            max_frequency: Maximum rebalancing frequency
            
        Returns:
            RebalancingOptimization with optimal frequency and costs
        """
        logger.info("Optimizing rebalancing frequency...")
        
        def total_cost(n_rebalances):
            """Total cost function: hedging error + transaction costs"""
            if n_rebalances < 1:
                n_rebalances = 1
            
            # Hedging error cost (Gamma risk)
            # Expected squared price change between rebalances
            dt = time_horizon / n_rebalances
            expected_ds_squared = (volatility ** 2) * (underlying_price ** 2) * dt
            
            # Gamma P&L variance (approximation)
            gamma_error = abs(0.5 * gamma * expected_ds_squared * n_rebalances)
            
            # Transaction costs
            # Assuming we rebalance full position each time
            transaction_costs = self.transaction_cost_rate * abs(gamma * underlying_price) * n_rebalances
            
            return gamma_error + transaction_costs
        
        # Optimize using scipy
        result = minimize_scalar(
            total_cost,
            bounds=(1, max_frequency),
            method='bounded'
        )
        
        optimal_freq = result.x
        min_cost = result.fun
        
        # Calculate cost breakdown
        hedging_error = total_cost(optimal_freq) - self.transaction_cost_rate * abs(gamma * underlying_price) * optimal_freq
        transaction_cost = self.transaction_cost_rate * abs(gamma * underlying_price) * optimal_freq
        
        # Calculate costs at different frequencies for comparison
        freq_comparison = {}
        for freq in [1, 12, 52, 252]:  # Yearly, Monthly, Weekly, Daily
            if freq <= max_frequency:
                freq_comparison[f'{freq}_times'] = {
                    'total_cost': total_cost(freq),
                    'rebalancing_interval': f'{252/freq:.0f} days' if freq > 1 else '1 year'
                }
        
        optimization = RebalancingOptimization(
            optimal_frequency=optimal_freq,
            total_cost=min_cost,
            hedging_error_cost=hedging_error,
            transaction_cost=transaction_cost,
            cost_breakdown=freq_comparison,
            timestamp=datetime.now()
        )
        
        logger.info(f"Optimal rebalancing frequency: {optimal_freq:.1f} times per {time_horizon} years")
        logger.info(f"Total cost: {min_cost:.2f} (Error: {hedging_error:.2f}, TxnCost: {transaction_cost:.2f})")
        
        return optimization
    
    def validate_inverse_square_root_law(self,
                                        gammas: np.ndarray,
                                        volatilities: np.ndarray,
                                        prices: np.ndarray,
                                        rebalancing_frequencies: np.ndarray) -> Dict:
        """
        Validate inverse square root law for hedging frequency
        
        Theory: Optimal rebalancing frequency n* scales with √Γ
        
        This validates: n* ∝ √(Γ·σ²·S²)
        
        Args:
            gammas: Array of Gamma values
            volatilities: Array of volatilities
            prices: Array of prices
            rebalancing_frequencies: Array of optimal frequencies
            
        Returns:
            Dictionary with validation results
        """
        # Calculate theoretical scaling factor
        scaling_factors = np.sqrt(np.abs(gammas) * (volatilities ** 2) * (prices ** 2))
        
        # Normalize
        scaling_normalized = scaling_factors / np.mean(scaling_factors)
        freq_normalized = rebalancing_frequencies / np.mean(rebalancing_frequencies)
        
        # Calculate correlation
        correlation = np.corrcoef(scaling_normalized, freq_normalized)[0, 1]
        
        # Linear regression
        from scipy.stats import linregress
        slope, intercept, r_value, p_value, std_err = linregress(scaling_normalized, freq_normalized)
        
        validation = {
            'correlation': correlation,
            'r_squared': r_value ** 2,
            'slope': slope,
            'p_value': p_value,
            'validation_passed': correlation > 0.7 and p_value < 0.05,
            'interpretation': 'Inverse square root law validated' if correlation > 0.7 else 'Law not strongly supported'
        }
        
        logger.info(f"Inverse square root law validation: r²={r_value**2:.4f}, p={p_value:.4f}")
        
        return validation
    
    def analyze_hedging_strategy_performance(self,
                                           price_path: np.ndarray,
                                           option_values: np.ndarray,
                                           hedge_positions: np.ndarray,
                                           greeks_path: Dict[str, np.ndarray]) -> pd.DataFrame:
        """
        Analyze hedging strategy performance using Taylor series decomposition
        
        Args:
            price_path: Underlying price path (n_steps,)
            option_values: Option value path (n_steps,)
            hedge_positions: Delta hedge positions (n_steps,)
            greeks_path: Dictionary of Greeks over time
                - 'delta': Delta values (n_steps,)
                - 'gamma': Gamma values (n_steps,)
                - 'theta': Theta values (n_steps,)
                - 'vega': Vega values (n_steps,)
                - 'rho': Rho values (n_steps,)
                
        Returns:
            DataFrame with step-by-step error decomposition
        """
        n_steps = len(price_path) - 1
        
        results = []
        
        for t in range(n_steps):
            # Changes
            ds = price_path[t+1] - price_path[t]
            dv_actual = option_values[t+1] - option_values[t]
            dt = 1/252  # Daily time step
            
            # Greeks at time t
            delta_t = greeks_path['delta'][t]
            gamma_t = greeks_path['gamma'][t]
            theta_t = greeks_path['theta'][t]
            vega_t = greeks_path.get('vega', np.zeros(n_steps))[t]
            rho_t = greeks_path.get('rho', np.zeros(n_steps))[t]
            
            # Taylor series components
            delta_contrib = delta_t * ds
            gamma_contrib = 0.5 * gamma_t * (ds ** 2)
            theta_contrib = theta_t * dt
            
            # Approximated changes (assume vol and rate stable for now)
            vega_contrib = 0.0  # Would need volatility path
            rho_contrib = 0.0   # Would need rate path
            
            # Taylor approximation
            dv_taylor = delta_contrib + gamma_contrib + theta_contrib + vega_contrib + rho_contrib
            
            # Hedging P&L (delta hedged)
            hedge_pnl = -delta_t * ds  # Short underlying to hedge
            
            # Total hedging error
            hedging_error = dv_actual - hedge_pnl
            taylor_error = hedging_error - gamma_contrib - theta_contrib
            
            results.append({
                'step': t,
                'price': price_path[t],
                'price_change': ds,
                'option_value': option_values[t],
                'delta': delta_t,
                'gamma': gamma_t,
                'actual_option_change': dv_actual,
                'delta_contribution': delta_contrib,
                'gamma_contribution': gamma_contrib,
                'theta_contribution': theta_contrib,
                'taylor_approximation': dv_taylor,
                'hedge_pnl': hedge_pnl,
                'hedging_error': hedging_error,
                'taylor_error': taylor_error
            })
        
        df = pd.DataFrame(results)
        
        logger.info(f"Hedging strategy analyzed over {n_steps} steps")
        logger.info(f"Mean hedging error: {df['hedging_error'].mean():.4f}")
        logger.info(f"Mean Gamma contribution: {df['gamma_contribution'].mean():.4f}")
        
        return df
    
    def calculate_error_cost_tradeoff(self,
                                     gamma: float,
                                     volatility: float,
                                     underlying_price: float,
                                     time_horizon: float = 1.0,
                                     frequencies: Optional[List[int]] = None) -> pd.DataFrame:
        """
        Analyze tradeoff between hedging error and transaction costs
        
        Args:
            gamma: Portfolio Gamma
            volatility: Volatility (annualized)
            underlying_price: Underlying price
            time_horizon: Time horizon in years
            frequencies: List of rebalancing frequencies to analyze
            
        Returns:
            DataFrame with cost analysis for each frequency
        """
        if frequencies is None:
            # Default: Yearly, Quarterly, Monthly, Weekly, Daily
            frequencies = [1, 4, 12, 52, 252]
        
        results = []
        
        for n in frequencies:
            # Time between rebalances
            dt = time_horizon / n
            
            # Expected squared price change
            expected_ds_squared = (volatility ** 2) * (underlying_price ** 2) * dt
            
            # Gamma error (accumulated over all rebalances)
            gamma_error = abs(0.5 * gamma * expected_ds_squared * n)
            
            # Transaction costs
            # Each rebalance costs transaction_cost_rate × position_value
            position_value = abs(gamma * underlying_price)  # Approximate position size
            transaction_cost = self.transaction_cost_rate * position_value * n
            
            # Total cost
            total_cost = gamma_error + transaction_cost
            
            results.append({
                'rebalancing_frequency': n,
                'rebalancing_interval_days': 252 / n,
                'gamma_error_cost': gamma_error,
                'transaction_cost': transaction_cost,
                'total_cost': total_cost,
                'error_to_cost_ratio': gamma_error / transaction_cost if transaction_cost > 0 else np.inf
            })
        
        df = pd.DataFrame(results)
        df = df.sort_values('total_cost')
        
        logger.info(f"Cost tradeoff analyzed for {len(frequencies)} frequencies")
        
        return df
    
    def estimate_optimal_hedge_ratio(self,
                                     portfolio_gamma: float,
                                     hedge_instrument_gamma: float,
                                     transaction_cost_portfolio: float,
                                     transaction_cost_hedge: float) -> Dict:
        """
        Estimate optimal hedge ratio for Gamma hedging
        
        For a portfolio with Gamma exposure, we can hedge using instruments
        with known Gamma (e.g., options).
        
        Optimal ratio minimizes total risk-adjusted cost.
        
        Args:
            portfolio_gamma: Portfolio's net Gamma
            hedge_instrument_gamma: Gamma of hedging instrument
            transaction_cost_portfolio: Cost to adjust portfolio
            transaction_cost_hedge: Cost to trade hedge instrument
            
        Returns:
            Dictionary with optimal hedge ratio and analysis
        """
        # Optimal hedge ratio (gamma-neutral)
        if abs(hedge_instrument_gamma) < 1e-10:
            logger.warning("Hedge instrument has near-zero Gamma, cannot hedge")
            return {'hedge_ratio': 0, 'gamma_neutralized': False}
        
        optimal_ratio = -portfolio_gamma / hedge_instrument_gamma
        
        # Residual gamma after hedging
        residual_gamma = portfolio_gamma + optimal_ratio * hedge_instrument_gamma
        
        # Cost analysis
        hedge_cost = abs(optimal_ratio) * transaction_cost_hedge
        
        analysis = {
            'portfolio_gamma': portfolio_gamma,
            'hedge_instrument_gamma': hedge_instrument_gamma,
            'optimal_hedge_ratio': optimal_ratio,
            'residual_gamma': residual_gamma,
            'hedge_cost': hedge_cost,
            'gamma_reduction_pct': (1 - abs(residual_gamma) / abs(portfolio_gamma)) * 100 if portfolio_gamma != 0 else 0,
            'recommendation': 'Implement Gamma hedge' if abs(optimal_ratio) > 0.1 else 'Gamma exposure acceptable'
        }
        
        logger.info(f"Optimal hedge ratio: {optimal_ratio:.4f}, "
                   f"Gamma reduction: {analysis['gamma_reduction_pct']:.1f}%")
        
        return analysis
    
    def validate_hedging_strategy(self,
                                 simulated_pnl: np.ndarray,
                                 theoretical_pnl: np.ndarray,
                                 confidence_level: float = 0.95) -> Dict:
        """
        Validate hedging strategy by comparing simulated vs theoretical P&L
        
        Args:
            simulated_pnl: Simulated P&L from Monte Carlo
            theoretical_pnl: Theoretical P&L from Taylor series
            confidence_level: Confidence level for validation
            
        Returns:
            Dictionary with validation results
        """
        # Calculate errors
        errors = simulated_pnl - theoretical_pnl
        
        # Statistical tests
        mean_error = np.mean(errors)
        std_error = np.std(errors)
        
        # Confidence interval for mean error
        from scipy import stats
        ci = stats.t.interval(
            confidence_level,
            len(errors) - 1,
            loc=mean_error,
            scale=std_error / np.sqrt(len(errors))
        )
        
        # Correlation between simulated and theoretical
        correlation = np.corrcoef(simulated_pnl, theoretical_pnl)[0, 1]
        
        # Mean absolute percentage error
        mape = np.mean(np.abs(errors / (theoretical_pnl + 1e-10))) * 100
        
        validation = {
            'mean_error': mean_error,
            'std_error': std_error,
            'confidence_interval': ci,
            'correlation': correlation,
            'r_squared': correlation ** 2,
            'mape': mape,
            'validation_passed': abs(mean_error) < std_error and correlation > 0.9,
            'interpretation': 'Taylor approximation accurate' if correlation > 0.9 else 'Significant higher-order effects'
        }
        
        logger.info(f"Hedging validation: Correlation={correlation:.4f}, MAPE={mape:.2f}%")
        
        return validation
    
    def comprehensive_hedging_analysis(self,
                                      portfolio_greeks: Dict,
                                      price_scenarios: np.ndarray,
                                      initial_price: float,
                                      volatility: float,
                                      time_horizon: float = 1.0) -> Dict:
        """
        Comprehensive hedging analysis combining all methods
        
        Args:
            portfolio_greeks: Dictionary with portfolio Greeks
            price_scenarios: Simulated price scenarios
            initial_price: Initial underlying price
            volatility: Volatility
            time_horizon: Time horizon
            
        Returns:
            Dictionary with comprehensive analysis
        """
        logger.info("=" * 80)
        logger.info("COMPREHENSIVE HEDGING ANALYSIS")
        logger.info("=" * 80)
        
        # Extract Greeks
        gamma = portfolio_greeks.get('net_gamma', 0)
        delta = portfolio_greeks.get('net_delta', 0)
        theta = portfolio_greeks.get('net_theta', 0)
        vega = portfolio_greeks.get('net_vega', 0)
        
        # 1. Gamma contribution analysis
        gamma_analysis = self.analyze_gamma_contribution(
            gamma=gamma,
            price_scenarios=price_scenarios,
            initial_price=initial_price
        )
        
        # 2. Optimal rebalancing frequency
        rebalancing_opt = self.optimize_rebalancing_frequency(
            gamma=gamma,
            volatility=volatility,
            underlying_price=initial_price,
            time_horizon=time_horizon
        )
        
        # 3. Error breakdown at optimal frequency
        n_optimal = int(rebalancing_opt.optimal_frequency)
        dt = time_horizon / n_optimal
        
        # Simplified error decomposition
        price_changes = np.diff(price_scenarios, axis=1)
        mean_ds = np.mean(price_changes)
        std_ds = np.std(price_changes)
        
        error_analysis = self.decompose_hedging_error(
            price_change=std_ds,  # Use std as representative change
            vol_change=0.0,       # Simplified
            time_change=dt,
            rate_change=0.0,
            delta=delta,
            gamma=gamma,
            theta=theta,
            vega=vega,
            rho=0.0
        )
        
        # Comprehensive result
        analysis = {
            'portfolio_greeks': portfolio_greeks,
            'gamma_analysis': gamma_analysis,
            'optimal_rebalancing': rebalancing_opt,
            'error_decomposition': error_analysis.to_dict(),
            'error_breakdown_pct': error_analysis.get_percentage_breakdown(),
            'recommendations': self._generate_hedging_recommendations(
                gamma, rebalancing_opt, gamma_analysis
            ),
            'timestamp': datetime.now()
        }
        
        logger.info("Comprehensive hedging analysis complete")
        
        return analysis
    
    def _generate_hedging_recommendations(self,
                                        gamma: float,
                                        rebalancing_opt: RebalancingOptimization,
                                        gamma_analysis: Dict) -> List[str]:
        """
        Generate hedging strategy recommendations
        
        Args:
            gamma: Portfolio Gamma
            rebalancing_opt: Rebalancing optimization result
            gamma_analysis: Gamma contribution analysis
            
        Returns:
            List of recommendation strings
        """
        recommendations = []
        
        # Gamma-based recommendations
        if abs(gamma) > 1000:
            recommendations.append(
                f"HIGH Gamma exposure ({gamma:.0f}): Consider Gamma hedging with options"
            )
        
        # Frequency recommendations
        optimal_freq = rebalancing_opt.optimal_frequency
        if optimal_freq > 200:
            recommendations.append(
                "Optimal frequency suggests DAILY rebalancing"
            )
        elif optimal_freq > 40:
            recommendations.append(
                f"Optimal frequency suggests WEEKLY rebalancing ({252/optimal_freq:.0f} days)"
            )
        else:
            recommendations.append(
                f"Optimal frequency suggests MONTHLY rebalancing ({252/optimal_freq:.0f} days)"
            )
        
        # Cost recommendations
        error_cost = rebalancing_opt.hedging_error_cost
        txn_cost = rebalancing_opt.transaction_cost
        
        if txn_cost > error_cost * 2:
            recommendations.append(
                "Transaction costs dominate: Consider reducing rebalancing frequency"
            )
        elif error_cost > txn_cost * 2:
            recommendations.append(
                "Hedging errors dominate: Consider increasing rebalancing frequency"
            )
        else:
            recommendations.append(
                "Well-balanced error-cost tradeoff at optimal frequency"
            )
        
        # Gamma P&L interpretation
        mean_gamma_pnl = gamma_analysis.get('mean_gamma_pnl_per_step', 0)
        if gamma > 0 and mean_gamma_pnl > 0:
            recommendations.append(
                "Long Gamma profitable: Earning from volatility (convexity gains)"
            )
        elif gamma < 0 and mean_gamma_pnl < 0:
            recommendations.append(
                "Short Gamma losing: Volatility causing losses (convexity drag)"
            )
        
        return recommendations


# Convenience function
def quick_hedging_analysis(gamma: float, volatility: float, price: float,
                          transaction_cost_bps: float = 15.6) -> Dict:
    """
    Quick hedging analysis with default settings
    
    Args:
        gamma: Portfolio Gamma
        volatility: Volatility (annualized)
        price: Underlying price
        transaction_cost_bps: Transaction cost in bps
        
    Returns:
        Dictionary with optimal frequency and costs
    """
    analyzer = TaylorSeriesAnalyzer(transaction_cost_bps=transaction_cost_bps)
    optimization = analyzer.optimize_rebalancing_frequency(
        gamma=gamma,
        volatility=volatility,
        underlying_price=price
    )
    
    return {
        'optimal_frequency': optimization.optimal_frequency,
        'total_cost': optimization.total_cost,
        'recommendation': f"Rebalance {optimization.optimal_frequency:.0f} times per year"
    } 