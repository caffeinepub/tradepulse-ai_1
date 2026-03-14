# TradePulse AI

## Current State
The dashboard (`DashboardPage.tsx`) has:
- A static `AI_SIGNALS` map with fixed signal/confidence/reason per symbol
- A thin "AI SIGNAL" bar at the bottom of the chart showing signal badge + confidence bar + reason text
- Right panel with order entry and open positions (visible only on large screens)
- Prices update on a 3-second interval via `priceSimulator`

## Requested Changes (Diff)

### Add
- `AISignalEngine` utility/hook (`useAISignals`) that:
  - Runs automatically every 1 second (no manual trigger)
  - Reads current price + price history for the selected asset
  - Computes a full signal object including: signal type (BUY/SELL/HOLD), entry price, stop loss, take profit, risk/reward ratio, probability score (0-100), trend direction (Bullish/Bearish/Neutral), trade type (Scalp/Intraday/Swing), and timestamp
  - Uses simulated technical analysis logic (momentum, volatility, moving average crossover proxies based on recent chart data)
  - Appends each new signal to a signal history array (capped at 100 entries)
- `SignalsPanel` component:
  - Dedicated right-side panel replacing the current right `<aside>` on the dashboard (or placed next to chart)
  - **Live Signal Card** at top: shows latest signal with all fields highlighted (large signal badge, entry/SL/TP/RR/probability/trend/trade type)
  - **Signal History Table** below the live card: scrollable list with all history fields (asset, signal, entry, SL, TP, RR, probability, trend, trade type, timestamp)
  - Latest signal always at top of history
  - Auto-updates every second as new signal arrives
- Order entry and open positions section preserved (can be a collapsible section or tab within the right panel)

### Modify
- `DashboardPage.tsx`:
  - Remove the static `AI_SIGNALS` map
  - Remove the bottom AI signal bar
  - Integrate `useAISignals` hook, pass selected symbol and current price/chart data
  - Replace or reorganize the right `<aside>` to include the `SignalsPanel` + order/positions below it
  - Layout: left sidebar (symbols) | chart (main, flex-1) | right panel (signals panel + order/positions)

### Remove
- Static `AI_SIGNALS` constant
- Bottom AI signal strip below the chart

## Implementation Plan
1. Create `src/frontend/src/utils/aiSignalEngine.ts` — pure signal generation logic
2. Create `src/frontend/src/hooks/useAISignals.ts` — React hook wrapping the engine, 1-second interval, history state
3. Create `src/frontend/src/components/SignalsPanel.tsx` — live signal card + history table UI
4. Update `DashboardPage.tsx` — wire hook, integrate SignalsPanel, remove old static signals
