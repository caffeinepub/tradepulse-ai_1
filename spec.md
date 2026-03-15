# TradePulse AI

## Current State
- BTC/USD chart initializes with `generateCandleHistory()` which creates simulated candles seeded from a potentially stale base price, causing the Y-axis to show an incorrect 365,000 range
- On pair/timeframe change, `handleSymbolOrTimeframeChange` regenerates candle history from simulation — no fresh data fetch
- `priceMin/priceMax` uses 8% padding across ALL candle data (not limited to last 50)
- Binance REST candle fetch (`fetchBinanceCandles`) exists but is not called on initial load or symbol/timeframe change for BTC/ETH/SOL
- Twelve Data `startCandlePolling` is only triggered for Forex pairs on 5m/15m timeframes — not on all timeframes and not on symbol switch

## Requested Changes (Diff)

### Add
- On page load: immediately fetch real candles from Binance REST API for BTC/USD (and ETH/SOL if selected) instead of using simulated history
- On pair change or timeframe change: fetch fresh candles from the appropriate API (Binance for crypto, Twelve Data for Forex/Gold) and replace all candle data in state
- Loading state: while fresh candles are being fetched after a switch, clear the previous candle data so stale data is never shown

### Modify
- `priceMin/priceMax` computation: limit to last 50 candles only; change padding from 8% to 5%
- `handleSymbolOrTimeframeChange`: instead of calling `generateCandleHistory`, set candle data to empty (reset) and trigger a fresh API fetch
- Initial load effect: replace `generateCandleHistory` for BTC/USD with `fetchBinanceCandles("BTC/USD", "1h", 60)` — convert result to `CandleData[]` format and set state
- Forex polling: expand `startCandlePolling` to cover all timeframes (not just 5m/15m), mapping timeframe strings to Twelve Data interval strings

### Remove
- `generateCandleHistory` calls for the initial BTC/USD load and on pair/timeframe switch (replaced by real API fetches)
- Stale candle data bleeding through on symbol/timeframe switch

## Implementation Plan
1. Add a `convertBinanceCandles(candles: Candle[]): CandleData[]` helper in DashboardPage.tsx (similar to existing `convertTwelveDataCandles`)
2. Create a `fetchChartCandles(symbol, timeframe)` async helper that routes to Binance or Twelve Data depending on symbol, and returns `CandleData[]`
3. On initial mount: call `fetchChartCandles("BTC/USD", "1h")` to seed the chart with real data; also update `livePriceRef` from the last candle close
4. In the symbol/timeframe change effect: clear `candleData` to `[]` first (shows loading/empty state), then call `fetchChartCandles` and set the result
5. Fix `priceMin/priceMax` useMemo: slice to last 50 candles before computing min/max, and reduce padding constant from 0.08 to 0.05
6. Remove `generateCandleHistory` from initial BTC load and from `handleSymbolOrTimeframeChange` for real-data paths
