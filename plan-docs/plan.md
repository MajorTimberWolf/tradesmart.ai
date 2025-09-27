# Pyth Support & Resistance Strategy Plan

## 0. Objective
- Fetch the last 5 days of BTC (or user-selected asset) price data from the Pyth Network and aggregate it into 4-hour OHLC candles.
- Detect support and resistance zones where the price reversed from the same band at least twice.
- Project validated bands 3 days into the future and wrap them with optional technical indicators (e.g., RSI, risk/reward ratio) chosen by the user.
- Deliver the enriched strategy payload to the Trade Executor Agent so it can monitor live prices and trigger the X402-powered execution workflow.

## 1. Flow Alignment (Sequence Diagram Anchors)
- **Agent Registration (Section 1)**: Reuse the existing adapter deployment and ERC8004 agent registration. No new work besides documenting the new strategy capability in the agent metadata.
- **User Onboarding (Section 2)**: Extend the Liquidity Builder Agent service so it can present the historical-analysis option, gather ticker + indicator preferences, and display the resulting support/resistance bands.
- **Strategy Building Phase (Section 3)**:
  - Replace the generic “liquidity analysis” task with the Pyth-driven 5-day OHLC fetch and support/resistance computation.
  - Update UI copy and responses from the Liquidity Builder Agent to show the detected price bands, indicator overlays, and risk/reward settings.
- **Execution Phase (Section 4)**: The generated strategy config (bands + indicators) feeds into the automated monitoring loop. The Trade Executor Agent subscribes to the POST endpoint described below and watches live Pyth prices for band touches.
- **User Monitoring & Control (Section 5)**: Persist the generated bands and indicators so they appear inside dashboards, are auditable, and can be updated or paused.

## 2. Architecture Overview
- **Data Layer**: Pyth Hermes API (HTTP) for historical price pulls, existing on-chain price feeds for real-time monitoring, local cache (Redis/Postgres) for recent OHLC candles and computed bands.
- **Analytics Layer**: New Python module (inside `backend/agent/core/analytics`) responsible for candle aggregation, reversal detection, price-band construction, indicator calculations, and projections.
- **Integration Layer**: REST endpoint (`POST /api/strategies/support-resistance`) that writes strategy configs to the Trade Executor Agent queue and emits events for the frontend.
- **Execution Layer**: Existing Trade Executor Agent consumes the config, subscribes to real-time prices, and calls the X402 Payment Agent + 1inch Router when price enters a scheduled band.

## 3. Pyth Historical Data Acquisition (5-Day / 4-Hour OHLC)
1. **Inputs**: `price_id` (Pyth price feed ID), target asset symbol, optional start timestamp (defaults to `now - 5 days`).
2. **Fetch Strategy**:
   - Call Hermes `get_price_feed` (or `get_history`) endpoint with `start_time` and `end_time` covering the last 5×24 hours.
   - Paginate if necessary; cache responses keyed by price ID + date window to avoid redundant queries.
3. **Aggregation**:
   - Convert raw price updates (publishTime + price/expo) into a sorted time series.
   - Bucket updates into contiguous 4-hour windows; derive OHLC values per bucket using first/last/high/low entries.
   - Ensure 30 complete candles (5 days × 6 candles/day); if missing candles, backfill using the previous close while marking them as synthetic for transparency.
4. **Data Validation**:
   - Reject datasets with fewer than 24 unique data points.
   - Log latency and response metadata for each Hermes call (supporting x402 payment receipts if required later).
5. **Storage**: Persist raw candles plus computed metrics in the strategy database (table `historical_ohlc`) with foreign key to the strategy draft.

## 4. Support & Resistance Band Detection
1. **Reversal Point Identification**:
   - Traverse OHLC series to find local maxima/minima where price direction changes sign.
   - Record timestamps, closing prices, and swing magnitude.
2. **Band Formation Logic**:
   - Group reversal points by price proximity using a configurable tolerance (default 0.5% of price, overridable via user settings or ATR-based width).
   - For each cluster, ensure there are at least 3 touches (>=2 reversals away from the band plus the initial touch) and that alternating highs/lows occur, confirming actual rejection.
3. **Band Metrics**:
   - Compute `mid_price`, `upper_bound`, `lower_bound`, touch count, average bounce distance, and most recent interaction time.
   - Classify as `support` if the last interaction was a bounce upward from the band; `resistance` if the price fell from above.
4. **Filtering & Ranking**:
   - Prioritize bands by recentness and touch count; cap to top N (default 3 support + 3 resistance) for UI clarity.
   - Discard bands older than 5 days or with low bounce magnitude (configurable minimum percentage move).
5. **Visualization Hooks**:
   - Expose bands in a format consumable by TradingView overlays: `[timestamp_start, price_lower, price_upper, label]`.

## 5. Projection & Data Packaging
- **Time Extension**: For each validated band, set `projection_end = last_touch_time + 72h`. The band remains active for monitoring until expiration or manual stop.
- **Payload Schema**:
  ```json
  {
    "asset": "BTC",
    "priceId": "0x...",
    "bands": [
      {
        "type": "support",
        "lower": 100000,
        "upper": 100500,
        "touchCount": 4,
        "lastTouch": "2025-09-25T12:00:00Z",
        "projectedUntil": "2025-09-28T12:00:00Z"
      }
    ],
    "indicators": {...},
    "generatedAt": "2025-09-25T16:00:00Z"
  }
  ```
- **Audit Trail**: Store derived parameters (tolerance used, candles considered) for reproducibility and validator replays.

## 6. Optional Indicator Modules
- **RSI (Relative Strength Index)**:
  - Calculate 14-period RSI using the 4-hour closes; expose thresholds (default 30/70) and allow the user to override.
  - Attach to payload as `{"rsi": {"value": 48.2, "length": 14}}`.
- **Risk/Reward Ratio**:
  - Derive suggested stop-loss (band boundary breach) and take-profit (next opposite band or user target) to compute R:R.
  - Present recommended position sizing guidelines to the executor (`maxPositionPct`, `minRR`).
- **Extensibility**:
  - Design indicator interface so future tools (MACD, ATR, VWAP) can plug in without altering core band logic.

## 7. Trade Executor Integration
1. **API Contract**: Implement `POST /api/strategies/support-resistance` that accepts the payload above plus user metadata (`strategyId`, `owner`, `preferences`).
2. **Processing Pipeline**:
   - Validate payload, persist to DB, and enqueue a monitoring job for the Trade Executor Agent.
   - Notify frontend via WebSocket/event so users see the new strategy immediately.
3. **Executor Responsibilities**:
   - Subscribe to real-time Pyth price updates for the same price ID.
   - When live price enters `[lower, upper]`, check indicator conditions (e.g., RSI in buy zone, R:R threshold) before requesting approval from the user (per flowchart alt-limits path).
   - Initiate trade via 1inch + X402 Payment Agent, then emit execution metrics (`price`, `amount`, `profitLoss`).
4. **Error Handling**: Retry transient failures, escalate to user if band expires without touch, and expose health metrics for monitoring.

## 8. Implementation Phases
- **Phase A – Preparation (0.5 day)**: Confirm Pyth price IDs, ensure Hermes credentials/x402 budgeting, update environment variables, stub new database tables.
- **Phase B – Data Service (1 day)**: Build Hermes client wrapper, candle aggregator, caching, and validation tests; expose service to other modules.
- **Phase C – Analytics Engine (1 day)**: Implement reversal detection, band clustering, indicator hooks; create unit/integration tests using sample data.
- **Phase D – API & Executor Wiring (1 day)**: Add REST endpoint, persistence layer, enqueue logic, and executor consumption updates; integrate with frontend event flow.
- **Phase E – QA & Demo Prep (0.5 day)**: Run end-to-end dry runs, connect to TradingView overlay, prepare demo narrative matching the sequence diagram.

## 9. Testing & Validation
- **Unit Tests**: Candle aggregation, reversal detection, indicator calculations with deterministic fixtures.
- **Integration Tests**: Mock Hermes responses to verify 5-day windows and projection logic; simulate executor loop hitting a projected band.
- **Performance Checks**: Ensure historical fetch + aggregation stays under 2 seconds per request; cache results for repeated strategy building.
- **Manual Validation**: Compare generated bands with TradingView’s auto SR levels for sanity; adjust tolerance settings as needed.

## 10. Configuration & Ops
- Environment variables: `PYTH_PRICE_ID`, `PYTH_HERMES_ENDPOINT`, `PYTH_HISTORY_CACHE_TTL`, `SR_BAND_TOLERANCE_BP`, `SR_PROJECTION_HOURS`.
- Logging: Tag requests with strategy ID, include Hermes latency, and send metrics to monitoring dashboard.
- Security: Validate user ownership before accepting POST calls; redact sensitive keys; ensure x402 budgets are refilled.

## 11. Open Questions / Follow-Ups
- Do we need multi-asset batch processing or per-asset requests?
- Should projections auto-refresh every 12 hours with the latest 5-day window?
- How much configurability do advanced users need for tolerance, minimum touches, and expiry windows?
- Confirm whether the Trade Executor Agent requires synchronous acknowledgment or can process the payload asynchronously.

This plan keeps the new support/resistance workflow aligned with the existing agent lifecycle while grounding the analytics in Pyth’s historical data and ensuring the trade executor can act on clearly defined price bands augmented with user-selected indicators.
