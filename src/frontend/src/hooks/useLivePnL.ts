import { useEffect, useState } from "react";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";

export function useLivePnL(currentPrice: number, symbol: string) {
  // Subscribe to tradeStore so we always have the latest snapshot
  const [, setTick] = useState(0);

  useEffect(() => {
    return tradeStore.subscribe(() => setTick((n) => n + 1));
  }, []);

  useEffect(() => {
    if (currentPrice <= 0) return;

    const interval = setInterval(() => {
      const openTrades = tradeStore
        .getTrades()
        .filter((t) => t.symbol === symbol && t.status === "open");

      for (const trade of openTrades) {
        const { entryPrice, sl, tp1, side } = trade;
        const pnl =
          side === "buy"
            ? currentPrice - entryPrice
            : entryPrice - currentPrice;

        // Check SL hit
        const slHit = side === "buy" ? currentPrice <= sl : currentPrice >= sl;

        // Check TP1 hit
        const tp1Hit =
          side === "buy" ? currentPrice >= tp1 : currentPrice <= tp1;

        if (slHit || tp1Hit) {
          const closed: TradeRecord = {
            ...trade,
            status: "closed",
            exitPrice: currentPrice,
            exitTime: new Date(),
            pnl,
          };
          tradeStore.updateTrade(closed);
        } else {
          // Update live P&L without closing
          tradeStore.updateTrade({ ...trade, pnl });
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentPrice, symbol]);
}
