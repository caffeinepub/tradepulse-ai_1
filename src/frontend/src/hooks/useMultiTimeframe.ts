import { useEffect, useRef, useState } from "react";
import {
  type MultiTimeframeAnalysis,
  analyzeMultiTimeframe,
} from "../utils/multiTimeframeEngine";

export function useMultiTimeframe(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
): MultiTimeframeAnalysis | null {
  const [mtf, setMtf] = useState<MultiTimeframeAnalysis | null>(null);
  const prevSymbolRef = useRef(symbol);

  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setMtf(null);
    }
  }, [symbol]);

  useEffect(() => {
    const tick = () => {
      if (price <= 0 || chartData.length < 10) return;
      const result = analyzeMultiTimeframe(symbol, price, chartData);
      setMtf(result);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [symbol, price, chartData]);

  return mtf;
}
