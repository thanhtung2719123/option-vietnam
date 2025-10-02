"""
Black-Scholes Options Pricing Engine
Production-ready implementation for Vietnamese covered warrants

Based on delta_hedging_jupyter.ipynb with enhancements:
- Complete Greeks calculation (Delta, Gamma, Vega, Theta, Rho)
- Implied volatility using py_vollib
- Dividend adjustments for Vietnamese market
- Error handling and validation
- Vietnamese market calibration
"""

import numpy as np
import logging
from scipy.stats import norm
from typing import Dict, Optional, Tuple
from datetime import datetime, date
from dataclasses import dataclass

# Try to import py_vollib for implied volatility
try:
    from py_vollib.black_scholes import black_scholes as bs_price
    from py_vollib.black_scholes.implied_volatility import implied_volatility as bs_iv
    from py_vollib.black_scholes.greeks import analytical as greeks
    PY_VOLLIB_AVAILABLE = True
except ImportError:
    PY_VOLLIB_AVAILABLE = False
    logging.warning("py_vollib not available. Using built-in implementations only.")

# Import VNMarketConfig - try local first, then root
try:
    from backend.config.vn_market_config import VNMarketConfig
except ImportError:
    try:
        import sys
        import os
        # Add project root to path
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../'))
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
        from config.vn_market_config import VNMarketConfig
    except ImportError:
        # Fallback: use relative import from backend
        from ...config.vn_market_config import VNMarketConfig

logger = logging.getLogger(__name__)


@dataclass
class BSPricingResult:
    """Results from Black-Scholes pricing calculation"""
    price: float
    delta: float
    gamma: float
    vega: float
    theta: float
    rho: float
    
    # Additional metrics
    intrinsic_value: float
    time_value: float
    moneyness: float  # S/K
    
    # Calculation metadata
    calculation_method: str
    timestamp: datetime
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'price': self.price,
            'delta': self.delta,
            'gamma': self.gamma,
            'vega': self.vega,
            'theta': self.theta,
            'rho': self.rho,
            'intrinsic_value': self.intrinsic_value,
            'time_value': self.time_value,
            'moneyness': self.moneyness,
            'calculation_method': self.calculation_method,
            'timestamp': self.timestamp.isoformat()
        }


class BlackScholesPricer:
    """
    Black-Scholes options pricing engine
    
    Implements analytical Black-Scholes-Merton model with:
    - European call and put pricing
    - Complete Greeks calculation
    - Dividend yield adjustments
    - Implied volatility calculation
    - Vietnamese market calibration
    
    Reference: delta_hedging_jupyter.ipynb
    """
    
    def __init__(self, use_vn_config: bool = True):
        """
        Initialize Black-Scholes pricer
        
        Args:
            use_vn_config: Use Vietnamese market configuration for default parameters
        """
        self.use_vn_config = use_vn_config
        self.vn_config = VNMarketConfig() if use_vn_config else None
        
        # Default parameters
        self.default_risk_free_rate = 0.04
        if use_vn_config:
            self.default_risk_free_rate = self.vn_config.get_risk_free_rate()
        
        logger.info(f"BlackScholesPricer initialized (VN config: {use_vn_config})")
    
    def _validate_inputs(self, S: float, K: float, T: float, sigma: float, r: float) -> None:
        """
        Validate pricing inputs
        
        Args:
            S: Underlying price
            K: Strike price
            T: Time to maturity
            sigma: Volatility
            r: Risk-free rate
            
        Raises:
            ValueError: If inputs are invalid
        """
        if S <= 0:
            raise ValueError(f"Underlying price must be positive, got {S}")
        if K <= 0:
            raise ValueError(f"Strike price must be positive, got {K}")
        if T < 0:
            raise ValueError(f"Time to maturity cannot be negative, got {T}")
        if sigma < 0:
            raise ValueError(f"Volatility cannot be negative, got {sigma}")
        if not -0.5 <= r <= 0.5:
            raise ValueError(f"Risk-free rate seems unrealistic: {r}")
    
    def _d1_d2(self, S: float, K: float, r: float, T: float, sigma: float, q: float = 0.0) -> Tuple[float, float]:
        """
        Calculate d1 and d2 for Black-Scholes formula
        
        Args:
            S: Underlying price
            K: Strike price
            r: Risk-free rate
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Tuple of (d1, d2)
        """
        if T == 0:
            # At expiration, handle edge case
            return (float('inf') if S > K else float('-inf'), 
                    float('inf') if S > K else float('-inf'))
        
        # Black-Scholes-Merton formula with dividend yield
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        return d1, d2
    
    def call_price(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate European call option price using Black-Scholes formula
        
        Based on delta_hedging_jupyter.ipynb implementation
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous, annualized)
            
        Returns:
            Call option price
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        # Handle expiration
        if T == 0:
            return max(S - K, 0)
        
        # Calculate d1 and d2
        d1, d2 = self._d1_d2(S, K, r, T, sigma, q)
        
        # Black-Scholes formula with dividend yield
        call_value = (S * np.exp(-q * T) * norm.cdf(d1) - 
                     K * np.exp(-r * T) * norm.cdf(d2))
        
        return call_value
    
    def put_price(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate European put option price using Black-Scholes formula
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous, annualized)
            
        Returns:
            Put option price
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        # Handle expiration
        if T == 0:
            return max(K - S, 0)
        
        # Calculate d1 and d2
        d1, d2 = self._d1_d2(S, K, r, T, sigma, q)
        
        # Black-Scholes formula with dividend yield
        put_value = (K * np.exp(-r * T) * norm.cdf(-d2) - 
                    S * np.exp(-q * T) * norm.cdf(-d1))
        
        return put_value
    
    def call_delta(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate delta for European call option
        
        Delta = ∂V/∂S (first derivative of option value with respect to underlying price)
        Based on delta_hedging_jupyter.ipynb
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Call delta (between 0 and 1)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 1.0 if S > K else 0.0
        
        d1, _ = self._d1_d2(S, K, r, T, sigma, q)
        delta = np.exp(-q * T) * norm.cdf(d1)
        
        return delta
    
    def put_delta(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate delta for European put option
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Put delta (between -1 and 0)
        """
        # Put delta = call delta - e^(-qT)
        return self.call_delta(S, K, T, sigma, r, q) - np.exp(-q * T)
    
    def gamma(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate gamma (same for call and put)
        
        Gamma = ∂²V/∂S² (second derivative of option value)
        Measures delta sensitivity to underlying price changes
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Gamma
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        d1, _ = self._d1_d2(S, K, r, T, sigma, q)
        gamma_value = (np.exp(-q * T) * norm.pdf(d1)) / (S * sigma * np.sqrt(T))
        
        return gamma_value
    
    def vega(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate vega (same for call and put)
        
        Vega = ∂V/∂σ (sensitivity to volatility changes)
        Measures option value change for 1% volatility change
        
        NOTE: Vega scales with spot price. For Vietnamese stocks (VND 100,000):
        - Raw formula gives very large numbers
        - We normalize by dividing by 100 to get "per 1% vol change"
        
        Args:
            S: Current underlying price (in VND)
            K: Strike price (in VND)
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Vega per 1% volatility change (practical units)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        d1, _ = self._d1_d2(S, K, r, T, sigma, q)
        # Vega formula: S × φ(d₁) × √T
        # Divide by 100 to get "per 1% volatility change" 
        # This makes the number more interpretable for large VND prices
        vega_value = S * np.exp(-q * T) * norm.pdf(d1) * np.sqrt(T) / 100
        
        return vega_value
    
    def call_theta(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate theta for European call option
        
        Theta = ∂V/∂t (time decay)
        Measures option value change per day (returned as per day)
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Theta (per day)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        d1, d2 = self._d1_d2(S, K, r, T, sigma, q)
        
        theta_value = (
            -S * np.exp(-q * T) * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
            - r * K * np.exp(-r * T) * norm.cdf(d2)
            + q * S * np.exp(-q * T) * norm.cdf(d1)
        ) / 365  # Convert to per day
        
        return theta_value
    
    def put_theta(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate theta for European put option
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Theta (per day)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        d1, d2 = self._d1_d2(S, K, r, T, sigma, q)
        
        theta_value = (
            -S * np.exp(-q * T) * norm.pdf(d1) * sigma / (2 * np.sqrt(T))
            + r * K * np.exp(-r * T) * norm.cdf(-d2)
            - q * S * np.exp(-q * T) * norm.cdf(-d1)
        ) / 365  # Convert to per day
        
        return theta_value
    
    def call_rho(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate rho for European call option
        
        Rho = ∂V/∂r (interest rate sensitivity)
        Measures option value change for 1% interest rate change
        
        NOTE: Rho scales with strike price. For Vietnamese strikes (VND 100,000):
        - Raw formula gives very large numbers
        - We normalize by dividing by 100 to get "per 1% rate change"
        
        Args:
            S: Current underlying price (in VND)
            K: Strike price (in VND)
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Rho per 1% interest rate change (practical units)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        _, d2 = self._d1_d2(S, K, r, T, sigma, q)
        # Rho formula: K × T × e^(-rT) × N(d₂)
        # Divide by 100 to get "per 1% rate change"
        rho_value = K * T * np.exp(-r * T) * norm.cdf(d2) / 100
        
        return rho_value
    
    def put_rho(self, S: float, K: float, T: float, sigma: float, r: float, q: float = 0.0) -> float:
        """
        Calculate rho for European put option
        
        NOTE: Rho scales with strike price. Normalized for practical use.
        
        Args:
            S: Current underlying price (in VND)
            K: Strike price (in VND)
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            q: Dividend yield (continuous)
            
        Returns:
            Rho per 1% interest rate change (practical units)
        """
        self._validate_inputs(S, K, T, sigma, r)
        
        if T == 0:
            return 0.0
        
        _, d2 = self._d1_d2(S, K, r, T, sigma, q)
        # Divide by 100 to get "per 1% rate change"
        rho_value = -K * T * np.exp(-r * T) * norm.cdf(-d2) / 100
        
        return rho_value
    
    def implied_volatility(self, option_price: float, S: float, K: float, T: float, r: float, 
                          option_type: str = 'c', q: float = 0.0, 
                          method: str = 'newton') -> Optional[float]:
        """
        Calculate implied volatility from option price
        
        Uses py_vollib if available, otherwise falls back to Newton-Raphson
        
        Args:
            option_price: Observed option price
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            r: Risk-free rate (annualized)
            option_type: 'c' for call, 'p' for put
            q: Dividend yield (continuous)
            method: 'vollib' or 'newton'
            
        Returns:
            Implied volatility or None if calculation fails
        """
        if PY_VOLLIB_AVAILABLE and method == 'vollib':
            try:
                iv = bs_iv(option_price, S, K, T, r, option_type.lower())
                return iv
            except Exception as e:
                logger.warning(f"py_vollib IV calculation failed: {e}. Falling back to Newton-Raphson")
        
        # Newton-Raphson method
        return self._implied_vol_newton(option_price, S, K, T, r, option_type, q)
    
    def _implied_vol_newton(self, target_price: float, S: float, K: float, T: float, r: float,
                           option_type: str = 'c', q: float = 0.0, 
                           max_iterations: int = 100, tolerance: float = 1e-6) -> Optional[float]:
        """
        Calculate implied volatility using Newton-Raphson method
        
        Args:
            target_price: Target option price
            S: Underlying price
            K: Strike price
            T: Time to maturity
            r: Risk-free rate
            option_type: 'c' or 'p'
            q: Dividend yield
            max_iterations: Maximum iterations
            tolerance: Convergence tolerance
            
        Returns:
            Implied volatility or None
        """
        # Initial guess (ATM volatility)
        sigma = 0.3
        
        for i in range(max_iterations):
            # Calculate price and vega at current sigma
            if option_type.lower() == 'c':
                price = self.call_price(S, K, T, sigma, r, q)
            else:
                price = self.put_price(S, K, T, sigma, r, q)
            
            vega_value = self.vega(S, K, T, sigma, r, q) * 100  # Convert back to decimal
            
            # Check convergence
            price_diff = target_price - price
            if abs(price_diff) < tolerance:
                return sigma
            
            # Newton-Raphson update
            if vega_value < 1e-10:
                logger.warning("Vega too small for IV calculation")
                return None
            
            sigma = sigma + price_diff / vega_value
            
            # Keep sigma positive and reasonable
            sigma = max(0.001, min(sigma, 5.0))
        
        logger.warning(f"IV calculation did not converge after {max_iterations} iterations")
        return sigma
    
    def price_with_greeks(self, S: float, K: float, T: float, sigma: float, r: float,
                         option_type: str = 'c', q: float = 0.0) -> BSPricingResult:
        """
        Calculate option price and all Greeks in one call
        
        Args:
            S: Current underlying price
            K: Strike price
            T: Time to maturity (years)
            sigma: Volatility (annualized)
            r: Risk-free rate (annualized)
            option_type: 'c' for call, 'p' for put
            q: Dividend yield (continuous)
            
        Returns:
            BSPricingResult with price and all Greeks
        """
        is_call = option_type.lower() == 'c'
        
        # Price
        price = self.call_price(S, K, T, sigma, r, q) if is_call else self.put_price(S, K, T, sigma, r, q)
        
        # Greeks (gamma and vega same for call and put)
        delta = self.call_delta(S, K, T, sigma, r, q) if is_call else self.put_delta(S, K, T, sigma, r, q)
        gamma_value = self.gamma(S, K, T, sigma, r, q)
        vega_value = self.vega(S, K, T, sigma, r, q)
        theta = self.call_theta(S, K, T, sigma, r, q) if is_call else self.put_theta(S, K, T, sigma, r, q)
        rho = self.call_rho(S, K, T, sigma, r, q) if is_call else self.put_rho(S, K, T, sigma, r, q)
        
        # Additional metrics
        intrinsic = max(S - K, 0) if is_call else max(K - S, 0)
        time_value = price - intrinsic
        moneyness = S / K
        
        return BSPricingResult(
            price=price,
            delta=delta,
            gamma=gamma_value,
            vega=vega_value,
            theta=theta,
            rho=rho,
            intrinsic_value=intrinsic,
            time_value=time_value,
            moneyness=moneyness,
            calculation_method='black_scholes_analytical',
            timestamp=datetime.now()
        )
    
    def price_vietnamese_warrant(self, warrant_code: str, underlying_price: float, 
                                strike_price: float, maturity_date: date,
                                conversion_ratio: float = 1.0, volatility: Optional[float] = None,
                                dividend_yield: float = 0.0) -> Dict:
        """
        Price a Vietnamese covered warrant with market-specific adjustments
        
        Args:
            warrant_code: Warrant symbol
            underlying_price: Current underlying stock price
            strike_price: Warrant strike price
            maturity_date: Warrant maturity date
            conversion_ratio: Conversion ratio (default 1:1)
            volatility: Volatility override (uses VN benchmark if None)
            dividend_yield: Annual dividend yield
            
        Returns:
            Dictionary with pricing results
        """
        # Calculate time to maturity
        today = date.today()
        days_to_maturity = (maturity_date - today).days
        T = days_to_maturity / 365.0
        
        if T < 0:
            raise ValueError(f"Warrant {warrant_code} has already expired")
        
        # Use Vietnamese market parameters
        r = self.default_risk_free_rate
        
        if volatility is None:
            # Use Vietnamese market volatility benchmark
            volatility = self.vn_config.VOLATILITY_BENCHMARKS['warrant_implied_avg'] if self.use_vn_config else 0.30
        
        # Adjust prices for conversion ratio
        adjusted_strike = strike_price * conversion_ratio
        
        # Price the warrant (Vietnamese warrants are typically calls)
        result = self.price_with_greeks(
            S=underlying_price,
            K=adjusted_strike,
            T=T,
            sigma=volatility,
            r=r,
            option_type='c',
            q=dividend_yield
        )
        
        # Adjust price back for conversion ratio
        warrant_price = result.price / conversion_ratio
        
        return {
            'warrant_code': warrant_code,
            'warrant_price': warrant_price,
            'underlying_price': underlying_price,
            'strike_price': strike_price,
            'conversion_ratio': conversion_ratio,
            'days_to_maturity': days_to_maturity,
            'time_to_maturity_years': T,
            'volatility': volatility,
            'risk_free_rate': r,
            'dividend_yield': dividend_yield,
            'greeks': {
                'delta': result.delta / conversion_ratio,
                'gamma': result.gamma / conversion_ratio,
                'vega': result.vega / conversion_ratio,
                'theta': result.theta / conversion_ratio,
                'rho': result.rho / conversion_ratio
            },
            'intrinsic_value': result.intrinsic_value / conversion_ratio,
            'time_value': result.time_value / conversion_ratio,
            'moneyness': result.moneyness,
            'timestamp': result.timestamp.isoformat()
        } 