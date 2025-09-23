#!/usr/bin/env python3
"""
Import IONQ historical data from CSV to InfluxDB
"""

import pandas as pd
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime

# InfluxDB connection details
INFLUX_URL = "http://localhost:8086"
# Note: In production, store this token securely
# This is the default admin token from the setup
INFLUX_TOKEN = "admin_token_generated_during_setup"
INFLUX_ORG = "personal"
INFLUX_BUCKET = "stock_data"

# CSV file path
CSV_FILE = r"C:\ANFA\IONQ_historical.csv"

def import_csv_to_influxdb():
    """Import IONQ historical data from CSV to InfluxDB"""
    
    # Read CSV file
    print(f"Reading CSV file: {CSV_FILE}")
    df = pd.read_csv(CSV_FILE)
    
    # Convert Date column to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    print(f"Found {len(df)} records to import")
    
    # Connect to InfluxDB
    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)
    
    # Import data
    points = []
    for index, row in df.iterrows():
        point = Point("ionq_stock") \
            .time(row['Date']) \
            .field("open", float(row['Open'])) \
            .field("high", float(row['High'])) \
            .field("low", float(row['Low'])) \
            .field("close", float(row['Close'])) \
            .field("volume", int(row['Volume']))
        
        points.append(point)
        
        # Write in batches of 1000
        if len(points) >= 1000:
            write_api.write(bucket=INFLUX_BUCKET, record=points)
            print(f"Imported {index + 1} records...")
            points = []
    
    # Write remaining points
    if points:
        write_api.write(bucket=INFLUX_BUCKET, record=points)
    
    print(f"Successfully imported {len(df)} records to InfluxDB!")
    
    # Query to verify data
    query_api = client.query_api()
    query = f'''
    from(bucket: "{INFLUX_BUCKET}")
        |> range(start: -5y)
        |> filter(fn: (r) => r._measurement == "ionq_stock")
        |> filter(fn: (r) => r._field == "close")
        |> last()
    '''
    
    result = query_api.query(query=query)
    for table in result:
        for record in table.records:
            print(f"Last close price: ${record['_value']} at {record['_time']}")
    
    client.close()

if __name__ == "__main__":
    import_csv_to_influxdb()
