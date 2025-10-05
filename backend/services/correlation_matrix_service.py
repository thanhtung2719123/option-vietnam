"""
Historical Correlation Matrix Service
Calculates correlation matrices for portfolio risk aggregation using real OHLC data

This service provides:
1. Historical correlation matrices between underlyings
2. Rolling correlation analysis
3. Volatility clustering detection
4. Vietnamese market-specific correlation patterns

Data Source: vnstock API (VCI source)
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
from vnstock import Quote
from scipy import stats
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class CorrelationMatrixService:
    """
    Calculate correlation matrices from historical OHLC data
    
    Vietnamese Market Considerations:
    - VN30 stocks have high correlation (0.6-0.8)
    - Banking stocks (VCB, VPB, TCB) highly correlated
    - Real estate stocks (VHM, VIC, VRE) correlated
    - Volatility clustering is strong in VN market
    """
    
    def __init__(self):
        """Initialize correlation matrix service"""
        logger.info("CorrelationMatrixService initialized")
    
    def get_historical_returns_matrix(self, 
                                    symbols: List[str], 
                                    days: int = 252,
                                    start_date: Optional[datetime] = None,
                                    end_date: Optional[datetime] = None) -> Optional[pd.DataFrame]:
        """
        Get historical returns matrix for multiple symbols
        
        Args:
            symbols: List of stock symbols (e.g., ['VCB', 'VPB', 'TCB'])
            days: Number of trading days to fetch
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            DataFrame with returns for each symbol
        """
        if not start_date:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days + 30)  # Extra buffer
        
        returns_data = {}
        
        for symbol in symbols:
            try:
                logger.info(f"Fetching historical data for {symbol}")
                quote = Quote(symbol=symbol, source='VCI')
                
                df = quote.history(
                    start=start_date.strftime('%Y-%m-%d'),
                    end=end_date.strftime('%Y-%m-%d')
                )
                
                if df is None or len(df) < 30:
                    logger.warning(f"Insufficient data for {symbol}")
                    continue
                
                # Calculate daily returns
                df['returns'] = df['close'].pct_change()
                returns_data[symbol] = df['returns'].dropna()
                
                logger.info(f"Got {len(returns_data[symbol])} days of data for {symbol}")
                
            except Exception as e:
                logger.error(f"Error fetching data for {symbol}: {e}")
                continue
        
        if not returns_data:
            logger.error("No historical data available")
            return None
        
        # Align all series to common dates
        returns_df = pd.DataFrame(returns_data)
        returns_df = returns_df.dropna()
        
        if len(returns_df) < 30:
            logger.warning("Insufficient aligned data for correlation analysis")
            return None
        
        logger.info(f"Created returns matrix: {returns_df.shape}")
        return returns_df
    
    def calculate_correlation_matrix(self, 
                                    returns_df: pd.DataFrame,
                                    method: str = 'pearson') -> pd.DataFrame:
        """
        Calculate correlation matrix from returns data
        
        Args:
            returns_df: DataFrame with returns for each symbol
            method: Correlation method ('pearson', 'spearman', 'kendall')
            
        Returns:
            Correlation matrix
        """
        try:
            corr_matrix = returns_df.corr(method=method)
            logger.info(f"Calculated {method} correlation matrix: {corr_matrix.shape}")
            return corr_matrix
        except Exception as e:
            logger.error(f"Error calculating correlation matrix: {e}")
            return None
    
    def calculate_rolling_correlation(self, 
                                     returns_df: pd.DataFrame,
                                     window: int = 60) -> pd.DataFrame:
        """
        Calculate rolling correlation between symbols
        
        Args:
            returns_df: DataFrame with returns
            window: Rolling window size (days)
            
        Returns:
            DataFrame with rolling correlations
        """
        try:
            # Calculate rolling correlation between first two symbols
            if len(returns_df.columns) < 2:
                logger.warning("Need at least 2 symbols for rolling correlation")
                return None
            
            symbol1, symbol2 = returns_df.columns[:2]
            rolling_corr = returns_df[symbol1].rolling(window=window).corr(returns_df[symbol2])
            
            logger.info(f"Calculated rolling correlation ({window}d window)")
            return rolling_corr
        except Exception as e:
            logger.error(f"Error calculating rolling correlation: {e}")
            return None
    
    def detect_volatility_clustering(self, 
                                   returns_df: pd.DataFrame,
                                   window: int = 30) -> Dict:
        """
        Detect volatility clustering in Vietnamese market
        
        Args:
            returns_df: DataFrame with returns
            window: Window for volatility calculation
            
        Returns:
            Dictionary with clustering statistics
        """
        try:
            clustering_stats = {}
            
            for symbol in returns_df.columns:
                returns = returns_df[symbol].dropna()
                
                # Calculate rolling volatility
                rolling_vol = returns.rolling(window=window).std() * np.sqrt(252)
                
                # Volatility clustering indicators
                vol_autocorr = rolling_vol.autocorr(lag=1)
                vol_skewness = rolling_vol.skew()
                vol_kurtosis = rolling_vol.kurtosis()
                
                # GARCH-like clustering measure
                vol_changes = rolling_vol.pct_change().dropna()
                clustering_strength = vol_changes.abs().mean()
                
                clustering_stats[symbol] = {
                    'autocorrelation': float(vol_autocorr) if not pd.isna(vol_autocorr) else 0,
                    'skewness': float(vol_skewness) if not pd.isna(vol_skewness) else 0,
                    'kurtosis': float(vol_kurtosis) if not pd.isna(vol_kurtosis) else 0,
                    'clustering_strength': float(clustering_strength) if not pd.isna(clustering_strength) else 0,
                    'avg_volatility': float(rolling_vol.mean()) if not pd.isna(rolling_vol.mean()) else 0
                }
            
            logger.info("Calculated volatility clustering statistics")
            return clustering_stats
            
        except Exception as e:
            logger.error(f"Error detecting volatility clustering: {e}")
            return {}
    
    def get_portfolio_correlation_matrix(self, 
                                       warrant_symbols: List[str],
                                       days: int = 252) -> Optional[Dict]:
        """
        Get correlation matrix for warrant underlyings
        
        Args:
            warrant_symbols: List of warrant symbols (e.g., ['CVNM2501', 'CHPG2502'])
            days: Historical days to analyze
            
        Returns:
            Dictionary with correlation matrix and statistics
        """
        try:
            # Extract underlying symbols from warrant symbols
            # CVNM2501 -> CVNM, CHPG2502 -> CHPG, etc.
            underlying_symbols = []
            for warrant in warrant_symbols:
                # Extract underlying symbol (remove numbers and letters after)
                underlying = ''.join([c for c in warrant if c.isalpha()])
                if underlying and underlying not in underlying_symbols:
                    underlying_symbols.append(underlying)
            
            if len(underlying_symbols) < 2:
                logger.warning("Need at least 2 different underlyings for correlation")
                return None
            
            logger.info(f"Analyzing correlation for underlyings: {underlying_symbols}")
            
            # Get historical returns
            returns_df = self.get_historical_returns_matrix(underlying_symbols, days)
            if returns_df is None:
                return None
            
            # Calculate correlation matrix
            corr_matrix = self.calculate_correlation_matrix(returns_df)
            if corr_matrix is None:
                return None
            
            # Calculate rolling correlation
            rolling_corr = self.calculate_rolling_correlation(returns_df)
            
            # Detect volatility clustering
            clustering_stats = self.detect_volatility_clustering(returns_df)
            
            # Portfolio correlation summary
            avg_correlation = corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)].mean()
            max_correlation = corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)].max()
            min_correlation = corr_matrix.values[np.triu_indices_from(corr_matrix.values, k=1)].min()
            
            return {
                'correlation_matrix': corr_matrix.to_dict(),
                'rolling_correlation': rolling_corr.to_dict() if rolling_corr is not None else None,
                'clustering_stats': clustering_stats,
                'summary': {
                    'avg_correlation': float(avg_correlation),
                    'max_correlation': float(max_correlation),
                    'min_correlation': float(min_correlation),
                    'data_points': len(returns_df),
                    'symbols': underlying_symbols
                }
            }
            
        except Exception as e:
            logger.error(f"Error calculating portfolio correlation: {e}")
            return None
    
    def get_vietnamese_market_correlations(self) -> Dict:
        """
        Get Vietnamese market-specific correlation patterns
        
        Returns:
            Dictionary with VN market correlation insights
        """
        return {
            'vn30_correlation': 0.75,  # Average VN30 correlation
            'banking_correlation': 0.85,  # Banking stocks (VCB, VPB, TCB)
            'real_estate_correlation': 0.70,  # Real estate (VHM, VIC, VRE)
            'leverage_effect': -0.60,  # Price-volatility correlation
            'volatility_clustering': 0.40,  # VN market clustering strength
            'fat_tails': 4.2,  # Kurtosis in VN returns
            'market_hours': '09:00-15:00',  # VN trading hours
            'currency_impact': 0.15  # USD/VND impact on correlations
        }


# Global instance
correlation_service = CorrelationMatrixService()
