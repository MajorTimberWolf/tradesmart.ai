# Pyth Contract Addresses for EVM Chains

## Mainnet Chains

| Network | Contract Address |
|---------|------------------|
| Ethereum Mainnet | `0x4305FB66699C3B2702D4d05CF36551390A4c69C6` |
| Arbitrum One | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Optimism | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Polygon | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Base | `0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a` |
| BNB Chain | `0x4D7E825f80bDf85e913E0DD2A2D54927e9dE1594` |
| Avalanche C-Chain | `0x4305FB66699C3B2702D4d05CF36551390A4c69C6` |
| Gnosis | `0x2880aB155794e7179c9eE2e38200202908C17B43` |
| Mantle | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Linea | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Scroll | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| zkSync Era | `0xf087c864AEccFb6A2Bf1Af6A0382B0d0f6c5D834` |

## Testnet Chains

| Network | Contract Address |
|---------|------------------|
| Sepolia (Ethereum Testnet) | `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21` |
| Arbitrum Sepolia | `0x4374e5a8b9C22271E9EB878A2AA31DE97DF15DAF` |
| Optimism Sepolia | `0x0708325268dF9F66270F1401206434524814508b` |
| Base Sepolia | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Polygon Mumbai | `0xff1a0f4744e8582DF1aE09D5611b887B6a12925C` |
| Polygon Amoy | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| BNB Chain Testnet | `0xd7308b14BF4008e7C7196eC35610B1427C5702EA` |
| Avalanche Fuji | `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21` |
| Gnosis Chiado | `0x98046Bd286715D3B0BC227Dd7a956b83D8978603` |
| Mantle Sepolia | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Linea Sepolia | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| Scroll Sepolia | `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729` |
| zkSync Sepolia | `0xC38B1dd611889Abc95d4E0a472A667c3671c08DE` |

## How to Use

1. Identify which network you're deploying to
2. Copy the corresponding contract address from the table above
3. Update your `.env` file with the address

For example, if using Sepolia testnet:
```
PYTH_CONTRACT_ADDRESS=0xDd24F84d36BF92C65F92307595335bdFab5Bbd21
```

## Official Documentation

For the most up-to-date contract addresses, visit:
https://docs.pyth.network/price-feeds/contract-addresses/evm