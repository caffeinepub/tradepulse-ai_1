# TradePulse AI

## Current State
- Professional dark trading terminal with live price data (Binance WebSocket for crypto, simulated for forex/gold/indices)
- AI Signal Engine generates BUY/SELL/HOLD signals with entry, SL, TP, RR, probability, trend, tradeType
- Market Analysis Engine: real-time trend, momentum score, structure events (BOS, CHOCH, Breakout)
- Multi-Timeframe Analysis: higher TF (4H, 1D) and entry TF (1m, 5m, 15m) trends, confluence score, bias
- Chart: line chart with candle timer, timeframe switching (1m, 5m, 15m, 1h, 4h, 1D)
- Trade Visualization: markers, SL/TP lines, entry/exit on chart canvas via TradeChartOverlay
- Demo account tracking
- SignalsPanel shows current signal and history
- Signals Panel and Market Analysis Panel side by side below the chart

## Requested Changes (Diff)

### Add
- **Candlestick chart type** (default): OHLC candles with green/red coloring, real-time updates
- **Chart type switcher** in toolbar inline with timeframe buttons: Candlestick | Line | Area | Bar
- **Area chart type** and **Bar chart type** in chart renderer
- **TP1, TP2, TP3** fields to AISignal interface (replace single takeProfit)
- **Confidence breakdown** fields to AISignal: trendAlignment, indicatorConfluence, volumeConfirmation, structureScore contributing to final confidence %
- **200 USDT daily loss limit** in useTradeHistory / demo trading logic: track daily PnL, stop opening new demo trades when loss >= 200 USDT, reset at start of new trading day
- **Daily loss limit status indicator** in the dashboard (badge/banner when limit hit)
- Candle data generation: generate OHLC candle history and update current candle in real time

### Modify
- **aiSignalEngine.ts**: Add TP1/TP2/TP3 calculation, enhance confidence score with 4 components (trend alignment 0-25, indicator confluence 0-25, volume confirmation 0-25, structure signals 0-25), rename `probability` to `confidence`, add `Sideways` to trend type
- **SignalsPanel.tsx**: Show TP1, TP2, TP3 separately; show confidence with breakdown; update field names
- **useTradeHistory.ts**: Integrate 200 USDT daily loss limit; use TP1/TP2/TP3 from signal; track dailyPnL; expose `dailyLossLimitHit` boolean and `dailyPnl` value
- **DashboardPage.tsx**: 
  - Add chart type state (candlestick | line | area | bar), pass to chart renderer
  - Add chart type buttons in toolbar next to timeframe selector
  - Show daily loss limit status badge when limit is hit
- **Chart renderer** (inline in DashboardPage or dedicated component): Support candlestick OHLC rendering; area chart fill; bar chart rendering; all chart types must render trade overlay lines/markers
- **TradeChartOverlay.tsx**: Accept and display TP1/TP2/TP3 lines separately on canvas (TP1 green-solid, TP2 green-dashed, TP3 green-dotted)
- **priceSimulator.ts**: Add `generateCandleData` function that returns `{time, open, high, low, close}[]` for chart rendering; maintain live candle that updates with each price tick

### Remove
- Single `takeProfit` field from AISignal (replaced by tp1, tp2, tp3)

## Implementation Plan
1. Update `AISignal` interface: add `tp1`, `tp2`, `tp3`, rename `probability` -> `confidence`, add `Sideways` to trend union, add confidence breakdown fields
2. Update `aiSignalEngine.ts`: calculate TP1/TP2/TP3 levels, compute 4-component confidence score
3. Update `priceSimulator.ts`: add OHLC candle data generator and live candle updater
4. Update `useTradeHistory.ts`: 200 USDT daily loss cap logic, use tp1/tp2/tp3 from signal
5. Update `SignalsPanel.tsx`: display tp1/tp2/tp3, updated confidence display
6. Update chart rendering in DashboardPage: candlestick (default), line, area, bar chart types with switcher in toolbar
7. Update `TradeChartOverlay.tsx`: render TP1/TP2/TP3 as separate lines with distinct styling
8. Add daily loss status indicator to dashboard
