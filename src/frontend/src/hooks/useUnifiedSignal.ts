import { useEffect, useRef, useState } from "react";
import {
  type UnifiedSignal,
  computeUnifiedSignal,
  computeUnifiedSignalSync,
} from "../utils/unifiedSignalEngine";

const CRYPTO_SYMBOLS_SET = new Set(["BTC/USD", "ETH/USD", "SOL/USD"]);
const FOREX_SYMBOLS_SET = new Set(["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"]);

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
    pricesRef.current = latest.slice(-99);
    if (price > 0) pricesRef.current.push(price);
  }, [chartData, price]);

  // Determine if this pair+timeframe supports real candle data
  // Crypto: all timeframes supported via Binance
  // Forex: only 5m and 15m supported via Twelve Data
  const isRealCandleSupported =
    CRYPTO_SYMBOLS_SET.has(symbol) ||
    (FOREX_SYMBOLS_SET.has(symbol) &&
      (timeframe === "5m" || timeframe === "15m"));

  // 1.5-second evaluation loop
  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      let sig: UnifiedSignal;

      if (isRealCandleSupported) {
        // Async path: fetch real candles from Binance (crypto) or Twelve Data (forex)
        sig = await computeUnifiedSignal(symbol, timeframe, positionSize);
      } else {
        // Sync path: use tick-based prices for unsupported pairs/timeframes
        const ps = pricesRef.current;
        if (ps.length < 2) return;
        sig = computeUnifiedSignalSync(ps, timeframe, symbol, positionSize);
      }

      if (cancelled) return;

      setCurrentSignal(sig);

      const prev = prevSignalRef.current;
      const isNew = !prev || prev.signal !== sig.signal;
      if (sig.signal !== "HOLD" && isNew) {
        setHistory((h) => [sig, ...h].slice(0, 50));
      }
      prevSignalRef.current = sig;
    };

    evaluate();
    const id = setInterval(evaluate, 1500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [timeframe, symbol, positionSize, isRealCandleSupported]);

  return { currentSignal, history };
}
