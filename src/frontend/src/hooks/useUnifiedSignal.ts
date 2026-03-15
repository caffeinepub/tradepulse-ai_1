import { useEffect, useRef, useState } from "react";
import {
  type UnifiedSignal,
  computeUnifiedSignal,
} from "../utils/unifiedSignalEngine";

export function useUnifiedSignal(params: {
  symbol: string;
  price: number;
  chartData: { price: number; time: string }[];
  timeframe: string;
  positionSize: number;
}) {
  const { symbol, price, chartData, timeframe, positionSize } = params;

  const pricesRef = useRef<number[]>([]);
  const prevSymbolRef = useRef(symbol);
  const prevTimeframeRef = useRef(timeframe);
  const prevSignalRef = useRef<UnifiedSignal | null>(null);

  const [currentSignal, setCurrentSignal] = useState<UnifiedSignal | null>(
    null,
  );
  const [history, setHistory] = useState<UnifiedSignal[]>([]);

  // Reset on symbol or timeframe change
  useEffect(() => {
    const symbolChanged = prevSymbolRef.current !== symbol;
    const tfChanged = prevTimeframeRef.current !== timeframe;
    if (symbolChanged || tfChanged) {
      prevSymbolRef.current = symbol;
      prevTimeframeRef.current = timeframe;
      pricesRef.current = [];
      prevSignalRef.current = null;
      setCurrentSignal(null);
      setHistory([]);
    }
  }, [symbol, timeframe]);

  // Accumulate prices from chartData (keep last 100)
  useEffect(() => {
    if (chartData.length === 0) return;
    const latest = chartData.map((d) => d.price);
    // Use chart data as the base, then append current live price
    pricesRef.current = latest.slice(-99);
    if (price > 0) pricesRef.current.push(price);
  }, [chartData, price]);

  // 1.5-second evaluation loop
  useEffect(() => {
    const evaluate = () => {
      const ps = pricesRef.current;
      if (ps.length < 2) return;
      const sig = computeUnifiedSignal(ps, timeframe, symbol, positionSize);
      setCurrentSignal(sig);

      // Add to history when signal changes or is BUY/SELL
      const prev = prevSignalRef.current;
      const isNew = !prev || prev.signal !== sig.signal;
      if (sig.signal !== "HOLD" && isNew) {
        setHistory((h) => [sig, ...h].slice(0, 50));
      } else if (sig.signal === "HOLD" && prev && prev.signal !== "HOLD") {
        // transition to HOLD: don't add to history
      }
      prevSignalRef.current = sig;
    };

    evaluate();
    const id = setInterval(evaluate, 1500);
    return () => clearInterval(id);
  }, [timeframe, symbol, positionSize]);

  return { currentSignal, history };
}
