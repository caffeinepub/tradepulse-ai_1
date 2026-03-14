# TradePulse AI — Version 13: TradingView-Style Layout Redesign

## Current State

The platform has a vertically-stacked layout: TickerBar on top, then a main content area with the chart in the center-left and MarketAnalysisPanel + SignalsPanel as right column panels. The chart toolbar (timeframes + chart type switcher) sits above the chart canvas. SMC overlay toggles appear as a strip above the chart. A vertical drawing toolbar sits on the left edge of the chart. The current layout gives the chart roughly 60% of the horizontal space.

Existing components:
- `ChartCanvas.tsx` — full candlestick chart with EMA(20/50), VWAP, SMC overlays, zoom/pan, drawing tools
- `SignalsPanel.tsx` — live AI signal card + signal history
- `MarketAnalysisPanel.tsx` — trend, MTF analysis, sentiment, structure events
- `SMCOverlayControls.tsx` — toggle strip for SMC overlay visibility
- `ChartDrawingToolbar.tsx` — vertical toolbar for drawing tools
- `TickerBar.tsx` — scrolling price ticker
- `DashboardPage.tsx` — assembles all components
- `AnalyticsPage.tsx` — separate analytics tab

## Requested Changes (Diff)

### Add
- **Left Watchlist Panel** (collapsible): shows symbol list (BTC, ETH, XAUUSD, EURUSD, GBPUSD, NAS100, SP500, key cryptos), last price, 24h change %, and a bell icon alert toggle per symbol. Clicking a symbol switches the active asset.
- **SMC hover tooltips on chart canvas**: when hovering over an order block, FVG, liquidity zone, or BOS/CHOCH marker on the canvas, show a floating tooltip with the element type, price level, and direction (bullish/bearish). Tooltip is rendered as an HTML overlay positioned near the cursor.
- **Clickable SMC elements**: clicking an order block or FVG on the chart highlights it (glowing border effect) and shows a highlighted trade zone overlay.
- **1W and 1M timeframes**: add to the timeframe selector with simulated candle data. Position trades can use 1D/1W/1M.
- **Notifications panel**: compact alert feed in the right sidebar showing recent signal alerts, SMC events, and optimizer updates with timestamps.
- **Open Trade Panel**: compact widget in the right sidebar showing current open demo trades (entry, SL, TP, P&L).
- **Session info strip**: shows scalping session info (scalps today: X/3), daily P&L, and account balance.

### Modify
- **Layout restructure** — TradingView-style 3-column layout:
  - Left: collapsible watchlist panel (~220px, collapsible to icon strip)
  - Center: chart area + top toolbar, takes ~70% of remaining width, full height
  - Right: stacked panels (Signals, Open Trades, Market Analysis, Notifications) in a scrollable sidebar (~320px)
- **Top chart toolbar**: unified single toolbar row containing: symbol/price header | timeframe buttons (1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M) | chart type switcher | SMC toggle pills | zoom +/- buttons. Clean, compact, TradingView-style.
- **Chart canvas**: grows to fill 100% of center column height (minus top toolbar). Drawing toolbar moves to left edge of chart as before.
- **TickerBar**: kept at very top of page as a thin marquee strip.
- **Position size input**: move from standalone widget into the Open Trade Panel in the right sidebar.
- **Navbar**: simplify to logo + Analytics tab link + account status. No redundant navigation.
- **DashboardPage**: full refactor to implement the 3-column layout using CSS grid.

### Remove
- Separate stacked layout of MarketAnalysisPanel and SignalsPanel below/beside the chart in a vertical column arrangement.
- Duplicate SMC overlay control strip above chart (SMC toggles move into the top toolbar).

## Implementation Plan

1. **Refactor `DashboardPage.tsx`**: Implement a 3-column CSS grid layout — left watchlist, center chart + toolbar, right sidebar.
2. **Create `WatchlistPanel.tsx`**: Symbol list with live prices, change %, alert bell toggle, collapsible. Clicking a symbol dispatches asset change.
3. **Update `ChartCanvas.tsx`**: Add SMC hover tooltip (HTML overlay div, position tracking via onMouseMove), clickable SMC element highlight state.
4. **Update top chart toolbar** (inline in DashboardPage or extracted as `ChartToolbar.tsx`): unified row with timeframes (1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M), chart type switcher, SMC toggle pills, zoom +/- buttons.
5. **Add 1W and 1M timeframes** to ChartCanvas candle generation logic (simulated data, longer lookback periods).
6. **Create `OpenTradePanel.tsx`**: shows current open demo trades with entry/SL/TP/P&L. Includes editable position size input.
7. **Create `NotificationsPanel.tsx`**: scrollable feed of recent signal alerts, SMC events, and optimizer messages.
8. **Add `SessionInfoStrip.tsx`**: compact bar at top of right sidebar — scalps today, daily P&L, account balance.
9. **Right sidebar**: stack SessionInfoStrip → SignalsPanel → OpenTradePanel → NotificationsPanel → MarketAnalysisPanel in a scrollable column.
10. **Update timeframe-related data utils** to handle 1W and 1M candle generation.
