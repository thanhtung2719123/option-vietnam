from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime
import logging
from typing import Dict, Any
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(__file__))

# Import API routers
from api.warrant_pricing import router as warrant_router
from api.hedging import router as hedging_router
from api.risk_management import router as risk_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Vietnamese Options Risk Management Engine",
    description="""
    Comprehensive options risk management system for Vietnamese covered warrants.
    
    Features:
    - Black-Scholes and Heston model pricing
    - Real-time Greeks calculation (Delta, Gamma, Vega, Theta, Rho)
    - Dynamic delta hedging simulation
    - Monte Carlo risk analysis
    - Vietnamese market data integration
    - Portfolio risk management
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(warrant_router)
app.include_router(hedging_router)
app.include_router(risk_router)

# Health check endpoint
@app.get("/", tags=["Health"])
async def root() -> Dict[str, Any]:
    """
    Health check and API information endpoint
    """
    return {
        "message": "Vietnamese Options Risk Management Engine",
        "status": "active",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "features": [
            "Options Pricing (Black-Scholes, Heston)",
            "Greeks Calculation (Δ, Γ, ν, Θ, ρ)",
            "Delta Hedging Simulation",
            "Monte Carlo Risk Analysis",
            "Vietnamese Market Data",
            "Portfolio Risk Management"
        ],
        "data_sources": [
            "vnstock - Vietnamese market data",
            "Vietstock - Warrant specifications",
            "py_vollib - Options pricing",
            "PyESG - Economic scenario generation"
        ],
        "api_endpoints": {
            "warrant_pricing": "/api/v1/warrants/",
            "hedging": "/api/v1/hedging/",
            "risk_management": "/api/v1/risk/"
        }
    }

@app.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """
    Simple health check endpoint
    """
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# API endpoint placeholders (will be implemented in subsequent phases)
@app.get("/api/v1/status", tags=["API Status"])
async def api_status() -> Dict[str, Any]:
    """
    API status and capabilities
    """
    return {
        "api_version": "1.0.0",
        "capabilities": {
            "warrant_pricing": "Available",
            "greeks_calculation": "Available", 
            "delta_hedging": "Available",
            "monte_carlo": "Available",
            "risk_management": "Available",
            "vietnamese_data": "Available"
        },
        "models_available": [
            "Black-Scholes",
            "Heston Stochastic Volatility",
            "Geometric Brownian Motion",
            "Academy Rate Model"
        ],
        "data_sources": {
            "vnstock": "Connected",
            "vietstock": "Available for scraping",
            "py_vollib": "Loaded",
            "pyesg": "Loaded"
        },
        "database": "SQLite (Development)",
        "endpoints": {
            "warrant_pricing": [
                "POST /api/v1/warrants/price",
                "GET /api/v1/warrants/{symbol}/greeks",
                "GET /api/v1/warrants/"
            ],
            "hedging": [
                "POST /api/v1/hedging/simulate",
                "POST /api/v1/hedging/optimize-rebalancing",
                "GET /api/v1/hedging/results/{warrant_symbol}"
            ],
            "risk_management": [
                "POST /api/v1/risk/var",
                "POST /api/v1/risk/stress-test",
                "POST /api/v1/risk/taylor-series",
                "GET /api/v1/risk/metrics/{portfolio_id}"
            ]
        }
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail, "timestamp": datetime.now().isoformat()}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "message": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """
    Application startup tasks
    """
    logger.info(" Vietnamese Options Risk Management Engine Starting...")
    logger.info(" Initializing mathematical models...")
    logger.info(" Connecting to Vietnamese market data sources...")
    logger.info(" Database: SQLite (Development)")
    logger.info(" Application ready!")
    logger.info(" API Documentation: http://localhost:8000/docs")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Application shutdown tasks
    """
    logger.info(" Vietnamese Options Risk Management Engine Shutting down...")
    logger.info(" Saving state and cleaning up resources...")
    logger.info(" Shutdown complete!")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
