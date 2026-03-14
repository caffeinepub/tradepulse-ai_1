import { useEffect, useState } from "react";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";

export function useAnalyticsTrades() {
  const [trades, setTrades] = useState<TradeRecord[]>(() =>
    tradeStore.getTrades(),
  );

  useEffect(() => {
    return tradeStore.subscribe(() => {
      setTrades(tradeStore.getTrades());
    });
  }, []);

  return trades;
}
