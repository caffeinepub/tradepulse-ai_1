# TradePulse AI

## Current State
The dashboard uses a `fixed` 3-column layout (watchlist left, chart center, sidebar right) with `overflow-hidden`. The right sidebar is already `hidden md:flex`. However:
- WatchlistPanel has no mobile hiding — it renders at 40px (collapsed) on mobile, narrowing the chart
- The entire layout is `fixed` with `overflow-hidden`, so panels below the chart are inaccessible on mobile portrait
- On iPhone portrait, the chart gets cut off and panels are not visible

## Requested Changes (Diff)

### Add
- Mobile-only panels section below the chart: shows SignalsPanel, OpenTradePanel in a scrollable strip (portrait only)
- On mobile portrait, the outer container switches from `fixed overflow-hidden` to a scrollable layout

### Modify
- WatchlistPanel aside: add `hidden md:flex` so it is hidden on mobile (desktop unchanged)
- DashboardPage layout: on mobile (`< md`), use a vertical stacked layout — chart area takes `55vh` fixed height, then panels scroll below
- ChartCanvas container: on mobile, enforce a minimum height so it doesn't collapse
- ChartToolbar: ensure it doesn't overflow horizontally on small screens (wrap or horizontal scroll)
- ChartDrawingToolbar: hide on mobile or make it collapse
- SessionInfoStrip and right sidebar panels: shown in mobile bottom section

### Remove
- Nothing removed from desktop layout

## Implementation Plan
1. In `DashboardPage.tsx`: wrap the entire layout in a responsive container — on `md+` keep current `fixed overflow-hidden` behavior; on mobile use `min-h-screen flex flex-col` starting at the padded top, with the chart in a fixed-height block and panels below in a scrollable div
2. In `WatchlistPanel.tsx`: add `hidden md:flex` to the aside element to hide it on mobile
3. In `DashboardPage.tsx`: add a mobile-only (`md:hidden`) scrollable section below the chart that renders SignalsPanel, OpenTradePanel, MarketAnalysisPanel
4. In `ChartToolbar.tsx`: add `overflow-x-auto` to prevent horizontal overflow on small screens
5. In `ChartDrawingToolbar.tsx`: hide on mobile (`hidden md:flex`)
6. Ensure the chart container div has `min-h-[300px]` on mobile so the canvas always has sufficient space
