import { useEffect, useRef } from "react";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";
import type { AISignal } from "../utils/aiSignalEngine";

const COOLDOWN_MS = 60_000;

export function useAutoTrading(
  signal: AISignal | null,
  _currentPrice: number,
  symbol: string,
) {
  const lastTradeTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!signal) return;
    if (signal.signal !== "BUY" && signal.signal !== "SELL") return;
    if (signal.confidence < 68) return;

    // Enforce 60s cooldown
    if (Date.now() - lastTradeTimeRef.current < COOLDOWN_MS) return;

    // Only one open trade per symbol at a time
    const hasOpen = tradeStore
      .getTrades()
      .some((t) => t.symbol === symbol && t.status === "open");
    if (hasOpen) return;

    const side = signal.signal.toLowerCase() as "buy" | "sell";

    const newTrade: TradeRecord = {
      id: `auto-${Date.now()}`,
      symbol,
      side,
      source: "signal",
      entryPrice: signal.entryPrice,
      sl: signal.stopLoss,
      tp1: signal.tp1,
      tp2: signal.tp2,
      tp3: signal.tp3,
      entryTime: new Date(),
      entryIndex: 0,
      status: "open",
      tradeType: signal.tradeType,
      confirmationReason: signal.confirmationReason,
    };

    tradeStore.addTrade(newTrade);
    lastTradeTimeRef.current = Date.now();
  }, [signal, symbol]);
}
