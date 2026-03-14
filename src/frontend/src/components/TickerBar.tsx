import { useEffect, useState } from "react";
import {
  type PriceState,
  SYMBOLS,
  getPriceState,
  updatePrices,
} from "../utils/priceSimulator";

interface TickerItem {
  symbol: string;
  price: number;
  changePercent: number;
  precision: number;
}

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>(() =>
    SYMBOLS.map((s) => {
      const state: PriceState = getPriceState(s.symbol);
      return {
        symbol: s.symbol,
        price: state.price,
        changePercent: state.changePercent,
        precision: s.precision,
      };
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices();
      setItems(
        SYMBOLS.map((s) => {
          const state = getPriceState(s.symbol);
          return {
            symbol: s.symbol,
            price: state.price,
            changePercent: state.changePercent,
            precision: s.precision,
          };
        }),
      );
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const doubled = [
    ...items.map((i) => ({ ...i, key: `a-${i.symbol}` })),
    ...items.map((i) => ({ ...i, key: `b-${i.symbol}` })),
  ];

  return (
    <div className="fixed top-14 left-0 right-0 z-40 bg-card border-b border-border overflow-hidden h-8 flex items-center">
      <div
        className="flex items-center ticker-scroll whitespace-nowrap"
        style={{ width: "max-content" }}
      >
        {doubled.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-2 px-6 text-xs font-mono-num border-r border-border/30 h-8"
          >
            <span className="text-muted-foreground">{item.symbol}</span>
            <span className="text-foreground">
              {item.price.toFixed(item.precision)}
            </span>
            <span
              className={item.changePercent >= 0 ? "text-buy" : "text-sell"}
            >
              {item.changePercent >= 0 ? "+" : ""}
              {item.changePercent.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
