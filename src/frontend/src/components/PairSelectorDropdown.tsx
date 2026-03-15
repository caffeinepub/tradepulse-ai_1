import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Star } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchBinanceLivePrice,
  fetchLivePrice,
} from "../utils/twelveDataService";

const FOREX_PAIRS = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "USD/CHF",
  "AUD/USD",
  "NZD/USD",
  "USD/CAD",
  "GBP/JPY",
  "EUR/JPY",
  "EUR/GBP",
  "XAU/USD",
  "XAG/USD",
  "WTI/USD",
];

const CRYPTO_PAIRS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "ADA/USD",
  "DOGE/USD",
  "AVAX/USD",
  "MATIC/USD",
  "DOT/USD",
];

const PAIR_PRECISION: Record<string, number> = {
  "EUR/USD": 5,
  "GBP/USD": 5,
  "USD/JPY": 3,
  "USD/CHF": 5,
  "AUD/USD": 5,
  "NZD/USD": 5,
  "USD/CAD": 5,
  "GBP/JPY": 3,
  "EUR/JPY": 3,
  "EUR/GBP": 5,
  "XAU/USD": 2,
  "XAG/USD": 3,
  "WTI/USD": 2,
  "BTC/USD": 2,
  "ETH/USD": 2,
  "SOL/USD": 3,
  "BNB/USD": 2,
  "XRP/USD": 4,
  "ADA/USD": 4,
  "DOGE/USD": 5,
  "AVAX/USD": 3,
  "MATIC/USD": 4,
  "DOT/USD": 3,
};

const FAVORITES_KEY = "tradepulse_favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function saveFavorites(favorites: Set<string>): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {}
}

function formatPairPrice(price: number, pair: string): string {
  if (price <= 0) return "—";
  const prec = PAIR_PRECISION[pair] ?? 4;
  return price.toFixed(prec);
}

interface PairSelectorDropdownProps {
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

export function PairSelectorDropdown({
  selectedSymbol,
  onSymbolSelect,
}: PairSelectorDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"forex" | "crypto">(
    CRYPTO_PAIRS.includes(selectedSymbol) ? "crypto" : "forex",
  );
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async (tab: "forex" | "crypto") => {
    setLoading(true);
    try {
      const pairs = tab === "forex" ? FOREX_PAIRS : CRYPTO_PAIRS;
      const fetcher =
        tab === "crypto"
          ? (p: string) => fetchBinanceLivePrice(p)
          : (p: string) => fetchLivePrice(p);
      const results = await Promise.all(
        pairs.map(async (p) => {
          const price = await fetcher(p).catch(() => 0);
          return [p, price] as [string, number];
        }),
      );
      setPrices((prev) => {
        const next = { ...prev };
        for (const [p, price] of results) {
          if (price > 0) next[p] = price;
        }
        return next;
      });
    } catch {}
    setLoading(false);
  }, []);

  // Fetch prices when dropdown opens or tab changes
  useEffect(() => {
    if (!open) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    fetchPrices(activeTab);
    pollRef.current = setInterval(() => fetchPrices(activeTab), 30_000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [open, activeTab, fetchPrices]);

  const toggleFavorite = useCallback((pair: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(pair)) next.delete(pair);
      else next.add(pair);
      saveFavorites(next);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (pair: string) => {
      onSymbolSelect(pair);
      setOpen(false);
    },
    [onSymbolSelect],
  );

  const currentPairs = activeTab === "forex" ? FOREX_PAIRS : CRYPTO_PAIRS;
  const sorted = [...currentPairs].sort((a, b) => {
    const fa = favorites.has(a);
    const fb = favorites.has(b);
    if (fa && !fb) return -1;
    if (!fa && fb) return 1;
    return a.localeCompare(b);
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-ocid="pair_selector.open_modal_button"
          className="flex items-center gap-1 px-2 h-6 rounded text-xs font-bold transition-colors hover:bg-secondary/60"
          style={{ color: "oklch(0.9 0.06 240)" }}
        >
          <span>{selectedSymbol}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 border"
        style={{
          width: 320,
          background: "oklch(0.14 0.02 240)",
          borderColor: "oklch(0.28 0.04 240)",
        }}
        align="start"
      >
        {/* Tab bar */}
        <div
          className="flex border-b"
          style={{ borderColor: "oklch(0.28 0.04 240)" }}
        >
          <button
            type="button"
            data-ocid="pair_selector.forex.tab"
            onClick={() => setActiveTab("forex")}
            className="flex-1 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors"
            style={{
              color:
                activeTab === "forex"
                  ? "oklch(0.82 0.14 240)"
                  : "oklch(0.5 0.04 240)",
              borderBottom:
                activeTab === "forex"
                  ? "2px solid oklch(0.65 0.18 240)"
                  : "2px solid transparent",
            }}
          >
            Forex &amp; Commodities
          </button>
          <button
            type="button"
            data-ocid="pair_selector.crypto.tab"
            onClick={() => setActiveTab("crypto")}
            className="flex-1 py-2 text-[10px] font-semibold tracking-wide uppercase transition-colors"
            style={{
              color:
                activeTab === "crypto"
                  ? "oklch(0.82 0.14 240)"
                  : "oklch(0.5 0.04 240)",
              borderBottom:
                activeTab === "crypto"
                  ? "2px solid oklch(0.65 0.18 240)"
                  : "2px solid transparent",
            }}
          >
            Crypto
          </button>
        </div>

        {/* Price loading indicator */}
        {loading && (
          <div
            className="h-0.5 w-full"
            style={{ background: "oklch(0.65 0.18 240 / 0.4)" }}
          >
            <div
              className="h-full w-1/3 animate-pulse"
              style={{ background: "oklch(0.65 0.18 240)" }}
            />
          </div>
        )}

        {/* Pair grid */}
        <div
          className="grid grid-cols-2 gap-px p-2"
          style={{ maxHeight: 360, overflowY: "auto" }}
        >
          {sorted.map((pair, i) => {
            const isFav = favorites.has(pair);
            const isSelected = pair === selectedSymbol;
            const price = prices[pair];
            const idx = i + 1;
            return (
              <button
                key={pair}
                type="button"
                data-ocid={`pair_selector.item.${idx}`}
                onClick={() => handleSelect(pair)}
                className="flex items-center justify-between gap-1 px-2 py-1.5 rounded text-left transition-colors group"
                style={{
                  background: isSelected
                    ? "oklch(0.22 0.06 240 / 0.8)"
                    : "oklch(0.16 0.02 240 / 0.5)",
                  border: isSelected
                    ? "1px solid oklch(0.5 0.14 240 / 0.6)"
                    : "1px solid oklch(0.24 0.03 240 / 0.4)",
                }}
              >
                <div className="flex items-center gap-1 min-w-0">
                  <button
                    type="button"
                    data-ocid="pair_selector.star.toggle"
                    onClick={(e) => toggleFavorite(pair, e)}
                    className="shrink-0 transition-colors"
                    style={{
                      color: isFav
                        ? "oklch(0.78 0.16 80)"
                        : "oklch(0.38 0.03 240)",
                    }}
                  >
                    <Star
                      className="w-3 h-3"
                      fill={isFav ? "currentColor" : "none"}
                      strokeWidth={isFav ? 0 : 1.5}
                    />
                  </button>
                  <span
                    className="text-[10px] font-mono font-semibold truncate"
                    style={{
                      color: isSelected
                        ? "oklch(0.9 0.08 240)"
                        : "oklch(0.72 0.05 240)",
                    }}
                  >
                    {pair}
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono shrink-0"
                  style={{
                    color:
                      price && price > 0
                        ? "oklch(0.72 0.12 145)"
                        : "oklch(0.4 0.03 240)",
                  }}
                >
                  {price ? formatPairPrice(price, pair) : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="px-3 py-1.5 text-[9px] border-t"
          style={{
            borderColor: "oklch(0.22 0.03 240)",
            color: "oklch(0.42 0.04 240)",
          }}
        >
          {activeTab === "forex"
            ? "Prices via Twelve Data"
            : "Prices via Binance"}{" "}
          · ★ to favorite
        </div>
      </PopoverContent>
    </Popover>
  );
}
