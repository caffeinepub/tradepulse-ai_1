# TradePulse AI

## Current State
The platform has an existing AI signal engine (useAISignals) that generates Scalp/Intraday/Swing/Position signals using SMC + EMA + VWAP + confidence scoring. SignalsPanel displays the live signal in the right sidebar. The auto-trading hook (useAutoTrading) executes trades when confidence >= 85%. Charts support 1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M timeframes.

## Requested Changes (Diff)

### Add
- `use15MSignalEngine.ts` hook: dedicated 15M intraday signal engine with strict logic:
  - BUY: EMA20 > EMA50, price > VWAP, RSI 55–70, volume above 5-candle average
  - SELL: EMA20 < EMA50, price < VWAP, RSI 30–45, volume above 5-candle average
  - NO TRADE if any condition unmet
  - Calculates: SL = 1.2×ATR, TP = entry ± (SL distance × 2), lot size = risk-based (1% balance / SL distance), Trade Confidence %
  - Signal includes: signal type, timestamp with timezone, entry, SL, TP, lot size, confidence %, reason string
  - Updates on every new 15M candle
  - Stores signal history (last 50)
- `IntraSignalPanel.tsx`: dedicated panel for 15M signals alongside existing SignalsPanel
  - Displays signal in exact format: Signal, Signal Time, Entry Price, SL, Target, Lot Size, Trade Confidence %, Reason
  - Shows NO TRADE state with reason when conditions unmet
  - Signal history log (collapsible, last 20 entries)
  - Visual badge: BUY (green), SELL (red), NO TRADE (gray)
- Chart entry markers for 15M signals: distinct cyan/teal color triangles (vs existing yellow for AI trades)

### Modify
- `DashboardPage.tsx`: add IntraSignalPanel to right sidebar below existing SignalsPanel
- `ChartCanvas.tsx`: render 15M signal markers (cyan triangles) when on 15M timeframe

### Remove
- Nothing removed

## Implementation Plan
1. Create `use15MSignalEngine.ts` with full indicator calculation (EMA, VWAP, RSI, ATR, volume avg) and signal logic
2. Create `IntraSignalPanel.tsx` with formatted signal display and collapsible history
3. Wire `use15MSignalEngine` into DashboardPage and pass data to IntraSignalPanel
4. Pass 15M signal markers to ChartCanvas for visual rendering when timeframe is 15m
