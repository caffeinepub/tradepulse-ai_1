# TradePulse AI

## Current State
The chart is a canvas-based renderer (`ChartCanvas.tsx`) that supports Candlestick, Line, Area, and Bar chart types. It renders trade overlays (entry/SL/TP lines) for open trades and uses a separate SVG overlay (`TradeChartOverlay.tsx`) for trade markers. The chart is static — no pan, no zoom, and no drawing tools. `DashboardPage.tsx` hosts the chart with a fixed plot area.

## Requested Changes (Diff)

### Add
- **Chart viewport state**: `viewOffset` (horizontal pan index) and `candleWidth` (pixels per candle/zoom level) managed in `DashboardPage` or a new `useChartViewport` hook
- **Mouse/touch interactions on canvas**: scroll to zoom anchored to cursor position; click-drag to pan; all interactions work across all 4 chart types
- **Drawing tools engine** (`useChartDrawings` hook): manages drawing state per timeframe, handles creation, selection, movement, deletion
- **Drawing toolbar component** (`ChartDrawingToolbar.tsx`): vertical toolbar on the left side of the chart with 4 tool buttons: Trendline, Horizontal Line, Rectangle, Fibonacci Retracement; cursor icon + pointer tool to return to normal
- **Drawing renderer**: all drawings rendered on the chart canvas as part of the draw loop — trendlines, horizontal lines, rectangles, fibonacci levels (0%, 23.6%, 38.2%, 50%, 61.8%, 100%) with labeled price levels
- **Drawing interaction layer**: canvas mouse events for click-to-start, drag-to-place, click-to-select, drag-to-move drawings; right-click context menu with "Delete" option; Delete/Backspace keyboard shortcut for selected drawing
- **Context menu component** for right-click delete on drawings

### Modify
- `ChartCanvas.tsx`: accept `viewOffset` and `candleWidth` props; render only the visible candle slice based on viewport; add zoom/pan mouse event handlers; render drawings layer on canvas; accept `drawings`, `activeTool`, `onDrawingStart`, `onDrawingUpdate`, `onDrawingComplete`, `onDrawingSelect`, `onDrawingMove` props
- `DashboardPage.tsx`: add drawing toolbar to the left of the chart; wire viewport state and drawing state; layout updated so chart has drawing toolbar on left
- `TradeChartOverlay.tsx`: update plot area constants to account for drawing toolbar width on left side

### Remove
- Nothing removed; all existing overlays preserved

## Implementation Plan
1. Create `src/frontend/src/hooks/useChartViewport.ts` — manages candleWidth (zoom), viewOffset (pan), exposes handlers for wheel zoom and drag pan
2. Create `src/frontend/src/hooks/useChartDrawings.ts` — manages drawings map keyed by timeframe, active tool, selected drawing, drawing-in-progress; exposes CRUD operations
3. Create `src/frontend/src/types/drawing.ts` — TypeScript types for Drawing (trendline, hline, rectangle, fibonacci) with start/end coordinates in price/index space
4. Create `src/frontend/src/components/ChartDrawingToolbar.tsx` — vertical icon toolbar, tool selection state
5. Rewrite `ChartCanvas.tsx` — add viewport slice logic, pan/zoom mouse handlers, drawing render layer, drawing interaction hit-testing
6. Update `DashboardPage.tsx` — integrate drawing toolbar, viewport hook, drawings hook; layout chart area as flex row with toolbar + canvas
7. Update `TradeChartOverlay.tsx` — adjust for new plot area with toolbar offset
