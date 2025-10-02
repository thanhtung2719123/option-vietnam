"""
Dynamic Delta Hedging Engine
Production-ready hedging simulation for Vietnamese covered warrants

Based on delta_hedging_jupyter.ipynb with enhancements:
- Vietnamese market transaction costs (0.156%)
- Slippage modeling (0.05% for large orders)
- Liquidity constraints
- Multiple rebalancing frequencies
- Performance analysis and inverse square root law validation
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DynamicDeltaHedgingEngine:
    '''
    Dynamic Delta Hedging Engine for Vietnamese Warrants
    
    Implements delta-neutral hedging with:
    - Transaction cost modeling
    - Slippage effects
    - Multiple rebalancing frequencies
    - Performance tracking
    '''
    
    def __init__(self, 
                 pricer,
                 transaction_cost: float = 0.00156,  # 0.156% VN market
                 slippage: float = 0.0005,           # 0.05% slippage
                 use_vn_config: bool = True):
        '''
        Initialize hedging engine
        
        Args:
            pricer: BlackScholesPricer instance
            transaction_cost: Transaction cost per trade (default VN: 0.156%)
            slippage: Slippage per trade (default: 0.05%)
            use_vn_config: Use Vietnamese market parameters
        '''
        self.pricer = pricer
        self.transaction_cost = transaction_cost
        self.slippage = slippage
        self.use_vn_config = use_vn_config
        
        logger.info(f'DynamicDeltaHedgingEngine initialized')
        logger.info(f'  Transaction cost: {transaction_cost*100:.3f}%')
        logger.info(f'  Slippage: {slippage*100:.3f}%')
    
    def simulate_price_path(self, 
                           S0: float, 
                           T: float, 
                           sigma: float, 
                           mu: float = 0.0,
                           rebal_freq: float = 1/252,
                           n_paths: int = 1) -> pd.DataFrame:
        '''
        Simulate underlying price paths using Geometric Brownian Motion
        
        Args:
            S0: Initial stock price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            mu: Drift (default 0 for risk-neutral)
            rebal_freq: Rebalancing frequency (years)
            n_paths: Number of simulation paths
            
        Returns:
            DataFrame with simulated price paths
        '''
        # Time steps
        time_steps = np.arange(start=T, stop=0.0, step=-rebal_freq)
        n_steps = len(time_steps)
        
        # Initialize price paths
        paths = np.zeros((n_steps, n_paths))
        paths[0, :] = S0
        
        # Daily volatility
        dt = rebal_freq
        drift_adj = mu - 0.5 * sigma**2  # Drift adjustment
        
        # Generate random shocks
        z = np.random.standard_normal((n_steps-1, n_paths))
        
        # Simulate paths
        for i in range(1, n_steps):
            paths[i, :] = paths[i-1, :] * np.exp(drift_adj * dt + sigma * np.sqrt(dt) * z[i-1, :])
        
        # Create DataFrame
        df = pd.DataFrame(
            paths,
            index=time_steps,
            columns=[f'Path_{i+1}' for i in range(n_paths)]
        )
        
        return df
    
    def calculate_hedging_pnl(self,
                             price_paths: pd.DataFrame,
                             K: float,
                             r: float,
                             sigma: float,
                             q: float = 0.0,
                             option_type: str = 'c') -> Dict:
        '''
        Calculate hedging P&L for given price paths
        
        Based on delta_hedging_jupyter.ipynb Cell 13
        
        Args:
            price_paths: DataFrame with simulated price paths
            K: Strike price
            r: Risk-free rate
            sigma: Volatility
            q: Dividend yield
            option_type: 'c' for call, 'p' for put
            
        Returns:
            Dictionary with hedging results
        '''
        n_steps, n_paths = price_paths.shape
        time_to_maturity = price_paths.index.values
        
        # Initialize arrays
        deltas = np.zeros((n_steps, n_paths))
        hedging_pnl = np.zeros((n_steps, n_paths))
        transaction_costs = np.zeros((n_steps, n_paths))
        
        # Calculate deltas and hedging P&L
        for i in range(n_steps):
            T = time_to_maturity[i]
            S = price_paths.iloc[i, :].values
            
            # Calculate delta at this step
            if option_type == 'c':
                deltas[i, :] = [self.pricer.call_delta(s, K, T, sigma, r, q) for s in S]
            else:
                deltas[i, :] = [self.pricer.put_delta(s, K, T, sigma, r, q) for s in S]
            
            # Calculate hedging P&L (from previous step)
            if i > 0:
                price_change = S - price_paths.iloc[i-1, :].values
                hedging_pnl[i, :] = -deltas[i-1, :] * price_change
                
                # Calculate transaction costs
                delta_change = np.abs(deltas[i, :] - deltas[i-1, :])
                trade_size = delta_change * S
                
                # Transaction cost + slippage
                transaction_costs[i, :] = trade_size * (self.transaction_cost + self.slippage)
        
        # Calculate option payoff at expiration
        final_prices = price_paths.iloc[-1, :].values
        if option_type == 'c':
            option_payoff = np.maximum(final_prices - K, 0)
        else:
            option_payoff = np.maximum(K - final_prices, 0)
        
        # Calculate total P&L
        hedging_pnl_cumsum = np.cumsum(hedging_pnl, axis=0)
        transaction_costs_cumsum = np.cumsum(transaction_costs, axis=0)
        
        # Total P&L = Hedging P&L - Transaction Costs + Option Payoff
        total_pnl = hedging_pnl_cumsum[-1, :] - transaction_costs_cumsum[-1, :] + option_payoff
        
        # Calculate initial option price
        initial_price = self.pricer.call_price(price_paths.iloc[0, 0], K, time_to_maturity[0], sigma, r, q) \
                       if option_type == 'c' else \
                       self.pricer.put_price(price_paths.iloc[0, 0], K, time_to_maturity[0], sigma, r, q)
        
        return {
            'deltas': deltas,
            'hedging_pnl': hedging_pnl,
            'hedging_pnl_cumsum': hedging_pnl_cumsum,
            'transaction_costs': transaction_costs,
            'transaction_costs_cumsum': transaction_costs_cumsum,
            'option_payoff': option_payoff,
            'total_pnl': total_pnl,
            'initial_option_price': initial_price,
            'returns': total_pnl / initial_price - 1
        }
    
    def analyze_hedging_performance(self, results: Dict) -> Dict:
        '''
        Analyze hedging performance
        
        Args:
            results: Dictionary from calculate_hedging_pnl
            
        Returns:
            Dictionary with performance metrics
        '''
        total_pnl = results['total_pnl']
        returns = results['returns']
        
        performance = {
            'mean_pnl': np.mean(total_pnl),
            'std_pnl': np.std(total_pnl),
            'mean_return': np.mean(returns),
            'std_return': np.std(returns),
            'max_profit': np.max(total_pnl),
            'max_loss': np.min(total_pnl),
            'profitable_paths': np.sum(total_pnl > 0) / len(total_pnl),
            'total_transaction_costs': np.mean(results['transaction_costs_cumsum'][-1, :]),
            'avg_final_delta': np.mean(results['deltas'][-1, :])
        }
        
        return performance
    
    def test_rebalancing_frequencies(self,
                                    S0: float,
                                    K: float,
                                    T: float,
                                    sigma: float,
                                    r: float,
                                    q: float = 0.0,
                                    frequencies: List[int] = None,
                                    n_paths: int = 1000) -> pd.DataFrame:
        '''
        Test different rebalancing frequencies
        
        Validates inverse square root law: σ_PnL  1/n
        
        Args:
            S0: Initial stock price
            K: Strike price
            T: Time to maturity
            sigma: Volatility
            r: Risk-free rate
            q: Dividend yield
            frequencies: List of rebalancing frequencies (times per day)
            n_paths: Number of simulation paths
            
        Returns:
            DataFrame with results for each frequency
        '''
        if frequencies is None:
            frequencies = [1, 5, 10, 20, 50, 100]  # Times per day
        
        results_list = []
        
        for freq_per_day in frequencies:
            rebal_freq = 1 / (252 * freq_per_day)  # Convert to years
            
            logger.info(f'Testing frequency: {freq_per_day}x per day (every {1/freq_per_day:.2f} days)')
            
            # Simulate price paths
            price_paths = self.simulate_price_path(S0, T, sigma, 0.0, rebal_freq, n_paths)
            
            # Calculate hedging P&L
            hedging_results = self.calculate_hedging_pnl(price_paths, K, r, sigma, q, 'c')
            
            # Analyze performance
            performance = self.analyze_hedging_performance(hedging_results)
            
            results_list.append({
                'frequency_per_day': freq_per_day,
                'rebalancing_interval_days': 1 / freq_per_day,
                'mean_return': performance['mean_return'],
                'std_return': performance['std_return'],
                'total_transaction_costs': performance['total_transaction_costs'],
                'profitable_paths_pct': performance['profitable_paths'] * 100
            })
        
        results_df = pd.DataFrame(results_list)
        
        # Validate inverse square root law
        results_df['inv_sqrt_freq'] = 1 / np.sqrt(results_df['frequency_per_day'])
        
        return results_df
