# ANFA Volatility Scanner - Quick Start

## 🚀 Running the Scanner

```bash
# Pull latest code
git pull

# Run the working scanner
npx ts-node working-scanner.ts
```

## 📊 Testing the Scanner

Once running on port 3000, test with PowerShell:

```powershell
# Test if APIs are working
Invoke-RestMethod "http://localhost:3000/api/test"

# Find opportunities
Invoke-RestMethod "http://localhost:3000/api/scanner/opportunities" -Method POST -ContentType "application/json" -Body '{"symbols":["NVDA","AAPL","TSLA"]}'

# Get volatility analysis
Invoke-RestMethod "http://localhost:3000/api/scanner/volatility/NVDA"
```

## ✅ What Works

- Real-time data from Polygon.io
- Company data from Finnhub
- Volatility calculations
- Opportunity scoring
- Simple and reliable

## 🔑 Required API Keys

Make sure these are in your `.env` file:
- `POLYGON_API_KEY`
- `FINNHUB_API_KEY`

## 📝 Notes

- Uses port 3000 by default
- No Docker/Redis required
- Simplified version that actually works
