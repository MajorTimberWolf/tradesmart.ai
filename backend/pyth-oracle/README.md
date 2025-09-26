# Pyth Oracle Demo

This package contains a minimal script that demonstrates the pull workflow for Pyth Network price feeds on EVM chains. It fetches price updates from the Hermes endpoint, updates the on-chain Pyth contract using `updatePriceFeeds`, and reads the latest price.

## Prerequisites

- Node.js 18+
- Access to an EVM RPC endpoint
- A funded private key on the target network capable of calling the Pyth contract
- Pyth contract address for the target chain and the price feed ID you want to read

## Environment Variables

Create a `.env` file in `backend/pyth-oracle` with:

```
HERMES_ENDPOINT=https://hermes.pyth.network
PYTH_PRICE_ID=<hex price id, with or without 0x prefix>
PYTH_CONTRACT_ADDRESS=<pyth contract address on target chain>
RPC_URL=<rpc endpoint url>
PRIVATE_KEY=<private key of transaction signer>
MAX_PRICE_AGE_SECONDS=60
FEEDS_CONFIG=./feeds.json
```

`FEEDS_CONFIG` is optional. When set, the script ignores `PYTH_PRICE_ID` and instead loads a JSON file containing one or more price feed entries. Without it, the single `PYTH_PRICE_ID` path from the environment is used.

If your Hermes endpoint requires basic auth, embed it in the URL using standard syntax, for example: `https://user:pass@hermes.pyth.network`. The script strips the credentials and forwards the appropriate header.

## Usage

Install dependencies:

```
npm install
```

Run the script:

```
npm start
```

The script will:

1. Load the configured feed(s) from either `.env` or `FEEDS_CONFIG`.
2. Fetch the latest price updates from Hermes for every feed.
3. Pay the required update fee and publish the updates on-chain via `updatePriceFeeds`.
4. Read fresh prices from the Pyth contract with `getPriceNoOlderThan` for each feed and log them.

### Multi-feed configuration

Provide a JSON file pointed to by `FEEDS_CONFIG`. You can either use a top-level array or wrap in `{ "feeds": [...] }`. Each entry must include an `id` and may optionally include a `symbol` or `label` that is used only for logging.

Example (`feeds.example.json`):

```
{
  "feeds": [
    { "id": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace", "symbol": "ETH/USD" },
    { "id": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43", "symbol": "BTC/USD" }
  ]
}
```

Copy it and adjust IDs as needed:

```
cp feeds.example.json feeds.json
```

Update `.env` to point `FEEDS_CONFIG=./feeds.json` (or another path). During a run the script prints Hermes and on-chain prices for each configured feed in sequence.

See the [Pyth docs for EVM integrations](https://docs.pyth.network/price-feeds/use-real-time-data/evm) and [Hermes fetch guide](https://docs.pyth.network/price-feeds/fetch-price-updates) for more details.
