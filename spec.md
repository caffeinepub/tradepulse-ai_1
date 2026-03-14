# TradePulse AI

## Current State
- `useAISignals` hook generates a new signal every 1 second and pushes every signal to both `currentSignal` and `history[]`.
- `SignalsPanel` shows the current signal card at the top and a scrollable signal history list below it.
- The signal engine always maps timeframe to trade type strictly; no flexibility override.
- No concept of signal timeout, expiry countdown, or HOLD/waiting state display.
- No collapsed history section — history is always fully expanded.

## Requested Changes (Diff)

### Add
- **Signal timeout logic**: After a BUY/SELL signal is generated, it remains the live signal until replaced by a new one OR until its type-specific timeout expires with no trade taken (Scalp=15min, Intraday=3h, Swing=24h, Position=72h). On expiry, panel returns to HOLD/scanning state.
- **Signal expiry countdown**: A small countdown timer shown on the live signal card indicating how long before it expires.
- **HOLD/scanning state UI**: When no valid setup (or signal expired), show a pulsing HOLD state with contextual messages ("Scanning for setup...", "Liquidity grab in progress — waiting for confirmation", etc.).
- **Flexible trade type mapping**: AI can override default timeframe mapping if conditions are very strong (e.g. Scalp on 15m if confidence + momentum strongly favor short-term). Signal card shows which type was chosen and a brief reason.
- **Collapsed signal history**: Below the live signal card, a collapsible section showing past signals with a count badge. Collapsed by default.
- **Contextual HOLD messages**: When market is testing key levels / liquidity sweeps in progress, show specific context message instead of generic scanning message.

### Modify
- `useAISignals`: Change from "push every tick" to "only update currentSignal when signal direction changes or 60s cooldown passes OR forced by expiry reset". Add timeout management per signal ID.
- `SignalsPanel`: Replace always-expanded history with collapsed accordion section. Add expiry countdown to live card. Overhaul HOLD state display to show contextual messages.
- `aiSignalEngine`: Add flexible trade type logic — if confidence > 80 and momentum is very short-term on a 15m chart, can emit Scalp; if confidence > 75 on 1H and conditions favor very short move, can emit Intraday.

### Remove
- Always-visible expanded signal history list (replaced with collapsible).

## Implementation Plan
1. Update `aiSignalEngine.ts`: Add flexible trade type override logic based on confidence + volatility.
2. Update `useAISignals.ts`: Manage signal lifetime — track expiry per signal, auto-reset to HOLD on expiry, maintain collapsed history list separately from live signal.
3. Update `SignalsPanel.tsx`: 
   - Redesign live signal card with expiry countdown timer.
   - Add pulsing HOLD/scanning state with contextual messages.
   - Replace history list with collapsible accordion (collapsed by default, count badge).
4. Add contextual HOLD message generation based on SMC context (liquidity sweep, order block test, etc.).
