from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import pandas as pd
from datetime import datetime

# Your InfluxDB token
TOKEN = "GSQwVFtuONA6rNbHwID3vSUFuRHWzWGxJJhnY-Lxoro1dGEMw81dNT8ibxrKW8KPSOszNj6J-J0vrf0zA3qy9Q=="

# Connect to InfluxDB
client = InfluxDBClient(
    url="http://localhost:8086",
    token=TOKEN,
    org="Pope Brothers LTD"  # Corrected org name
)

# Read your IONQ CSV
df = pd.read_csv(r"C:\ANFA\IONQ_historical.csv")
df['Date'] = pd.to_datetime(df['Date'])

print(f"Loading {len(df)} records from IONQ_historical.csv...")

write_api = client.write_api(write_options=SYNCHRONOUS)

# Import all records
count = 0
for index, row in df.iterrows():
    point = Point("ionq_stock") \
        .time(row['Date']) \
        .field("open", float(row['Open'])) \
        .field("high", float(row['High'])) \
        .field("low", float(row['Low'])) \
        .field("close", float(row['Close'])) \
        .field("volume", int(row['Volume']))
    
    write_api.write(bucket="stocks", org="Pope Brothers LTD", record=point)
    count += 1
    if count % 100 == 0:
        print(f"Imported {count} records...")

print(f"Successfully imported {len(df)} IONQ stock records!")

# Test query
query_api = client.query_api()
query = '''
from(bucket: "stocks")
  |> range(start: -5y)
  |> filter(fn: (r) => r._measurement == "ionq_stock")
  |> filter(fn: (r) => r._field == "close")
  |> last()
'''

result = query_api.query(query)
for table in result:
    for record in table.records:
        print(f"Latest close price: ${record['_value']:.2f} at {record['_time']}")

client.close()
