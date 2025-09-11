# Stock Price Prediction Algorithm Architecture

## Algorithm Overview

Our hybrid quantitative-qualitative stock prediction algorithm combines polynomial regression with P/E ratios and qualitative market factors to predict end-of-year stock prices. The algorithm has been tested on 8 major tech stocks (TSLA, AAPL, MSFT, AMZN, GOOGL, NVDA, AMD, TSM) with strong performance metrics (R² values 0.80-0.97).

## Core Algorithm Components

### 1. Data Preprocessing

```python
# Normalize time series: t = years since base year (e.g., 2010)
t = years - base_year
# Filter valid P/E data (remove NaN, negative, zero values)
valid_mask = ~np.isnan(pe_ratios) & (pe_ratios > 0)
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
# For multivariate model
X_future = [future_t³, future_t², future_t, 1, forward_pe]
predicted_price = model.predict(X_future)

# Apply qualitative adjustments
adjusted_price = predicted_price * (1 + qualitative_factor)
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
    def fit(self, historical_data: pd.DataFrame)
    def predict(self, forward_pe: float, qual_adjustments: dict)
    def generate_scenarios(self) -> dict
    def evaluate_model(self) -> dict

class QualitativeAdjuster:
    def calculate_risk_factors(self, stock_data: dict) -> float
    def calculate_growth_factors(self, stock_data: dict) -> float
    def apply_adjustments(self, base_prediction: float) -> float
```

### Data Pipeline

1. **Data Ingestion:** Fetch historical prices and P/E ratios
2. **Data Validation:** Filter invalid/anomalous data points
3. **Model Training:** Fit multivariate or cubic model based on data availability
4. **Prediction:** Generate base prediction using fitted model
5. **Adjustment:** Apply qualitative factors for final scenarios
6. **Output:** Return three scenarios with confidence metrics

This architecture provides a systematic, testable approach to stock price prediction that balances quantitative rigor with qualitative market insights.
