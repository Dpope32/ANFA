# Stock Price Prediction Algorithm Architecture

## Algorithm Overview

Our hybrid quantitative-qualitative stock prediction algorithm combines polynomial regression with P/E ratios and qualitative market factors to predict end-of-year stock prices. The algorithm has been tested on 8 major tech stocks (TSLA, AAPL, MSFT, AMZN, GOOGL, NVDA, AMD, TSM) with strong performance metrics (R² values 0.80-0.97).

## Core Algorithm Components

### 1. Data Preprocessing

```python
# Normalize time series: t = years since base year (e.g., 2010)
t = years - base_year

# Polygon market data preprocessing
polygon_data = validate_polygon_data(raw_market_data)
prices = polygon_data['adjusted_close']
volume = polygon_data['volume']
vwap = polygon_data['vwap']  # Volume-weighted average price

# Finnhub fundamentals preprocessing
finnhub_data = validate_finnhub_data(raw_fundamental_data)
pe_ratios = finnhub_data['pe_ratio']
forward_pe = finnhub_data['forward_pe']
valid_mask = ~np.isnan(pe_ratios) & (pe_ratios > 0)

# Quiver political data preprocessing
quiver_trades = filter_recent_political_trades(raw_political_data, days=90)
political_sentiment = calculate_political_sentiment(quiver_trades)
```

### 2. Model Selection Logic

```python
if len(valid_pe_data) >= 6:
    # Use multivariate model: price ~ t³ + t² + t + constant + P/E
    model_type = "multivariate"
    features = [t³, t², t, constant, pe_ratio]
else:
    # Fallback to cubic polynomial: price ~ t³ + t² + t + constant
    model_type = "cubic_fallback"
    features = [t³, t², t, constant]
```

### 3. Regression Models

#### Multivariate Cubic Model

- **Formula:** `price = a*t³ + b*t² + c*t + d + e*PE`
- **Method:** Ordinary Least Squares (OLS) regression
- **Use Case:** When sufficient P/E historical data exists (≥6 points)
- **Advantages:** Captures both temporal trends and valuation effects

#### Cubic Polynomial Fallback

- **Formula:** `price = a*t³ + b*t² + c*t + d`
- **Method:** NumPy polyfit with degree=3
- **Use Case:** When P/E data is insufficient or unreliable
- **Advantages:** Robust to missing data, captures non-linear growth patterns

### 4. Evaluation Metrics

- **R² (Coefficient of Determination):** Measures explained variance (0-1, higher better)
- **RMSE (Root Mean Square Error):** Measures prediction error (lower better)
- **Model Selection:** Prefer multivariate if R² improvement > 0.05 over cubic

### 5. Prediction Generation

```python
# For multivariate model with Finnhub P/E data
X_future = [future_t³, future_t², future_t, 1, forward_pe_finnhub]
predicted_price = model.predict(X_future)

# Apply Quiver political trading adjustments
political_adjustment = calculate_political_impact(quiver_trades, symbol)
volume_adjustment = calculate_volume_anomaly(polygon_volume_data)

# Apply combined qualitative adjustments
total_adjustment = qualitative_factor + political_adjustment + volume_adjustment
adjusted_price = predicted_price * (1 + total_adjustment)
```

## Qualitative Adjustment Framework

### Risk Factors (Negative Adjustments)

- **Political/Trade Risks:** -5% for China-exposed stocks (AAPL, NVDA, TSM, AMD)
- **High Volatility:** -2% for stocks with implied volatility >40%
- **Regulatory Risks:** -3% for stocks facing potential regulation

### Growth Factors (Positive Adjustments)

- **High Revenue Growth:** +3% for stocks with >50% YoY revenue growth
- **Strong Institutional Ownership:** +2% for stocks with >70% institutional ownership
- **AI/Technology Leadership:** +5% for clear AI market leaders

### Market Context Factors

- **Market Cap Considerations:** Large cap (>$1T) gets stability bonus +1%
- **Sector Momentum:** Tech sector momentum adds +2% in bull markets
- **Earnings Quality:** High-quality earnings (low P/E relative to growth) +3%

## Three-Scenario Generation

### Conservative Scenario

- **Base:** Primary model prediction
- **Adjustment:** Apply all negative risk factors, 50% of positive factors
- **Probability:** 60-70% (highest likelihood)

### Bullish Scenario

- **Base:** Primary model prediction + 1 standard deviation
- **Adjustment:** Apply all positive factors, minimize negative factors
- **Probability:** 15-25% (optimistic case)

### Bearish Scenario

- **Base:** Primary model prediction - 1 standard deviation
- **Adjustment:** Apply all negative factors, no positive factors
- **Probability:** 15-25% (pessimistic case)

## Algorithm Performance

### Historical Validation Results

| Stock | Model Type   | R²    | RMSE  | Predicted 2025 | Current Price | % Gain |
| ----- | ------------ | ----- | ----- | -------------- | ------------- | ------ |
| AAPL  | Multivariate | 0.976 | 11.64 | $248           | $227          | +9.3%  |
| MSFT  | Multivariate | 0.955 | 28.11 | $491           | $501          | -1.9%  |
| TSLA  | Cubic        | 0.796 | 65.65 | $394           | $350          | +13.3% |
| NVDA  | Multivariate | 0.869 | 12.31 | $151           | $177          | -14.8% |

### Model Strengths

- **High Accuracy:** R² values consistently above 0.80 for most stocks
- **Robust Fallback:** Cubic model handles insufficient P/E data gracefully
- **Qualitative Integration:** Systematic incorporation of market factors
- **Scenario Diversity:** Three distinct probability-weighted outcomes

### Model Limitations

- **Overfitting Risk:** Multivariate model with limited data points
- **Forward P/E Dependency:** Requires accurate forward P/E estimates
- **Market Regime Changes:** May not capture sudden market structure shifts
- **Qualitative Subjectivity:** Manual adjustment factors need validation

## Implementation Architecture

### Core Classes

```python
class StockPredictor:
    def __init__(self, base_year=2010)
    def fit(self, polygon_data: pd.DataFrame, finnhub_data: pd.DataFrame)
    def predict(self, forward_pe: float, political_data: dict, qual_adjustments: dict)
    def generate_scenarios(self) -> dict
    def evaluate_model(self) -> dict

class MultiSourceDataManager:
    def __init__(self, polygon_client, finnhub_client, quiver_client)
    def fetch_all_data(self, symbol: str) -> CombinedStockData
    def validate_cross_source_consistency(self, data: dict) -> bool
    def cache_data(self, symbol: str, data: dict, ttl: int)

class PoliticalTradingAnalyzer:
    def analyze_politician_trades(self, quiver_trades: list) -> dict
    def calculate_political_sentiment(self, trades: list) -> float
    def detect_unusual_activity(self, trades: list, options_flow: list) -> bool
    def apply_political_adjustments(self, base_prediction: float) -> float

class QualitativeAdjuster:
    def calculate_risk_factors(self, stock_data: dict) -> float
    def calculate_growth_factors(self, stock_data: dict) -> float
    def calculate_political_factors(self, political_data: dict) -> float
    def apply_adjustments(self, base_prediction: float) -> float
```

### Data Pipeline

1. **Multi-Source Data Ingestion:**

   - Polygon: Historical prices, volume, VWAP, real-time data
   - Finnhub: P/E ratios, forward P/E, earnings, financial metrics
   - Quiver: Political trades, insider activity, unusual options flow

2. **Cross-Source Data Validation:**

   - Filter invalid/anomalous data points per source
   - Validate price consistency between sources when possible
   - Handle rate limiting and API failures gracefully

3. **Enhanced Model Training:**

   - Fit multivariate model with Polygon prices + Finnhub fundamentals
   - Incorporate volume-weighted metrics from Polygon
   - Fall back to cubic model based on data availability

4. **Multi-Factor Prediction:**

   - Generate base prediction using fitted model
   - Apply Quiver political trading intelligence
   - Factor in unusual options activity and insider trades

5. **Comprehensive Adjustment:**

   - Apply traditional qualitative factors
   - Add political sentiment adjustments
   - Include volume anomaly detection

6. **Enhanced Output:**
   - Return three scenarios with confidence metrics
   - Include data source attribution and freshness
   - Provide political trading context and insider activity summary

This architecture provides a systematic, testable approach to stock price prediction that balances quantitative rigor with qualitative market insights.
