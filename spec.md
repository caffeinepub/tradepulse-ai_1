# TradePulse AI

## Current State
ChartCanvas.tsx draws the chart with PLOT_LEFT=72 (left Y-axis panel) and PR = W - 8 (only 8px right padding). The live price label box is placed at boxX = PR = W - 8, which extends beyond the canvas right edge — making the label invisible. The countdown timer renders near the bottom of the last candle, not near the price line.

## Requested Changes (Diff)

### Add
- Right Y-axis panel (72px wide) with price level labels mirroring the left axis
- Live price line extends from PL to full canvas width (W), crossing into the right axis area
- Price label box rendered inside the right axis panel at the correct Y position (green/red background, white text)
- Countdown timer rendered just below the price label box in the right axis area

### Modify
- `PR` changes from `W - 8` to `W - 72` to carve out a right Y-axis panel
- Live price line drawing: extend `lineTo` target from PR to W (full width)
- Label box X position: `PR + 2` (inside right Y-axis panel) instead of `PR` (off-canvas)
- Countdown timer: draw in right Y-axis area below the label box, not at chart bottom
- Add right Y-axis label drawing block after existing left Y-axis labels

### Remove
- Old countdown timer rendering at chart bottom-left of last candle (replaced by right-axis placement)

## Implementation Plan
1. In `draw` callback: change `PR = W - 8` to `PR = W - 72`
2. Add right Y-axis price labels block (textAlign left, x = PR + 6)
3. Extend live price dashed line from PL to W (full canvas width)
4. Place price label box at boxX = PR + 2 with proper pip-precision label
5. Render countdown timer at (PR + 2, labelBoxBottom + 14) in right axis area
6. Remove old countdown timer block at chart bottom
