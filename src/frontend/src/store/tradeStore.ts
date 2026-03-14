import type { TradeRecord } from "../types/trade";

// Module-level singleton store so Analytics page can read trades
// from the same source as DashboardPage without prop drilling

type Listener = () => void;

let trades: TradeRecord[] = [];
const listeners = new Set<Listener>();

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
};

function notify() {
  for (const l of listeners) l();
}
