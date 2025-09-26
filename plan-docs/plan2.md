# Trading Strategy Builder - ETHGlobal Delhi Project Plan

## 🎯 Project Overview

**Name**: TradingStrategyDAO  
**Tagline**: "Build, Validate, Execute, and Monetize Trading Strategies with AI Agents"  
**Duration**: 48 Hours  
**Target Chains**: Polygon, Base (low-fee L2s)

### Core Innovation
- **ERC8004** for trustless agent identity & reputation
- **x402 Protocol** for autonomous AI agent payments
- **Pyth Network** for reliable price oracles
- **1inch** for optimal swap execution
- **The Graph** for strategy performance indexing

---

## 📋 Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [48-Hour Development Timeline](#48-hour-timeline)
4. [Component Details](#component-details)
5. [Smart Contracts](#smart-contracts)
6. [Off-Chain Services](#off-chain-services)
7. [Frontend Application](#frontend-application)
8. [Integration Points](#integration-points)
9. [Prize Track Alignment](#prize-track-alignment)
10. [Deployment Checklist](#deployment-checklist)

---

## 🏗️ Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Strategy     │  │ Marketplace  │  │ Dashboard    │      │
│  │ Builder      │  │ (Copy Trade) │  │ (Analytics)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVICES (Python)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Backtest     │  │ AI Trading   │  │ Validation   │      │
│  │ Engine       │  │ Agent        │  │ Service      │      │
│  │              │  │ (LangChain)  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌─────────────────┐   ┌─────────────────┐
        │  BLOCKCHAIN     │   │  EXTERNAL APIs  │
        │  (Smart         │   │  - Pyth Oracle  │
        │   Contracts)    │   │  - 1inch Swap   │
        │                 │   │  - The Graph    │
        │  - Identity     │   │  (x402 payments)│
        │  - Reputation   │   └─────────────────┘
        │  - Validation   │
        │  - Marketplace  │
        └─────────────────┘
```

### Data Flow

```
1. User Input → Strategy Parameters (RSI bounds, Risk/Reward)
2. Backend → Backtest using Pyth historical data
3. Backend → Register Agent on-chain (ERC8004 Identity)
4. Validator → Re-run backtest, submit validation (ERC8004)
5. AI Agent → Monitor prices (Pyth + x402)
6. AI Agent → Execute trades (1inch + x402)
7. AI Agent → Record results (ERC8004 Reputation)
8. The Graph → Index all strategies & performance
9. Marketplace → Users copy strategies, pay royalties
```

---

## 💻 Tech Stack

### Blockchain Layer
- **Networks**: Polygon, Base (EVM-compatible L2s)
- **Smart Contract Language**: Solidity 0.8.20+
- **Development Framework**: Hardhat / Foundry
- **Libraries**: OpenZeppelin, web3.py

### Off-Chain Services
- **Language**: Python 3.10+
- **AI Framework**: LangChain / LangGraph
- **LLM**: OpenAI GPT-4 / Anthropic Claude
- **Web3 Library**: web3.py
- **Task Queue**: Celery (optional for production)
- **Database**: PostgreSQL (strategy metadata)

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Web3 Integration**: wagmi, viem
- **UI Components**: shadcn/ui, Tailwind CSS
- **State Management**: Zustand / React Query
- **Charts**: Recharts / TradingView Lightweight Charts

### External Services
- **Price Oracles**: Pyth Network
- **DEX Aggregator**: 1inch API
- **Payment Protocol**: x402
- **Indexing**: The Graph (Subgraph)
- **Storage**: IPFS (strategy metadata)

---

## ⏱️ 48-Hour Timeline

### Hour 0-12: Foundation Layer
**Goal**: Working strategy builder with basic validation

#### Tasks
- [x] Project setup (repo, contracts, backend)
- [x] Deploy ERC8004 Identity Registry contract
- [x] Deploy Reputation Registry contract
- [x] Build strategy creation UI
- [x] Implement Pyth price feed integration
- [x] Create backtesting engine (Python)
- [x] Test strategy registration on-chain

#### Deliverables
- Smart contracts deployed to testnet
- Basic UI for strategy creation
- Backtest engine with Pyth data
- Agent registration working

---

### Hour 12-24: Validation & Trust Layer
**Goal**: ERC8004 validation mechanism operational

#### Tasks
- [x] Deploy Validation Registry contract
- [x] Build validator service (re-runs backtests)
- [x] Implement attestation submission
- [x] Create reputation scoring system
- [x] Test end-to-end validation flow
- [x] Deploy strategy as smart contract

#### Deliverables
- Validation system working
- Strategies getting verified
- Reputation scores visible
- Strategy contracts deployed

---

### Hour 24-36: AI Agent Execution
**Goal**: Autonomous trading with x402 payments

#### Tasks
- [x] Build LangChain trading agent
- [x] Integrate x402 payment for Pyth
- [x] Integrate x402 payment for 1inch
- [x] Implement RSI calculation logic
- [x] Build trade execution flow
- [x] Record results via ERC8004
- [x] Deploy agent executor service

#### Deliverables
- AI agent executing trades
- x402 payments working
- Trade results on-chain
- Live demo of autonomous trading

---

### Hour 36-44: Marketplace & Copy Trading
**Goal**: Public strategies with royalty system

#### Tasks
- [x] Deploy Marketplace contract
- [x] Build strategy discovery UI
- [x] Implement copy trading mechanism
- [x] Create royalty distribution logic
- [x] Deploy The Graph subgraph
- [x] Build leaderboard (top strategies)
- [x] Test full marketplace flow

#### Deliverables
- Working marketplace
- Copy trading operational
- Royalties being paid
- Leaderboard with The Graph

---

### Hour 44-48: Polish & Demo
**Goal**: Production-ready demo

#### Tasks
- [x] Final UI/UX polish
- [x] Record demo video
- [x] Write documentation
- [x] Deploy to mainnet/testnet
- [x] Prepare pitch deck
- [x] Test all integrations
- [x] Submit project

#### Deliverables
- Complete working demo
- Video walkthrough
- GitHub README
- Deployed application

---

## 🔧 Component Details

### 1. Identity Registry (ERC8004)
**Purpose**: Register trading strategy agents on-chain

**Key Functions**:
```solidity
- registerAgent(name, description, trustModels, metadataURI)
- getAgent(agentAddress)
- updateAgentMetadata(agentAddress, newURI)
```

**Data Stored**:
- Agent unique address
- Strategy name & description
- Trust models supported
- IPFS metadata URI
- Owner address
- Registration timestamp

---

### 2. Reputation Registry (ERC8004)
**Purpose**: Track agent performance & build reputation

**Key Functions**:
```solidity
- submitFeedback(serverAgent, success, profitLoss, feedbackURI)
- getReputationScore(agentAddress)
- getFeedbackHistory(agentAddress)
- getWinRate(agentAddress)
```

**Data Tracked**:
- Trade outcomes (win/loss)
- Profit/loss amounts
- Success count
- Failure count
- Win rate percentage
- Feedback from users

---

### 3. Validation Registry (ERC8004)
**Purpose**: Independent verification of strategy performance

**Key Functions**:
```solidity
- requestValidation(strategyAgent, backtestPeriod, expectedWinRate)
- submitValidation(strategyAgent, actualWinRate, proofURI)
- isValidated(strategyAgent)
- getValidationHistory(strategyAgent)
```

**Validation Flow**:
1. Strategy creator requests validation
2. Independent validator re-runs backtest
3. Validator submits attestation on-chain
4. Strategy gets "verified" badge
5. Users trust validated strategies more

---

### 4. Trading Strategy Contract
**Purpose**: Store strategy parameters and execution logic reference

**Key Data**:
```solidity
struct TradingStrategy {
    address agentId;           // ERC8004 identity
    string name;               // "RSI_20-80_RR_1:2"
    uint256 rsiLower;          // 20
    uint256 rsiUpper;          // 80
    uint256 riskRewardRatio;   // 200 (2.0x)
    address owner;
    bool isPublic;
    string pythFeedId;         // Price oracle
    uint256 totalTrades;
    int256 totalPnL;
}
```

**Functions**:
```solidity
- createStrategy(params)
- updateStrategyVisibility(agentId, isPublic)
- recordTrade(agentId, profitLoss)
- getStrategyPerformance(agentId)
```

---

### 5. Strategy Marketplace
**Purpose**: Enable copy trading with royalty payments

**Key Functions**:
```solidity
- subscribeToStrategy(agentId) payable
- executeStrategyTrade(agentId, params)
- distributeRoyalties(agentId, profits)
- unsubscribe(agentId)
```

**Royalty Model**:
- 10% of profits go to strategy creator
- 90% to copy trader
- Automatic distribution on each profitable trade

---

### 6. Python Backtesting Engine
**Purpose**: Test strategies against historical data

**Features**:
- Fetch Pyth historical prices
- Calculate RSI indicator
- Simulate trades with risk/reward
- Generate performance metrics
- Export results to IPFS

**Output Metrics**:
```python
{
    "win_rate": 65.5,
    "total_trades": 100,
    "avg_profit": 3.2,
    "max_drawdown": -12.3,
    "sharpe_ratio": 1.8,
    "roi": 45.6
}
```

---

### 7. AI Trading Agent (LangChain)
**Purpose**: Autonomous strategy execution

**Architecture**:
```python
class TradingAgent:
    - LLM: GPT-4 for decision making
    - Tools:
        * get_pyth_price (x402 payment)
        * calculate_rsi
        * get_1inch_quote (x402 payment)
        * execute_trade
        * record_result_onchain (ERC8004)
    - Memory: Conversation history
    - Executor: ReAct agent pattern
```

**Execution Loop**:
1. Check market conditions (Pyth)
2. Calculate indicators (RSI)
3. Evaluate strategy conditions
4. Request quotes (1inch)
5. Verify risk/reward ratio
6. Execute if profitable
7. Record outcome on-chain

---

### 8. x402 Payment Integration
**Purpose**: Enable AI agents to pay for services

**Implementation**:
```python
# Pay for Pyth price update
response = requests.get(
    "https://pyth-api.example.com/price",
    headers={
        "X-PAYMENT": generate_x402_payment(
            amount="0.001 USDC",
            recipient="0xPythOracle",
            network="polygon"
        )
    }
)

# Pay for 1inch quote
quote = requests.get(
    "https://api.1inch.dev/quote",
    headers={
        "X-PAYMENT": generate_x402_payment(
            amount="0.01 USDC",
            recipient="0x1inchAPI",
            network="polygon"
        )
    }
)
```

**Payment Flow**:
1. Agent needs service (price/quote)
2. Generate x402 payment payload
3. Sign with agent's private key
4. Include in HTTP header
5. Service validates & provides data
6. Transaction settles on-chain

---

### 9. The Graph Subgraph
**Purpose**: Index all strategies and performance data

**Entities**:
```graphql
type TradingStrategy @entity {
  id: ID!
  agentId: Bytes!
  name: String!
  owner: Bytes!
  rsiLower: BigInt!
  rsiUpper: BigInt!
  riskRewardRatio: BigInt!
  isPublic: Boolean!
  winRate: BigDecimal!
  totalTrades: BigInt!
  totalPnL: BigInt!
  subscribers: BigInt!
  createdAt: BigInt!
}

type TradeExecution @entity {
  id: ID!
  strategy: TradingStrategy!
  timestamp: BigInt!
  success: Boolean!
  profitLoss: BigInt!
  txHash: Bytes!
}

type Validation @entity {
  id: ID!
  strategy: TradingStrategy!
  validator: Bytes!
  expectedWinRate: BigInt!
  actualWinRate: BigInt!
  validated: Boolean!
  timestamp: BigInt!
}
```

**Queries**:
```graphql
# Get top strategies
query TopStrategies {
  tradingStrategies(
    first: 10,
    orderBy: winRate,
    orderDirection: desc,
    where: { isPublic: true }
  ) {
    id
    name
    winRate
    totalTrades
    totalPnL
  }
}

# Get strategy performance
query StrategyPerformance($id: ID!) {
  tradingStrategy(id: $id) {
    name
    winRate
    trades: tradeExecutions(orderBy: timestamp) {
      timestamp
      success
      profitLoss
    }
  }
}
```

---

### 10. Frontend Application

#### Pages Structure
```
/
├── app/
│   ├── page.tsx (Landing)
│   ├── create/ (Strategy Builder)
│   ├── marketplace/ (Browse Strategies)
│   ├── dashboard/ (User Dashboard)
│   ├── strategy/[id]/ (Strategy Details)
│   └── leaderboard/ (Top Performers)
```

#### Key Components
```
components/
├── StrategyBuilder/
│   ├── ParameterForm.tsx (RSI, RR inputs)
│   ├── BacktestResults.tsx (Performance metrics)
│   └── DeployButton.tsx (Register on-chain)
├── Marketplace/
│   ├── StrategyCard.tsx (Strategy preview)
│   ├── CopyTradeModal.tsx (Subscribe flow)
│   └── LeaderboardTable.tsx (Top strategies)
├── Dashboard/
│   ├── PortfolioStats.tsx (User's strategies)
│   ├── TradeHistory.tsx (Past executions)
│   └── RoyaltyEarnings.tsx (Revenue)
└── Shared/
    ├── ConnectWallet.tsx (Web3 auth)
    ├── NetworkSwitch.tsx (Polygon/Base)
    └── TxStatus.tsx (Transaction feedback)
```

---

## 🔌 Integration Points

### 1. Pyth Network Integration
```python
from pyth_sdk import PythClient

# Initialize
pyth = PythClient(rpc_url="https://polygon-rpc.com")

# Get price with x402 payment
price_feed = pyth.get_price_feed(
    feed_id="0xff61491...",  # ETH/USD
    payment={
        "amount": "0.001",
        "currency": "USDC",
        "protocol": "x402"
    }
)

print(f"ETH Price: ${price_feed.price}")
```

### 2. 1inch API Integration
```python
import requests

def get_swap_quote(from_token, to_token, amount):
    response = requests.get(
        f"https://api.1inch.dev/swap/v6.0/137/quote",
        params={
            "src": from_token,
            "dst": to_token,
            "amount": amount
        },
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "X-PAYMENT": generate_x402_payment("0.01 USDC")
        }
    )
    return response.json()

def execute_swap(quote, user_address, private_key):
    # Build transaction
    tx = {
        'to': quote['to'],
        'data': quote['data'],
        'value': quote['value'],
        'gas': quote['gas']
    }
    
    # Sign and send
    signed = w3.eth.account.sign_transaction(tx, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed.rawTransaction)
    return tx_hash
```

### 3. The Graph Queries (Frontend)
```typescript
import { useQuery } from '@apollo/client'

const GET_TOP_STRATEGIES = gql`
  query GetTopStrategies {
    tradingStrategies(
      first: 10,
      orderBy: winRate,
      orderDirection: desc,
      where: { isPublic: true }
    ) {
      id
      name
      winRate
      totalPnL
      totalTrades
      owner
    }
  }
`

function Leaderboard() {
  const { data, loading } = useQuery(GET_TOP_STRATEGIES)
  
  return (
    <div>
      {data?.tradingStrategies.map(strategy => (
        <StrategyCard key={strategy.id} {...strategy} />
      ))}
    </div>
  )
}
```

---

## 🏆 Prize Track Alignment

### Primary Targets

#### 1. **Pyth Network** 🎯
- **Integration**: Real-time price feeds for strategy execution
- **Innovation**: x402 payments for on-demand price updates
- **Usage**: Both backtesting (historical) and live trading

#### 2. **1inch** 🎯
- **Integration**: Optimal swap routing for trade execution
- **Innovation**: x402 micropayments for quote requests
- **Usage**: All strategy trades routed through 1inch

#### 3. **The Graph** 🎯
- **Integration**: Strategy performance indexing
- **Innovation**: Real-time leaderboards and analytics
- **Usage**: Query all strategies, trades, validations

#### 4. **Polygon** 🎯
- **Integration**: Primary deployment network
- **Why**: Low fees for agent transactions
- **Usage**: All smart contracts deployed here

#### 5. **Base** (Alternative)
- **Integration**: Secondary deployment
- **Why**: Coinbase ecosystem, x402 native
- **Usage**: Cross-chain strategy execution

### Secondary Targets

#### 6. **Uniswap Foundation**
- Alternative DEX integration
- Multi-source liquidity

#### 7. **Hedera**
- High TPS for frequent agent transactions
- Low, predictable fees

---

## ✅ Deployment Checklist

### Smart Contracts
- [ ] Identity Registry deployed
- [ ] Reputation Registry deployed
- [ ] Validation Registry deployed
- [ ] Trading Strategy Registry deployed
- [ ] Marketplace Contract deployed
- [ ] All contracts verified on explorer
- [ ] Contract addresses documented

### Backend Services
- [ ] Python environment configured
- [ ] LangChain agent tested
- [ ] Pyth integration working
- [ ] 1inch integration working
- [ ] x402 payments functional
- [ ] Backtest engine operational
- [ ] Database migrations run
- [ ] API server deployed

### Frontend
- [ ] Next.js app deployed (Vercel)
- [ ] Wallet connection working
- [ ] All pages functional
- [ ] The Graph queries working
- [ ] Transaction flows tested
- [ ] Responsive design verified
- [ ] Error handling implemented

### The Graph
- [ ] Subgraph deployed
- [ ] All events indexed
- [ ] Queries optimized
- [ ] Studio dashboard configured

### Testing
- [ ] Unit tests (contracts)
- [ ] Integration tests (full flow)
- [ ] End-to-end demo recorded
- [ ] Edge cases handled
- [ ] Security review done

### Documentation
- [ ] README.md complete
- [ ] Architecture diagram created
- [ ] API documentation written
- [ ] Video demo recorded
- [ ] Pitch deck prepared
- [ ] GitHub repo organized

---

## 🚀 Demo Script

### 1. Strategy Creation (2 min)
1. Connect wallet
2. Navigate to "Create Strategy"
3. Input parameters: RSI 20-80, RR 1:2
4. Click "Backtest" - show results
5. Click "Deploy Strategy" - tx confirmed
6. Show agent registered on-chain

### 2. Validation (1 min)
1. Switch to validator account
2. Re-run backtest independently
3. Submit validation on-chain
4. Strategy gets "verified" badge

### 3. Live Trading (3 min)
1. Show agent monitoring prices (Pyth)
2. RSI drops below 20 (buy signal)
3. Agent pays x402 for 1inch quote
4. Executes swap automatically
5. Records profit/loss on-chain (ERC8004)
6. Show updated reputation score

### 4. Marketplace (2 min)
1. Navigate to leaderboard
2. Show top strategy (from The Graph)
3. Click "Copy Trade"
4. Subscribe with payment
5. Strategy executes for subscriber
6. Show royalty paid to creator

### 5. Impact (1 min)
- Show total strategies created
- Show total trades executed
- Show total value managed
- Highlight x402 payment volume

---

## 📊 Success Metrics

### Technical Metrics
- Strategies created: Target 20+
- Trades executed: Target 50+
- Validation success rate: >90%
- Agent uptime: 99%+
- x402 transactions: 100+

### Business Metrics
- Copy traders: 10+
- Royalties paid: $100+ (testnet)
- Average strategy ROI: 30%+
- User engagement: 5 min avg session

---

## 🔐 Security Considerations

### Smart Contracts
- Use OpenZeppelin libraries
- Reentrancy guards on all state changes
- Access control for admin functions
- Pausable in emergency
- Upgrade mechanism (proxy pattern)

### AI Agent
- Private keys in secure vault
- Rate limiting on API calls
- Slippage protection on trades
- Max trade size limits
- Emergency stop mechanism

### Frontend
- Input sanitization
- XSS protection
- CSRF tokens
- Secure wallet connections
- No private keys in browser

---

## 📚 Resources & Links

### Documentation
- ERC8004 Spec: https://eips.ethereum.org/EIPS/eip-8004
- x402 Docs: https://x402.gitbook.io/x402
- Pyth Docs: https://docs.pyth.network/
- 1inch API: https://docs.1inch.io/
- The Graph: https://thegraph.com/docs/

### Code References
- ERC8004 Reference: https://github.com/ChaosChain/trustless-agents-erc-ri
- LangChain Agents: https://python.langchain.com/docs/tutorials/agents/
- web3.py Guide: https://web3py.readthedocs.io/

### Community
- ERC8004 Telegram: [Link from docs]
- ETHGlobal Discord: [Hackathon server]
- Developer Support: [Prize sponsor channels]

---

## 🎬 Final Deliverables

1. **GitHub Repository**
   - Complete source code
   - README with setup instructions
   - Architecture documentation
   - Demo screenshots

2. **Deployed Application**
   - Live frontend URL
   - Contract addresses
   - Subgraph endpoint
   - API documentation

3. **Demo Video** (5 min max)
   - Problem statement
   - Solution overview
   - Live demo walkthrough
   - Technical highlights
   - Future roadmap

4. **Pitch Deck** (10 slides)
   - Problem & Solution
   - Architecture
   - Key Innovations
   - Prize Integration
   - Market Opportunity
   - Team
   - Demo Link
   - Call to Action

---

## 🔮 Future Enhancements (Post-Hackathon)

- Multi-indicator strategies (RSI + MACD + Bollinger)
- Machine learning strategy generation
- Social features (comments, ratings)
- Strategy DAOs (collective management)
- Cross-chain execution
- Mobile app
- Strategy marketplace v2
- Insurance pools for losses
- Governance token for platform

---

**Built with ❤️ for ETHGlobal Delhi**  
**Powered by ERC8004, x402, Pyth, 1inch, The Graph, and Polygon**