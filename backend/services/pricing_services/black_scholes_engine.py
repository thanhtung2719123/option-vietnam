"""
Black-Scholes Engine Wrapper
Provides compatibility layer for API endpoints
"""

from .black_scholes_pricer import BlackScholesPricer

class BlackScholesEngine:
    """Wrapper class for BlackScholesPricer to maintain API compatibility"""
    
    def __init__(self, use_vn_config: bool = True):
        self.pricer = BlackScholesPricer(use_vn_config=use_vn_config)
    
    def price_warrant(self, spot_price: float, strike_price: float, 
                     time_to_maturity: float, risk_free_rate: float,
                     volatility: float, warrant_type: str = 'call'):
        """
        Price a warrant using Black-Scholes model
        
        Returns:
            tuple: (price, greeks_dict)
        """
        option_type = 'c' if warrant_type.lower() == 'call' else 'p'
        
        result = self.pricer.price_with_greeks(
            S=spot_price,
            K=strike_price,
            T=time_to_maturity,
            sigma=volatility,
            r=risk_free_rate,
            option_type=option_type
        )
        
        greeks = {
            'delta': result.delta,
            'gamma': result.gamma,
            'vega': result.vega,
            'theta': result.theta,
            'rho': result.rho
        }
        
        return result.price, greeks 