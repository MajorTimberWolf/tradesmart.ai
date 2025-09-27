#!/usr/bin/env python3
"""
Simple test without Web3 connection.
"""

import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.agent.core.tools.price_fetcher import PriceFetcher
from backend.agent.core.tools.rsi_calculator import RSICalculator
from backend.agent.core.tools.quote_fetcher import QuoteFetcher
from backend.agent.config.settings import AgentSettings
import json


def test_price_fetcher():
    """Test price fetching."""
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


def test_rsi_calculator():
    """Test RSI calculation."""
    print("\n📊 Testing RSI Calculator...")
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


def test_quote_fetcher():
    """Test quote fetching."""
    print("\n💱 Testing Quote Fetcher...")
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


def test_contract_addresses():
    """Test contract address loading."""
    print("\n🔗 Testing Contract Addresses...")
    try:
        with open("contracts/addresses.json", "r") as f:
            addresses = json.load(f)
        
        sepolia_addresses = addresses.get("11155111", {})
        print(f"✅ Loaded Sepolia addresses: {list(sepolia_addresses.keys())}")
        
        # Check specific contracts
        contracts = ["agent_registry", "arbitrage_agent", "dca_agent", "grid_trading_agent"]
        for contract in contracts:
            address = sepolia_addresses.get(contract)
            if address:
                print(f"   ✅ {contract}: {address}")
            else:
                print(f"   ❌ {contract}: Not found")
        
        return True
    except Exception as e:
        print(f"❌ Contract addresses test failed: {e}")
        return False


def test_abi_files():
    """Test ABI file loading."""
    print("\n📄 Testing ABI Files...")
    try:
        abi_dir = Path("contracts/abi")
        abi_files = list(abi_dir.glob("*.json"))
        print(f"✅ Found ABI files: {[f.name for f in abi_files]}")
        
        # Test loading each ABI
        for abi_file in abi_files:
            try:
                with open(abi_file, "r") as f:
                    abi_data = json.load(f)
                print(f"   ✅ {abi_file.name}: {len(abi_data.get('abi', []))} functions")
            except Exception as e:
                print(f"   ❌ {abi_file.name}: {e}")
        
        return True
    except Exception as e:
        print(f"❌ ABI files test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🚀 Simple Agent Tests")
    print("=" * 50)
    
    success = True
    success &= test_price_fetcher()
    success &= test_rsi_calculator()
    success &= test_quote_fetcher()
    success &= test_contract_addresses()
    success &= test_abi_files()
    
    if success:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
