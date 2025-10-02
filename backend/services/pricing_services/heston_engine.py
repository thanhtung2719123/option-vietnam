"""
Heston Stochastic Volatility Engine
Currently uses Black-Scholes as fallback
TODO: Implement full Heston model
"""

from .black_scholes_pricer import BlackScholesPricer

class HestonEngine:
    """Heston model engine (currently using Black-Scholes fallback)"""
    
    def __init__(self, use_vn_config: bool = True):
        # Fallback to Black-Scholes for now
        self.pricer = BlackScholesPricer(use_vn_config=use_vn_config)
    
    def price_warrant(self, spot_price: float, strike_price: float, 
                     time_to_maturity: float, risk_free_rate: float,
                     volatility: float, warrant_type: str = 'call'):
        """
        Price a warrant using Heston model (currently Black-Scholes fallback)
        
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