import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, BellOff, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import type { PriceState } from "../utils/priceSimulator";

const WATCHLIST_SYMBOLS = [
  { key: "BTC/USD", label: "BTC/USDT", abbr: "BTC" },
  { key: "ETH/USD", label: "ETH/USDT", abbr: "ETH" },
  { key: "XAUUSD", label: "XAU/USD", abbr: "XAU" },
  { key: "EURUSD", label: "EUR/USD", abbr: "EUR" },
  { key: "GBPUSD", label: "GBP/USD", abbr: "GBP" },
  { key: "NAS100", label: "NAS100", abbr: "NAS" },
  { key: "SP500", label: "S&P 500", abbr: "SPX" },
  { key: "BNB/USD", label: "BNB/USDT", abbr: "BNB" },
  { key: "SOL/USD", label: "SOL/USDT", abbr: "SOL" },
];

interface WatchlistPanelProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  prices: Record<string, PriceState>;
}

export function WatchlistPanel({
  collapsed,
  onCollapse,
  selectedSymbol,
  onSymbolSelect,
  prices,
}: WatchlistPanelProps) {
  const [search, setSearch] = useState("");
  const [alerts, setAlerts] = useState<Set<string>>(new Set());

  const filtered = WATCHLIST_SYMBOLS.filter(
    (s) =>
      !search ||
      s.label.toLowerCase().includes(search.toLowerCase()) ||
      s.abbr.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleAlert = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      data-ocid="watchlist.panel"
      className="hidden md:flex flex-col border-r border-border bg-background shrink-0 transition-all duration-200 overflow-hidden"
      style={{ width: collapsed ? 40 : 200 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-2 border-b border-border shrink-0"
        style={{ minHeight: 36 }}
      >
        {!collapsed && (
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Watchlist
          </span>
        )}
        <button
          type="button"
          data-ocid="watchlist.collapse_toggle"
          onClick={() => onCollapse(!collapsed)}
          className="ml-auto text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="px-2 py-1.5 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              data-ocid="watchlist.search_input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-6 text-[10px] pl-5 bg-secondary border-border"
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="py-1">
          {collapsed
            ? WATCHLIST_SYMBOLS.map((s, i) => {
                const isSelected = selectedSymbol === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    data-ocid={`watchlist.item.${i + 1}`}
                    onClick={() => onSymbolSelect(s.key)}
                    className={`w-full flex items-center justify-center py-2 text-[9px] font-bold transition-colors ${
                      isSelected
                        ? "text-buy bg-buy/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                    title={s.label}
                  >
                    {s.abbr}
                  </button>
                );
              })
            : filtered.map((s, i) => {
                const isSelected = selectedSymbol === s.key;
                const price = prices[s.key];
                const changePos = (price?.changePercent ?? 0) >= 0;
                return (
                  <button
                    key={s.key}
                    type="button"
                    data-ocid={`watchlist.item.${i + 1}`}
                    onClick={() => onSymbolSelect(s.key)}
                    className={`w-full flex items-center gap-1 px-2 py-1.5 cursor-pointer transition-colors select-none text-left ${
                      isSelected
                        ? "bg-buy/10 border-l-2 border-l-buy"
                        : "hover:bg-secondary/40 border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-semibold text-foreground leading-tight truncate">
                        {s.label}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-mono text-[9px] text-foreground/80">
                          {price ? price.price.toFixed(2) : "--"}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[8px] py-0 px-1 h-3.5 border-0 ${
                            changePos ? "text-buy" : "text-sell"
                          }`}
                        >
                          {changePos ? "+" : ""}
                          {(price?.changePercent ?? 0).toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                    <button
                      type="button"
                      data-ocid={`watchlist.alert_toggle.${i + 1}`}
                      onClick={(e) => toggleAlert(s.key, e)}
                      className={`shrink-0 p-0.5 rounded transition-colors ${
                        alerts.has(s.key)
                          ? "text-amber-400"
                          : "text-muted-foreground/40 hover:text-muted-foreground"
                      }`}
                    >
                      {alerts.has(s.key) ? (
                        <Bell className="w-2.5 h-2.5" />
                      ) : (
                        <BellOff className="w-2.5 h-2.5" />
                      )}
                    </button>
                  </button>
                );
              })}
          {!collapsed && filtered.length === 0 && (
            <div className="text-center py-4 text-[10px] text-muted-foreground">
              No results
            </div>
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}
