import type { TradeRecord } from "../types/trade";

// Module-level singleton store so Analytics page can read trades
// from the same source as DashboardPage without prop drilling

type Listener = () => void;

let trades: TradeRecord[] = [];
const listeners = new Set<Listener>();

// ── Daily loss tracking ──────────────────────────────────────────
let dailyLoss = 0;
let dailyLossLimit = 500; // USDT
let lastResetDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

function checkDayReset() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== lastResetDate) {
    dailyLoss = 0;
    lastResetDate = today;
  }
}

export const tradeStore = {
  getTrades(): TradeRecord[] {
    return trades;
  },
  addTrade(trade: TradeRecord): void {
    trades = [trade, ...trades].slice(0, 500);
    notify();
  },
  updateTrade(updated: TradeRecord): void {
    trades = trades.map((t) => (t.id === updated.id ? updated : t));
    notify();
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  clear(): void {
    trades = [];
    notify();
  },

  // ── Daily loss management ────────────────────────────────────
  isDailyLimitReached(): boolean {
    checkDayReset();
    return dailyLoss >= dailyLossLimit;
  },
  getDailyLoss(): number {
    checkDayReset();
    return dailyLoss;
  },
  getDailyLossLimit(): number {
    return dailyLossLimit;
  },
  addClosedPnL(pnl: number): void {
    checkDayReset();
    if (pnl < 0) {
      dailyLoss += Math.abs(pnl);
    }
    notify();
  },
  setDailyLossLimit(limit: number): void {
    dailyLossLimit = limit;
    notify();
  },
};

function notify() {
  for (const l of listeners) l();
}
