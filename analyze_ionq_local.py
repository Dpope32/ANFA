"""
Local IONQ Historical Data Analysis
No InfluxDB required - using pandas and SQLite for time series analysis
"""

import pandas as pd
import sqlite3
import json
from datetime import datetime
import matplotlib.pyplot as plt
import numpy as np

# Read the CSV file
csv_file = r"C:\ANFA\IONQ_historical.csv"
df = pd.read_csv(csv_file)

# Convert Date to datetime
df['Date'] = pd.to_datetime(df['Date'])

# Convert price columns to float
for col in ['Open', 'High', 'Low', 'Close']:
    df[col] = df[col].astype(float)
df['Volume'] = df['Volume'].astype(int)

# Create SQLite database for time series queries
conn = sqlite3.connect(r'C:\ANFA\ionq_timeseries.db')
df.to_sql('ionq_prices', conn, if_exists='replace', index=False)

print("=" * 60)
print("IONQ Historical Data Analysis")
print("=" * 60)

# Basic Statistics
print(f"\n📊 Data Overview:")
print(f"  • Total trading days: {len(df)}")
print(f"  • Date range: {df['Date'].min().date()} to {df['Date'].max().date()}")
print(f"  • Days covered: {(df['Date'].max() - df['Date'].min()).days}")

print(f"\n💰 Price Statistics:")
print(f"  • Current Price (last close): ${df['Close'].iloc[-1]:.2f}")
print(f"  • Average Close: ${df['Close'].mean():.2f}")
print(f"  • Median Close: ${df['Close'].median():.2f}")
print(f"  • Min Close: ${df['Close'].min():.2f} on {df.loc[df['Close'].idxmin(), 'Date'].date()}")
print(f"  • Max Close: ${df['Close'].max():.2f} on {df.loc[df['Close'].idxmax(), 'Date'].date()}")
print(f"  • Standard Deviation: ${df['Close'].std():.2f}")

# Calculate returns
df['Daily