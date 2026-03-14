import { useEffect, useRef, useState } from "react";
import {
  type MarketAnalysis,
  analyzeMarket,
} from "../utils/marketAnalysisEngine";

export function useMarketAnalysis(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
): MarketAnalysis | null {
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setAnalysis(null);
    }
  }, [symbol]);

  useEffect(() => {
    const tick = () => {
      if (price <= 0 || chartData.length < 5) return;
      const result = analyzeMarket(symbol, price, chartData);
      setAnalysis(result);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [symbol, price, chartData]);

  return analysis;
}
