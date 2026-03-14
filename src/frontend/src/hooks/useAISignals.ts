import { useEffect, useRef, useState } from "react";
import { type AISignal, generateSignal } from "../utils/aiSignalEngine";
import type { MarketAnalysis } from "../utils/marketAnalysisEngine";
import type { MultiTimeframeAnalysis } from "../utils/multiTimeframeEngine";
import type { SentimentLabel } from "../utils/newsService";

export function useAISignals(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
  analysis?: MarketAnalysis | null,
  mtf?: MultiTimeframeAnalysis | null,
  overallSentiment?: SentimentLabel,
  sentimentStrength?: number,
): { currentSignal: AISignal | null; history: AISignal[] } {
  const [currentSignal, setCurrentSignal] = useState<AISignal | null>(null);
  const [history, setHistory] = useState<AISignal[]>([]);
  const prevSymbolRef = useRef(symbol);
  const analysisRef = useRef(analysis);
  const mtfRef = useRef(mtf);
  const sentimentRef = useRef({ overallSentiment, sentimentStrength });
  analysisRef.current = analysis;
  mtfRef.current = mtf;
  sentimentRef.current = { overallSentiment, sentimentStrength };

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
        sentimentRef.current.overallSentiment,
        sentimentRef.current.sentimentStrength,
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
