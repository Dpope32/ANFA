# Requirements Document - ANFA Neural Trading System

## Introduction

The ANFA Neural Trading Intelligence System uses multiple specialized neural networks to predict stock price movements with high accuracy. Unlike generic AI chatbots that guess at stocks, this system trains purpose-built neural networks on actual market data, learning patterns that genuinely predict price movement. The system features continuous learning, ensemble predictions, and complete transparency through a 10-step analysis workflow.

## Core Vision

**Building neural networks that actually work for trading, not chatbot AI that sounds smart but fails.**

- Multiple specialized neural networks (price, volume, patterns, sentiment)
- Trained on real market data, not generic text
- Continuous retraining with new data
- Ensemble approach for robust predictions
- Full explainability despite being neural networks

## Requirements

### Requirement 1: Multi-Network Architecture

**User Story:** As a trader, I want specialized neural networks for different aspects of the market, so predictions are more accurate than a single general model.

#### Acceptance Criteria
1. WHEN analyzing price data THEN use the PriceNet neural network
2. WHEN analyzing volume patterns THEN use the VolumeNet LSTM network
3. WHEN detecting chart patterns THEN use the PatternNet CNN
4. WHEN analyzing sentiment THEN use the SentimentNet network
5. WHEN combining predictions THEN use the EnsembleNet meta-network
6. WHEN networks disagree THEN show all perspectives in the output

### Requirement 2: Continuous Learning Pipeline

**User Story:** As a trader, I want the neural networks to continuously improve with new market data, so they adapt to changing conditions.

#### Acceptance Criteria
1. WHEN market closes THEN retrain networks with the day's data
2. WHEN predictions are made THEN track actual outcomes
3. WHEN performance degrades THEN trigger immediate retraining
4. WHEN new patterns emerge THEN networks SHALL learn them
5. WHEN retraining completes THEN validate on recent data before deployment

### Requirement 3: 10-Step Analysis Workflow

**User Story:** As a trader, I want a systematic workflow that leverages neural networks intelligently, not just raw predictions.

#### Acceptance Criteria
1. WHEN analyzing a stock THEN execute all 10 workflow steps
2. WHEN time context matters THEN encode temporal features properly
3. WHEN features are engineered THEN normalize for neural network input
4. WHEN networks run THEN capture all outputs for ensemble
5. WHEN generating scenarios THEN use network confidence scores
6. WHEN explaining decisions THEN show each network's contribution

### Requirement 4: Real-Time Data Pipeline

**User Story:** As a trader, I want real-time data feeding the neural networks, so predictions use the latest information.

#### Acceptance Criteria
1. WHEN market is open THEN collect tick data continuously
2. WHEN data arrives THEN engineer features in real-time
3. WHEN features are ready THEN run through networks immediately
4. WHEN predictions complete THEN deliver in <2 seconds
5. WHEN data quality issues occur THEN handle gracefully

### Requirement 5: PocketBase Training Data Management

**User Story:** As a system operator, I want all training data stored in PocketBase on our Fedora server, so we have complete control over our data.

#### Acceptance Criteria
1. WHEN collecting data THEN store in PocketBase immediately
2. WHEN training networks THEN pull data from PocketBase
3. WHEN tracking performance THEN update PocketBase records
4. WHEN querying history THEN use PocketBase's fast queries
5. WHEN backing up THEN PocketBase handles it automatically

### Requirement 6: Feature Engineering System

**User Story:** As a data scientist, I want comprehensive feature engineering for neural network inputs, so networks have rich information to learn from.

#### Acceptance Criteria
1. WHEN engineering price features THEN calculate 50+ technical indicators
2. WHEN engineering volume features THEN include flow analysis
3. WHEN engineering time features THEN encode cyclical patterns
4. WHEN engineering sentiment THEN process text properly
5. WHEN features are ready THEN normalize to [-1, 1] range

### Requirement 7: Ensemble Prediction System

**User Story:** As a trader, I want multiple networks voting on predictions, so results are more robust than single model outputs.

#### Acceptance Criteria
1. WHEN networks complete THEN combine outputs in EnsembleNet
2. WHEN confidence varies THEN weight networks accordingly
3. WHEN generating final prediction THEN show consensus level
4. WHEN networks strongly disagree THEN flag as uncertain
5. WHEN ensemble runs THEN complete in <100ms

### Requirement 8: Scenario Generation

**User Story:** As a trader, I want three scenarios (conservative, expected, aggressive) with confidence scores, so I can size positions appropriately.

#### Acceptance Criteria
1. WHEN generating scenarios THEN base on network outputs
2. WHEN calculating targets THEN use historical distributions
3. WHEN setting stops THEN consider volatility
4. WHEN showing confidence THEN derive from network agreement
5. WHEN risk/reward calculated THEN include Kelly criterion

### Requirement 9: Explainable Predictions

**User Story:** As a trader, I want to understand WHY the neural networks made their prediction, not just see a black box output.

#### Acceptance Criteria
1. WHEN showing predictions THEN identify primary driver
2. WHEN factors contribute THEN show their weights
3. WHEN signals conflict THEN highlight disagreements
4. WHEN confidence is shown THEN break down by network
5. WHEN similar setups exist THEN show historical performance

### Requirement 10: A/B Testing Framework

**User Story:** As a system operator, I want to test new network architectures safely, so improvements are validated before production use.

#### Acceptance Criteria
1. WHEN new architecture developed THEN test alongside current
2. WHEN testing period completes THEN compare accuracy metrics
3. WHEN new model wins THEN gradual rollout
4. WHEN new model loses THEN keep current version
5. WHEN testing THEN track all metrics in PocketBase

## Neural Network Specifications

### PriceNet
- **Input:** 50 price-based features
- **Architecture:** 4-layer fully connected
- **Output:** 3 classes (down, flat, up)
- **Activation:** ReLU with dropout
- **Training:** Cross-entropy loss

### VolumeNet
- **Input:** 20-step volume sequence
- **Architecture:** 2-layer LSTM
- **Output:** 3 classes (bearish, neutral, bullish)
- **Hidden size:** 50
- **Training:** Sequence-to-one prediction

### PatternNet
- **Input:** 100-bar price series
- **Architecture:** CNN with 2 conv layers
- **Output:** 10 pattern types
- **Kernels:** 5 and 3
- **Training:** Multi-class classification

### SentimentNet
- **Input:** Tokenized text (news, social)
- **Architecture:** Embedding + LSTM
- **Output:** 3 sentiment classes
- **Embedding:** 10k vocabulary, 128 dims
- **Training:** Supervised on labeled data

### EnsembleNet
- **Input:** All network outputs (19 values)
- **Architecture:** 3-layer meta-network
- **Output:** Final prediction + confidence
- **Dropout:** 0.3 for robustness
- **Training:** End-to-end with all networks

## Training Requirements

### Data Volume
- Minimum 1 year historical data for initial training
- 10,000+ samples per symbol
- Continuous collection of new data
- Validation on most recent 20% of data

### Training Schedule
- Nightly full retrain (2 AM)
- Incremental updates every hour
- Emergency retrain on 10% accuracy drop
- A/B test new architectures weekly

### Performance Targets
- 65%+ directional accuracy
- <2% mean absolute error
- 90%+ next-bar prediction speed
- Ensemble better than any single network

## Infrastructure Requirements

### Compute
- GPU preferred but not required (CPU training acceptable)
- 8GB+ RAM for training
- 100GB+ storage for data
- Fedora server for production

### Software
- PyTorch for neural networks
- PocketBase for data storage
- Python for data collection
- Cron for scheduling

## Success Metrics

1. **Prediction Accuracy:** >65% directional accuracy
2. **Network Specialization:** Each network >55% standalone
3. **Ensemble Improvement:** +10% over best single network
4. **Continuous Learning:** 2% monthly improvement
5. **Explanation Quality:** 100% predictions explained
6. **System Reliability:** <1% prediction failures

## What Makes This Different

- **Not Generic AI:** Purpose-built neural networks for trading
- **Not Static:** Continuous learning from new data
- **Not Black Box:** Full explainability despite being neural
- **Not Theoretical:** Trained on actual market outcomes
- **Not Single Model:** Ensemble of specialized networks

This is the neural network trading system that actually works - trained on real data, specialized for different market aspects, and continuously improving.
