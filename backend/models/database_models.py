from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./vn_options_risk_engine.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Database Models
class Warrant(Base):
    __tablename__ = "warrants"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    underlying_symbol = Column(String(20), nullable=False)
    warrant_type = Column(String(10), nullable=False)  # Call or Put
    strike_price = Column(Float, nullable=False)
    maturity_date = Column(DateTime, nullable=False)
    exercise_ratio = Column(Float, nullable=False)
    issuer = Column(String(100), nullable=False)
    listing_date = Column(DateTime, nullable=False)
    close_price = Column(Float, nullable=True)  # Current market price from scraper
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pricing_results = relationship("PricingResult", back_populates="warrant")
    greeks_results = relationship("GreeksResult", back_populates="warrant")

class PricingResult(Base):
    __tablename__ = "pricing_results"
    
    id = Column(Integer, primary_key=True, index=True)
    warrant_id = Column(Integer, ForeignKey("warrants.id"), nullable=False)
    model_type = Column(String(50), nullable=False)  # Black-Scholes, Heston, Monte Carlo
    spot_price = Column(Float, nullable=False)
    risk_free_rate = Column(Float, nullable=False)
    volatility = Column(Float, nullable=False)
    time_to_maturity = Column(Float, nullable=False)
    theoretical_price = Column(Float, nullable=False)
    market_price = Column(Float, nullable=True)
    pricing_error = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    warrant = relationship("Warrant", back_populates="pricing_results")

class GreeksResult(Base):
    __tablename__ = "greeks_results"
    
    id = Column(Integer, primary_key=True, index=True)
    warrant_id = Column(Integer, ForeignKey("warrants.id"), nullable=False)
    model_type = Column(String(50), nullable=False)
    delta = Column(Float, nullable=False)
    gamma = Column(Float, nullable=False)
    vega = Column(Float, nullable=False)
    theta = Column(Float, nullable=False)
    rho = Column(Float, nullable=False)
    lambda_greek = Column(Float, nullable=True)  # Elasticity
    vanna = Column(Float, nullable=True)
    volga = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    warrant = relationship("Warrant", back_populates="greeks_results")

class HedgingResult(Base):
    __tablename__ = "hedging_results"
    
    id = Column(Integer, primary_key=True, index=True)
    warrant_symbol = Column(String(20), nullable=False)
    strategy_type = Column(String(50), nullable=False)  # Delta, Gamma, etc.
    initial_delta = Column(Float, nullable=False)
    target_delta = Column(Float, nullable=False)
    hedge_ratio = Column(Float, nullable=False)
    transaction_cost = Column(Float, nullable=False)
    total_pnl = Column(Float, nullable=False)
    hedging_error = Column(Float, nullable=False)
    rebalancing_frequency = Column(Integer, nullable=False)
    simulation_days = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskMetrics(Base):
    __tablename__ = "risk_metrics"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(String(50), nullable=False)
    metric_type = Column(String(50), nullable=False)  # VaR, ES, Max Drawdown
    confidence_level = Column(Float, nullable=False)
    time_horizon = Column(Integer, nullable=False)  # days
    metric_value = Column(Float, nullable=False)
    calculation_method = Column(String(50), nullable=False)  # Historical, Monte Carlo, Parametric
    created_at = Column(DateTime, default=datetime.utcnow)

# Create all tables
Base.metadata.create_all(bind=engine)

print(" Database models created successfully!")
print(" Tables created:")
print("  - warrants")
print("  - pricing_results") 
print("  - greeks_results")
print("  - hedging_results")
print("  - risk_metrics")
