# TradePulse AI

## Current State
Full trading platform with Internet Identity auth, TradingView-style chart, AI auto-trading engine, Dashboard, Analytics, and Profile pages. Backend has user profile management, market data, and AI signals. No admin system exists.

## Requested Changes (Diff)

### Add
- Backend: `verifyAdminPin(pin: Text) -> Bool` query that returns true only if pin matches `997117`
- Backend: `getAdminStats()` query returning totalUsers, tradeCount, and platform metrics (admin-only after pin verification is handled on frontend)
- Frontend: `/admin` route — completely hidden from navigation, accessible only by direct URL
- Frontend: `AdminLoginPage` — minimal dark-themed PIN entry form at `/admin`
- Frontend: `AdminDashboardPage` — shown after correct PIN entered, displays platform stats
- Frontend: Admin session state (stored in React state/context, not persisted — cleared on refresh)

### Modify
- `App.tsx`: Add `/admin` route pointing to AdminLoginPage (no navbar/ticker for admin route)
- Backend: Add `getAdminStats` function returning user count and trade stats

### Remove
- Nothing removed from existing user-facing UI

## Implementation Plan
1. Add `verifyAdminPin` and `getAdminStats` to backend Motoko
2. Create `AdminLoginPage.tsx` with PIN input, error state, submit button
3. Create `AdminDashboardPage.tsx` with stats cards (total users, trades, win rate, etc.)
4. Add `/admin` route to `App.tsx` with its own layout (no Navbar/TickerBar)
5. Wire PIN verification: correct PIN shows AdminDashboardPage, wrong PIN shows error
