import pandas as pd
import requests
import json
from datetime import datetime

# Read the CSV file
csv_file = r"C:\ANFA\IONQ_historical.csv"
df = pd.read_csv(csv_file)

print(f"Loaded {len(df)} rows of IONQ data")
print(f"Date range: {df['Date'].min()} to {df['Date'].max()}")
print(f"\nFirst few rows:")
print(df.head())

# Data statistics
print(f"\nData Statistics:")
print(f"Average Close Price: ${df['Close'].astype(float).mean():.2f}")
print(f"Min Close Price: ${df['Close'].astype(float).min():.2f}")
print(f"Max Close Price: ${df['Close'].astype(float).max():.2f}")
print(f"Total Volume: {df['Volume'].astype(int).sum():,}")

# Save as JSON for easier import
json_data = []
for _, row in df.iterrows():
    json_data.append({
        "timestamp": row['Date'],
        "open": float(row['Open']),
        "high": float(row['High']),
        "low": float(row['Low']),
        "close": float(row['Close']),
        "volume": int(row['Volume'])
    })

# Save to JSON file
output_file = r"C:\ANFA\IONQ_historical.json"
with open(output_file, 'w') as f:
    json.dump(json_data, f, indent=2)

print(f"\nData saved to {output_file}")
print("InfluxDB is running at http://localhost:8086")
print("You can access the InfluxDB UI to complete setup and import data.")
