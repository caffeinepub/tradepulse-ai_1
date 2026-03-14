# TradePulse AI

## Current State
The dashboard has a trading chart with a symbol header area that includes a timeframe selector (1m, 5m, 15m, 1H, 4H, 1D tabs) displayed at the top right of the symbol header. The chart uses Recharts AreaChart. Candle data is generated via `generateChartData` and regenerated when the symbol changes, but NOT when the timeframe changes. There is no candle countdown timer, no candle progress bar, and no visual flash on new candle open.

## Requested Changes (Diff)

### Add
- `useCandleTimer` hook: tracks seconds elapsed/remaining in the current candle based on the selected timeframe. Exposes `secondsRemaining`, `progress` (0–100), and `isNewCandle` (brief boolean true at candle close).
- Candle countdown timer display: shows `MM:SS` format remaining time in the price status bar area (the symbol header row).
- Candle progress bar: shows percentage complete (0–100%) with a filled bar in the same area.
- Visual flash: when a new candle starts, the newest chart candle briefly highlights (CSS keyframe flash animation on a wrapper element or via state-driven class).
- Timeframe change triggers chart data regeneration (`generateChartData`) so chart reflects the new period intervals.
- `isNewCandle` event also triggers signal refresh (re-runs AI signal engine).

### Modify
- `DashboardPage`: wire `useCandleTimer` with selected timeframe; display timer + progress bar in the symbol header; regenerate `chartData` on timeframe change; trigger new candle flash.
- Symbol header layout: add timer and progress bar elements between the price display and the timeframe tabs.

### Remove
- Nothing removed.

## Implementation Plan
1. Create `src/frontend/src/hooks/useCandleTimer.ts` -- calculates candle duration from timeframe string, computes `secondsRemaining` and `progress` on a 1-second interval, fires `onNewCandle` callback at zero.
2. Update `DashboardPage.tsx`:
   - Call `useCandleTimer(timeframe)` with a callback that regenerates chart data and triggers signal refresh.
   - Add timer (`MM:SS`) and progress bar to the symbol header row.
   - Add `newCandleFlash` state boolean; apply a flash CSS class to the chart container for ~600ms on new candle.
3. Add flash keyframe animation to `index.css` or inline style.
