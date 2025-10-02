import sys
import os

sys.path.append(os.path.dirname(__file__))

from backend.models.database_models import SessionLocal, Warrant

def check_active():
    db = SessionLocal()
    
    try:
        total = db.query(Warrant).count()
        active = db.query(Warrant).filter(Warrant.is_active == True).count()
        inactive = db.query(Warrant).filter(Warrant.is_active == False).count()
        
        print(f"📊 Total warrants: {total}")
        print(f"✅ Active warrants: {active}")
        print(f"❌ Inactive warrants: {inactive}")
        
        if active == 0:
            print("\n⚠️ PROBLEM: No active warrants found!")
            print("   The API filters by is_active == True")
            
            # Show some samples
            print("\n🔍 Sample warrants status:")
            for w in db.query(Warrant).limit(10):
                print(f"  {w.symbol}: is_active = {w.is_active}")
        else:
            print("\n✅ Active warrants exist, API should work")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_active() 