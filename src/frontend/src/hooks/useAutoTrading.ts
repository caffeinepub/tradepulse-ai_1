import { useEffect } from "react";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";
import type { AISignal } from "../utils/aiSignalEngine";

/** Max hold durations per trade type in milliseconds */
const HOLD_DURATION: Record<string, number> = {
  Scalp: 15 * 60 * 1000,
  Intraday: 8 * 60 * 60 * 1000,
  Swing: 5 * 24 * 60 * 60 * 1000,
  Position: 7 * 24 * 60 * 60 * 1000,
};

export function useAutoTrading(
  _signal: AISignal | null,
  currentPrice: number,
  symbol: string,
) {
  // Auto-close expired trades on every price tick
  useEffect(() => {
    if (currentPrice <= 0) return;
    const now = Date.now();
    const openTrades = tradeStore
      .getTrades()
      .filter((t) => t.status === "open");
    for (const trade of openTrades) {
      const maxHold =
        HOLD_DURATION[trade.tradeType ?? "Intraday"] ?? HOLD_DURATION.Intraday;
      const elapsed = now - new Date(trade.entryTime).getTime();
      if (elapsed >= maxHold) {
        const exitPrice =
          trade.symbol === symbol ? currentPrice : trade.entryPrice;
        const pnl =
          trade.side === "buy"
            ? exitPrice - trade.entryPrice
            : trade.entryPrice - exitPrice;
        const closed: TradeRecord = {
          ...trade,
          status: "closed",
          exitPrice,
          exitTime: new Date(),
          pnl,
        };
        tradeStore.updateTrade(closed);
        tradeStore.addClosedPnL(pnl);
      }
    }
  }, [currentPrice, symbol]);

  // Auto-execution is intentionally disabled.
  // The AI generates signals only; trades must be opened manually.
}
