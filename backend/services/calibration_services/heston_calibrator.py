"""
Heston Model Parameter Calibration for Vietnamese Market

This module calibrates Heston stochastic volatility model parameters
using VN30 index historical data from vnstock.

Mathematical Foundation:
    Heston Model SDEs:
    dS(t) = μS(t)dt + √v(t)S(t)dW₁(t)
    dv(t) = κ(θ - v(t))dt + σ√v(t)dW₂(t)
    
    Parameters to calibrate:
    - μ (mu): Expected return (drift)
    - θ (theta): Long-term variance
    - κ (kappa): Mean reversion speed
    - σ (sigma/volvol): Volatility of volatility
    - ρ (rho): Correlation between price and volatility

Vietnamese Market Specifics:
    - Data source: vnstock (VCI provider)
    - Benchmark: VN30 index
    - Trading days: 252 per year
    - Historical window: 2-3 years
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Tuple, Optional
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class HestonParameters:
    """
    Container for Heston model parameters
    
    Attributes:
        v0: Initial variance (volatility squared)
        theta: Long-term variance
        kappa: Mean reversion speed
        volvol: Volatility of volatility (sigma)
        rho: Correlation between asset price and volatility
        mu: Drift/expected return (for simulation)
    """
    v0: float
    theta: float
    kappa: float
    volvol: float
    rho: float
    mu: float = 0.0  # Optional, used for simulation
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'v0': self.v0,
            'theta': self.theta,
            'kappa': self.kappa,
            'volvol': self.volvol,
            'rho': self.rho,
            'mu': self.mu
        }
    
    def __repr__(self) -> str:
        return (f"HestonParameters(v0={self.v0:.4f}, theta={self.theta:.4f}, "
                f"kappa={self.kappa:.2f}, volvol={self.volvol:.2f}, "
                f"rho={self.rho:.2f}, mu={self.mu:.4f})")


class VN30DataFetcher:
    """
    Fetch and process VN30 index historical data from vnstock
    
    This class handles all data retrieval and preprocessing for
    Heston parameter calibration.
    """
    
    def __init__(self, years_back: int = 2):
        """
        Initialize VN30 data fetcher
        
        Args:
            years_back: Number of years of historical data to fetch (default: 2)
        """
        self.years_back = years_back
        self.symbol = 'VN30'
        self.source = 'VCI'
        logger.info(f"VN30DataFetcher initialized with {years_back} years lookback")
    
    def fetch_vn30_history(self, 
                          start_date: Optional[str] = None,
                          end_date: Optional[str] = None) -> pd.DataFrame:
        """
        Fetch VN30 historical price data from vnstock
        
        Args:
            start_date: Start date in 'YYYY-MM-DD' format (optional)
            end_date: End date in 'YYYY-MM-DD' format (optional)
            
        Returns:
            DataFrame with columns: time, open, high, low, close, volume
        """
        try:
            from vnstock import Quote
            
            # Calculate default dates if not provided
            if end_date is None:
                end_date = datetime.now().strftime('%Y-%m-%d')
            
            if start_date is None:
                start_date = (datetime.now() - timedelta(days=365*self.years_back)).strftime('%Y-%m-%d')
            
            logger.info(f"Fetching VN30 data from {start_date} to {end_date}")
            
            # Fetch data using vnstock
            quote = Quote(symbol=self.symbol, source=self.source)
            df = quote.history(start=start_date, end=end_date, interval='1D')
            
            # Ensure datetime format
            df['time'] = pd.to_datetime(df['time'])
            df = df.sort_values('time').reset_index(drop=True)
            
            logger.info(f"Successfully fetched {len(df)} days of VN30 data")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching VN30 data: {e}")
            raise
    
    def calculate_returns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate log returns from price data
        
        Args:
            df: DataFrame with 'close' price column
            
        Returns:
            DataFrame with added 'returns' column
        """
        df = df.copy()
        df['returns'] = np.log(df['close'] / df['close'].shift(1))
        df = df.dropna()
        
        return df
    
    def calculate_realized_volatility(self, 
                                     df: pd.DataFrame,
                                     window: int = 21) -> pd.DataFrame:
        """
        Calculate rolling realized volatility (annualized)
        
        Args:
            df: DataFrame with 'returns' column
            window: Rolling window size in days (default: 21 = 1 month)
            
        Returns:
            DataFrame with added 'realized_vol' column
        """
        df = df.copy()
        
        # Calculate rolling standard deviation
        rolling_std = df['returns'].rolling(window=window).std()
        
        # Annualize (sqrt(252) for daily returns)
        df['realized_vol'] = rolling_std * np.sqrt(252)
        df = df.dropna()
        
        return df
    
    def prepare_calibration_data(self) -> Tuple[pd.DataFrame, Dict]:
        """
        Fetch and prepare all data needed for calibration
        
        Returns:
            Tuple of (processed_dataframe, summary_statistics)
        """
        # Fetch historical data
        df = self.fetch_vn30_history()
        
        # Calculate returns
        df = self.calculate_returns(df)
        
        # Calculate realized volatility
        df = self.calculate_realized_volatility(df, window=21)
        
        # Calculate summary statistics
        stats = {
            'total_days': len(df),
            'start_date': df['time'].min().strftime('%Y-%m-%d'),
            'end_date': df['time'].max().strftime('%Y-%m-%d'),
            'mean_return': df['returns'].mean(),
            'std_return': df['returns'].std(),
            'mean_volatility': df['realized_vol'].mean(),
            'std_volatility': df['realized_vol'].std(),
            'min_volatility': df['realized_vol'].min(),
            'max_volatility': df['realized_vol'].max()
        }
        
        logger.info(f"Calibration data prepared: {stats['total_days']} days from "
                   f"{stats['start_date']} to {stats['end_date']}")
        
        return df, stats


class HestonCalibrator:
    """
    Calibrate Heston model parameters from VN30 historical data
    
    This class implements various calibration methods for Heston parameters
    based on historical market data.
    """
    
    def __init__(self, years_back: int = 2):
        """
        Initialize Heston calibrator
        
        Args:
            years_back: Number of years of historical data to use
        """
        self.years_back = years_back
        self.data_fetcher = VN30DataFetcher(years_back=years_back)
        self.calibration_data = None
        self.calibration_stats = None
        
        logger.info(f"HestonCalibrator initialized with {years_back} years of data")
    
    def fetch_and_prepare_data(self) -> None:
        """Fetch and prepare calibration data"""
        self.calibration_data, self.calibration_stats = self.data_fetcher.prepare_calibration_data()
        logger.info("Calibration data ready")
    
    def estimate_mu(self) -> float:
        """
        Estimate drift parameter (μ) from historical returns
        
        Formula: μ = E[r] * 252 (annualized mean return)
        
        Returns:
            Estimated drift
        """
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        # Annualized mean return
        mu = self.calibration_data['returns'].mean() * 252
        
        logger.info(f"Estimated mu (drift): {mu:.4f} ({mu*100:.2f}%)")
        
        return mu
    
    def estimate_theta(self) -> float:
        """
        Estimate long-term variance (θ) from historical volatility
        
        Formula: θ = E[σ²] (mean of realized variance)
        
        Returns:
            Estimated long-term variance
        """
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        # Mean of realized variance (volatility squared)
        theta = (self.calibration_data['realized_vol'] ** 2).mean()
        
        logger.info(f"Estimated theta (long-term variance): {theta:.4f} "
                   f"(volatility: {np.sqrt(theta)*100:.2f}%)")
        
        return theta
    
    def estimate_v0(self) -> float:
        """
        Estimate initial variance (v₀) from recent volatility
        
        Formula: v₀ = σ²(t=0) (recent realized variance)
        
        Returns:
            Estimated initial variance
        """
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        # Use last 30 days average as initial variance
        recent_vol = self.calibration_data['realized_vol'].tail(30).mean()
        v0 = recent_vol ** 2
        
        logger.info(f"Estimated v0 (initial variance): {v0:.4f} "
                   f"(volatility: {recent_vol*100:.2f}%)")
        
        return v0
    
    def estimate_kappa_sigma(self) -> Tuple[float, float]:
        """
        Estimate mean reversion speed (κ) and vol of vol (σ)
        using variance of variance approach
        
        This uses the Ornstein-Uhlenbeck process properties:
        Var(v) = σ²θ / (2κ)
        
        Returns:
            Tuple of (kappa, sigma)
        """
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        # Calculate variance of realized variance
        realized_var = self.calibration_data['realized_vol'] ** 2
        var_of_var = realized_var.var()
        
        # Get theta
        theta = self.estimate_theta()
        
        # Initial estimates based on market practice
        # For Vietnamese market: moderate mean reversion, high vol of vol
        kappa = 5.0  # Moderate mean reversion
        sigma = np.sqrt(2 * kappa * var_of_var / theta)
        
        # Bound sigma to reasonable range
        sigma = np.clip(sigma, 0.5, 3.0)
        
        logger.info(f"Estimated kappa (mean reversion): {kappa:.2f}")
        logger.info(f"Estimated sigma (vol of vol): {sigma:.2f}")
        
        return kappa, sigma
    
    def estimate_rho_historical(self) -> float:
        """
        Estimate correlation (ρ) between returns and volatility changes
        
        This calculates the empirical correlation between:
        - Daily returns
        - Changes in realized volatility
        
        Returns:
            Estimated correlation (typically negative)
        """
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        df = self.calibration_data.copy()
        
        # Calculate changes in volatility
        df['vol_change'] = df['realized_vol'].diff()
        
        # Drop NaN values
        df = df.dropna()
        
        # Calculate correlation
        if len(df) > 30:  # Need sufficient data
            rho = df['returns'].corr(df['vol_change'])
            
            # Bound to reasonable range [-0.9, 0]
            rho = np.clip(rho, -0.9, 0.0)
        else:
            # Default to typical equity market value
            rho = -0.6
            logger.warning("Insufficient data for rho estimation, using default -0.6")
        
        logger.info(f"Estimated rho (correlation): {rho:.2f}")
        
        return rho
    
    def get_default_parameters(self) -> HestonParameters:
        """
        Get default Heston parameters for Vietnamese market
        
        These are reasonable starting values based on market practice
        
        Returns:
            Default HestonParameters
        """
        return HestonParameters(
            v0=0.8**2,      # Initial variance (80% vol)
            theta=0.6**2,   # Long-term variance (60% vol)
            kappa=5.0,      # Moderate mean reversion
            volvol=1.5,     # High vol of vol for VN market
            rho=-0.6,       # Typical negative correlation
            mu=0.08         # 8% expected return
        )
    
    def calibrate_from_historical_data(self) -> HestonParameters:
        """
        Calibrate all Heston parameters from VN30 historical data
        
        This is the main calibration method that estimates all parameters
        from historical price and volatility data.
        
        Returns:
            Calibrated HestonParameters
        """
        logger.info("=" * 80)
        logger.info("HESTON PARAMETER CALIBRATION - VIETNAMESE MARKET")
        logger.info("=" * 80)
        
        # Ensure data is loaded
        if self.calibration_data is None:
            self.fetch_and_prepare_data()
        
        # Estimate all parameters
        mu = self.estimate_mu()
        v0 = self.estimate_v0()
        theta = self.estimate_theta()
        kappa, volvol = self.estimate_kappa_sigma()
        rho = self.estimate_rho_historical()
        
        # Create parameter object
        params = HestonParameters(
            v0=v0,
            theta=theta,
            kappa=kappa,
            volvol=volvol,
            rho=rho,
            mu=mu
        )
        
        logger.info("=" * 80)
        logger.info("CALIBRATION COMPLETE")
        logger.info(f"Parameters: {params}")
        logger.info("=" * 80)
        
        return params
    
    def get_calibration_summary(self) -> Dict:
        """
        Get comprehensive calibration summary with diagnostics
        
        Returns:
            Dictionary with calibration results and statistics
        """
        if self.calibration_data is None or self.calibration_stats is None:
            self.fetch_and_prepare_data()
        
        # Calibrate parameters
        params = self.calibrate_from_historical_data()
        
        summary = {
            'parameters': params.to_dict(),
            'data_statistics': self.calibration_stats,
            'calibration_info': {
                'method': 'historical_estimation',
                'data_source': 'VN30 via vnstock',
                'years_used': self.years_back,
                'timestamp': datetime.now().isoformat()
            },
            'parameter_interpretation': {
                'initial_volatility': f"{np.sqrt(params.v0)*100:.2f}%",
                'long_term_volatility': f"{np.sqrt(params.theta)*100:.2f}%",
                'mean_reversion_speed': f"{params.kappa:.2f}",
                'vol_of_vol': f"{params.volvol:.2f}",
                'correlation': f"{params.rho:.2f}",
                'expected_return': f"{params.mu*100:.2f}%"
            }
        }
        
        return summary


# Convenience function for quick calibration
def calibrate_heston_parameters(years_back: int = 2) -> HestonParameters:
    """
    Quick function to calibrate Heston parameters from VN30 data
    
    Args:
        years_back: Number of years of historical data
        
    Returns:
        Calibrated HestonParameters
    """
    calibrator = HestonCalibrator(years_back=years_back)
    return calibrator.calibrate_from_historical_data() 