# Simple Trading Agent

A simplified LangChain trading agent that autonomously executes trading strategies using ERC8004 infrastructure, Pyth Network price oracles, and 1inch DEX integration.

## 🚀 Quick Start

```bash
# Activate environment
conda activate ethglobal

# Run the agent once
python app.py

# Run continuously
python app.py --mode loop

# Test individual components
python app.py --price    # Test price fetching
python app.py --rsi      # Test RSI calculation
python app.py --quote    # Test 1inch quotes
python app.py --test     # Run unit tests
```

## 🧠 Agent + Frontend Integration

```bash
# 1. Ensure backend/agent/.env contains your OpenRouter API key (LLM__API_KEY)

# 2. Start the chart-analysis API (FastAPI)
uvicorn backend.agent.api.server:app --host 0.0.0.0 --port 8000 --reload

# 3. Configure the frontend
echo "NEXT_PUBLIC_AGENT_API_URL=http://127.0.0.1:8000" >> frontend/.env.local

# 4. Start the Next.js frontend separately (see frontend README)
```

Once running, the TradingView chart exposes an **Ask Agent** action. The captured chart snapshot is analysed by Claude Sonnet via OpenRouter and recent strategy suggestions appear in the Strategy Address Book panel.

## 📋 Available Commands

| Command | Description |
|---------|-------------|
| `python app.py` | Run agent once (default) |
| `python app.py --mode once` | Run agent once (explicit) |
| `python app.py --mode loop` | Run continuously (30s intervals) |
| `python app.py --price` | Test Pyth price fetching |
| `python app.py --rsi` | Test RSI calculation with live data |
| `python app.py --quote` | Test 1inch quote fetching |
| `python app.py --test` | Run all unit tests |

## 🏗️ Architecture

```
app.py                          # Simple entry point
├── backend/agent/
│   ├── core/
│   │   ├── agent.py           # Main TradingAgent class
│   │   ├── tools/             # Core tools
│   │   │   ├── price_fetcher.py    # Pyth price feeds
│   │   │   ├── rsi_calculator.py   # RSI calculation
│   │   │   ├── quote_fetcher.py    # 1inch quotes
│   │   │   ├── contract_executor.py # Web3 execution
│   │   │   └── risk_manager.py     # Risk management
│   │   └── strategies/
│   │       ├── strategy_base.py    # Base strategy class
│   │       └── rsi_strategy.py     # RSI trading strategy
│   ├── config/
│   │   ├── settings.py        # Configuration management
│   │   └── constants.py       # Trading constants
│   └── tests/
│       └── test_trading_agent.py # Unit tests
```

## ⚙️ Configuration

The agent uses environment variables from `backend/agent/.env`:

```bash
# Wallet Configuration
WALLET__PRIVATE_KEY=your_private_key
WALLET__ADDRESS=your_wallet_address

# Network Configuration
NETWORK__RPC_URL=https://sepolia.infura.io/v3/your_key
NETWORK__CHAIN_ID=11155111

# Contract Addresses
CONTRACTS__AGENT_REGISTRY=0x...
CONTRACTS__ARBITRAGE_AGENT=0x...
CONTRACTS__DCA_AGENT=0x...
CONTRACTS__GRID_TRADING_AGENT=0x...

# API Keys
ONEINCH__API_KEY=your_1inch_api_key
PYTH__API_KEY=your_pyth_api_key
```

## 🔧 Development

### Running Tests
```bash
python app.py --test
```

### Testing Individual Components
```bash
# Test price fetching
python app.py --price

# Test RSI calculation
python app.py --rsi

# Test quote fetching
python app.py --quote
```

### Running the Agent
```bash
# Single run
python app.py

# Continuous loop
python app.py --mode loop
```

## 📊 Current Status

- ✅ **Price Fetching**: Pyth Network integration working
- ✅ **RSI Calculation**: Technical analysis working
- ✅ **Agent Orchestration**: Main loop working
- ✅ **Unit Tests**: All tests passing
- 🔄 **Quote Fetching**: Needs Sepolia token addresses
- 🔄 **Contract Execution**: Needs strategy parameter updates

## 🎯 Next Steps

1. Update RSI strategy with Sepolia token addresses
2. Test 1inch quote fetching with real tokens
3. Enable contract execution for live trading
4. Add more trading strategies (Grid, DCA)

## 📝 Logs

The agent provides detailed logging:
- Price data and confidence levels
- RSI calculations and signals
- Trade execution results
- Error handling and recovery

Example output:
```
🚀 Simple Trading Agent
==================================================
🤖 Running Trading Agent (Once)...
[2025-09-27 00:45:31] No trade signal: RSI 50.00 not below threshold
✅ Agent cycle completed
✅ All operations completed successfully!
```

## 🛡️ Safety Features

- Risk management validation
- Slippage protection
- Position size limits
- Emergency stop capabilities
- Comprehensive error handling

## 📚 Documentation

- [Agent Plan](plan-docs/agent-plan.md) - Detailed implementation plan
- [Complete Plan](plan-docs/complete-plan.md) - Full project overview
- [Contract Addresses](contracts/addresses.json) - Deployed contract addresses
- [ABI Files](contracts/abi/) - Contract interfaces
