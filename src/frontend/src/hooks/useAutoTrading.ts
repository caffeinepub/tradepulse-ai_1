import { useEffect } from "react";
import { toast } from "sonner";
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

/** Play a two-tone beep using Web Audio API. BUY = ascending, SELL = descending. */
function playTradeAlert(direction: "buy" | "sell") {
  try {
    const ctx = new AudioContext();
    const freqs = direction === "buy" ? [880, 1100] : [440, 330];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      osc.start(start);
      osc.stop(start + 0.15);
    });
    // Close context after tones finish
    setTimeout(() => ctx.close(), 800);
  } catch (_) {
    // AudioContext not available (e.g. SSR / blocked by browser policy)
  }
}

export function useAutoTrading(
  signal: AISignal | null,
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
        // Auto-close at current price
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

  // Open new trade when signal fires
  useEffect(() => {
    if (!signal) return;
    if (signal.signal !== "BUY" && signal.signal !== "SELL") return;

    // Raise confidence threshold to 85
    if (signal.confidence < 85) return;

    // Global check: if ANY trade is open, do not open another
    const hasAnyOpen = tradeStore.getTrades().some((t) => t.status === "open");
    if (hasAnyOpen) return;

    // Respect daily loss limit
    if (tradeStore.isDailyLimitReached()) return;

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

    // Sound alert — applies to ALL trade types
    playTradeAlert(side);

    // Toast notification — auto-dismisses after 4500ms
    const isBuy = side === "buy";
    toast(`${signal.signal} ${symbol}`, {
      description: `${signal.tradeType} @ $${signal.entryPrice.toFixed(signal.entryPrice > 100 ? 2 : 5)}`,
      duration: 4500,
      style: {
        background: isBuy ? "oklch(0.20 0.04 145)" : "oklch(0.20 0.04 15)",
        borderLeft: isBuy
          ? "3px solid oklch(0.72 0.18 145)"
          : "3px solid oklch(0.62 0.22 25)",
        color: "oklch(0.92 0.01 220)",
      },
    });
  }, [signal, symbol]);
}
