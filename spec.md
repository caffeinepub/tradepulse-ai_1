# TradePulse AI

## Current State
The platform has a full TradingView-style dashboard with candlestick charts rendered on a Canvas element (ChartCanvas.tsx). Price data is fetched from Binance REST API on load and WebSocket for live ticks. Candles are built from simulated drift via `priceSimulator.ts` / `updateLiveCandle`. The current candle is updated each tick. Chart supports zoom/pan (mouse wheel, click-drag), drawing tools, SMC overlays, EMA/VWAP overlays, live price line (dashed), and a countdown timer. The Y-axis uses canvas transforms.

## Requested Changes (Diff)

### Add
- **Y-axis drag-to-scale**: Right-side Y-axis panel becomes draggable. Clicking and dragging up/down stretches or compresses the vertical price scale (yScaleFactor). This is independent of the horizontal zoom.
- **Free pan mode via double-click**: Double-clicking the chart canvas enters a "free pan" mode. In this mode, click-and-drag moves the chart freely in both X (horizontal) and Y (vertical pan/price offset) directions. A small HUD indicator (e.g. "PAN MODE" badge) appears on the chart. Double-clicking again or pressing Escape exits free pan mode.
- **Candle OHLC from real price accumulation**: Each live candle must correctly accumulate OHLC from real Binance tick prices. The live candle's `high` and `low` must update as price moves above/below previous high/low. The `close` always equals the latest price. The `open` is locked when the candle opens. This ensures candles go up or down based on real prices.
- **Vertical price offset (yPanOffset)**: Free pan mode allows dragging the chart vertically, shifting the visible price window up/down independently of the price scale.

### Modify
- **ChartCanvas.tsx**: Accept new props: `yScaleFactor` (number, default 1), `yPanOffset` (number, default 0), `onYAxisDrag` (callback for Y-axis drag delta), `freePanMode` (boolean), `onFreePanDelta` (callback for x+y delta during free pan).
- **ChartCanvas.tsx rendering**: Apply `yScaleFactor` and `yPanOffset` when mapping price to Y pixel coordinate. Only the right-side Y-axis is interactive for drag-to-scale.
- **useChartViewport.ts**: Add `yScaleFactor`, `yPanOffset`, `handleYAxisDrag`, `setFreePanMode`, `freePanMode` state and handlers.
- **DashboardPage.tsx**: Wire the new viewport state and handlers into ChartCanvas.
- **updateLiveCandle in priceSimulator.ts**: Ensure `high = Math.max(prev.high, livePrice)` and `low = Math.min(prev.low, livePrice)` are always applied, so candle extremes reflect all ticks within the period.

### Remove
- Nothing removed.

## Implementation Plan
1. Update `priceSimulator.ts` → `updateLiveCandle` to correctly track high/low accumulation from every tick.
2. Update `useChartViewport.ts` to add Y-axis scale factor, Y pan offset, free pan mode state and handlers.
3. Update `ChartCanvas.tsx` to:
   - Accept and apply `yScaleFactor` and `yPanOffset` in price-to-pixel mapping.
   - Render Y-axis panel as a draggable zone (mousedown on Y-axis area triggers Y scale drag).
   - Handle double-click to toggle free pan mode.
   - In free pan mode, drag moves both X and Y; show a "PAN MODE" badge overlay.
4. Update `DashboardPage.tsx` to wire new props from `useChartViewport` into `ChartCanvas`.
