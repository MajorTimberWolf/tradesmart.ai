import 'dotenv/config';
import { HermesClient } from '@pythnetwork/hermes-client';
import { Contract, JsonRpcProvider, Wallet, formatUnits } from 'ethers';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const {
  HERMES_ENDPOINT = 'https://hermes.pyth.network',
  PYTH_PRICE_ID,
  PYTH_CONTRACT_ADDRESS,
  RPC_URL,
  PRIVATE_KEY,
  MAX_PRICE_AGE_SECONDS = '60',
  FEEDS_CONFIG,
} = process.env;

if (!PYTH_CONTRACT_ADDRESS) {
  throw new Error('Missing PYTH_CONTRACT_ADDRESS env variable.');
}

if (!RPC_URL) {
  throw new Error('Missing RPC_URL env variable.');
}

if (!PRIVATE_KEY) {
  throw new Error('Missing PRIVATE_KEY env variable.');
}

const PYTH_ABI = [
  'function getUpdateFee(bytes[] calldata updateData) external view returns (uint256)',
  'function updatePriceFeeds(bytes[] calldata updateData) external payable',
  'function getPriceNoOlderThan(bytes32 priceId, uint age) external view returns (int64 price, uint64 conf, int32 expo, uint64 publishTime)',
];

const priceAgeSeconds = Number(MAX_PRICE_AGE_SECONDS);
if (Number.isNaN(priceAgeSeconds) || priceAgeSeconds < 0) {
  throw new Error('MAX_PRICE_AGE_SECONDS must be a non-negative number.');
}

const provider = new JsonRpcProvider(RPC_URL);
const wallet = new Wallet(PRIVATE_KEY, provider);
const contract = new Contract(PYTH_CONTRACT_ADDRESS, PYTH_ABI, wallet);

const { endpoint: hermesEndpoint, headers: hermesHeaders } = parseHermesEndpoint(HERMES_ENDPOINT);
const client = new HermesClient(hermesEndpoint, { headers: hermesHeaders });

function parseHermesEndpoint(endpoint) {
  try {
    const url = new URL(endpoint);
    const headers = {};

    if (url.username && url.password) {
      headers.Authorization = `Basic ${Buffer.from(`${url.username}:${url.password}`).toString('base64')}`;
      url.username = '';
      url.password = '';
    }

    return { endpoint: url.toString(), headers };
  } catch (err) {
    console.warn(`Invalid HERMES_ENDPOINT provided: ${err.message}`);
  }
  return { endpoint, headers: {} };
}

function sanitizePriceId(priceId) {
  const normalized = priceId.trim();
  const hex = normalized.startsWith('0x') ? normalized.slice(2) : normalized;
  if (hex.length !== 64) {
    throw new Error(`Price ID must be 32 bytes (64 hex chars). Received length ${hex.length}`);
  }
  return hex.toLowerCase();
}

function toBytes32(hexString) {
  return hexString.startsWith('0x') ? hexString : `0x${hexString}`;
}

function toPrefixedHex(data) {
  return data.startsWith('0x') ? data : `0x${data}`;
}

function loadFeedConfigs() {
  if (FEEDS_CONFIG) {
    const configPath = resolve(process.cwd(), FEEDS_CONFIG);
    if (!existsSync(configPath)) {
      throw new Error(`Feeds config file not found at ${configPath}`);
    }

    let parsed;
    try {
      parsed = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (error) {
      throw new Error(`Failed to parse feeds config JSON: ${error.message}`);
    }

    const entries = Array.isArray(parsed) ? parsed : parsed?.feeds;
    if (!Array.isArray(entries)) {
      throw new Error('Feeds config must be an array or an object with a feeds array.');
    }

    const seen = new Map();
    entries.forEach((entry, index) => {
      if (!entry || typeof entry.id !== 'string') {
        throw new Error(`Feed entry at index ${index} is missing an id string.`);
      }
      const sanitizedHex = sanitizePriceId(entry.id);
      const idBytes32 = toBytes32(sanitizedHex);
      const key = idBytes32.toLowerCase();

      if (seen.has(key)) {
        console.warn(`Duplicate feed id detected in config (${idBytes32}); ignoring subsequent entry.`);
        return;
      }

      seen.set(key, {
        idHex: sanitizedHex,
        idBytes32,
        label: entry.symbol ?? entry.label ?? idBytes32,
      });
    });

    if (seen.size === 0) {
      throw new Error('No valid feed entries found in config.');
    }

    return Array.from(seen.values());
  }

  if (!PYTH_PRICE_ID) {
    throw new Error('Provide either PYTH_PRICE_ID or FEEDS_CONFIG to specify feeds.');
  }

  const sanitizedHex = sanitizePriceId(PYTH_PRICE_ID);
  return [
    {
      idHex: sanitizedHex,
      idBytes32: toBytes32(sanitizedHex),
      label: 'env:PYTH_PRICE_ID',
    },
  ];
}

function formatParsedPrice(parsedPrice) {
  if (!parsedPrice) {
    return 'N/A (no parsed price returned by Hermes)';
  }
  const priceStruct = parsedPrice.price ?? parsedPrice.ema_price;
  if (!priceStruct) {
    return 'N/A (missing price fields)';
  }
  const { price, expo } = priceStruct;
  if (price === undefined || expo === undefined) {
    return 'N/A (missing price fields)';
  }
  if (expo < 0) {
    return formatUnits(BigInt(price), -expo);
  }
  return (BigInt(price) * 10n ** BigInt(expo)).toString();
}

async function fetchHermesUpdates(feedIds) {
  console.log(
    `Fetching latest price updates for ${feedIds.length} feed(s) from Hermes: ${hermesEndpoint}`,
  );
  const response = await client.getLatestPriceUpdates(feedIds, { encoding: 'hex', parsed: true });
  const updateData = response.binary.data.map(toPrefixedHex);
  const parsedMap = new Map();

  if (Array.isArray(response.parsed)) {
    for (const item of response.parsed) {
      const key = item.id.startsWith('0x') ? item.id.toLowerCase() : `0x${item.id.toLowerCase()}`;
      parsedMap.set(key, item);
    }
  }

  return { updateData, parsedMap };
}

function formatOnChainPrice(priceStruct) {
  const { price, expo, conf, publishTime } = priceStruct;
  const formattedPrice = expo < 0 ? formatUnits(price, -expo) : (BigInt(price) * 10n ** BigInt(expo)).toString();
  const formattedConf = expo < 0 ? formatUnits(conf, -expo) : (BigInt(conf) * 10n ** BigInt(expo)).toString();
  return {
    price: formattedPrice,
    confidence: formattedConf,
    publishTime,
    raw: priceStruct,
  };
}

async function main() {
  try {
    const feeds = loadFeedConfigs();
    const { updateData, parsedMap } = await fetchHermesUpdates(feeds.map((feed) => feed.idHex));

    if (updateData.length === 0) {
      console.log('No update data returned from Hermes; skipping on-chain transaction.');
      return;
    }

    console.log('Estimating update fee...');
    const updateFee = await contract.getUpdateFee(updateData);
    console.log(`Required update fee: ${updateFee.toString()} wei`);

    console.log('Sending updatePriceFeeds transaction...');
    const tx = await contract.updatePriceFeeds(updateData, { value: updateFee });
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Transaction hash: ${tx.hash}`);

    for (const feed of feeds) {
      console.log(`\n=== ${feed.label} (${feed.idBytes32}) ===`);
    const parsed = parsedMap.get(feed.idBytes32.toLowerCase()) ?? parsedMap.get(feed.idHex.toLowerCase());
      console.log('Latest Hermes price (parsed):', formatParsedPrice(parsed));

      console.log('Reading price from on-chain contract...');
      const onChainPriceStruct = await contract.getPriceNoOlderThan(feed.idBytes32, priceAgeSeconds);
      const formatted = formatOnChainPrice(onChainPriceStruct);

      console.log('On-chain price fetched from Pyth contract:', formatted.price);
      console.log('On-chain confidence interval:', formatted.confidence);
      console.log('Published at (unix):', formatted.publishTime);
    }
  } catch (error) {
    console.error('Failed to update and read price from Pyth:', error);
    process.exitCode = 1;
  }
}

main();


