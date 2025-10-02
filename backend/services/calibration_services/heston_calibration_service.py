"""
Heston Calibration Service with Caching
Manages calibration of Heston model parameters from real VN30 data
Caches results to avoid expensive recalibration
"""

import logging
from typing import Dict, Optional
from datetime import datetime, timedelta
import json
import os

logger = logging.getLogger(__name__)


class HestonCalibrationService:
    """
    Service to manage Heston parameter calibration and caching
    
    Calibrates Heston parameters from real VN30 historical data and caches
    the results to avoid expensive recalibration on every request.
    """
    
    def __init__(self, cache_file: str = 'heston_params_cache.json'):
        """
        Initialize calibration service
        
        Args:
            cache_file: Path to cache file for storing calibrated parameters
        """
        self.cache_file = os.path.join('backend', 'data', cache_file)
        self.cached_params = None
        self.last_calibration = None
        self.cache_duration_days = 7  # Recalibrate weekly
        
        # Ensure data directory exists
        os.makedirs(os.path.dirname(self.cache_file), exist_ok=True)
        
        # Load cached parameters if available
        self._load_cache()
    
    def _load_cache(self):
        """Load cached parameters from file"""
        try:
            if os.path.exists(self.cache_file):
                with open(self.cache_file, 'r') as f:
                    cache_data = json.load(f)
                    self.cached_params = cache_data.get('params')
                    last_cal_str = cache_data.get('last_calibration')
                    if last_cal_str:
                        self.last_calibration = datetime.fromisoformat(last_cal_str)
                    logger.info(f"Loaded cached Heston parameters from {self.cache_file}")
        except Exception as e:
            logger.warning(f"Could not load cache: {e}")
    
    def _save_cache(self):
        """Save parameters to cache file"""
        try:
            cache_data = {
                'params': self.cached_params,
                'last_calibration': self.last_calibration.isoformat() if self.last_calibration else None
            }
            with open(self.cache_file, 'w') as f:
                json.dump(cache_data, f, indent=2)
            logger.info(f"Saved Heston parameters to cache: {self.cache_file}")
        except Exception as e:
            logger.error(f"Could not save cache: {e}")
    
    def get_calibrated_params(self, force_recalibrate: bool = False) -> Dict:
        """
        Get Heston parameters calibrated from real VN30 data
        
        Caches results to avoid expensive calibration on every call.
        Automatically recalibrates if cache is older than cache_duration_days.
        
        Args:
            force_recalibrate: Force recalibration even if cache is fresh
            
        Returns:
            Dictionary with Heston parameters:
            {
                'kappa': float,  # Mean reversion speed
                'theta': float,  # Long-term variance
                'sigma': float,  # Volatility of volatility
                'rho': float,    # Correlation
                'v0': float      # Initial variance
            }
        """
        # Check if cache is valid
        if self.cached_params and not force_recalibrate:
            if self.last_calibration:
                age = datetime.now() - self.last_calibration
                if age.days < self.cache_duration_days:
                    logger.info(f"Using cached Heston parameters (age: {age.days} days)")
                    return self.cached_params
        
        # Calibrate from real VN30 data
        logger.info("Calibrating Heston parameters from VN30 historical data...")
        
        try:
            from backend.services.calibration_services.heston_calibrator import (
                VN30DataFetcher, HestonCalibrator
            )
            
            # Fetch VN30 historical data
            fetcher = VN30DataFetcher()
            df, stats = fetcher.prepare_calibration_data()
            
            logger.info(f"Fetched {stats['total_days']} days of VN30 data "
                       f"({stats['start_date']} to {stats['end_date']})")
            
            # Calibrate Heston model
            calibrator = HestonCalibrator()
            params = calibrator.calibrate_from_timeseries(df)
            
            # Cache the results
            self.cached_params = params
            self.last_calibration = datetime.now()
            self._save_cache()
            
            logger.info(f"✅ Heston calibration complete:")
            logger.info(f"   κ (kappa): {params['kappa']:.4f}")
            logger.info(f"   θ (theta): {params['theta']:.4f}")
            logger.info(f"   σ (sigma): {params['sigma']:.4f}")
            logger.info(f"   ρ (rho):   {params['rho']:.4f}")
            logger.info(f"   v₀ (v0):   {params['v0']:.4f}")
            
            return params
            
        except Exception as e:
            logger.error(f"Calibration failed: {e}")
            
            # Return default parameters if calibration fails
            logger.warning("Using default Heston parameters for Vietnamese market")
            default_params = {
                'kappa': 3.0,    # Mean reversion speed
                'theta': 0.10,   # Long-term variance (~31.6% vol)
                'sigma': 0.40,   # Vol of vol
                'rho': -0.60,    # Correlation (leverage effect)
                'v0': 0.12       # Initial variance (~34.6% vol)
            }
            return default_params
    
    def get_params_with_fallback(self) -> Dict:
        """
        Get Heston parameters with automatic fallback to defaults
        
        Returns:
            Heston parameters dictionary
        """
        try:
            return self.get_calibrated_params(force_recalibrate=False)
        except Exception as e:
            logger.error(f"Failed to get calibrated params: {e}")
            # Return conservative defaults for Vietnamese market
            return {
                'kappa': 3.0,
                'theta': 0.10,
                'sigma': 0.40,
                'rho': -0.60,
                'v0': 0.12
            }
    
    def clear_cache(self):
        """Clear cached parameters and force recalibration on next call"""
        self.cached_params = None
        self.last_calibration = None
        if os.path.exists(self.cache_file):
            os.remove(self.cache_file)
        logger.info("Cleared Heston parameter cache")


# Global instance
_heston_service = None

def get_heston_service() -> HestonCalibrationService:
    """Get global Heston calibration service instance"""
    global _heston_service
    if _heston_service is None:
        _heston_service = HestonCalibrationService()
    return _heston_service 