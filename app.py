#!/usr/bin/env python3
"""
Simple Trading Agent - Main Entry Point
=======================================

A simplified interface for the LangChain trading agent that can be easily
executed and called frequently as per the agent-plan.md requirements.

Usage:
    python app.py                    # Run once
    python app.py --mode once        # Run once (explicit)
    python app.py --mode loop        # Run continuously
    python app.py --test             # Run tests
    python app.py --price            # Just fetch current price
    python app.py --rsi              # Calculate RSI with current data
    python app.py --quote            # Test 1inch quote (if configured)
"""

import argparse
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.agent.core.agent import TradingAgent
from backend.agent.core.tools.price_fetcher import PriceFetcher
from backend.agent.core.tools.rsi_calculator import RSICalculator
from backend.agent.core.tools.quote_fetcher import QuoteFetcher
from backend.agent.config.settings import AgentSettings


def run_price_test():
    """Test price fetching from Pyth."""
    print("🔍 Testing Price Fetcher...")
    try:
        settings = AgentSettings()
        fetcher = PriceFetcher(settings)
        price = fetcher.fetch_price('ETH_USD')
        print(f"✅ ETH Price: ${price.price:.2f} (confidence: {price.confidence:.2f})")
        return True
    except Exception as e:
        print(f"❌ Price fetch failed: {e}")
        return False


def run_rsi_test():
    """Test RSI calculation with current market data."""
    print("📊 Testing RSI Calculation...")
    try:
        settings = AgentSettings()
        fetcher = PriceFetcher(settings)
        rsi_calc = RSICalculator(period=14)
        
        # Get 15 prices for RSI calculation
        prices = []
        for i in range(15):
            price = fetcher.fetch_price('ETH_USD')
            prices.append(price.price)
            print(f"  Price {i+1}: ${price.price:.2f}")
        
        rsi = RSICalculator.from_series(prices, period=14)
        print(f"✅ RSI: {rsi:.2f}")
        
        # Determine signal
        if rsi < 30:
            signal = "🟢 BUY (Oversold)"
        elif rsi > 70:
            signal = "🔴 SELL (Overbought)"
        else:
            signal = "⚪ HOLD (Neutral)"
        
        print(f"📈 Signal: {signal}")
        return True
    except Exception as e:
        print(f"❌ RSI calculation failed: {e}")
        return False


def run_quote_test():
    """Test 1inch quote fetching."""
    print("💱 Testing 1inch Quote...")
    try:
        settings = AgentSettings()
        quote_fetcher = QuoteFetcher(settings)
        
        # Use Sepolia WETH and USDC addresses
        from_token = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"  # WETH on Sepolia
        to_token = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8"    # USDC on Sepolia
        amount = 1000000000000000000  # 1 ETH in wei
        
        quote = quote_fetcher.fetch_swap_quote(from_token, to_token, amount)
        print(f"✅ Quote: {quote}")
        return True
    except Exception as e:
        print(f"❌ Quote fetch failed: {e}")
        return False


def run_agent_once():
    """Run the trading agent once."""
    print("🤖 Running Trading Agent (Once)...")
    try:
        from backend.agent.core.strategies.rsi_strategy import RSIStrategy
        
        settings = AgentSettings()
        strategy = RSIStrategy(settings)
        agent = TradingAgent(strategy=strategy, settings=settings)
        agent.run_cycle()
        print("✅ Agent cycle completed")
        return True
    except Exception as e:
        print(f"❌ Agent execution failed: {e}")
        return False


def run_agent_loop():
    """Run the trading agent continuously."""
    print("🔄 Running Trading Agent (Continuous Loop)...")
    print("Press Ctrl+C to stop")
    try:
        from backend.agent.core.strategies.rsi_strategy import RSIStrategy
        
        settings = AgentSettings()
        strategy = RSIStrategy(settings)
        agent = TradingAgent(strategy=strategy, settings=settings)
        
        while True:
            agent.run_cycle()
            # Wait 30 seconds between cycles
            import time
            time.sleep(30)
    except KeyboardInterrupt:
        print("\n🛑 Agent stopped by user")
        return True
    except Exception as e:
        print(f"❌ Agent loop failed: {e}")
        return False


def run_tests():
    """Run all unit tests."""
    print("🧪 Running Unit Tests...")
    import subprocess
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "backend/agent/tests/", "-v"
        ], capture_output=True, text=True)
        
        print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        return result.returncode == 0
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return False


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Simple Trading Agent")
    parser.add_argument("--mode", choices=["once", "loop"], default="once",
                       help="Run mode: once or loop")
    parser.add_argument("--test", action="store_true", help="Run tests")
    parser.add_argument("--price", action="store_true", help="Test price fetching")
    parser.add_argument("--rsi", action="store_true", help="Test RSI calculation")
    parser.add_argument("--quote", action="store_true", help="Test 1inch quotes")
    
    args = parser.parse_args()
    
    print("🚀 Simple Trading Agent")
    print("=" * 50)
    
    success = True
    
    if args.test:
        success &= run_tests()
    
    if args.price:
        success &= run_price_test()
    
    if args.rsi:
        success &= run_rsi_test()
    
    if args.quote:
        success &= run_quote_test()
    
    # If no specific test flags, run the agent
    if not any([args.test, args.price, args.rsi, args.quote]):
        if args.mode == "once":
            success &= run_agent_once()
        else:
            success &= run_agent_loop()
    
    if success:
        print("\n✅ All operations completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Some operations failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
