# TradePulse AI

## Current State

Full-stack trading platform with:
- Multi-type chart (candlestick/line/area/bar) with zoom/pan and drawing tools
- AI Signal Engine generating BUY/SELL/HOLD with confidence scoring
- Market Analysis Panel: trend, momentum, structure events, MTF analysis, news/sentiment
- Trade visualization on chart canvas (entry/SL/TP lines, markers, popups)
- Demo trading with 200 USDT daily loss limit
- Analytics page with full performance metrics
- ChartCanvas.tsx handles all canvas rendering
- MarketAnalysisPanel.tsx for analysis sidebar
- SignalsPanel.tsx for signal display
- ChartDrawingToolbar.tsx for drawing tools
- Hooks: useMarketAnalysis, useMultiTimeframe, useAISignals, useNewsSentiment, useTradeHistory

## Requested Changes (Diff)

### Add
- `useSMCEngine` hook: detects liquidity zones, order blocks, BOS/CHOCH, FVGs per timeframe-adaptive lookback (1m/5m=30 candles, 15m/1h=75, 4h/1D=150). BOS/CHOCH classification uses prior swing structure + MTF bias. FVGs track filled state (price traded through zone).
- `SMCOverlayControls` component: compact toggle panel with 4 toggles (Liquidity Zones, Order Blocks, BOS/CHOCH, Fair Value Gaps). Sits above or alongside the drawing toolbar.
- SMC rendering in ChartCanvas: draw liquidity zones as semi-transparent shaded bands, order blocks as colored rectangles (green/red), BOS/CHOCH as labeled text markers at breakout candles, FVGs as highlighted zones (full opacity unfilled, 25% opacity filled with "Filled" label).
- `useStrategyOptimizer` hook: per-asset learned weight map (trend alignment, indicator confluence, volume confirmation, structure signals, liquidity zone proximity, order block proximity, sentiment). Triggers after every 10 closed trades per asset. Increases weight for factors >65% win rate, decreases for <40%. Returns current weights + latest optimization summary string.
- Strategy optimization notification card in SignalsPanel or MarketAnalysisPanel: small card showing the optimization summary (e.g. "Strategy updated for BTC — Order block confluence weight increased (68% win rate)"). Dismissable, auto-clears on next optimization run.
- Signal confidence adjustments in useAISignals: use SMC detections (+5-8% for order block proximity, +5% for liquidity sweep, +5% for BOS matching HTF bias, penalty for CHOCH against HTF bias) and optimizer weights.

### Modify
- ChartCanvas.tsx: add props for SMC data (liquidity zones, order blocks, BOS/CHOCH events, FVGs) and overlay visibility toggles. Render SMC layers beneath trade overlays.
- DashboardPage.tsx: wire useSMCEngine, useStrategyOptimizer, SMCOverlayControls. Pass SMC data to ChartCanvas.
- useAISignals: accept SMC context and optimizer weights, apply confidence boosts/penalties.
- MarketAnalysisPanel or SignalsPanel: display strategy optimizer notification card when available.

### Remove
- Nothing removed.

## Implementation Plan

1. Create `src/frontend/src/hooks/useSMCEngine.ts` — detects all SMC elements from candle data, timeframe, and MTF bias.
2. Create `src/frontend/src/hooks/useStrategyOptimizer.ts` — per-asset weight tracking, 10-trade trigger, transparency summary.
3. Create `src/frontend/src/components/SMCOverlayControls.tsx` — 4 toggles for SMC layer visibility.
4. Update `ChartCanvas.tsx` — add SMC rendering layer (liquidity zones, order blocks, BOS/CHOCH labels, FVGs).
5. Update `useAISignals` — consume SMC context and optimizer weights for confidence scoring.
6. Update `DashboardPage.tsx` — integrate all new hooks and components.
7. Update `MarketAnalysisPanel.tsx` or `SignalsPanel.tsx` — show optimizer notification card.
