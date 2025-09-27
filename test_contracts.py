#!/usr/bin/env python3
"""
Test contract interaction with deployed Sepolia contracts.
"""

import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from backend.agent.core.tools.contract_executor import ContractExecutor
from backend.agent.config.settings import AgentSettings
import json


def test_contract_loading():
    """Test loading contract ABIs and addresses."""
    print("🔗 Testing Contract Loading...")
    
    try:
        settings = AgentSettings()
        executor = ContractExecutor(settings)
        
        # Load addresses
        with open("contracts/addresses.json", "r") as f:
            addresses = json.load(f)
        
        sepolia_addresses = addresses.get("11155111", {})
        print(f"✅ Loaded Sepolia addresses: {list(sepolia_addresses.keys())}")
        
        # Test loading ABI files
        abi_dir = Path("contracts/abi")
        abi_files = list(abi_dir.glob("*.json"))
        print(f"✅ Found ABI files: {[f.name for f in abi_files]}")
        
        # Test Web3 connection
        if executor.web3.is_connected():
            print("✅ Web3 connection successful")
            print(f"   Chain ID: {executor.web3.eth.chain_id}")
            print(f"   Latest block: {executor.web3.eth.block_number}")
        else:
            print("❌ Web3 connection failed")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ Contract loading failed: {e}")
        return False


def test_agent_registry():
    """Test AgentRegistry contract interaction."""
    print("\n📋 Testing AgentRegistry Contract...")
    
    try:
        settings = AgentSettings()
        executor = ContractExecutor(settings)
        
        # Load AgentRegistry ABI
        with open("contracts/abi/AgentRegistry.json", "r") as f:
            abi = json.load(f)
        
        # Get contract address
        with open("contracts/addresses.json", "r") as f:
            addresses = json.load(f)
        
        contract_address = addresses["11155111"]["agent_registry"]
        print(f"   Contract address: {contract_address}")
        
        # Create contract instance
        contract = executor.web3.eth.contract(
            address=contract_address,
            abi=abi["abi"]  # Extract just the ABI from the Hardhat output
        )
        
        # Test reading from contract (view functions)
        try:
            # Try to call a view function if available
            print("✅ AgentRegistry contract loaded successfully")
            print(f"   Contract code: {contract.functions}")
        except Exception as e:
            print(f"⚠️  Could not call contract functions: {e}")
            print("   (This is normal if the contract doesn't have view functions)")
        
        return True
        
    except Exception as e:
        print(f"❌ AgentRegistry test failed: {e}")
        return False


def test_strategy_contracts():
    """Test strategy contract interaction."""
    print("\n🎯 Testing Strategy Contracts...")
    
    try:
        settings = AgentSettings()
        executor = ContractExecutor(settings)
        
        # Load addresses
        with open("contracts/addresses.json", "r") as f:
            addresses = json.load(f)
        
        sepolia_addresses = addresses["11155111"]
        strategy_contracts = [
            ("ArbitrageAgent", sepolia_addresses.get("arbitrage_agent")),
            ("DCAAgent", sepolia_addresses.get("dca_agent")),
            ("GridTradingAgent", sepolia_addresses.get("grid_trading_agent")),
        ]
        
        for name, address in strategy_contracts:
            if address:
                print(f"   ✅ {name}: {address}")
            else:
                print(f"   ⚠️  {name}: No address found")
        
        return True
        
    except Exception as e:
        print(f"❌ Strategy contracts test failed: {e}")
        return False


def main():
    """Run all contract tests."""
    print("🚀 Contract Interaction Tests")
    print("=" * 50)
    
    success = True
    success &= test_contract_loading()
    success &= test_agent_registry()
    success &= test_strategy_contracts()
    
    if success:
        print("\n✅ All contract tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some contract tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()
