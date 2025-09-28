# X402 Execution Plan - Polygon Integration

## Overview
Implementation plan to bridge stored Lighthouse strategies with x402 contract execution on Polygon chain using 1inch API for DEX aggregation.

## Current State Analysis

### What We Have
- ✅ Strategy creation and Lighthouse storage
- ✅ Pyth price feed monitoring (BTCUSD, ETHUSD)
- ✅ Support/resistance analysis pipeline
- ✅ 1inch quote fetcher in backend
- ✅ SSE streaming for real-time updates
- ✅ Agent wallet configuration (hot wallet)

### What's Missing
- ❌ x402 smart contracts (not deployed)
- ❌ Strategy-to-execution bridge
- ❌ Polygon token mapping
- ❌ Escrow deposit/withdrawal system
- ❌ Condition monitoring for execution
- ❌ 1inch API integration for actual swaps

## Architecture Overview

```
Pyth Price Feed → Strategy Monitoring → Condition Detection → 
x402 Contract Execution → 1inch DEX Routing → Token Transfer
```

### Data Flow
1. **Strategy Storage**: Lighthouse (existing) + enhanced schema
2. **Price Monitoring**: Pyth oracles (existing) + execution triggers
3. **Condition Detection**: Backend agent (enhanced)
4. **Execution**: x402 contract on Polygon
5. **Token Routing**: 1inch API for best prices

### Phase 1.5: Token Pair Infrastructure (CRITICAL)

**Problem**: Current system monitors Pyth price feeds but doesn't map to tradeable Polygon pairs

**Solution**: Bridge price feeds to actual token trading

#### 1.5.1 Backend Configuration Overhaul
**Files to modify:**
- `backend/agent/config/constants.py` - Replace hardcoded feeds with execution mapping
- `frontend/app/api/agent-analysis/route.ts` - Update symbol resolution for trading pairs

**New Flow:**
```
User selects "WETH/USDC" → Backend uses ETH_USD Pyth feed for price → 
Executes WETH<>USDC swap on Polygon
```

#### 1.5.2 Supported Trading Pairs (Phase 1)
**Priority Pairs** (high liquidity on Polygon):
1. **WETH/USDC** - Uses ETH_USD Pyth feed
2. **WBTC/USDC** - Uses BTC_USD Pyth feed  
3. **WETH/MATIC** - Uses ETH_USD Pyth feed (MATIC price from 1inch)

**Token Addresses (Polygon Mainnet):**
- WETH: `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619`
- WBTC: `0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6`
- USDC: `0x2791bca1f2de4661ed88a30c99a7a9449aa84174`
- MATIC: `0x0000000000000000000000000000000000001010`

#### 1.5.3 Price Feed to Trading Pair Logic
**Example: WETH/USDC Strategy**
1. Monitor ETH_USD Pyth feed for price triggers
2. When ETH hits $2000 support → Execute WETH→USDC swap
3. Use 1inch to get WETH/USDC rate (accounts for any premium/discount vs USD rate)

#### 1.5.4 Frontend Symbol Resolution  
**Current Issue**: Frontend sends `PYTH:BTCUSD` to backend
**Updated Flow**: Frontend sends `WBTC/USDC` → Backend maps to BTC_USD feed + Polygon tokens

## Phase 1: Smart Contract Foundation
**Deliverables:**
- `X402ConditionalExecutor.sol` - Main escrow and execution logic
- `X402StrategyRegistry.sol` - Links strategies to IPFS hashes
- Deployment scripts for Polygon mainnet/testnet

**Key Features:**
- Escrow-style fund management
- Agent authorization system
- Order creation and execution
- Emergency cancellation
- Daily execution limits for agents

### 1.2 Contract Integration Points
- **1inch Router Integration**: Contract approvals and call routing
- **Agent Permission System**: Multi-sig or owner-based agent authorization
- **Strategy Linking**: Connect on-chain orders to off-chain strategies
- **Gas Optimization**: Batch operations where possible

### 1.3 Testing & Deployment
- Unit tests with Foundry
- Integration tests on Polygon Mumbai testnet
- Gas cost analysis and optimization
- Mainnet deployment with verified contracts

## Phase 2: Backend Execution Engine

### 2.1 Strategy Processing Pipeline
**Components:**
- **Strategy Retrieval Service**: Fetch and decrypt from Lighthouse
- **Condition Parser**: Convert strategy JSON to executable conditions
- **Order Generator**: Create x402 orders from strategies
- **Execution Monitor**: Watch for trigger conditions

**Enhanced Schema:**
```
Current Strategy + Execution Parameters:
- positionSize: { type: "fixed_usd" | "percentage", value: number }
- tokenPair: { base: "WBTC", quote: "USDC" }
- slippageTolerance: number
- maxGasFee: number
- enabled: boolean
```

### 2.2 Symbol Mapping Extension
**Current Limitation:** Only 2 hardcoded price feeds without execution mapping
- `ETH_USD` → feed `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace`  
- `BTC_USD` → feed `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43`

**Enhanced Mapping for Polygon Execution:**
```python
# backend/agent/config/constants.py - COMPLETE REWRITE
EXECUTION_SYMBOL_MAP = {
  "PYTH:ETHUSD": {
    pyth_feed_id: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    polygon_pairs: [
      {
        base_token: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",  # WETH
        quote_token: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", # USDC
        pair_symbol: "WETH/USDC",
        decimals: { base: 18, quote: 6 }
      },
      {
        base_token: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",  # WETH  
        quote_token: "0x0000000000000000000000000000000000001010", # MATIC
        pair_symbol: "WETH/MATIC", 
        decimals: { base: 18, quote: 18 }
      }
    ]
  },
  "PYTH:BTCUSD": {
    pyth_feed_id: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    polygon_pairs: [
      {
        base_token: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",  # WBTC
        quote_token: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", # USDC
        pair_symbol: "WBTC/USDC",
        decimals: { base: 8, quote: 6 }
      }
    ]
  }
}
```

**Frontend Symbol Presentation:**
- User sees: "WETH/USDC", "WBTC/USDC", "WETH/MATIC" 
- Backend maps to: Pyth ETH_USD or BTC_USD price + Polygon token addresses

### 2.3 Condition Monitoring System
**Enhancement to existing MonitoringJobs:**
- Track active strategies with execution enabled
- Monitor Pyth price feeds for trigger conditions
- Generate execution proofs when conditions met
- Queue execution transactions with retry logic

### 2.4 x402 Payment Service Implementation
**File:** `backend/agent/payments/x402_payments.py`

**Core Functions:**
- `create_escrow_order()` - Create x402 order with user funds
- `execute_conditional_order()` - Execute when conditions met
- `cancel_order()` - Emergency cancellation
- `get_order_status()` - Track execution status

## Phase 3: 1inch Integration Layer

### 3.1 Enhanced Quote Service
**Extend existing:** `backend/agent/core/tools/quote_fetcher.py`

**New Capabilities:**
- Polygon chain support (chainId: 137)
- Token address resolution
- Slippage calculation
- Gas estimation for transactions
- Multi-route comparison

### 3.2 Transaction Execution Pipeline
**Components:**
- **Route Optimizer**: Get best 1inch routes
- **Transaction Builder**: Construct execution calldata
- **Gas Management**: Dynamic gas pricing
- **Slippage Protection**: Verify minimum output amounts

### 3.3 1inch API Integration Points
**Endpoints to integrate:**
- `/v5.0/137/quote` - Get swap quotes
- `/v5.0/137/swap` - Get transaction data
- `/v5.0/137/approve/calldata` - Token approvals
- `/v5.0/137/tokens` - Supported token list

## Phase 4: Frontend Enhancement

### 4.1 Strategy Builder Extension
**File:** `frontend/components/strategy-builder.tsx`

**Critical UI Changes:**
- **Symbol Selection**: Replace `PYTH:BTCUSD` with actual trading pairs
  - Dropdown shows: "WETH/USDC", "WBTC/USDC", "WETH/MATIC"
  - Backend maps to appropriate Pyth feed for price monitoring
- **Execution Toggle**: Enable Auto-Trading checkbox
- **Position Size Selector**: Fixed USD amount or percentage of balance
- **Slippage Tolerance**: 0.1% to 3% slider
- **Gas Fee Limits**: Max MATIC to spend on execution

**Updated Strategy Schema:**
```typescript
interface StrategyConfig {
  // CHANGED: From pyth symbol to trading pair
  tradingPair: "WETH/USDC" | "WBTC/USDC" | "WETH/MATIC";
  
  // Existing fields
  riskRewardRatio: string;
  liquidityLevel: { type: "support" | "resistance", price: number };
  indicators: Array<{...}>;
  timeframe: string;
  
  // NEW: Execution parameters  
  execution: {
    enabled: boolean;
    positionSize: { type: "fixed_usd" | "percentage", value: number };
    slippageTolerance: number;
    maxGasFee: number;
  };
}
```

### 4.2 Escrow Management Interface
**New Component:** `frontend/components/escrow-manager.tsx`

**Features:**
- Deposit funds to x402 contract
- View escrow balance
- Withdraw unused funds
- Transaction history
- Active order status

### 4.3 Execution Dashboard
**New Component:** `frontend/components/execution-dashboard.tsx`

**Real-time Monitoring:**
- Active strategies with execution enabled
- Live P&L tracking
- Execution history
- Failed transaction logs
- Manual override controls

## Phase 5: Integration & Testing

### 5.1 End-to-End Flow Testing
**Test Scenarios:**
1. Create strategy with execution enabled
2. Deposit USDC to escrow
3. Monitor price until trigger hit
4. Verify automatic execution
5. Confirm token receipt

### 5.2 Error Handling & Recovery
**Edge Cases:**
- Insufficient escrow balance
- 1inch API failures
- Gas price spikes
- Slippage exceeded
- Network congestion

### 5.3 Performance Optimization
**Monitoring:**
- Execution latency (trigger to completion)
- Gas cost analysis
- Success/failure rates
- User experience metrics

## Revised Delivery Phases

To keep implementation tractable, the remaining scope is organized into the following deliverables. Each phase produces a self-contained milestone that can ship independently.

### Phase A: Strategy & Monitoring Core
- Finalize shared strategy schema (pair + execution parameters)
- Persist execution-ready strategies via backend services
- Extend monitoring jobs to load strategies and evaluate trigger conditions (dry-run)
- Instrument logging/metrics for condition evaluation

### Phase B: x402 Foundation
- Implement Solidity escrow + registry contracts
- Foundry unit tests and Mumbai deployment scripts
- Backend payment service (order creation, status polling)
- CLI utilities for funding/withdrawing escrow

### Phase C: 1inch Execution Layer
- Enhanced quote + swap builder for Polygon
- Slippage/gas safeguards and retry logic
- Integration of swap pipeline with x402 orders
- Simulation harness + fork tests

### Phase D: Frontend Operations Suite
- Escrow manager UI (deposit/withdraw/status)
- Execution dashboard (live strategies, recent fills, error log)
- Notifications and manual override controls
- UX polish + guided onboarding

### Phase E: End-to-End Hardening
- Full regression playbook (success + failure paths)
- Monitoring/alerting hooks
- Load & chaos testing
- Security review checklist and documentation

## Risk Mitigation

### Security Considerations
- **Agent Authorization**: Multi-sig control for agent permissions
- **Execution Limits**: Daily/per-transaction limits
- **Emergency Stops**: Circuit breakers for unusual market conditions
- **Proof Verification**: Robust condition verification system

### Operational Risks
- **1inch Dependency**: Fallback to direct DEX if 1inch fails
- **Gas Management**: Dynamic fee adjustment for network congestion
- **Liquidity Risks**: Pre-execution liquidity checks
- **Slippage Protection**: Conservative slippage bounds

### User Protection
- **Fund Safety**: Escrow-only execution (no direct wallet access)
- **Transparent Fees**: Clear gas + slippage cost disclosure
- **Easy Exit**: Simple order cancellation and fund withdrawal
- **Execution Logs**: Comprehensive transaction history

## Success Metrics

### Technical KPIs
- Order execution success rate > 95%
- Average execution latency < 30 seconds
- Gas efficiency (competitive with manual trading)
- Zero fund loss incidents

### User Experience KPIs
- Strategy creation completion rate > 80%
- User retention after first execution > 70%
- Support ticket volume < 5% of executions
- Positive user feedback on automation value

## Dependencies & Requirements

### External Dependencies
- Polygon RPC provider (Alchemy/Infura)
- 1inch API access and rate limits
- Pyth Network price feeds
- Lighthouse/IPFS availability

### Infrastructure Requirements
- Reliable backend hosting with 99.9% uptime
- Secure private key management for agent wallet
- Monitoring and alerting system
- Error logging and analytics

### Compliance Considerations
- Smart contract security audits
- Terms of service for automated trading
- Risk disclosures for users
- Regulatory compliance review
