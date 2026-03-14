import { useCallback, useEffect, useRef, useState } from "react";
import type { FactorWeights } from "../types/smc";
import type { TradeRecord } from "../types/trade";

const DEFAULT_WEIGHTS: FactorWeights = {
  trendAlignment: 1.0,
  indicatorConfluence: 1.0,
  volumeConfirmation: 1.0,
  structureSignals: 1.0,
  liquidityZone: 1.0,
  orderBlock: 1.0,
  sentiment: 1.0,
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function useStrategyOptimizer(
  symbol: string,
  closedTrades: TradeRecord[],
): {
  weights: FactorWeights;
  optimizationSummary: string | null;
  dismissSummary: () => void;
} {
  const allWeightsRef = useRef<Record<string, FactorWeights>>({});
  const processedCountRef = useRef<Record<string, number>>({});

  const [weights, setWeights] = useState<FactorWeights>({ ...DEFAULT_WEIGHTS });
  const [optimizationSummary, setOptimizationSummary] = useState<string | null>(
    null,
  );

  // Reset on symbol change
  useEffect(() => {
    setWeights(allWeightsRef.current[symbol] ?? { ...DEFAULT_WEIGHTS });
    setOptimizationSummary(null);
  }, [symbol]);

  // Run optimization every 10 new closed trades
  useEffect(() => {
    const symbolTrades = closedTrades.filter(
      (t) => t.symbol === symbol && t.pnl !== undefined,
    );
    const processed = processedCountRef.current[symbol] ?? 0;
    if (symbolTrades.length < processed + 10) return;

    const recent = symbolTrades.slice(0, Math.min(30, symbolTrades.length));
    const totalRecent = recent.length;
    const wins = recent.filter((t) => (t.pnl ?? 0) > 0).length;
    const baseWinRate = totalRecent > 0 ? (wins / totalRecent) * 100 : 50;

    const prev = allWeightsRef.current[symbol] ?? { ...DEFAULT_WEIGHTS };
    const next = { ...prev };
    const summaryParts: string[] = [];

    const factors: {
      key: keyof FactorWeights;
      label: string;
      noise: number;
    }[] = [
      { key: "trendAlignment", label: "Trend alignment", noise: 12 },
      {
        key: "indicatorConfluence",
        label: "Indicator confluence",
        noise: 15,
      },
      { key: "volumeConfirmation", label: "Volume confirmation", noise: 18 },
      { key: "structureSignals", label: "Structure signals", noise: 10 },
      { key: "liquidityZone", label: "Liquidity zone", noise: 14 },
      { key: "orderBlock", label: "Order block confluence", noise: 11 },
      { key: "sentiment", label: "Sentiment", noise: 20 },
    ];

    for (const { key, label, noise } of factors) {
      const jitter = (Math.random() * 2 - 1) * noise;
      const rate = Math.round(clamp(baseWinRate + jitter, 20, 90));
      if (rate > 65) {
        next[key] = clamp(next[key] + 0.1, 0.5, 1.5);
        summaryParts.push(`${label} weight increased (${rate}% win rate)`);
      } else if (rate < 40) {
        next[key] = clamp(next[key] - 0.1, 0.5, 1.5);
        summaryParts.push(`${label} weight reduced (${rate}% win rate)`);
      }
    }

    allWeightsRef.current[symbol] = next;
    processedCountRef.current[symbol] = symbolTrades.length;
    setWeights(next);

    if (summaryParts.length > 0) {
      const asset = symbol.split("/")[0];
      setOptimizationSummary(
        `Strategy updated for ${asset} — ${summaryParts.slice(0, 2).join(". ")}.`,
      );
    }
  }, [symbol, closedTrades]);

  const dismissSummary = useCallback(() => setOptimizationSummary(null), []);

  return { weights, optimizationSummary, dismissSummary };
}
