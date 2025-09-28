# AI Trading Agent Platform

An autonomous trading platform that combines AI-powered chart analysis with automated execution on Ethereum. The system uses Claude Sonnet for technical analysis and integrates with Pyth oracles and 1inch DEX for intelligent trading decisions.

## Architecture

![AI Trading Agent Platform Architecture](architecture%20diagram.png)

## Quick Start

### Prerequisites
- Node.js (for frontend)
- Python with uv (for backend)
- Ethereum wallet with private key

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/your-username/eth-global-delhi.git
cd eth-global-delhi
```

2. **Configure environment**
```bash
# Copy environment template
1) cp backend/agent/.env.example backend/agent/.env
2) cp backend/pyth-oracle/.env.example backend/pyth-oracle/.env
3) cp frontend/.env.example frontend/.env.local

# Edit the .env file with your configuration
# Required: WALLET__PRIVATE_KEY, LLM__API_KEY, network RPC URLs
```

3. **Start the backend server**
```bash
# From project root directory
uvicorn backend.agent.api.server:app --reload --port 8000
```

4. **Start the frontend**
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies 
npm install
# start development server
npm run dev
```

### Running the Platform

Once both services are running:
- Open your browser to `http://localhost:3000` (frontend)
- The backend API will be available at `http://localhost:8000`
- Use the TradingView chart to capture snapshots and click "Ask Agent" for AI analysis
- View trading suggestions in the Strategy Address Book panel

## Key Features

- **AI-Powered Analysis**: Claude Sonnet analyzes trading charts and provides strategy suggestions
- **Real-time Price Data**: Integrated with Pyth Network for accurate oracle prices
- **DEX Integration**: 1inch API for optimal trade execution
- **Risk Management**: Built-in safety checks and position limits
- **Smart Contract Support**: ERC8004 infrastructure for autonomous agents
- **Live Testing**: Deploy and test trading strategies on Sepolia testnet

## Development

### Testing Individual Components
```bash
# Test price fetching
python app.py --price

# Test RSI calculation
python app.py --rsi

# Test DEX quotes
python app.py --quote

# Run all tests
python app.py --test
```

### Configuration
Edit `backend/agent/.env` to configure:
- Wallet settings (private key, address)
- Network RPC URLs
- API keys (LLM, 1inch, Pyth)
- Contract addresses
- Trading parameters