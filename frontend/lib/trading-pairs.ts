export type TokenDecimals = {
  base: number
  quote: number
}

export type TradingPairConfig = {
  id: string
  label: string
  backendSymbol: string
  pythFeedId: string
  baseToken: string
  quoteToken: string
  decimals: TokenDecimals
  tradingViewSymbol: string
}

export const TRADING_PAIRS: TradingPairConfig[] = [
  {
    id: 'WETH/USDC',
    label: 'WETH / USDC',
    backendSymbol: 'ETH_USD',
    pythFeedId: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    baseToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    quoteToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: { base: 18, quote: 6 },
    tradingViewSymbol: 'PYTH:ETHUSD'
  },
  {
    id: 'WBTC/USDC',
    label: 'WBTC / USDC',
    backendSymbol: 'BTC_USD',
    pythFeedId: '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    baseToken: '0x1BFD67037B42CF73acf2047067bd4F2C47D9BfD6',
    quoteToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    decimals: { base: 8, quote: 6 },
    tradingViewSymbol: 'PYTH:BTCUSD'
  },
  {
    id: 'WETH/MATIC',
    label: 'WETH / MATIC',
    backendSymbol: 'ETH_USD',
    pythFeedId: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    baseToken: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    quoteToken: '0x0000000000000000000000000000000000001010',
    decimals: { base: 18, quote: 18 },
    tradingViewSymbol: 'PYTH:ETHUSD'
  }
]

export const TRADING_PAIR_BY_ID = Object.fromEntries(
  TRADING_PAIRS.map((pair) => [pair.id, pair])
)

export const DEFAULT_TRADING_PAIR_ID = TRADING_PAIRS[0]?.id ?? 'WETH/USDC'
