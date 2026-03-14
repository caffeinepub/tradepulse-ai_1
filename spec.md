# TradePulse AI

## Current State
Crypto symbols (BTC, ETH, SOL) use hardcoded `basePrice` values in `priceSimulator.ts`. On load, the chart always starts at the hardcoded value (e.g. BTC = 71055) regardless of the real market price.

## Requested Changes (Diff)

### Add
- On app init, fetch real-time prices for crypto symbols from the Binance REST API (`https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]`) before the simulator starts.
- A `fetchLiveBinancePrices()` async utility in `priceSimulator.ts` that calls the Binance REST endpoint and updates `basePrice` + seeds the initial `priceState` for each crypto symbol with the real last price.

### Modify
- `priceSimulator.ts`: Add `fetchLiveBinancePrices()` that fetches 24hr ticker data for BTCUSDT, ETHUSDT, SOLUSDT from Binance, then patches the corresponding `SYMBOLS` entries and priceStates.
- `DashboardPage.tsx` (or wherever the price simulator is initialized): call `fetchLiveBinancePrices()` on mount before starting the price update interval. Show a brief loading state if needed.

### Remove
- Nothing removed.

## Implementation Plan
1. In `priceSimulator.ts`, add `fetchLiveBinancePrices()` async function that: fetches `https://api.binance.com/api/v3/ticker/24hr?symbols=["BTCUSDT","ETHUSDT","SOLUSDT"]`, parses `lastPrice`, `highPrice`, `lowPrice`, `priceChange`, `priceChangePercent` from each ticker, updates the matching entry in `SYMBOLS` array's `basePrice`, and sets the corresponding priceState entry.
2. In `DashboardPage.tsx`, call `fetchLiveBinancePrices()` on mount (useEffect with empty deps), before the price update interval starts. Existing Binance WebSocket for live ticks remains unchanged.
3. Handle fetch errors gracefully -- fall back to hardcoded values if the fetch fails.
