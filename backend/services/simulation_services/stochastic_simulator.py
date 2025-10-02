"""
Stochastic Simulator using PyESG
Comprehensive scenario generation for Vietnamese warrant pricing and risk analysis

This module provides high-performance Monte Carlo simulation capabilities:
- Geometric Brownian Motion (GBM) for stock prices
- Heston stochastic volatility for realistic volatility dynamics
- Multi-asset correlated scenarios
- Optimized for large-scale simulations (10,000+ scenarios)

Mathematical Foundation:
    GBM: dS(t) = μS(t)dt + σS(t)dW(t)
    Heston Price: dS(t) = μS(t)dt + √v(t)S(t)dW₁(t)
    Heston Vol: dv(t) = κ(θ - v(t))dt + σ√v(t)dW₂(t)
    
Vietnamese Market:
    - Trading days: 252 per year
    - Time step: 1/252 (daily)
    - Optimized for warrant pricing
"""

import numpy as np
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Union
import logging
from dataclasses import dataclass
import pyesg

logger = logging.getLogger(__name__)


@dataclass
class SimulationConfig:
    """
    Configuration for Monte Carlo simulation
    
    Attributes:
        n_scenarios: Number of simulation paths
        n_steps: Number of time steps
        dt: Time step size (default: 1/252 for daily)
        random_seed: Random seed for reproducibility
    """
    n_scenarios: int = 10000
    n_steps: int = 252
    dt: float = 1/252
    random_seed: Optional[int] = None
    
    def __post_init__(self):
        """Validate configuration"""
        if self.n_scenarios < 1:
            raise ValueError(f"n_scenarios must be positive, got {self.n_scenarios}")
        if self.n_steps < 1:
            raise ValueError(f"n_steps must be positive, got {self.n_steps}")
        if self.dt <= 0:
            raise ValueError(f"dt must be positive, got {self.dt}")


@dataclass
class SimulationResult:
    """
    Container for simulation results
    
    Attributes:
        scenarios: Array of simulated paths (n_scenarios, n_steps+1)
        config: Simulation configuration used
        model_type: Type of stochastic model used
        timestamp: When simulation was run
    """
    scenarios: np.ndarray
    config: SimulationConfig
    model_type: str
    timestamp: datetime
    
    def get_terminal_values(self) -> np.ndarray:
        """Get final values from all scenarios"""
        return self.scenarios[:, -1]
    
    def get_statistics(self) -> Dict:
        """Get summary statistics of simulation"""
        terminal = self.get_terminal_values()
        
        return {
            'mean': np.mean(terminal),
            'median': np.median(terminal),
            'std': np.std(terminal),
            'min': np.min(terminal),
            'max': np.max(terminal),
            'percentile_5': np.percentile(terminal, 5),
            'percentile_95': np.percentile(terminal, 95)
        }


class StochasticSimulator:
    """
    High-performance Monte Carlo simulator using PyESG
    
    This class provides multiple stochastic process simulations:
    - Geometric Brownian Motion (constant volatility)
    - Heston stochastic volatility (realistic vol dynamics)
    - Multi-asset correlated scenarios
    
    Optimized for Vietnamese warrant pricing and risk analysis.
    """
    
    def __init__(self, config: Optional[SimulationConfig] = None):
        """
        Initialize stochastic simulator
        
        Args:
            config: Simulation configuration (uses defaults if None)
        """
        self.config = config or SimulationConfig()
        
        # Set random seed if provided
        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)
        
        logger.info(f"StochasticSimulator initialized: {self.config.n_scenarios} scenarios, "
                   f"{self.config.n_steps} steps")
    
    def simulate_gbm(self,
                    x0: float,
                    mu: float,
                    sigma: float,
                    n_scenarios: Optional[int] = None,
                    n_steps: Optional[int] = None) -> SimulationResult:
        """
        Simulate Geometric Brownian Motion scenarios
        
        Model: dS(t) = μS(t)dt + σS(t)dW(t)
        
        Args:
            x0: Initial value
            mu: Drift parameter
            sigma: Volatility parameter
            n_scenarios: Number of scenarios (uses config if None)
            n_steps: Number of steps (uses config if None)
            
        Returns:
            SimulationResult with price scenarios
        """
        n_scenarios = n_scenarios or self.config.n_scenarios
        n_steps = n_steps or self.config.n_steps
        
        logger.info(f"Simulating GBM: x0={x0}, mu={mu:.4f}, sigma={sigma:.4f}")
        
        # Create GBM process
        gbm = pyesg.GeometricBrownianMotion(mu=mu, sigma=sigma)
        
        # Generate scenarios
        scenarios = gbm.scenarios(
            x0=x0,
            dt=self.config.dt,
            n_scenarios=n_scenarios,
            n_steps=n_steps,
            random_state=self.config.random_seed
        )
        
        result = SimulationResult(
            scenarios=scenarios,
            config=self.config,
            model_type='GBM',
            timestamp=datetime.now()
        )
        
        logger.info(f"GBM simulation complete: {scenarios.shape}")
        
        return result
    
    def simulate_heston(self,
                       S0: float,
                       v0: float,
                       mu: float,
                       theta: float,
                       kappa: float,
                       sigma: float,
                       rho: float,
                       n_scenarios: Optional[int] = None,
                       n_steps: Optional[int] = None) -> Tuple[SimulationResult, SimulationResult]:
        """
        Simulate Heston stochastic volatility model
        
        Model:
            dS(t) = μS(t)dt + √v(t)S(t)dW₁(t)
            dv(t) = κ(θ - v(t))dt + σ√v(t)dW₂(t)
            E[dW₁ · dW₂] = ρ dt
        
        Args:
            S0: Initial stock price
            v0: Initial variance
            mu: Drift (expected return)
            theta: Long-term variance
            kappa: Mean reversion speed
            sigma: Volatility of volatility
            rho: Correlation between price and vol
            n_scenarios: Number of scenarios
            n_steps: Number of steps
            
        Returns:
            Tuple of (price_result, variance_result)
        """
        n_scenarios = n_scenarios or self.config.n_scenarios
        n_steps = n_steps or self.config.n_steps
        
        logger.info(f"Simulating Heston: S0={S0}, v0={v0:.4f}, mu={mu:.4f}, "
                   f"theta={theta:.4f}, kappa={kappa:.2f}, sigma={sigma:.2f}, rho={rho:.2f}")
        
        # Create Heston process
        heston = pyesg.HestonProcess(
            mu=mu,
            theta=theta,
            kappa=kappa,
            sigma=sigma,
            rho=rho
        )
        
        # Initial state: [price, variance]
        x0 = np.array([S0, v0])
        
        # Generate scenarios
        scenarios = heston.scenarios(
            x0=x0,
            dt=self.config.dt,
            n_scenarios=n_scenarios,
            n_steps=n_steps,
            random_state=self.config.random_seed
        )
        
        # Extract price and variance scenarios
        price_scenarios = scenarios[:, :, 0]
        variance_scenarios = scenarios[:, :, 1]
        
        price_result = SimulationResult(
            scenarios=price_scenarios,
            config=self.config,
            model_type='Heston_Price',
            timestamp=datetime.now()
        )
        
        variance_result = SimulationResult(
            scenarios=variance_scenarios,
            config=self.config,
            model_type='Heston_Variance',
            timestamp=datetime.now()
        )
        
        logger.info(f"Heston simulation complete: Price {price_scenarios.shape}, "
                   f"Variance {variance_scenarios.shape}")
        
        return price_result, variance_result
    
    def simulate_multi_asset(self,
                            initial_prices: np.ndarray,
                            mus: np.ndarray,
                            sigmas: np.ndarray,
                            correlation_matrix: np.ndarray,
                            n_scenarios: Optional[int] = None,
                            n_steps: Optional[int] = None) -> List[SimulationResult]:
        """
        Simulate multiple correlated assets using GBM
        
        Args:
            initial_prices: Array of initial prices for each asset
            mus: Array of drift parameters for each asset
            sigmas: Array of volatility parameters for each asset
            correlation_matrix: Correlation matrix between assets
            n_scenarios: Number of scenarios
            n_steps: Number of steps
            
        Returns:
            List of SimulationResult for each asset
        """
        n_scenarios = n_scenarios or self.config.n_scenarios
        n_steps = n_steps or self.config.n_steps
        n_assets = len(initial_prices)
        
        logger.info(f"Simulating {n_assets} correlated assets")
        
        # Validate correlation matrix
        if correlation_matrix.shape != (n_assets, n_assets):
            raise ValueError(f"Correlation matrix shape {correlation_matrix.shape} "
                           f"doesn't match number of assets {n_assets}")
        
        # Cholesky decomposition for correlation
        L = np.linalg.cholesky(correlation_matrix)
        
        # Generate correlated random numbers
        np.random.seed(self.config.random_seed)
        Z = np.random.standard_normal((n_scenarios, n_steps, n_assets))
        
        # Apply correlation
        correlated_Z = np.einsum('ijk,lk->ijl', Z, L)
        
        # Simulate each asset with correlated shocks
        results = []
        
        for i in range(n_assets):
            # Brownian increments
            dW = correlated_Z[:, :, i] * np.sqrt(self.config.dt)
            
            # GBM simulation
            scenarios = np.zeros((n_scenarios, n_steps + 1))
            scenarios[:, 0] = initial_prices[i]
            
            for t in range(n_steps):
                drift = mus[i] * self.config.dt
                diffusion = sigmas[i] * dW[:, t]
                scenarios[:, t+1] = scenarios[:, t] * np.exp(drift - 0.5 * sigmas[i]**2 * self.config.dt + diffusion)
            
            result = SimulationResult(
                scenarios=scenarios,
                config=self.config,
                model_type=f'MultiAsset_GBM_{i}',
                timestamp=datetime.now()
            )
            results.append(result)
        
        logger.info(f"Multi-asset simulation complete for {n_assets} assets")
        
        return results
    
    def price_european_option(self,
                             scenarios: np.ndarray,
                             strike: float,
                             option_type: str = 'call',
                             discount_factor: float = 1.0) -> Tuple[float, float]:
        """
        Price European option from simulated scenarios
        
        Args:
            scenarios: Price scenarios (n_scenarios, n_steps+1)
            strike: Strike price
            option_type: 'call' or 'put'
            discount_factor: Discount factor e^(-rT)
            
        Returns:
            Tuple of (option_price, standard_error)
        """
        # Get terminal values
        S_T = scenarios[:, -1]
        
        # Calculate payoffs
        if option_type.lower() in ['call', 'c']:
            payoffs = np.maximum(S_T - strike, 0)
        elif option_type.lower() in ['put', 'p']:
            payoffs = np.maximum(strike - S_T, 0)
        else:
            raise ValueError(f"Invalid option_type: {option_type}")
        
        # Discount payoffs
        discounted_payoffs = payoffs * discount_factor
        
        # Calculate price and standard error
        option_price = np.mean(discounted_payoffs)
        standard_error = np.std(discounted_payoffs) / np.sqrt(len(discounted_payoffs))
        
        return option_price, standard_error
    
    def calculate_greeks_finite_difference(self,
                                          S0: float,
                                          K: float,
                                          T: float,
                                          r: float,
                                          params: Dict,
                                          model: str = 'heston',
                                          bump_size: float = 0.01) -> Dict:
        """
        Calculate Greeks using finite difference method with Monte Carlo
        
        Args:
            S0: Initial stock price
            K: Strike price
            T: Time to maturity
            r: Risk-free rate
            params: Model parameters
            model: 'gbm' or 'heston'
            bump_size: Size of bump for finite difference
            
        Returns:
            Dictionary with Greeks estimates
        """
        discount_factor = np.exp(-r * T)
        n_steps = int(T / self.config.dt)
        
        # Base case
        if model == 'heston':
            price_result, var_result = self.simulate_heston(
                S0=S0, v0=params['v0'], mu=params['mu'],
                theta=params['theta'], kappa=params['kappa'],
                sigma=params['volvol'], rho=params['rho'],
                n_steps=n_steps
            )
            base_price, _ = self.price_european_option(
                price_result.scenarios, K, 'call', discount_factor
            )
        else:
            result = self.simulate_gbm(
                x0=S0, mu=params['mu'], sigma=params['sigma'],
                n_steps=n_steps
            )
            base_price, _ = self.price_european_option(
                result.scenarios, K, 'call', discount_factor
            )
        
        # Delta: bump spot price
        S_up = S0 * (1 + bump_size)
        if model == 'heston':
            price_result_up, _ = self.simulate_heston(
                S0=S_up, v0=params['v0'], mu=params['mu'],
                theta=params['theta'], kappa=params['kappa'],
                sigma=params['volvol'], rho=params['rho'],
                n_steps=n_steps
            )
            price_up, _ = self.price_european_option(
                price_result_up.scenarios, K, 'call', discount_factor
            )
        else:
            result_up = self.simulate_gbm(
                x0=S_up, mu=params['mu'], sigma=params['sigma'],
                n_steps=n_steps
            )
            price_up, _ = self.price_european_option(
                result_up.scenarios, K, 'call', discount_factor
            )
        
        delta = (price_up - base_price) / (S_up - S0)
        
        # Gamma: second derivative
        S_down = S0 * (1 - bump_size)
        if model == 'heston':
            price_result_down, _ = self.simulate_heston(
                S0=S_down, v0=params['v0'], mu=params['mu'],
                theta=params['theta'], kappa=params['kappa'],
                sigma=params['volvol'], rho=params['rho'],
                n_steps=n_steps
            )
            price_down, _ = self.price_european_option(
                price_result_down.scenarios, K, 'call', discount_factor
            )
        else:
            result_down = self.simulate_gbm(
                x0=S_down, mu=params['mu'], sigma=params['sigma'],
                n_steps=n_steps
            )
            price_down, _ = self.price_european_option(
                result_down.scenarios, K, 'call', discount_factor
            )
        
        gamma = (price_up - 2*base_price + price_down) / ((S0 * bump_size) ** 2)
        
        return {
            'price': base_price,
            'delta': delta,
            'gamma': gamma,
            'model': model
        }


class ScenarioGenerator:
    """
    Scenario generation for stress testing and risk analysis
    
    This class generates specific market scenarios:
    - Bull market scenarios
    - Bear market scenarios
    - Volatility spike scenarios
    - Custom scenarios
    """
    
    def __init__(self, simulator: StochasticSimulator):
        """
        Initialize scenario generator
        
        Args:
            simulator: StochasticSimulator instance
        """
        self.simulator = simulator
        logger.info("ScenarioGenerator initialized")
    
    def generate_stress_scenarios(self,
                                  S0: float,
                                  base_mu: float,
                                  base_sigma: float) -> Dict[str, SimulationResult]:
        """
        Generate predefined stress test scenarios
        
        Args:
            S0: Initial price
            base_mu: Base drift
            base_sigma: Base volatility
            
        Returns:
            Dictionary of scenario name -> SimulationResult
        """
        scenarios = {}
        
        # 1. Normal Market
        scenarios['normal'] = self.simulator.simulate_gbm(
            x0=S0, mu=base_mu, sigma=base_sigma
        )
        
        # 2. Bull Market (+20% drift, -20% vol)
        scenarios['bull'] = self.simulator.simulate_gbm(
            x0=S0, mu=base_mu * 1.2, sigma=base_sigma * 0.8
        )
        
        # 3. Bear Market (-30% drift, +50% vol)
        scenarios['bear'] = self.simulator.simulate_gbm(
            x0=S0, mu=base_mu * 0.7, sigma=base_sigma * 1.5
        )
        
        # 4. High Volatility (same drift, +100% vol)
        scenarios['high_vol'] = self.simulator.simulate_gbm(
            x0=S0, mu=base_mu, sigma=base_sigma * 2.0
        )
        
        # 5. Crash (-50% drift, +200% vol)
        scenarios['crash'] = self.simulator.simulate_gbm(
            x0=S0, mu=base_mu * 0.5, sigma=base_sigma * 3.0
        )
        
        logger.info(f"Generated {len(scenarios)} stress test scenarios")
        
        return scenarios
    
    def rank_scenarios(self,
                      scenarios: Dict[str, SimulationResult],
                      metric: str = 'final_value') -> pd.DataFrame:
        """
        Rank scenarios by specified metric
        
        Args:
            scenarios: Dictionary of scenarios
            metric: Ranking metric ('final_value', 'volatility', 'drawdown')
            
        Returns:
            DataFrame with ranked scenarios
        """
        ranking = []
        
        for name, result in scenarios.items():
            stats = result.get_statistics()
            
            ranking.append({
                'scenario': name,
                'mean_final': stats['mean'],
                'median_final': stats['median'],
                'std': stats['std'],
                'min': stats['min'],
                'max': stats['max'],
                'percentile_5': stats['percentile_5'],
                'percentile_95': stats['percentile_95']
            })
        
        df = pd.DataFrame(ranking)
        
        if metric == 'final_value':
            df = df.sort_values('mean_final', ascending=False)
        elif metric == 'volatility':
            df = df.sort_values('std', ascending=False)
        
        return df


# Convenience functions
def quick_gbm_simulation(S0: float, mu: float, sigma: float, 
                        T: float = 1.0, n_scenarios: int = 10000) -> np.ndarray:
    """
    Quick GBM simulation with default settings
    
    Args:
        S0: Initial price
        mu: Drift
        sigma: Volatility
        T: Time horizon in years
        n_scenarios: Number of scenarios
        
    Returns:
        Array of simulated price paths
    """
    config = SimulationConfig(n_scenarios=n_scenarios, n_steps=int(T*252))
    simulator = StochasticSimulator(config=config)
    result = simulator.simulate_gbm(S0, mu, sigma)
    return result.scenarios


def quick_heston_simulation(S0: float, v0: float, mu: float, theta: float,
                           kappa: float, sigma: float, rho: float,
                           T: float = 1.0, n_scenarios: int = 10000) -> Tuple[np.ndarray, np.ndarray]:
    """
    Quick Heston simulation with default settings
    
    Args:
        S0: Initial price
        v0: Initial variance
        mu: Drift
        theta: Long-term variance
        kappa: Mean reversion
        sigma: Vol of vol
        rho: Correlation
        T: Time horizon
        n_scenarios: Number of scenarios
        
    Returns:
        Tuple of (price_scenarios, variance_scenarios)
    """
    config = SimulationConfig(n_scenarios=n_scenarios, n_steps=int(T*252))
    simulator = StochasticSimulator(config=config)
    price_result, var_result = simulator.simulate_heston(
        S0, v0, mu, theta, kappa, sigma, rho
    )
    return price_result.scenarios, var_result.scenarios 