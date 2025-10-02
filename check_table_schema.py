import sqlite3

# Connect to database
conn = sqlite3.connect('vn_options_risk_engine.db')
cursor = conn.cursor()

# Get table schema
cursor.execute("PRAGMA table_info(warrants)")
columns = cursor.fetchall()

print("📊 Table 'warrants' schema:")
print("-" * 50)
for col in columns:
    col_id, name, type_, notnull, default, pk = col
    print(f"{col_id}: {name:<20} {type_:<10} {'NOT NULL' if notnull else 'NULL':<10} {'PK' if pk else ''}")

conn.close() 