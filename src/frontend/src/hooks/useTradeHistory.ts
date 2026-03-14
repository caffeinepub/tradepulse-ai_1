import { useCallback, useEffect, useRef, useState } from "react";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";
import type { AISignal } from "../utils/aiSignalEngine";

const DAILY_LOSS_LIMIT = 200; // USDT

function calcLevels(
  side: "buy" | "sell",
  entryPrice: number,
): { sl: number; tp1: number; tp2: number; tp3: number } {
  const atr = entryPrice * 0.003; // 0.3% proxy
  if (side === "buy") {
    return {
      sl: entryPrice - 1.5 * atr,
      tp1: entryPrice + 1.5 * atr,
      tp2: entryPrice + 2.5 * atr,
      tp3: entryPrice + 4 * atr,
    };
  }
  return {
    sl: entryPrice + 1.5 * atr,
    tp1: entryPrice - 1.5 * atr,
    tp2: entryPrice - 2.5 * atr,
    tp3: entryPrice - 4 * atr,
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

let tradeCounter = 0;

export function useTradeHistory(
  signalHistory: AISignal[],
  symbol: string,
  chartData: { price: number; time: string }[],
) {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [dailyPnl, setDailyPnl] = useState(0);
  const dailyKeyRef = useRef(todayKey());
  const lastSignalIdRef = useRef<string | null>(null);
  const openSignalTradeIdRef = useRef<string | null>(null);
  const symbolRef = useRef(symbol);
  const chartDataRef = useRef(chartData);
  chartDataRef.current = chartData;

  // Reset when symbol changes
  useEffect(() => {
    if (symbolRef.current !== symbol) {
      symbolRef.current = symbol;
      setTrades([]);
      lastSignalIdRef.current = null;
      openSignalTradeIdRef.current = null;
    }
  }, [symbol]);

  // Reset daily PnL at midnight
  useEffect(() => {
    const interval = setInterval(() => {
      const newKey = todayKey();
      if (newKey !== dailyKeyRef.current) {
        dailyKeyRef.current = newKey;
        setDailyPnl(0);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const dailyLossLimitHit = dailyPnl <= -DAILY_LOSS_LIMIT;

  const openTrade = useCallback(
    (params: {
      symbol: string;
      side: "buy" | "sell";
      source: "signal" | "demo";
      entryPrice: number;
      entryIndex: number;
      sl?: number;
      tp1?: number;
      tp2?: number;
      tp3?: number;
    }): TradeRecord => {
      tradeCounter += 1;
      const autoLevels = calcLevels(params.side, params.entryPrice);
      const trade: TradeRecord = {
        id: `trade-${tradeCounter}-${Date.now()}`,
        symbol: params.symbol,
        side: params.side,
        source: params.source,
        entryPrice: params.entryPrice,
        entryIndex: params.entryIndex,
        sl: params.sl ?? autoLevels.sl,
        tp1: params.tp1 ?? autoLevels.tp1,
        tp2: params.tp2 ?? autoLevels.tp2,
        tp3: params.tp3 ?? autoLevels.tp3,
        entryTime: new Date(),
        status: "open",
      };
      setTrades((prev) => [trade, ...prev].slice(0, 200));
      // Sync to module-level store for Analytics page
      tradeStore.addTrade(trade);
      return trade;
    },
    [],
  );

  const closeTrade = useCallback(
    (id: string, exitPrice: number, exitIndex: number) => {
      setTrades((prev) =>
        prev.map((t) => {
          if (t.id !== id || t.status === "closed") return t;
          const pnl =
            t.side === "buy"
              ? (exitPrice - t.entryPrice) * 1
              : (t.entryPrice - exitPrice) * 1;
          const closed: TradeRecord = {
            ...t,
            exitPrice,
            exitIndex,
            exitTime: new Date(),
            status: "closed" as const,
            pnl,
          };
          // Update daily PnL
          setDailyPnl((d) => d + pnl);
          // Sync closed trade to store
          tradeStore.updateTrade(closed);
          return closed;
        }),
      );
    },
    [],
  );

  // Auto-open/close signal trades
  useEffect(() => {
    if (signalHistory.length === 0) return;
    const latest = signalHistory[0];
    if (latest.id === lastSignalIdRef.current) return;
    if (latest.signal === "HOLD") {
      lastSignalIdRef.current = latest.id;
      return;
    }
    lastSignalIdRef.current = latest.id;

    // Close any open signal trade first
    if (openSignalTradeIdRef.current) {
      const idx = chartDataRef.current.length - 1;
      closeTrade(openSignalTradeIdRef.current, latest.entryPrice, idx);
      openSignalTradeIdRef.current = null;
    }

    // Daily loss limit stops new demo trades - but signal trades are from signal engine
    // Per spec: loss limit stops ALL new demo trades (both signal-triggered and demo)
    if (dailyLossLimitHit) {
      return;
    }

    // Open new signal trade
    const side = latest.signal === "BUY" ? "buy" : "sell";
    const newTrade = openTrade({
      symbol: latest.asset,
      side,
      source: "signal",
      entryPrice: latest.entryPrice,
      entryIndex: chartDataRef.current.length - 1,
      sl: latest.stopLoss,
      tp1: latest.tp1,
      tp2: latest.tp2,
      tp3: latest.tp3,
    });
    openSignalTradeIdRef.current = newTrade.id;
  }, [signalHistory, openTrade, closeTrade, dailyLossLimitHit]);

  // chartRenderTrades: last 50 for chart display
  const chartRenderTrades = trades.slice(0, 50);

  return {
    trades,
    openTrade,
    closeTrade,
    chartRenderTrades,
    dailyPnl,
    dailyLossLimitHit,
  };
}
