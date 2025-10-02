import sys
import os
from datetime import datetime, timedelta
import random

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from backend.models.database_models import SessionLocal, Warrant

def create_sample_warrants():
    """
    Create sample Vietnamese warrants for testing
    """
    db = SessionLocal()
    
    try:
        # Sample Vietnamese warrants
        sample_warrants = [
            {
                "symbol": "VCB2401",
                "underlying_symbol": "VCB",
                "warrant_type": "Call",
                "strike_price": 85000,
                "maturity_date": datetime.now() + timedelta(days=90),
                "exercise_ratio": 0.1,
                "issuer": "SSI",
                "listing_date": datetime.now() - timedelta(days=30)
            },
            {
                "symbol": "VIC2402",
                "underlying_symbol": "VIC",
                "warrant_type": "Call",
                "strike_price": 75000,
                "maturity_date": datetime.now() + timedelta(days=120),
                "exercise_ratio": 0.1,
                "issuer": "HSC",
                "listing_date": datetime.now() - timedelta(days=45)
            },
            {
                "symbol": "VHM2403",
                "underlying_symbol": "VHM",
                "warrant_type": "Put",
                "strike_price": 65000,
                "maturity_date": datetime.now() + timedelta(days=60),
                "exercise_ratio": 0.1,
                "issuer": "VCBS",
                "listing_date": datetime.now() - timedelta(days=20)
            },
            {
                "symbol": "HPG2404",
                "underlying_symbol": "HPG",
                "warrant_type": "Call",
                "strike_price": 25000,
                "maturity_date": datetime.now() + timedelta(days=150),
                "exercise_ratio": 0.1,
                "issuer": "SSI",
                "listing_date": datetime.now() - timedelta(days=60)
            },
            {
                "symbol": "MSN2405",
                "underlying_symbol": "MSN",
                "warrant_type": "Call",
                "strike_price": 95000,
                "maturity_date": datetime.now() + timedelta(days=180),
                "exercise_ratio": 0.1,
                "issuer": "HSC",
                "listing_date": datetime.now() - timedelta(days=75)
            }
        ]
        
        # Clear existing warrants
        db.query(Warrant).delete()
        
        # Add sample warrants
        for warrant_data in sample_warrants:
            warrant = Warrant(**warrant_data)
            db.add(warrant)
        
        db.commit()
        print(" Sample warrants created successfully!")
        print(" Created warrants:")
        for warrant in sample_warrants:
            print(f"  - {warrant['symbol']}: {warrant['warrant_type']} {warrant['underlying_symbol']} @ {warrant['strike_price']:,} VND")
        
    except Exception as e:
        db.rollback()
        print(f" Error creating sample warrants: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_warrants()
