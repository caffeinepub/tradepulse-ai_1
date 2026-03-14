import { useEffect, useRef, useState } from "react";
import { type AISignal, generateSignal } from "../utils/aiSignalEngine";
import type { MarketAnalysis } from "../utils/marketAnalysisEngine";
import type { MultiTimeframeAnalysis } from "../utils/multiTimeframeEngine";

export function useAISignals(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
  analysis?: MarketAnalysis | null,
  mtf?: MultiTimeframeAnalysis | null,
): { currentSignal: AISignal | null; history: AISignal[] } {
  const [currentSignal, setCurrentSignal] = useState<AISignal | null>(null);
  const [history, setHistory] = useState<AISignal[]>([]);
  const prevSymbolRef = useRef(symbol);
  const analysisRef = useRef(analysis);
  const mtfRef = useRef(mtf);
  analysisRef.current = analysis;
  mtfRef.current = mtf;

  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setHistory([]);
      setCurrentSignal(null);
    }
  }, [symbol]);

  useEffect(() => {
    const tick = () => {
      if (price <= 0 || chartData.length < 5) return;
      const signal = generateSignal(
        symbol,
        price,
        chartData,
        analysisRef.current,
        mtfRef.current,
      );
      setCurrentSignal(signal);
      setHistory((prev) => [signal, ...prev].slice(0, 100));
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [symbol, price, chartData]);

  return { currentSignal, history };
}
