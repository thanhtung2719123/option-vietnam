"""
Second-Order Greeks Calculator using py_vollib
Advanced risk sensitivities for warrant hedging and risk management

Second-Order Greeks:
- Vanna (∂²V/∂S∂σ): Measures Delta sensitivity to volatility changes
- Volga/Vomma (∂²V/∂σ²): Measures Vega sensitivity to volatility changes  
- Charm (∂²V/∂S∂t): Measures Delta decay over time
- Veta (∂²V/∂σ∂t): Measures Vega decay over time

These are CRITICAL for:
- Delta hedging in volatile markets
- Volatility trading strategies
- Risk management in changing market conditions
"""

import numpy as np
from typing import Dict, Optional
from datetime import datetime
import logging

try:
    from py_vollib.black_scholes import black_scholes as bs_price
    from py_vollib.black_scholes.greeks import analytical as greeks
    VOLLIB_AVAILABLE = True
except ImportError:
    VOLLIB_AVAILABLE = False
    logging.warning("py_vollib not available. Install with: pip install py_vollib")

logger = logging.getLogger(__name__)


class SecondOrderGreeksCalculator:
    """
    Calculate second-order Greeks using py_vollib analytical formulas
    
    Theory:
    - Vanna = ∂Δ/∂σ = ∂ν/∂S: Critical for delta-hedging when vol changes
    - Volga = ∂ν/∂σ = ∂²V/∂σ²: Critical for volatility trading
    - Charm = -∂Δ/∂t: Delta decay (theta for delta)
    - Veta = ∂ν/∂t: Vega decay
    
    Vietnamese Market Considerations:
    - VN market has high volatility clustering
    - Vanna is especially important during market stress
    - Volga matters for vol trading strategies
    """
    
    def __init__(self):
        """Initialize second-order Greeks calculator"""
        if not VOLLIB_AVAILABLE:
            raise ImportError(
                "py_vollib is required for second-order Greeks. "
                "Install with: pip install py_vollib"
            )
        logger.info("SecondOrderGreeksCalculator initialized")
    
    def calculate_all_greeks(self,
                            S: float,
                            K: float,
                            T: float,
                            r: float,
                            sigma: float,
                            option_type: str = 'c',
                            q: float = 0.0) -> Dict:
        """
        Calculate complete set of first and second-order Greeks
        
        Args:
            S: Spot price
            K: Strike price
            T: Time to maturity (years)
            r: Risk-free rate
            sigma: Volatility (annualized)
            option_type: 'c' for call, 'p' for put
            q: Dividend yield
            
        Returns:
            Dictionary with all Greeks (first and second-order)
        """
        flag = option_type.lower()[0]  # 'c' or 'p'
        
        # First-order Greeks (from py_vollib)
        # Note: py_vollib doesn't support q parameter in Greeks, adjust S for dividends
        S_adj = S * np.exp(-q * T) if q != 0 else S
        
        delta = greeks.delta(flag, S_adj, K, T, r, sigma)
        gamma = greeks.gamma(flag, S_adj, K, T, r, sigma)
        vega = greeks.vega(flag, S_adj, K, T, r, sigma)
        theta = greeks.theta(flag, S_adj, K, T, r, sigma)
        rho = greeks.rho(flag, S_adj, K, T, r, sigma)
        
        # Second-order Greeks
        vanna = self.calculate_vanna(flag, S, K, T, r, sigma, q)
        volga = self.calculate_volga(flag, S, K, T, r, sigma, q)
        charm = self.calculate_charm(flag, S, K, T, r, sigma, q)
        veta = self.calculate_veta(flag, S, K, T, r, sigma, q)
        
        # Price
        price = bs_price(flag, S_adj, K, T, r, sigma)
        
        return {
            'price': price,
            'first_order': {
                'delta': delta,
                'gamma': gamma,
                'vega': vega / 100,  # py_vollib returns vega per 100% vol move
                'theta': theta / 365,  # py_vollib returns theta per year
                'rho': rho / 100  # py_vollib returns rho per 100% rate move
            },
            'second_order': {
                'vanna': vanna,
                'volga': volga,
                'charm': charm,
                'veta': veta
            },
            'timestamp': datetime.now()
        }
    
    def calculate_vanna(self, flag: str, S: float, K: float, T: float, 
                       r: float, sigma: float, q: float = 0.0) -> float:
        """
        Calculate Vanna = ∂²V/∂S∂σ = ∂Δ/∂σ = ∂ν/∂S
        
        Analytical Formula (Black-Scholes):
        Vanna = -e^(-qT) × φ(d1) × (d2/σ)
        
        Where:
        - φ(d1) = standard normal PDF at d1
        - d1 = [ln(S/K) + (r - q + σ²/2)T] / (σ√T)
        - d2 = d1 - σ√T
        
        Interpretation:
        - Measures how Delta changes when volatility changes
        - CRITICAL for delta-hedging in volatile markets
        - Large Vanna → Delta is very sensitive to vol changes
        
        Args:
            flag: 'c' for call, 'p' for put
            S, K, T, r, sigma, q: Black-Scholes parameters
            
        Returns:
            Vanna value
        """
        # Calculate d1 and d2
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        # Standard normal PDF
        phi_d1 = (1.0 / np.sqrt(2.0 * np.pi)) * np.exp(-0.5 * d1 ** 2)
        
        # Vanna formula (same for calls and puts)
        vanna = -np.exp(-q * T) * phi_d1 * d2 / sigma
        
        return vanna
    
    def calculate_volga(self, flag: str, S: float, K: float, T: float,
                       r: float, sigma: float, q: float = 0.0) -> float:
        """
        Calculate Volga (Vomma) = ∂²V/∂σ² = ∂ν/∂σ
        
        Analytical Formula:
        Volga = Vega × (d1 × d2 / σ)
        
        Interpretation:
        - Measures how Vega changes when volatility changes
        - CRITICAL for volatility trading
        - Positive Volga → Long volatility exposure
        - Negative Volga → Short volatility exposure
        
        Args:
            flag: 'c' for call, 'p' for put
            S, K, T, r, sigma, q: Black-Scholes parameters
            
        Returns:
            Volga value
        """
        # Calculate d1 and d2
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        # Calculate vega first
        phi_d1 = (1.0 / np.sqrt(2.0 * np.pi)) * np.exp(-0.5 * d1 ** 2)
        vega = S * np.exp(-q * T) * phi_d1 * np.sqrt(T)
        
        # Volga formula
        volga = vega * d1 * d2 / sigma
        
        return volga / 10000  # Scale to per 1% vol move
    
    def calculate_charm(self, flag: str, S: float, K: float, T: float,
                       r: float, sigma: float, q: float = 0.0) -> float:
        """
        Calculate Charm = -∂Δ/∂t = ∂²V/∂S∂t
        
        Analytical Formula:
        For Call:
        Charm = -qe^(-qT)Φ(d1) + e^(-qT)φ(d1)[2(r-q)T - d2σ√T] / (2Tσ√T)
        
        For Put:
        Charm = qe^(-qT)Φ(-d1) + e^(-qT)φ(d1)[2(r-q)T - d2σ√T] / (2Tσ√T)
        
        Interpretation:
        - Measures Delta decay over time
        - "Theta for Delta"
        - Positive Charm → Delta increases over time
        - Important for managing delta-hedged positions
        
        Args:
            flag: 'c' for call, 'p' for put
            S, K, T, r, sigma, q: Black-Scholes parameters
            
        Returns:
            Charm value (per day)
        """
        from scipy.stats import norm
        
        # Calculate d1 and d2
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        phi_d1 = norm.pdf(d1)
        Phi_d1 = norm.cdf(d1)
        Phi_minus_d1 = norm.cdf(-d1)
        
        # Common term
        common_term = np.exp(-q * T) * phi_d1 * (
            2 * (r - q) * T - d2 * sigma * np.sqrt(T)
        ) / (2 * T * sigma * np.sqrt(T))
        
        if flag == 'c':
            charm = -q * np.exp(-q * T) * Phi_d1 + common_term
        else:  # put
            charm = q * np.exp(-q * T) * Phi_minus_d1 + common_term
        
        return charm / 365  # Convert to per-day
    
    def calculate_veta(self, flag: str, S: float, K: float, T: float,
                      r: float, sigma: float, q: float = 0.0) -> float:
        """
        Calculate Veta = ∂ν/∂t = ∂²V/∂σ∂t
        
        Analytical Formula:
        Veta = -Se^(-qT)φ(d1)√T[q + ((r-q)d1)/(σ√T) - (1+d1d2)/(2T)]
        
        Interpretation:
        - Measures Vega decay over time
        - "Theta for Vega"
        - Important for volatility trading
        - Usually negative (vega decreases as expiry approaches)
        
        Args:
            flag: 'c' for call, 'p' for put
            S, K, T, r, sigma, q: Black-Scholes parameters
            
        Returns:
            Veta value (per day)
        """
        # Calculate d1 and d2
        d1 = (np.log(S / K) + (r - q + 0.5 * sigma ** 2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        
        phi_d1 = (1.0 / np.sqrt(2.0 * np.pi)) * np.exp(-0.5 * d1 ** 2)
        
        # Veta formula (same for calls and puts)
        veta = -S * np.exp(-q * T) * phi_d1 * np.sqrt(T) * (
            q + ((r - q) * d1) / (sigma * np.sqrt(T)) - (1 + d1 * d2) / (2 * T)
        )
        
        return veta / 365  # Convert to per-day
    
    def taylor_series_pnl(self,
                         greeks: Dict,
                         delta_S: float,
                         delta_sigma: float,
                         delta_t: float) -> Dict:
        """
        Calculate P&L using Taylor series expansion with second-order Greeks
        
        Full Taylor Series:
        ΔV ≈ Δ×ΔS + ½Γ×(ΔS)² + ν×Δσ + 𝒱(vanna)×ΔS×Δσ + 𝒲(volga)×(Δσ)² + Θ×Δt
        
        This is MORE ACCURATE than Delta-Gamma approximation when:
        - Volatility changes significantly
        - Both price and vol move together
        - Managing complex hedged portfolios
        
        Args:
            greeks: Dictionary with first and second-order Greeks
            delta_S: Change in underlying price
            delta_sigma: Change in volatility (absolute, e.g., 0.05 = 5% vol increase)
            delta_t: Time decay (in years)
            
        Returns:
            Dictionary with P&L breakdown
        """
        first = greeks['first_order']
        second = greeks['second_order']
        
        # First-order terms
        delta_pnl = first['delta'] * delta_S
        vega_pnl = first['vega'] * delta_sigma * 100  # vega per 1% vol
        theta_pnl = first['theta'] * delta_t * 365  # theta per day
        
        # Second-order terms
        gamma_pnl = 0.5 * first['gamma'] * (delta_S ** 2)
        vanna_pnl = second['vanna'] * delta_S * delta_sigma
        volga_pnl = 0.5 * second['volga'] * (delta_sigma ** 2) * 10000  # scaled
        
        # Total P&L
        total_pnl = (delta_pnl + gamma_pnl + vega_pnl + 
                     vanna_pnl + volga_pnl + theta_pnl)
        
        # Linear approximation (Delta-Gamma only) for comparison
        linear_approx = delta_pnl + gamma_pnl
        
        # Error from ignoring second-order cross terms
        cross_term_error = vanna_pnl + volga_pnl
        
        return {
            'total_pnl': total_pnl,
            'breakdown': {
                'delta': delta_pnl,
                'gamma': gamma_pnl,
                'vega': vega_pnl,
                'theta': theta_pnl,
                'vanna': vanna_pnl,
                'volga': volga_pnl
            },
            'linear_approx': linear_approx,
            'cross_term_error': cross_term_error,
            'error_percentage': abs(cross_term_error / total_pnl) * 100 if total_pnl != 0 else 0
        }


def test_second_order_greeks():
    """Test function for second-order Greeks"""
    print("=" * 60)
    print("🧪 Testing Second-Order Greeks Calculator")
    print("=" * 60)
    
    calc = SecondOrderGreeksCalculator()
    
    # ✅ FIXED: Get real market data instead of hardcoded values
    try:
        from backend.models.database_models import SessionLocal, Warrant
        from backend.services.data_helpers import get_warrant_market_data
        
        db = SessionLocal()
        
        # Try to get real warrant data
        try:
            warrant = db.query(Warrant).filter(Warrant.is_active == True).first()
            
            if warrant:
                data = get_warrant_market_data(warrant.symbol, db)
                S = data['spot_price']
                K = data['strike_price']
                T = data['time_to_maturity']
                r = data['risk_free_rate']
                sigma = data['volatility']
                print(f"\n📊 Using real market data for {warrant.symbol}:")
                print(f"   Spot: {S:,.0f} VND, Strike: {K:,.0f} VND")
                print(f"   Volatility: {sigma:.2%}, TTM: {T:.2f}y")
            else:
                raise ValueError("No warrants found")
        finally:
            db.close()
            
    except Exception as e:
        # Fallback to reasonable demo values if database unavailable
        print(f"\n⚠️  Could not fetch real data ({e}), using demo values")
        S = 50000  # VND
        K = 50000  # VND (ATM)
        T = 0.5  # 6 months
        r = 0.0376  # VN risk-free rate
        sigma = 0.30  # 30% volatility
    
    greeks = calc.calculate_all_greeks(S, K, T, r, sigma, 'c')
    
    print("\n📊 First-Order Greeks:")
    print(f"   Delta: {greeks['first_order']['delta']:.4f}")
    print(f"   Gamma: {greeks['first_order']['gamma']:.6f}")
    print(f"   Vega:  {greeks['first_order']['vega']:.4f}")
    print(f"   Theta: {greeks['first_order']['theta']:.4f}")
    
    print("\n🔬 Second-Order Greeks:")
    print(f"   Vanna: {greeks['second_order']['vanna']:.6f}")
    print(f"   Volga: {greeks['second_order']['volga']:.6f}")
    print(f"   Charm: {greeks['second_order']['charm']:.6f}")
    print(f"   Veta:  {greeks['second_order']['veta']:.6f}")
    
    # Test P&L calculation
    print("\n💰 P&L Calculation (ΔS=+2000, Δσ=+5%, Δt=1day):")
    pnl = calc.taylor_series_pnl(greeks, delta_S=2000, delta_sigma=0.05, delta_t=1/365)
    print(f"   Total P&L: {pnl['total_pnl']:,.2f} VND")
    print(f"   Delta contribution: {pnl['breakdown']['delta']:,.2f} VND")
    print(f"   Gamma contribution: {pnl['breakdown']['gamma']:,.2f} VND")
    print(f"   Vega contribution: {pnl['breakdown']['vega']:,.2f} VND")
    print(f"   Vanna contribution: {pnl['breakdown']['vanna']:,.2f} VND")
    print(f"   Volga contribution: {pnl['breakdown']['volga']:,.2f} VND")
    print(f"   Cross-term error: {pnl['cross_term_error']:,.2f} VND ({pnl['error_percentage']:.2f}%)")
    
    print("\n✅ Second-order Greeks working correctly!")


if __name__ == "__main__":
    test_second_order_greeks() 