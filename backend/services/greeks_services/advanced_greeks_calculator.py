"""
Advanced Greeks Calculator Service
Portfolio-level risk management and second-order Greeks analysis

Features:
- Portfolio Greeks aggregation
- Gamma risk analysis with price shock scenarios
- Vega risk analysis with volatility shock scenarios
- Greeks-based risk metrics (VaR, Expected Shortfall)
- Real-time Greeks monitoring
- Risk alerts and recommendations
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AdvancedGreeksCalculator:
    '''
    Advanced Greeks Calculator for Portfolio Risk Management
    
    Provides comprehensive Greeks analysis including:
    - Portfolio-level aggregation
    - Second-order risk analysis (Gamma, Vega)
    - Stress testing and scenario analysis
    - Real-time monitoring and alerts
    '''
    
    def __init__(self, pricer, use_vn_config: bool = True):
        '''
        Initialize Advanced Greeks Calculator
        
        Args:
            pricer: BlackScholesPricer instance
            use_vn_config: Use Vietnamese market configuration
        '''
        self.pricer = pricer
        self.use_vn_config = use_vn_config
        logger.info('AdvancedGreeksCalculator initialized')
    
    def calculate_portfolio_greeks(self, 
                                   positions: List[Dict],
                                   aggregate_by: str = None) -> Dict:
        '''
        Calculate aggregated Greeks for entire portfolio
        
        Portfolio Greeks Formulas (Position Greeks):
        - Net Δ = Σ(quantity × delta) - "Delta có phiếu" (shares equivalent)
        - Net Γ = Σ(quantity × gamma) - "Gamma có phiếu" 
        - Net ν = Σ(quantity × vega)
        - Net Θ = Σ(quantity × theta)
        - Net ρ = Σ(quantity × rho)
        
        Dollar Greeks (for risk measurement in VND):
        - Dollar Delta = Net Δ × underlying_price
        - Dollar Gamma = Σ(quantity × gamma × underlying_price² × 0.01²)
          (captures P&L change for 1% move in underlying)
        - Dollar Vega = Net ν (already in VND per vol point)
        
        Args:
            positions: List of position dictionaries with:
                - symbol: Warrant code
                - quantity: Position size (positive for long, negative for short)
                - underlying_price: Current underlying price
                - strike_price: Strike price
                - time_to_maturity: Time to maturity (years)
                - volatility: Volatility
                - risk_free_rate: Risk-free rate
                - dividend_yield: Dividend yield
                - option_type: 'c' or 'p'
            aggregate_by: Optional grouping ('underlying', 'maturity', None)
            
        Returns:
            Dictionary with portfolio Greeks and risk metrics
        '''
        if not positions:
            return self._empty_portfolio_greeks()
        
        # Calculate Greeks for each position
        position_greeks = []
        
        for position in positions:
            try:
                # Get pricing result with all Greeks
                result = self.pricer.price_with_greeks(
                    S=position['underlying_price'],
                    K=position['strike_price'],
                    T=position['time_to_maturity'],
                    sigma=position['volatility'],
                    r=position.get('risk_free_rate', 0.0376),
                    option_type=position.get('option_type', 'c'),
                    q=position.get('dividend_yield', 0.0)
                )
                
                quantity = position['quantity']
                S = position['underlying_price']
                
                position_greeks.append({
                    'symbol': position['symbol'],
                    'quantity': quantity,
                    'underlying_price': S,
                    'option_price': result.price,
                    'delta': result.delta,
                    'gamma': result.gamma,
                    'vega': result.vega,
                    'theta': result.theta,
                    'rho': result.rho,
                    # Position-level Greeks (shares equivalent)
                    'position_delta': quantity * result.delta,
                    'position_gamma': quantity * result.gamma,
                    'position_vega': quantity * result.vega,
                    'position_theta': quantity * result.theta,
                    'position_rho': quantity * result.rho,
                    # Dollar exposures (risk measurement in VND)
                    'delta_dollars': quantity * result.delta * S,
                    # Dollar Gamma for 1% move: Γ × S² × (0.01)²
                    'gamma_dollars': quantity * result.gamma * S * S * 0.0001,
                    'vega_dollars': quantity * result.vega,
                    'notional': quantity * result.price,
                    'underlying': position.get('underlying', 'UNKNOWN')
                })
                
            except Exception as e:
                logger.error(f'Error calculating Greeks for {position.get("symbol")}: {e}')
                continue
        
        if not position_greeks:
            return self._empty_portfolio_greeks()
        
        df = pd.DataFrame(position_greeks)
        
        # Aggregate Greeks
        portfolio_greeks = {
            'timestamp': datetime.now(),
            'total_positions': len(df),
            'long_positions': len(df[df['quantity'] > 0]),
            'short_positions': len(df[df['quantity'] < 0]),
            
            # Aggregated Greeks
            'net_delta': df['position_delta'].sum(),
            'net_gamma': df['position_gamma'].sum(),
            'net_vega': df['position_vega'].sum(),
            'net_theta': df['position_theta'].sum(),
            'net_rho': df['position_rho'].sum(),
            
            # Dollar exposures
            'delta_exposure': df['delta_dollars'].sum(),
            'gamma_exposure': df['gamma_dollars'].sum(),
            'vega_exposure': df['vega_dollars'].sum(),
            
            # Portfolio value
            'total_notional': df['notional'].sum(),
            'gross_notional': df['notional'].abs().sum(),
            
            # Position details
            'positions': position_greeks
        }
        
        # Add grouping if requested
        if aggregate_by:
            portfolio_greeks['groups'] = self._aggregate_by_category(df, aggregate_by)
        
        return portfolio_greeks
    
    def gamma_risk_analysis(self,
                           portfolio_greeks: Dict,
                           price_shocks: List[float] = None) -> Dict:
        '''
        Analyze Gamma risk with price shock scenarios
        
        Gamma P&L = 0.5  Gamma  (ΔS)
        
        Args:
            portfolio_greeks: Portfolio Greeks from calculate_portfolio_greeks
            price_shocks: List of price shock percentages (e.g., [-0.10, -0.05, 0.05, 0.10])
            
        Returns:
            Dictionary with Gamma risk analysis
        '''
        if price_shocks is None:
            price_shocks = [-0.20, -0.15, -0.10, -0.05, -0.02, 0.02, 0.05, 0.10, 0.15, 0.20]
        
        net_gamma = portfolio_greeks['net_gamma']
        
        # Calculate average underlying price (weighted by notional)
        positions = portfolio_greeks['positions']
        total_notional = sum(abs(p['notional']) for p in positions)
        
        if total_notional == 0:
            avg_price = 100000  # Default
        else:
            avg_price = sum(p['underlying_price'] * abs(p['notional']) for p in positions) / total_notional
        
        # Calculate Gamma P&L for each shock
        gamma_scenarios = []
        for shock in price_shocks:
            price_change = avg_price * shock
            gamma_pnl = 0.5 * net_gamma * (price_change ** 2)
            
            gamma_scenarios.append({
                'shock_pct': shock * 100,
                'price_change': price_change,
                'gamma_pnl': gamma_pnl,
                'new_price': avg_price * (1 + shock)
            })
        
        gamma_df = pd.DataFrame(gamma_scenarios)
        
        # Risk metrics
        max_gamma_loss = gamma_df['gamma_pnl'].min()
        max_gamma_gain = gamma_df['gamma_pnl'].max()
        
        # Classify risk level
        gamma_dollars = portfolio_greeks['gamma_exposure']
        
        if abs(gamma_dollars) < 10000:
            risk_level = 'LOW'
            rebal_freq = 'weekly'
        elif abs(gamma_dollars) < 50000:
            risk_level = 'MEDIUM'
            rebal_freq = 'daily'
        elif abs(gamma_dollars) < 200000:
            risk_level = 'HIGH'
            rebal_freq = 'intraday'
        else:
            risk_level = 'CRITICAL'
            rebal_freq = 'continuous'
        
        # Recommendations
        recommendations = []
        if abs(gamma_dollars) > 50000:
            recommendations.append('Consider reducing position size to lower Gamma risk')
        if abs(gamma_dollars) > 100000:
            recommendations.append('Implement continuous delta rebalancing')
        if net_gamma > 0:
            recommendations.append('Long Gamma position - benefits from volatility')
        else:
            recommendations.append('Short Gamma position - vulnerable to large moves')
        
        return {
            'timestamp': datetime.now(),
            'net_gamma': net_gamma,
            'gamma_dollars': gamma_dollars,
            'average_underlying_price': avg_price,
            'scenarios': gamma_scenarios,
            'max_gamma_loss': max_gamma_loss,
            'max_gamma_gain': max_gamma_gain,
            'risk_level': risk_level,
            'recommended_rebalancing': rebal_freq,
            'recommendations': recommendations,
            'gamma_pnl_std': gamma_df['gamma_pnl'].std()
        }
    
    def vega_risk_analysis(self,
                          portfolio_greeks: Dict,
                          vol_shocks: List[float] = None) -> Dict:
        '''
        Analyze Vega risk with volatility shock scenarios
        
        Vega P&L = Vega  Δσ
        
        Args:
            portfolio_greeks: Portfolio Greeks from calculate_portfolio_greeks
            vol_shocks: List of volatility shock percentages
            
        Returns:
            Dictionary with Vega risk analysis
        '''
        if vol_shocks is None:
            vol_shocks = [-0.50, -0.30, -0.20, -0.10, -0.05, 0.05, 0.10, 0.20, 0.30, 0.50]
        
        net_vega = portfolio_greeks['net_vega']
        vega_dollars = portfolio_greeks['vega_exposure']
        
        # Calculate Vega P&L for each shock
        vega_scenarios = []
        for shock in vol_shocks:
            # Vega is typically quoted per 1% vol change
            # So multiply by shock (in percentage points)
            vega_pnl = net_vega * 100 * shock  # Convert to basis points
            
            vega_scenarios.append({
                'vol_shock_pct': shock * 100,
                'vega_pnl': vega_pnl
            })
        
        vega_df = pd.DataFrame(vega_scenarios)
        
        # Risk metrics
        max_vega_loss = vega_df['vega_pnl'].min()
        max_vega_gain = vega_df['vega_pnl'].max()
        
        # Classify risk level
        if abs(vega_dollars) < 5000:
            risk_level = 'LOW'
        elif abs(vega_dollars) < 20000:
            risk_level = 'MEDIUM'
        elif abs(vega_dollars) < 100000:
            risk_level = 'HIGH'
        else:
            risk_level = 'CRITICAL'
        
        # Recommendations
        recommendations = []
        if net_vega > 0:
            recommendations.append('Long Vega - benefits from volatility increase')
            recommendations.append('Consider hedging with short volatility positions')
        else:
            recommendations.append('Short Vega - vulnerable to volatility spikes')
            recommendations.append('Monitor VIX or VN30 volatility index')
        
        if abs(vega_dollars) > 50000:
            recommendations.append('High Vega exposure - consider volatility hedging')
        
        return {
            'timestamp': datetime.now(),
            'net_vega': net_vega,
            'vega_dollars': vega_dollars,
            'scenarios': vega_scenarios,
            'max_vega_loss': max_vega_loss,
            'max_vega_gain': max_vega_gain,
            'risk_level': risk_level,
            'recommendations': recommendations,
            'vega_pnl_std': vega_df['vega_pnl'].std()
        }
    
    def calculate_greeks_var(self,
                            portfolio_greeks: Dict,
                            confidence_level: float = 0.95,
                            time_horizon_days: int = 1) -> Dict:
        '''
        Calculate Value-at-Risk using Greeks approximation
        
        VaR  DeltaΔS + 0.5Gamma(ΔS) + VegaΔσ + ThetaΔt
        
        Args:
            portfolio_greeks: Portfolio Greeks
            confidence_level: Confidence level (e.g., 0.95 for 95%)
            time_horizon_days: Time horizon in days
            
        Returns:
            Dictionary with VaR estimates
        '''
        # Assumptions for Vietnamese market
        daily_return_vol = 0.02  # 2% daily return volatility
        daily_vol_change = 0.05  # 5% daily volatility change
        
        # Z-score for confidence level
        from scipy.stats import norm
        z_score = norm.ppf(confidence_level)
        
        # Calculate potential changes
        delta_S = z_score * daily_return_vol * np.sqrt(time_horizon_days)
        delta_sigma = z_score * daily_vol_change * np.sqrt(time_horizon_days)
        delta_t = time_horizon_days / 365
        
        # Greeks-based VaR components
        net_delta = portfolio_greeks['net_delta']
        net_gamma = portfolio_greeks['net_gamma']
        net_vega = portfolio_greeks['net_vega']
        net_theta = portfolio_greeks['net_theta']
        
        # Estimate average price
        positions = portfolio_greeks['positions']
        if positions:
            avg_price = sum(p['underlying_price'] * abs(p['notional']) 
                          for p in positions) / sum(abs(p['notional']) for p in positions)
        else:
            # ✅ FIXED: Try to get from database if no positions
            try:
                from backend.services.data_helpers import get_average_portfolio_price
                from backend.models.database_models import SessionLocal
                db = SessionLocal()
                try:
                    avg_price = get_average_portfolio_price(positions or [], db)
                finally:
                    db.close()
            except:
                avg_price = 100000  # Fallback
        
        price_change = avg_price * delta_S
        
        # VaR components
        delta_var = net_delta * price_change
        gamma_var = 0.5 * net_gamma * (price_change ** 2)
        vega_var = net_vega * delta_sigma * 100
        theta_var = net_theta * delta_t
        
        total_var = delta_var + gamma_var + vega_var + theta_var
        
        return {
            'timestamp': datetime.now(),
            'confidence_level': confidence_level,
            'time_horizon_days': time_horizon_days,
            'total_var': total_var,
            'delta_component': delta_var,
            'gamma_component': gamma_var,
            'vega_component': vega_var,
            'theta_component': theta_var,
            'assumptions': {
                'daily_return_vol': daily_return_vol,
                'daily_vol_change': daily_vol_change,
                'z_score': z_score
            }
        }
    
    def stress_test_portfolio(self,
                             portfolio_greeks: Dict,
                             scenarios: List[Dict] = None) -> pd.DataFrame:
        '''
        Run stress tests on portfolio using Greeks
        
        Args:
            portfolio_greeks: Portfolio Greeks
            scenarios: List of scenario dictionaries with:
                - name: Scenario name
                - price_shock: Price change percentage
                - vol_shock: Volatility change percentage
                
        Returns:
            DataFrame with stress test results
        '''
        if scenarios is None:
            scenarios = [
                {'name': 'Normal Market', 'price_shock': 0.0, 'vol_shock': 0.0},
                {'name': 'Minor Correction', 'price_shock': -0.05, 'vol_shock': 0.10},
                {'name': 'Market Crash', 'price_shock': -0.20, 'vol_shock': 0.50},
                {'name': 'Flash Crash', 'price_shock': -0.30, 'vol_shock': 1.00},
                {'name': 'Bull Rally', 'price_shock': 0.10, 'vol_shock': -0.20},
                {'name': 'Volatility Spike', 'price_shock': 0.0, 'vol_shock': 0.50}
            ]
        
        net_delta = portfolio_greeks['net_delta']
        net_gamma = portfolio_greeks['net_gamma']
        net_vega = portfolio_greeks['net_vega']
        
        # Get average price
        positions = portfolio_greeks['positions']
        if positions:
            avg_price = sum(p['underlying_price'] * abs(p['notional']) 
                          for p in positions) / sum(abs(p['notional']) for p in positions)
        else:
            # ✅ FIXED: Try to get from database if no positions
            try:
                from backend.services.data_helpers import get_average_portfolio_price
                from backend.models.database_models import SessionLocal
                db = SessionLocal()
                try:
                    avg_price = get_average_portfolio_price(positions or [], db)
                finally:
                    db.close()
            except:
                avg_price = 100000  # Fallback
        
        results = []
        for scenario in scenarios:
            price_change = avg_price * scenario['price_shock']
            vol_change = scenario['vol_shock']
            
            # Calculate P&L
            delta_pnl = net_delta * price_change
            gamma_pnl = 0.5 * net_gamma * (price_change ** 2)
            vega_pnl = net_vega * vol_change * 100
            
            total_pnl = delta_pnl + gamma_pnl + vega_pnl
            
            results.append({
                'scenario': scenario['name'],
                'price_shock_pct': scenario['price_shock'] * 100,
                'vol_shock_pct': scenario['vol_shock'] * 100,
                'delta_pnl': delta_pnl,
                'gamma_pnl': gamma_pnl,
                'vega_pnl': vega_pnl,
                'total_pnl': total_pnl,
                'pnl_pct': (total_pnl / portfolio_greeks['total_notional'] * 100) 
                          if portfolio_greeks['total_notional'] != 0 else 0
            })
        
        return pd.DataFrame(results)
    
    def generate_risk_alerts(self, portfolio_greeks: Dict) -> List[Dict]:
        '''
        Generate risk alerts based on portfolio Greeks
        
        Args:
            portfolio_greeks: Portfolio Greeks
            
        Returns:
            List of alert dictionaries
        '''
        alerts = []
        
        # Delta alerts
        net_delta = portfolio_greeks['net_delta']
        if abs(net_delta) > 1000:
            alerts.append({
                'severity': 'HIGH' if abs(net_delta) > 2000 else 'MEDIUM',
                'type': 'DELTA_EXPOSURE',
                'message': f'High Delta exposure: {net_delta:.2f}',
                'recommendation': 'Consider delta hedging to neutralize directional risk'
            })
        
        # Gamma alerts
        gamma_dollars = portfolio_greeks['gamma_exposure']
        if abs(gamma_dollars) > 50000:
            alerts.append({
                'severity': 'HIGH' if abs(gamma_dollars) > 100000 else 'MEDIUM',
                'type': 'GAMMA_RISK',
                'message': f'High Gamma exposure: {gamma_dollars:,.0f} VND',
                'recommendation': 'Increase rebalancing frequency to manage Gamma risk'
            })
        
        # Vega alerts
        vega_dollars = portfolio_greeks['vega_exposure']
        if abs(vega_dollars) > 20000:
            alerts.append({
                'severity': 'HIGH' if abs(vega_dollars) > 50000 else 'MEDIUM',
                'type': 'VEGA_RISK',
                'message': f'High Vega exposure: {vega_dollars:,.0f} VND',
                'recommendation': 'Monitor volatility and consider volatility hedging'
            })
        
        # Theta decay
        net_theta = portfolio_greeks['net_theta']
        if net_theta < -10000:
            alerts.append({
                'severity': 'MEDIUM',
                'type': 'THETA_DECAY',
                'message': f'Significant time decay: {net_theta:,.0f} VND/day',
                'recommendation': 'Monitor theta decay impact on portfolio value'
            })
        
        return alerts
    
    def _empty_portfolio_greeks(self) -> Dict:
        '''Return empty portfolio Greeks structure'''
        return {
            'timestamp': datetime.now(),
            'total_positions': 0,
            'long_positions': 0,
            'short_positions': 0,
            'net_delta': 0,
            'net_gamma': 0,
            'net_vega': 0,
            'net_theta': 0,
            'net_rho': 0,
            'delta_exposure': 0,
            'gamma_exposure': 0,
            'vega_exposure': 0,
            'total_notional': 0,
            'gross_notional': 0,
            'positions': []
        }
    
    def _aggregate_by_category(self, df: pd.DataFrame, category: str) -> Dict:
        '''Aggregate Greeks by category'''
        if category not in df.columns:
            return {}
        
        grouped = df.groupby(category).agg({
            'position_delta': 'sum',
            'position_gamma': 'sum',
            'position_vega': 'sum',
            'position_theta': 'sum',
            'delta_dollars': 'sum',
            'gamma_dollars': 'sum',
            'notional': 'sum'
        }).to_dict('index')
        
        return grouped
