import sys
import os
import pandas as pd
from datetime import datetime
import re

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from backend.models.database_models import SessionLocal, Warrant, engine, Base

def parse_conversion_ratio(ratio_str):
    """Parse conversion ratio from string like '1.6712 : 1' to float"""
    try:
        if ':' in ratio_str:
            parts = ratio_str.split(':')
            return float(parts[0].strip())
        else:
            return float(ratio_str)
    except:
        return 1.0

def parse_date(date_str):
    """Parse date from DD/MM/YYYY format"""
    try:
        return datetime.strptime(date_str.strip(), '%d/%m/%Y')
    except:
        return datetime.now()

def parse_price(price_str):
    """Parse price from string, removing any formatting"""
    try:
        # Remove any non-numeric characters except decimal point
        clean_price = re.sub(r'[^\d.]', '', str(price_str))
        return float(clean_price) if clean_price else 0.0
    except:
        return 0.0

def import_warrants_from_csv(csv_file):
    """Import warrants from CSV file to database"""
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Read CSV
        print(f"📖 Reading CSV file: {csv_file}")
        df = pd.read_csv(csv_file)
        print(f"📊 Found {len(df)} warrants in CSV")
        
        # Clear existing warrants
        print("🗑️ Clearing existing warrants...")
        db.query(Warrant).delete()
        
        # Import warrants
        imported_count = 0
        skipped_count = 0
        
        for index, row in df.iterrows():
            try:
                # Map CSV columns to database fields
                warrant_data = {
                    "symbol": row['cw_code'],
                    "underlying_symbol": row['underlying_code'],
                    "warrant_type": "Call" if row['warrant_type'] == "Mua" else "Put",
                    "strike_price": parse_price(row['exercise_price']),
                    "maturity_date": parse_date(row['last_trading_date']),
                    "exercise_ratio": parse_conversion_ratio(row['conversion_ratio']),
                    "issuer": row['issuer'],
                    "listing_date": parse_date(row['first_trading_date']),
                    "close_price": parse_price(row['close_price']),
                    "is_active": True if row['status'] == "Bình thường" else False
                }
                
                # Create warrant
                warrant = Warrant(**warrant_data)
                db.add(warrant)
                imported_count += 1
                
                if imported_count % 50 == 0:
                    print(f"⏳ Imported {imported_count} warrants...")
                
            except Exception as e:
                print(f"⚠️ Error importing warrant {row.get('cw_code', 'Unknown')}: {e}")
                skipped_count += 1
                continue
        
        # Commit all changes
        db.commit()
        
        print(f"\n✅ Import completed!")
        print(f"   📊 Total warrants: {len(df)}")
        print(f"   ✅ Successfully imported: {imported_count}")
        print(f"   ⚠️ Skipped (errors): {skipped_count}")
        
        # Show some statistics
        print(f"\n📈 Database Statistics:")
        total_warrants = db.query(Warrant).count()
        active_warrants = db.query(Warrant).filter(Warrant.is_active == True).count()
        call_warrants = db.query(Warrant).filter(Warrant.warrant_type == "Call").count()
        put_warrants = db.query(Warrant).filter(Warrant.warrant_type == "Put").count()
        
        print(f"   📊 Total warrants in DB: {total_warrants}")
        print(f"   ✅ Active warrants: {active_warrants}")
        print(f"   📈 Call warrants: {call_warrants}")
        print(f"   📉 Put warrants: {put_warrants}")
        
        # Show top underlying assets
        print(f"\n🏆 Top Underlying Assets:")
        underlying_counts = db.execute("""
            SELECT underlying_symbol, COUNT(*) as count 
            FROM warrants 
            GROUP BY underlying_symbol 
            ORDER BY count DESC 
            LIMIT 10
        """).fetchall()
        
        for symbol, count in underlying_counts:
            print(f"   {symbol}: {count} warrants")
        
        return imported_count
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error importing warrants: {e}")
        return 0
    finally:
        db.close()

if __name__ == "__main__":
    csv_file = "vietstock_warrants_20251002_103806.csv"
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        print("Available files:")
        for file in os.listdir("."):
            if file.endswith(".csv"):
                print(f"   - {file}")
    else:
        import_warrants_from_csv(csv_file) 