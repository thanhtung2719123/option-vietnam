import sys
import os

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from backend.models.database_models import SessionLocal, Warrant

def check_database():
    db = SessionLocal()
    
    try:
        # Count total warrants
        total = db.query(Warrant).count()
        print(f"📊 Total warrants in database: {total}")
        
        # Show sample warrants
        print("\n🔍 Sample warrants:")
        for warrant in db.query(Warrant).limit(10):
            print(f"  {warrant.symbol}: {warrant.underlying_symbol} @ {warrant.strike_price:,.0f} VND, ratio: {warrant.exercise_ratio}")
        
        # Count by underlying
        print(f"\n🏆 Top underlying assets:")
        from sqlalchemy import func, text
        
        result = db.execute(text("""
            SELECT underlying_symbol, COUNT(*) as count 
            FROM warrants 
            GROUP BY underlying_symbol 
            ORDER BY count DESC 
            LIMIT 10
        """))
        
        for row in result:
            print(f"   {row[0]}: {row[1]} warrants")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_database() 