# TradePulse AI

## Current State
Two separate signal engines: aiSignalEngine.ts + useAISignals.ts drives SignalsPanel; use15MSignalEngine.ts drives IntraSignalPanel. They are independent and can contradict each other. Both are consumed in DashboardPage.tsx.

## Requested Changes (Diff)

### Add
- `unifiedSignalEngine.ts` — Pure function using strict EMA20/50, VWAP, RSI (55-70 BUY/30-45 SELL), Volume (above 5-candle avg), ATR SL/TP. Returns BUY/SELL/HOLD with reason, entry, SL, TP, confidence, duration, lot size, timeframe badge.
- `useUnifiedSignal.ts` — Hook with 1.5s recalculation interval. Resets on symbol/timeframe change. Maintains history.

### Modify
- DashboardPage.tsx — Replace useAISignals + use15MSignalEngine with single useUnifiedSignal. Pass shared signal to both panels.
- SignalsPanel.tsx — Accept UnifiedSignal type. Remove Scalp badge. Show HOLD reason + timeframe badge.
- IntraSignalPanel.tsx — Accept UnifiedSignal type. Remove 5m/15m-only gating. Show HOLD reason + timeframe badge.

### Remove
- Scalp signal type from engine output (only Intraday/Swing/HOLD produced)
- Old hooks still exist in files but are no longer called from DashboardPage

## Implementation Plan
1. Create unifiedSignalEngine.ts with UnifiedSignal type and pure computation
2. Create useUnifiedSignal.ts hook with 1.5s interval and reset logic
3. Update SignalsPanel.tsx to accept UnifiedSignal
4. Update IntraSignalPanel.tsx to accept UnifiedSignal
5. Update DashboardPage.tsx to use useUnifiedSignal
6. Validate build
