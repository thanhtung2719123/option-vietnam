"""
Dynamic Delta Hedging Engine Wrapper
Provides compatibility layer for API endpoints
"""

from .delta_hedging_engine import DynamicDeltaHedgingEngine

# Re-export for API compatibility
__all__ = ['DynamicDeltaHedgingEngine'] 