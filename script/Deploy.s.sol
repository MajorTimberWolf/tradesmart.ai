// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import contracts
import "../contracts/core/AgentRegistry.sol";
import "../contracts/agents/templates/ArbitrageAgent.sol";
import "../contracts/agents/templates/DCAAgent.sol";
import "../contracts/agents/templates/GridTradingAgent.sol";
import "../contracts/interfaces/IERC8004Agent.sol";

contract DeployScript is Script {
    // Contract addresses will be stored here
    address public agentRegistry;
    address public arbitrageAgent;
    address public dcaAgent;
    address public gridTradingAgent;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("WALLET__PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AgentRegistry
        console.log("Deploying AgentRegistry...");
        AgentRegistry registry = new AgentRegistry(deployer, deployer); // Using deployer as validator for now
        agentRegistry = address(registry);
        console.log("AgentRegistry deployed at:", agentRegistry);

        // Create agent info and capabilities for all agents
        IERC8004Agent.AgentInfo memory agentInfo = IERC8004Agent.AgentInfo({
            name: "Trading Agent",
            version: "1.0.0",
            owner: deployer,
            metadataURI: "https://example.com/metadata"
        });

        IERC8004Agent.Capability[] memory capabilities = new IERC8004Agent.Capability[](2);
        capabilities[0] = IERC8004Agent.Capability({
            id: keccak256("TRADING"),
            name: "TRADING",
            description: "Execute trading strategies",
            data: ""
        });
        capabilities[1] = IERC8004Agent.Capability({
            id: keccak256("PRICE_MONITORING"),
            name: "PRICE_MONITORING", 
            description: "Monitor price feeds",
            data: ""
        });

        uint256[] memory supportedChains = new uint256[](1);
        supportedChains[0] = 11155111; // Sepolia

        // Deploy ArbitrageAgent
        console.log("Deploying ArbitrageAgent...");
        ArbitrageAgent arbAgent = new ArbitrageAgent(
            agentInfo,
            capabilities,
            supportedChains,
            deployer,
            agentRegistry
        );
        arbitrageAgent = address(arbAgent);
        console.log("ArbitrageAgent deployed at:", arbitrageAgent);

        // Deploy DCAAgent (needs Pyth and 1inch addresses)
        console.log("Deploying DCAAgent...");
        // Sepolia addresses
        address pythAddress = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21;
        address aggregationRouter = 0x1111111254EEB25477B68fb85Ed929f73A960582;
        
        DCAAgent dca = new DCAAgent(
            agentInfo,
            capabilities,
            supportedChains,
            deployer,
            agentRegistry,
            pythAddress,
            aggregationRouter
        );
        dcaAgent = address(dca);
        console.log("DCAAgent deployed at:", dcaAgent);

        // Deploy GridTradingAgent
        console.log("Deploying GridTradingAgent...");
        GridTradingAgent gridAgent = new GridTradingAgent(
            agentInfo,
            capabilities,
            supportedChains,
            deployer,
            agentRegistry
        );
        gridTradingAgent = address(gridAgent);
        console.log("GridTradingAgent deployed at:", gridTradingAgent);

        vm.stopBroadcast();

        // Log all deployed addresses
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("AgentRegistry:", agentRegistry);
        console.log("ArbitrageAgent:", arbitrageAgent);
        console.log("DCAAgent:", dcaAgent);
        console.log("GridTradingAgent:", gridTradingAgent);
        console.log("========================\n");

        // Save addresses to file for later use
        _saveAddresses();
    }

    function _saveAddresses() internal {
        string memory addresses = string(abi.encodePacked(
            '{\n',
            '  "AgentRegistry": "', vm.toString(agentRegistry), '",\n',
            '  "ArbitrageAgent": "', vm.toString(arbitrageAgent), '",\n',
            '  "DCAAgent": "', vm.toString(dcaAgent), '",\n',
            '  "GridTradingAgent": "', vm.toString(gridTradingAgent), '"\n',
            '}\n'
        ));
        
        vm.writeFile("deployments/sepolia.json", addresses);
        console.log("Addresses saved to deployments/sepolia.json");
    }
}
