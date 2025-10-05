"""
Vietnamese Government Bond Rate Service
Fetches real-time Vietnamese government bond yields for risk-free rate in options pricing

Data Sources:
1. SSI API - State Securities Commission of Vietnam
2. Vietstock bond market data
3. Fallback to VNMarketConfig static rates
"""

import logging
import requests
from typing import Optional, Dict
from datetime import datetime, timedelta
import pandas as pd

logger = logging.getLogger(__name__)


class VNBondRateService:
    """Service to fetch Vietnamese government bond yields"""
    
    def __init__(self):
        """Initialize bond rate service"""
        self.cache = {}
        self.cache_duration = 3600  # Cache for 1 hour
        
        # API endpoints
        self.ssi_bond_url = "https://iboard-api.ssi.com.vn/statistics/bond"
        self.vietstock_bond_url = "https://finance.vietstock.vn/trai-phieu-chinh-phu"
        
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json'
        }
        
        # Fallback rates from VN market config
        self.fallback_rates = {
            "government_bond_10y": 0.04,  # 4.0%
            "government_bond_5y": 0.038,   # 3.8%
            "government_bond_3y": 0.035,   # 3.5%
            "interbank_rate": 0.045        # 4.5%
        }
        
        logger.info("VN Bond Rate Service initialized")
    
    def get_risk_free_rate(self, tenor: str = "10y") -> float:
        """
        Get Vietnamese risk-free rate (government bond yield)
        
        Args:
            tenor: Bond tenor ('3y', '5y', '10y')
            
        Returns:
            Risk-free rate as decimal (e.g., 0.04 = 4%)
        """
        try:
            # Check cache first
            cache_key = f"bond_rate_{tenor}"
            if cache_key in self.cache:
                cached_rate, cached_time = self.cache[cache_key]
                if (datetime.now() - cached_time).seconds < self.cache_duration:
                    logger.debug(f"Using cached bond rate for {tenor}: {cached_rate:.4f}")
                    return cached_rate
            
            # Try to fetch from API
            rate = self._fetch_from_vietstock(tenor)
            
            if rate is None:
                # Try SSI as backup
                rate = self._fetch_from_ssi(tenor)
            
            if rate is None:
                # Use fallback
                rate = self._get_fallback_rate(tenor)
                logger.warning(f"Using fallback rate for {tenor}: {rate:.4f}")
            else:
                logger.info(f"Fetched live bond rate for {tenor}: {rate:.4f}")
                # Cache the result
                self.cache[cache_key] = (rate, datetime.now())
            
            return rate
            
        except Exception as e:
            logger.error(f"Error fetching bond rate: {e}")
            return self._get_fallback_rate(tenor)
    
    def _fetch_from_vietstock(self, tenor: str) -> Optional[float]:
        """
        Fetch bond rate from Vietstock
        
        Note: This is a placeholder - actual implementation would need
        to scrape or use an API if available
        
        Args:
            tenor: Bond tenor
            
        Returns:
            Bond yield as decimal or None
        """
        try:
            # This would require actual Vietstock bond API or scraping
            # For now, return None to fall back to other sources
            logger.debug(f"Vietstock bond API not yet implemented")
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from Vietstock: {e}")
            return None
    
    def _fetch_from_ssi(self, tenor: str) -> Optional[float]:
        """
        Fetch bond rate from SSI API
        
        Args:
            tenor: Bond tenor
            
        Returns:
            Bond yield as decimal or None
        """
        try:
            # Map tenor to years
            tenor_years = int(tenor.replace('y', ''))
            
            # Try SSI bond statistics API
            response = requests.get(
                self.ssi_bond_url,
                headers=self.headers,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Parse bond data (structure depends on SSI API response)
                # This is a simplified example
                if 'data' in data:
                    for bond in data['data']:
                        if bond.get('tenor') == tenor_years:
                            yield_value = bond.get('yield')
                            if yield_value:
                                # Convert from percentage to decimal
                                return float(yield_value) / 100
                
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from SSI: {e}")
            return None
    
    def _get_fallback_rate(self, tenor: str) -> float:
        """
        Get fallback rate from static config
        
        Args:
            tenor: Bond tenor
            
        Returns:
            Fallback rate as decimal
        """
        tenor_map = {
            "3y": "government_bond_3y",
            "5y": "government_bond_5y",
            "10y": "government_bond_10y"
        }
        
        key = tenor_map.get(tenor, "government_bond_10y")
        return self.fallback_rates.get(key, 0.04)
    
    def get_all_bond_rates(self) -> Dict[str, float]:
        """
        Get all Vietnamese government bond rates
        
        Returns:
            Dictionary with tenor: rate pairs
        """
        return {
            "3y": self.get_risk_free_rate("3y"),
            "5y": self.get_risk_free_rate("5y"),
            "10y": self.get_risk_free_rate("10y")
        }
    
    def get_interpolated_rate(self, maturity_years: float) -> float:
        """
        Get interpolated risk-free rate for any maturity
        
        Uses linear interpolation between available tenors
        
        Args:
            maturity_years: Time to maturity in years
            
        Returns:
            Interpolated risk-free rate
        """
        # Get rates for 3y, 5y, 10y
        rates = self.get_all_bond_rates()
        
        # Interpolate based on maturity
        if maturity_years <= 3:
            return rates["3y"]
        elif maturity_years <= 5:
            # Interpolate between 3y and 5y
            weight = (maturity_years - 3) / (5 - 3)
            return rates["3y"] * (1 - weight) + rates["5y"] * weight
        elif maturity_years <= 10:
            # Interpolate between 5y and 10y
            weight = (maturity_years - 5) / (10 - 5)
            return rates["5y"] * (1 - weight) + rates["10y"] * weight
        else:
            # Use 10y rate for longer maturities
            return rates["10y"]
    
    def clear_cache(self):
        """Clear the rate cache"""
        self.cache = {}
        logger.info("Bond rate cache cleared")


# Global instance
vn_bond_rate_service = VNBondRateService()


# Convenience function
def get_vn_risk_free_rate(tenor: str = "10y") -> float:
    """
    Get Vietnamese risk-free rate
    
    Args:
        tenor: Bond tenor ('3y', '5y', '10y')
        
    Returns:
        Risk-free rate as decimal
    """
    return vn_bond_rate_service.get_risk_free_rate(tenor)


def get_dynamic_risk_free_rate(maturity_years: float) -> float:
    """
    Get dynamic risk-free rate based on warrant maturity
    
    Args:
        maturity_years: Warrant time to maturity in years
        
    Returns:
        Interpolated risk-free rate
    """
    return vn_bond_rate_service.get_interpolated_rate(maturity_years)

