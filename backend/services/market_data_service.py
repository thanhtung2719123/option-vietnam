"""
Market Data Service
Fetches real-time market data from vnstock
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import pandas as pd

logger = logging.getLogger(__name__)

class MarketDataService:
    """Service for fetching real-time market data from vnstock"""
    
    def __init__(self, source: str = 'VCI'):
        """
        Initialize market data service
        
        Args:
            source: Data source (VCI or TCBS)
        """
        self.source = source
        self.cache = {}  # Simple cache to avoid too many API calls
        self.cache_duration = 60  # Cache for 60 seconds
        
        logger.info(f"Market Data Service initialized with source: {source}")
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """
        Get current/latest close price for a stock symbol
        
        Args:
            symbol: Stock symbol (e.g., 'FPT', 'VNM', 'HPG')
            
        Returns:
            Current close price or None if error
        """
        try:
            # Check cache first
            cache_key = f"{symbol}_{self.source}"
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                if (datetime.now() - cached_time).seconds < self.cache_duration:
                    logger.debug(f"Using cached price for {symbol}: {cached_data}")
                    return cached_data
            
            # Import vnstock here to avoid loading if not needed
            from vnstock import Quote
            
            # Get quote data
            quote = Quote(symbol=symbol, source=self.source)
            
            # Get last 2 days of data (in case today is weekend/holiday)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5)
            
            # Fetch historical data
            df = quote.history(
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            )
            
            if df is None or df.empty:
                logger.warning(f"No data returned for {symbol}")
                return None
            
            # Get the most recent close price
            # Note: vnstock returns price in thousands for Vietnamese stocks
            latest_price = float(df['close'].iloc[-1]) * 1000  # Convert to VND
            
            # Cache the result
            self.cache[cache_key] = (latest_price, datetime.now())
            
            logger.info(f"Fetched current price for {symbol}: {latest_price:,.0f} VND")
            return latest_price
            
        except Exception as e:
            logger.error(f"Error fetching current price for {symbol}: {e}")
            return None
    
    def get_market_data(self, symbol: str) -> Optional[Dict[str, Any]]:
        """
        Get comprehensive market data for a stock
        
        Args:
            symbol: Stock symbol
            
        Returns:
            Dictionary with market data or None
        """
        try:
            from vnstock import Quote
            
            quote = Quote(symbol=symbol, source=self.source)
            
            # Get last 30 days for more context
            end_date = datetime.now()
            start_date = end_date - timedelta(days=30)
            
            df = quote.history(
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            )
            
            if df is None or df.empty:
                return None
            
            # Calculate additional metrics
            # Note: vnstock returns prices in thousands, convert to VND
            latest_data = df.iloc[-1]
            
            market_data = {
                'symbol': symbol,
                'current_price': float(latest_data['close']) * 1000,
                'open': float(latest_data['open']) * 1000,
                'high': float(latest_data['high']) * 1000,
                'low': float(latest_data['low']) * 1000,
                'volume': int(latest_data['volume']),
                'timestamp': latest_data['time'] if 'time' in latest_data else datetime.now().isoformat(),
                
                # 30-day statistics
                'high_30d': float(df['high'].max()) * 1000,
                'low_30d': float(df['low'].min()) * 1000,
                'avg_volume_30d': int(df['volume'].mean()),
                
                # Price changes
                'change_1d': float(df['close'].iloc[-1] - df['close'].iloc[-2]) * 1000 if len(df) > 1 else 0,
                'change_1d_pct': float((df['close'].iloc[-1] / df['close'].iloc[-2] - 1) * 100) if len(df) > 1 else 0,
            }
            
            logger.info(f"Fetched market data for {symbol}: {market_data['current_price']:,.0f} VND")
            return market_data
            
        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {e}")
            return None
    
    def get_intraday_data(self, symbol: str, page_size: int = 100) -> Optional[pd.DataFrame]:
        """
        Get intraday trading data
        
        Args:
            symbol: Stock symbol
            page_size: Number of records to fetch
            
        Returns:
            DataFrame with intraday data or None
        """
        try:
            from vnstock import Quote
            
            quote = Quote(symbol=symbol, source=self.source)
            df = quote.intraday(page_size=page_size)
            
            logger.info(f"Fetched {len(df)} intraday records for {symbol}")
            return df
            
        except Exception as e:
            logger.error(f"Error fetching intraday data for {symbol}: {e}")
            return None
    
    def get_warrant_price(self, warrant_symbol: str) -> Optional[float]:
        """
        Get current market price for a warrant
        
        Args:
            warrant_symbol: Warrant symbol (e.g., 'CFPT2502', 'CVNM2503')
            
        Returns:
            Current warrant price in VND or None
        """
        try:
            # Check cache first
            cache_key = f"{warrant_symbol}_{self.source}_warrant"
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                if (datetime.now() - cached_time).seconds < self.cache_duration:
                    logger.debug(f"Using cached warrant price for {warrant_symbol}: {cached_data}")
                    return cached_data
            
            from vnstock import Quote
            
            # Get warrant quote data
            quote = Quote(symbol=warrant_symbol, source=self.source)
            
            # Get last 2 days of data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=5)
            
            df = quote.history(
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            )
            
            if df is None or df.empty:
                logger.warning(f"No warrant price data for {warrant_symbol}")
                return None
            
            # Get most recent close price (warrants are in VND, not thousands)
            warrant_price = float(df['close'].iloc[-1])
            
            # Cache the result
            self.cache[cache_key] = (warrant_price, datetime.now())
            
            logger.info(f"Fetched warrant price for {warrant_symbol}: {warrant_price:,.2f} VND")
            return warrant_price
            
        except Exception as e:
            logger.error(f"Error fetching warrant price for {warrant_symbol}: {e}")
            return None
    
    def calculate_historical_volatility(self, symbol: str, days: int = 30) -> Optional[float]:
        """
        Calculate annualized historical volatility from vnstock data
        
        Formula:
        1. Daily Return = ln(Today's Price / Yesterday's Price)
        2. Daily Std Dev = sqrt(sum((xi - mean)^2) / (n-1))
        3. Annualized Volatility = Daily Std Dev × sqrt(252)
        
        Args:
            symbol: Stock or warrant symbol
            days: Number of days for calculation (default 30)
            
        Returns:
            Annualized volatility as decimal (e.g., 0.25 = 25%)
        """
        try:
            import numpy as np
            from vnstock import Quote
            
            # Check cache
            cache_key = f"{symbol}_vol_{days}"
            if cache_key in self.cache:
                cached_data, cached_time = self.cache[cache_key]
                if (datetime.now() - cached_time).seconds < self.cache_duration * 10:  # Cache vol longer
                    logger.debug(f"Using cached volatility for {symbol}: {cached_data:.2%}")
                    return cached_data
            
            quote = Quote(symbol=symbol, source=self.source)
            
            # Get historical data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days + 10)  # Extra days for safety
            
            df = quote.history(
                start=start_date.strftime('%Y-%m-%d'),
                end=end_date.strftime('%Y-%m-%d')
            )
            
            if df is None or len(df) < 10:
                logger.warning(f"Insufficient data for volatility calculation: {symbol}")
                return None
            
            # Calculate daily returns using log returns
            prices = df['close'].values
            
            # Step 1: Calculate log returns
            log_returns = np.log(prices[1:] / prices[:-1])
            
            # Step 2 & 3: Calculate standard deviation (sample)
            daily_std = np.std(log_returns, ddof=1)  # ddof=1 for sample std
            
            # Step 4: Annualize (252 trading days per year)
            annualized_volatility = daily_std * np.sqrt(252)
            
            # Cache the result
            self.cache[cache_key] = (annualized_volatility, datetime.now())
            
            logger.info(f"Calculated volatility for {symbol} ({len(log_returns)} days): {annualized_volatility:.2%}")
            return annualized_volatility
            
        except Exception as e:
            logger.error(f"Error calculating volatility for {symbol}: {e}")
            return None
    
    def clear_cache(self):
        """Clear the price cache"""
        self.cache = {}
        logger.info("Market data cache cleared")


# Global instance
market_data_service = MarketDataService() 