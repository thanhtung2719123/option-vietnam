"""
Vietnamese Market Specific Configuration
Market parameters, trading hours, holidays, and warrant specifications
"""

from typing import Dict, List, Tuple
from datetime import time, date
from enum import Enum

class MarketSession(Enum):
    """Vietnamese market trading sessions"""
    MORNING = "morning"
    AFTERNOON = "afternoon"
    ATO = "ato"  # At The Opening
    ATC = "atc"  # At The Close

class ExchangeCode(Enum):
    """Vietnamese stock exchanges"""
    HOSE = "HOSE"  # Ho Chi Minh Stock Exchange
    HNX = "HNX"    # Hanoi Stock Exchange
    UPCOM = "UPCOM"  # Unlisted Public Company Market

class VNMarketConfig:
    """
    Vietnamese market configuration and parameters
    """
    
    # Trading Hours (Vietnam timezone UTC+7)
    TRADING_HOURS = {
        MarketSession.ATO: {
            "start": time(8, 45),
            "end": time(9, 0)
        },
        MarketSession.MORNING: {
            "start": time(9, 0),
            "end": time(11, 30)
        },
        MarketSession.AFTERNOON: {
            "start": time(13, 0),
            "end": time(14, 45)
        },
        MarketSession.ATC: {
            "start": time(14, 45),
            "end": time(15, 0)
        }
    }
    
    # Market Holidays 2024-2025 (will need annual updates)
    MARKET_HOLIDAYS = [
        date(2024, 1, 1),   # New Year's Day
        date(2024, 2, 8),   # Lunar New Year's Eve
        date(2024, 2, 9),   # Lunar New Year
        date(2024, 2, 10),  # Lunar New Year
        date(2024, 2, 11),  # Lunar New Year
        date(2024, 2, 12),  # Lunar New Year
        date(2024, 2, 13),  # Lunar New Year
        date(2024, 2, 14),  # Lunar New Year
        date(2024, 4, 18),  # Hung Kings' Commemoration Day
        date(2024, 4, 30),  # Liberation Day
        date(2024, 5, 1),   # International Labor Day
        date(2024, 9, 2),   # National Day
        # Add 2025 holidays as needed
    ]
    
    # Transaction Costs by Exchange
    TRANSACTION_COSTS = {
        ExchangeCode.HOSE: {
            "brokerage_fee": 0.0015,  # 0.15%
            "clearing_fee": 0.00004,  # 0.004%
            "transfer_fee": 0.00002,  # 0.002%
            "total": 0.00156  # Total ~0.156%
        },
        ExchangeCode.HNX: {
            "brokerage_fee": 0.0015,
            "clearing_fee": 0.00004,
            "transfer_fee": 0.00002,
            "total": 0.00156
        },
        ExchangeCode.UPCOM: {
            "brokerage_fee": 0.002,   # Higher for UPCOM
            "clearing_fee": 0.00004,
            "transfer_fee": 0.00002,
            "total": 0.00206
        }
    }
    
    # Price Tick Sizes
    TICK_SIZES = {
        "under_10k": 10,      # VND 10 for prices under 10,000
        "10k_to_50k": 50,     # VND 50 for prices 10,000-50,000
        "50k_to_100k": 100,   # VND 100 for prices 50,000-100,000
        "over_100k": 500      # VND 500 for prices over 100,000
    }
    
    # Circuit Breaker Limits
    CIRCUIT_BREAKERS = {
        "daily_limit": 0.07,  # ±7% daily price limit
        "reference_price_adjustment": 0.07,
        "warrant_limit": 0.15  # ±15% for warrants (if different)
    }
    
    # Warrant Market Makers (major issuers)
    WARRANT_ISSUERS = {
        "KIS": "Korea Investment & Securities",
        "ACBS": "Asia Commercial Bank Securities",
        "VCI": "Vietcap Securities",
        "VPS": "VPS Securities",
        "VCSC": "Viet Capital Securities",
        "HSC": "Ho Chi Minh Securities",
        "BSC": "Bao Viet Securities",
        "TCBS": "Techcom Securities"
    }
    
    # Common Underlying Assets for Warrants
    POPULAR_UNDERLYING = {
        "VN30_STOCKS": [
            "ACB", "BCM", "BID", "BVH", "CTG", "FPT", "GAS", "GVR", 
            "HDB", "HPG", "MBB", "MSN", "MWG", "PLX", "POW", "SAB",
            "SHB", "SSB", "SSI", "STB", "TCB", "TPB", "VCB", "VHM",
            "VIB", "VIC", "VJC", "VNM", "VPB", "VRE"
        ],
        "BANKING": ["ACB", "BID", "CTG", "HDB", "MBB", "SHB", "SSB", "STB", "TCB", "VCB", "VIB", "VPB"],
        "REAL_ESTATE": ["VHM", "VIC", "VRE", "NVL", "KDH", "DXG"],
        "TECHNOLOGY": ["FPT", "CMG", "ELC"],
        "UTILITIES": ["GAS", "POW", "PVS"],
        "INDUSTRIALS": ["HPG", "HSG", "NKG"]
    }
    
    # Risk-Free Rate Proxies for Vietnam
    RISK_FREE_PROXIES = {
        "government_bond_10y": 0.04,  # 10-year government bond
        "government_bond_5y": 0.038,  # 5-year government bond
        "interbank_rate": 0.045,      # Interbank rate
        "vnx30_futures_basis": 0.042  # VN30 futures implied rate
    }
    
    # Volatility Benchmarks
    VOLATILITY_BENCHMARKS = {
        "vn30_historical": 0.15,      # VN30 historical volatility
        "individual_stock_avg": 0.25,  # Average individual stock volatility
        "warrant_implied_avg": 0.30,   # Average warrant implied volatility
        "crisis_period": 0.45          # High volatility periods
    }
    
    # Market Microstructure
    MICROSTRUCTURE = {
        "lot_size": 100,               # Standard lot size
        "warrant_lot_size": 100,       # Warrant lot size
        "minimum_order": 1,            # Minimum order (lots)
        "maximum_order": 1000000,      # Maximum order (lots)
        "settlement_days": 2           # T+2 settlement
    }
    
    @classmethod
    def get_tick_size(cls, price: float) -> float:
        """Get appropriate tick size for a given price"""
        if price < 10000:
            return cls.TICK_SIZES["under_10k"]
        elif price < 50000:
            return cls.TICK_SIZES["10k_to_50k"]
        elif price < 100000:
            return cls.TICK_SIZES["50k_to_100k"]
        else:
            return cls.TICK_SIZES["over_100k"]
    
    @classmethod
    def get_transaction_cost(cls, exchange: ExchangeCode) -> float:
        """Get total transaction cost for an exchange"""
        return cls.TRANSACTION_COSTS[exchange]["total"]
    
    @classmethod
    def is_trading_day(cls, check_date: date) -> bool:
        """Check if a given date is a trading day"""
        # Check if it's a weekend
        if check_date.weekday() >= 5:  # Saturday = 5, Sunday = 6
            return False
        
        # Check if it's a market holiday
        return check_date not in cls.MARKET_HOLIDAYS
    
    @classmethod
    def get_risk_free_rate(cls, proxy: str = "government_bond_10y") -> float:
        """Get risk-free rate for options pricing"""
        return cls.RISK_FREE_PROXIES.get(proxy, 0.04)

# Export configuration instance
vn_market_config = VNMarketConfig() 