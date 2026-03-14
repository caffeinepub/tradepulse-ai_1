# TradePulse AI

## Current State
Full TradingView-style trading platform with candlestick chart rendered on HTML canvas (ChartCanvas.tsx, ~1479 lines). The chart draws candles, EMA(20/50), VWAP, SMC overlays, trade lines, and user drawings. The chart receives `candles`, `selectedConfig`, and `isUp` props from DashboardPage. Price ticks arrive via Binance WebSocket for crypto and simulated ticks for other assets. The selected timeframe is managed in DashboardPage state.

## Requested Changes (Diff)

### Add
- **Live Price Line**: A dashed horizontal line drawn at the latest price (last candle's close or latest WebSocket tick). Renders across the full chart width. Updates every price tick.
- **Live Price Label**: A colored box label on the right Y-axis edge (at position PR) showing the exact price value. Color is green (`#26a69a`) if current price >= previous candle close, red (`#ef5350`) if below. Drawn at the Y coordinate corresponding to the current live price.
- **Candle Countdown Timer**: Text rendered on the chart canvas, attached to the bottom-right of the last visible candle. Shows time remaining until the current candle closes. Format: `MM:SS` for 1m/5m/15m; `HH:MM` for 1H/4H/1D/1W/1M. Resets when a new candle opens.
- **`livePrice` prop** on `ChartCanvas`: Pass the latest live price from DashboardPage so the chart can draw the live price line without reading candles only.
- **`selectedTimeframe` prop** on `ChartCanvas`: Pass the active timeframe string (e.g. "1m", "5m", "1H") so the countdown timer knows the candle duration.

### Modify
- `ChartCanvas.tsx`: Add `livePrice` and `selectedTimeframe` to `ChartCanvasProps` and `propsRef`. In the `draw` function, after all other overlays, draw the live price line and label, then the countdown timer.
- `DashboardPage.tsx`: Pass `livePrice` (latest price from WebSocket/tick) and `selectedTimeframe` to `ChartCanvas`.

### Remove
Nothing removed.

## Implementation Plan
1. Add `livePrice: number` and `selectedTimeframe: string` to `ChartCanvasProps` interface in `ChartCanvas.tsx`.
2. Add both to `propsRef` initialization and sync.
3. In the `draw` function (after drawings, before end of draw), add:
   a. Live price dashed line: draw from PL to PR at `mapY(livePrice, pMin, pMax, PT, PB)`. Use `[4, 4]` dash pattern. Color green/red based on prev candle close comparison.
   b. Live price label box: filled rect on the right edge (from PR to PR+labelWidth), with price text inside. Same green/red color.
   c. Candle countdown: compute seconds remaining from current time to next candle boundary. Draw text near the last visible candle's bottom-right corner.
4. In `DashboardPage.tsx`, find where `ChartCanvas` is used and pass `livePrice` (from existing price state) and `selectedTimeframe` (from existing timeframe state).
