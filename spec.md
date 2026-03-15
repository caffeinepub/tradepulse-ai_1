# TradePulse AI

## Current State
- Chart zoom/pan uses `useChartViewport.ts` which tracks `candleWidth` (4–60px) and `viewOffset`
- Scroll wheel zooms by ~15% per tick using a zoom factor of 0.85/1.176
- Ctrl+scroll vertical zoom does NOT exist; only Y-axis drag exists for vertical zoom
- Mobile: zero touch event support — no pinch or touch pan
- `plotWidth` is hardcoded to 700 inside the hook (not real container width), causing broken anchor behavior
- No explicit minimum/maximum visible candle count enforcement (10–200)
- Default visible candle count is implicitly ~87 (700px / 8px candleWidth)

## Requested Changes (Diff)

### Add
- `visibleCount` state (10–200 candles) as primary zoom parameter, default 50
- `setContainerWidth(w)` function in `useChartViewport` so hook uses real container width
- Ctrl+scroll vertical zoom in ChartCanvas wheel event handler (calls `onYAxisDrag`)
- Touch event handlers in ChartCanvas:
  - `touchstart` / `touchmove` / `touchend` for single-finger pan (calls `onPanDelta`)
  - Two-finger touch: detect dominant axis of pinch gesture
    - Horizontal pinch → horizontal zoom (calls `onWheel` equivalent / adjusts visibleCount)
    - Vertical pinch → vertical zoom (calls `onYAxisDrag`)
- ResizeObserver in DashboardPage to feed real container width to `useChartViewport`

### Modify
- `useChartViewport.ts`: full rewrite
  - Track `visibleCount` (10–200) instead of raw `candleWidth`
  - Store `containerWidthRef` updated via `setContainerWidth(w)`
  - Compute and return `candleWidth = containerWidth / visibleCount` so ChartCanvas prop interface is unchanged
  - Zoom step: 10% of current visibleCount per scroll tick (e.g. 50 candles → ±5 per tick)
  - Scroll down = zoom out (more candles), scroll up = zoom in (fewer candles)
  - Anchor zoom to cursor position using real `mouseXFraction`
  - Ctrl+scroll: delegate to `yScaleFactor` adjustment (vertical zoom)
  - `handlePanDelta`: use `containerWidth / visibleCount` to convert pixel delta to candle delta
- `ChartCanvas.tsx` wheel event handler: detect `e.ctrlKey` → call `onYAxisDrag` instead of `onWheel`
- DashboardPage: add `ResizeObserver` on `chartContainerRef`, call `setContainerWidth` on resize, pass `setContainerWidth` to the hook

### Remove
- Hardcoded `plotWidth = 700` from `useChartViewport.ts`
- Broken double `setCandleWidth` call pattern in `handleWheel`
- `MIN_CANDLE_WIDTH` / `MAX_CANDLE_WIDTH` constants (replaced by `MIN_VISIBLE_COUNT` / `MAX_VISIBLE_COUNT`)

## Implementation Plan
1. Rewrite `useChartViewport.ts`: new `visibleCount`-based zoom, `containerWidthRef`, correct pan delta, Ctrl+scroll delegation, 10% zoom step, 10–200 clamp, returns `candleWidth = containerWidth / visibleCount`
2. Update `DashboardPage.tsx`: add `ResizeObserver` on chart container ref, call `setContainerWidth` from hook on resize and on initial render
3. Update `ChartCanvas.tsx` wheel handler: check `e.ctrlKey` → call `onYAxisDrag(e.deltaY)`, else call existing `onWheel`
4. Add touch event handlers to `ChartCanvas.tsx`:
   - Track touch start positions
   - Single finger: `onPanDelta(dx)`
   - Two fingers: compute dominant axis of pinch; horizontal → zoom visibleCount; vertical → `onYAxisDrag`
   - Prevent default scroll on all chart touches
5. Validate build passes
