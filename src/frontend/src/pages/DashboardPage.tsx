import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Clock,
  Menu,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas, type ChartType } from "../components/ChartCanvas";
import { MarketAnalysisPanel } from "../components/MarketAnalysisPanel";
import { SignalsPanel } from "../components/SignalsPanel";
import { TradeChartOverlay } from "../components/TradeChartOverlay";
import { TradePopup } from "../components/TradePopup";
import { useAISignals } from "../hooks/useAISignals";
import { useCandleTimer } from "../hooks/useCandleTimer";
import { useMarketAnalysis } from "../hooks/useMarketAnalysis";
import { useMultiTimeframe } from "../hooks/useMultiTimeframe";
import { useUserProfile } from "../hooks/useQueries";
import { useTradeHistory } from "../hooks/useTradeHistory";
import type { TradeRecord } from "../types/trade";
import {
  type CandleData,
  SYMBOLS,
  type SymbolConfig,
  formatCurrency,
  generateCandleHistory,
  generateChartData,
  getPriceState,
  updateLiveCandle,
  updatePrices,
} from "../utils/priceSimulator";

const CATEGORIES = [
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "gold", label: "Gold" },
  { key: "indices", label: "Indices" },
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: "candlestick", label: "Candle" },
  { key: "line", label: "Line" },
  { key: "area", label: "Area" },
  { key: "bar", label: "Bar" },
];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface OrderEntry {
  side: "buy" | "sell";
  quantity: string;
}

interface SimPosition {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

let positionCounter = 3;

export function DashboardPage() {
  const { data: profile } = useUserProfile();
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("1H");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [chartData, setChartData] = useState(() =>
    generateChartData("BTC/USD"),
  );
  const [candleData, setCandleData] = useState<CandleData[]>(() =>
    generateCandleHistory("BTC/USD"),
  );
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(SYMBOLS.map((s) => [s.symbol, getPriceState(s.symbol)])),
  );
  const [order, setOrder] = useState<OrderEntry>({
    side: "buy",
    quantity: "0.1",
  });
  const [positions, setPositions] = useState<SimPosition[]>([
    {
      id: "pos-1",
      symbol: "BTC/USD",
      side: "buy",
      quantity: 0.1,
      entryPrice: 64320.5,
      currentPrice: 65000,
      pnl: 67.95,
    },
    {
      id: "pos-2",
      symbol: "ETH/USD",
      side: "sell",
      quantity: 1,
      entryPrice: 3450.0,
      currentPrice: 3400,
      pnl: 50.0,
    },
  ]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [candleFlash, setCandleFlash] = useState(false);
  const [activePopup, setActivePopup] = useState<{
    trade: TradeRecord;
    x: number;
    y: number;
  } | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleSymbolOrTimeframeChange = useCallback(
    (sym: string, _tf: string) => {
      setChartData(generateChartData(sym));
      setCandleData(generateCandleHistory(sym));
    },
    [],
  );

  useEffect(() => {
    handleSymbolOrTimeframeChange(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, handleSymbolOrTimeframeChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices();
      const newPrices = Object.fromEntries(
        SYMBOLS.map((s) => [s.symbol, getPriceState(s.symbol)]),
      );
      setPrices(newPrices);
      setPositions((prev) =>
        prev.map((p) => {
          const current = newPrices[p.symbol]?.price ?? p.currentPrice;
          const pnl =
            p.side === "buy"
              ? (current - p.entryPrice) * p.quantity
              : (p.entryPrice - current) * p.quantity;
          return { ...p, currentPrice: current, pnl };
        }),
      );
      // Update live candle for selected symbol
      const livePrice = newPrices[selectedSymbol]?.price;
      if (livePrice) {
        const config = SYMBOLS.find((s) => s.symbol === selectedSymbol);
        if (config) {
          setCandleData((prev) => updateLiveCandle(prev, livePrice, config));
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleNewCandle = useCallback(() => {
    setChartData(generateChartData(selectedSymbol));
    setCandleData(generateCandleHistory(selectedSymbol));
    setCandleFlash(true);
    setTimeout(() => setCandleFlash(false), 600);
  }, [selectedSymbol]);

  const { secondsRemaining, progress } = useCandleTimer(
    timeframe,
    handleNewCandle,
  );

  const selectedConfig: SymbolConfig =
    SYMBOLS.find((s) => s.symbol === selectedSymbol) ?? SYMBOLS[0];
  const selectedPrice = prices[selectedSymbol];

  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const balance = profile?.balance ?? 10000;
  const equity = balance + totalPnL;

  const isChartUp =
    chartData.length > 1 &&
    chartData[chartData.length - 1].price >= chartData[0].price;

  // Market analysis engine
  const analysis = useMarketAnalysis(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
  );

  // Multi-timeframe analysis engine
  const mtf = useMultiTimeframe(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
  );
  const { currentSignal, history: signalHistory } = useAISignals(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
    analysis,
    mtf,
  );

  // Trade history
  const {
    chartRenderTrades,
    openTrade,
    closeTrade,
    dailyPnl,
    dailyLossLimitHit,
  } = useTradeHistory(signalHistory, selectedSymbol, chartData);

  const handlePlaceOrder = useCallback(() => {
    if (dailyLossLimitHit) return;
    const qty = Number.parseFloat(order.quantity);
    if (!qty || qty <= 0) return;
    const price = prices[selectedSymbol]?.price ?? 0;
    positionCounter += 1;
    const newPos: SimPosition = {
      id: `pos-${positionCounter}`,
      symbol: selectedSymbol,
      side: order.side,
      quantity: qty,
      entryPrice: price,
      currentPrice: price,
      pnl: 0,
    };
    setPositions((prev) => [newPos, ...prev]);
    openTrade({
      symbol: selectedSymbol,
      side: order.side,
      source: "demo",
      entryPrice: price,
      entryIndex: chartData.length - 1,
    });
  }, [order, selectedSymbol, prices, openTrade, chartData, dailyLossLimitHit]);

  const progressFillColor =
    progress >= 80 ? "oklch(0.72 0.18 60)" : "oklch(0.72 0.18 145)";

  function formatSignalTime(date: Date): string {
    return date.toTimeString().slice(0, 8);
  }

  // Price range for chart overlay (must match what ChartCanvas displays)
  const { priceMin, priceMax } = useMemo(() => {
    if (chartType === "candlestick" || chartType === "bar") {
      if (candleData.length === 0) return { priceMin: 0, priceMax: 1 };
      const low = Math.min(...candleData.map((c) => c.low));
      const high = Math.max(...candleData.map((c) => c.high));
      const pad = (high - low) * 0.08;
      return { priceMin: low - pad, priceMax: high + pad };
    }
    if (chartData.length === 0) return { priceMin: 0, priceMax: 1 };
    const ps = chartData.map((d) => d.price);
    const lo = Math.min(...ps);
    const hi = Math.max(...ps);
    const pad = (hi - lo) * 0.08;
    return { priceMin: lo - pad, priceMax: hi + pad };
  }, [chartType, candleData, chartData]);

  // Open trades for reference lines
  const openTrades = chartRenderTrades.filter((t) => t.status === "open");

  return (
    <div className="flex flex-col h-screen" style={{ paddingTop: "6rem" }}>
      {/* Top bar */}
      <div className="border-b border-border bg-card px-4 py-2 flex items-center gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5 font-mono-num text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{clock.toUTCString().slice(17, 25)} UTC</span>
        </div>
        <Separator orientation="vertical" className="h-4" />
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Balance</span>
          <span className="font-mono-num text-foreground">
            {formatCurrency(balance)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Equity</span>
          <span className="font-mono-num text-foreground">
            {formatCurrency(equity)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">P&amp;L</span>
          <span
            className={`font-mono-num font-semibold ${totalPnL >= 0 ? "text-buy" : "text-sell"}`}
          >
            {totalPnL >= 0 ? "+" : ""}
            {formatCurrency(totalPnL)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground">Daily P&amp;L</span>
          <span
            className={`font-mono-num font-semibold ${dailyPnl >= 0 ? "text-buy" : "text-sell"}`}
          >
            {dailyPnl >= 0 ? "+" : ""}
            {formatCurrency(dailyPnl)}
          </span>
        </div>
        {dailyLossLimitHit && (
          <div
            data-ocid="risk.daily_loss_limit_badge"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold"
            style={{
              background: "oklch(0.25 0.08 27 / 0.6)",
              border: "1px solid oklch(0.62 0.22 27 / 0.5)",
              color: "oklch(0.82 0.12 27)",
            }}
          >
            <AlertTriangle className="w-3 h-3 shrink-0" />
            Daily Loss Limit Reached — Trading Paused
          </div>
        )}
        <div className="ml-auto md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? (
              <X className="w-4 h-4" />
            ) : (
              <Menu className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside
          className={`
          ${sidebarOpen ? "flex" : "hidden"} md:flex
          flex-col w-full md:w-52 shrink-0 border-r border-border bg-sidebar overflow-hidden
          absolute md:relative inset-0 z-30 md:z-auto top-0 md:top-auto
          pt-16 md:pt-0
        `}
        >
          <ScrollArea className="flex-1">
            <div className="p-2">
              {CATEGORIES.map((cat) => {
                const catSymbols = SYMBOLS.filter(
                  (s) => s.category === cat.key,
                );
                return (
                  <div key={cat.key} className="mb-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1">
                      {cat.label}
                    </div>
                    {catSymbols.map((sym) => {
                      const globalIdx = SYMBOLS.indexOf(sym) + 1;
                      const price = prices[sym.symbol];
                      const isSelected = selectedSymbol === sym.symbol;
                      return (
                        <button
                          key={sym.symbol}
                          type="button"
                          data-ocid={`dashboard.symbol_select.${globalIdx}`}
                          onClick={() => {
                            setSelectedSymbol(sym.symbol);
                            setSidebarOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center justify-between gap-2 mb-0.5 ${
                            isSelected
                              ? "bg-primary/10 border border-primary/20 text-foreground"
                              : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span className="font-semibold truncate">
                            {sym.symbol}
                          </span>
                          <div className="text-right shrink-0">
                            <div
                              className={`font-mono-num text-[10px] ${price?.changePercent >= 0 ? "text-buy" : "text-sell"}`}
                            >
                              {price?.changePercent >= 0 ? "+" : ""}
                              {price?.changePercent.toFixed(2)}%
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Main chart area */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Symbol header */}
          <div className="border-b border-border px-4 py-3 flex items-center gap-4 flex-wrap shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base">
                  {selectedConfig.name}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] text-muted-foreground border-border"
                >
                  {selectedConfig.category.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-mono-num text-2xl font-bold">
                  {selectedPrice?.price.toFixed(selectedConfig.precision) ??
                    "\u2014"}
                </span>
                <span
                  className={`font-mono-num text-sm ${(selectedPrice?.changePercent ?? 0) >= 0 ? "text-buy" : "text-sell"}`}
                >
                  {(selectedPrice?.changePercent ?? 0) >= 0 ? "+" : ""}
                  {selectedPrice?.changePercent.toFixed(2) ?? "0.00"}%
                </span>
              </div>
            </div>

            {/* Candle timer */}
            <div
              data-ocid="dashboard.candle_timer"
              className="hidden sm:flex flex-col gap-1 px-3 py-1.5 rounded terminal-border bg-secondary/30 min-w-[120px]"
            >
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                CANDLE CLOSE
              </span>
              <span
                className="font-mono-num text-sm font-bold"
                style={{ color: progressFillColor }}
              >
                {formatCountdown(secondsRemaining)}
              </span>
              <div
                data-ocid="dashboard.candle_progress"
                className="flex items-center gap-1.5"
              >
                <div
                  className="flex-1 rounded-full overflow-hidden"
                  style={{ height: "4px", background: "oklch(0.22 0.012 240)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min(100, Math.max(0, progress))}%`,
                      background: progressFillColor,
                    }}
                  />
                </div>
                <span
                  className="font-mono-num shrink-0"
                  style={{ fontSize: "9px", color: "oklch(0.52 0.01 220)" }}
                >
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Timeframe tabs + Chart type switcher */}
            <div className="ml-auto flex items-center gap-2">
              {/* Chart type switcher */}
              <div
                className="flex items-center gap-px p-0.5 rounded"
                style={{ background: "oklch(0.16 0.012 240)" }}
              >
                {CHART_TYPES.map((ct) => (
                  <button
                    key={ct.key}
                    type="button"
                    data-ocid={`chart.${ct.key}_button`}
                    onClick={() => setChartType(ct.key)}
                    className={`px-2 h-6 text-[10px] font-mono rounded transition-colors ${
                      chartType === ct.key
                        ? "bg-card text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>

              <Tabs value={timeframe} onValueChange={setTimeframe}>
                <TabsList className="bg-secondary h-7 p-0.5">
                  {TIMEFRAMES.map((tf, i) => (
                    <TabsTrigger
                      key={tf}
                      value={tf}
                      data-ocid={`dashboard.timeframe_tab.${i + 1}`}
                      className="text-[10px] px-2 h-6 data-[state=active]:bg-card data-[state=active]:text-foreground"
                    >
                      {tf}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Chart */}
          <div
            ref={chartContainerRef}
            className={`flex-1 min-h-0 p-2 transition-all relative ${candleFlash ? "candle-flash" : ""}`}
          >
            <ChartCanvas
              chartType={chartType}
              candles={candleData}
              chartData={chartData}
              openTrades={openTrades}
              selectedConfig={selectedConfig}
              isUp={isChartUp}
            />

            {/* Trade marker overlay */}
            <TradeChartOverlay
              trades={chartRenderTrades}
              chartData={chartData}
              containerRef={chartContainerRef}
              priceMin={priceMin}
              priceMax={priceMax}
              onMarkerClick={(trade, x, y) => setActivePopup({ trade, x, y })}
            />
          </div>
        </main>

        {/* Right panel: Signals + Order + Positions */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-border overflow-hidden">
          {/* Signals panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SignalsPanel
              currentSignal={currentSignal}
              history={signalHistory}
              symbol={selectedSymbol}
            />
          </div>

          <Separator />

          {/* Order entry + Open positions */}
          <div className="h-72 flex flex-col overflow-hidden shrink-0">
            <ScrollArea className="flex-1">
              {/* Order entry */}
              <div className="p-3 border-b border-border">
                <div className="text-[10px] font-semibold text-muted-foreground mb-2">
                  PLACE ORDER
                  {dailyLossLimitHit && (
                    <span
                      className="ml-2 text-[9px]"
                      style={{ color: "oklch(0.82 0.12 27)" }}
                    >
                      (Trading paused)
                    </span>
                  )}
                </div>

                <div className="flex rounded overflow-hidden border border-border mb-3">
                  <button
                    type="button"
                    data-ocid="dashboard.buy_toggle"
                    onClick={() => setOrder((o) => ({ ...o, side: "buy" }))}
                    className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                      order.side === "buy"
                        ? "bg-buy text-background"
                        : "text-muted-foreground hover:text-buy"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    type="button"
                    data-ocid="dashboard.sell_toggle"
                    onClick={() => setOrder((o) => ({ ...o, side: "sell" }))}
                    className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                      order.side === "sell"
                        ? "bg-sell text-background"
                        : "text-muted-foreground hover:text-sell"
                    }`}
                  >
                    SELL
                  </button>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Quantity ({selectedConfig.symbol.split("/")[0]})
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={order.quantity}
                      onChange={(e) =>
                        setOrder((o) => ({ ...o, quantity: e.target.value }))
                      }
                      data-ocid="dashboard.quantity_input"
                      className="bg-input border-border font-mono-num text-sm h-7 mt-1"
                    />
                  </div>

                  <div className="terminal-border rounded p-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground mb-1">
                      <span>Market Price</span>
                      <span className="font-mono-num text-foreground">
                        {selectedPrice?.price.toFixed(
                          selectedConfig.precision,
                        ) ?? "\u2014"}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Est. Cost</span>
                      <span className="font-mono-num text-foreground">
                        {formatCurrency(
                          (Number.parseFloat(order.quantity) || 0) *
                            (selectedPrice?.price ?? 0),
                        )}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={dailyLossLimitHit}
                    data-ocid="dashboard.place_order_button"
                    className={`w-full h-7 text-xs font-bold ${
                      dailyLossLimitHit
                        ? "opacity-50 cursor-not-allowed"
                        : order.side === "buy"
                          ? "bg-buy/20 border border-buy/40 text-buy hover:bg-buy/30"
                          : "bg-sell/20 border border-sell/40 text-sell hover:bg-sell/30"
                    }`}
                  >
                    {order.side === "buy" ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {dailyLossLimitHit
                      ? "Trading Paused"
                      : `${order.side.toUpperCase()} ${selectedConfig.symbol.split("/")[0]}`}
                  </Button>
                </div>
              </div>

              {/* Open positions */}
              <div className="p-3">
                <div className="text-[10px] font-semibold text-muted-foreground mb-2">
                  OPEN POSITIONS
                </div>

                {positions.length === 0 ? (
                  <div
                    data-ocid="positions.empty_state"
                    className="text-center py-4 text-xs text-muted-foreground"
                  >
                    No open positions.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {positions.map((pos, displayIdx) => (
                      <div
                        key={pos.id}
                        data-ocid={`positions.row.${displayIdx + 1}`}
                        className={`rounded p-2 text-xs terminal-border ${
                          pos.side === "buy"
                            ? "border-l-2 border-l-buy/50"
                            : "border-l-2 border-l-sell/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[10px]">
                            {pos.symbol}
                          </span>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={`text-[9px] py-0 ${
                                pos.side === "buy"
                                  ? "bg-buy border-buy text-buy"
                                  : "bg-sell border-sell text-sell"
                              }`}
                            >
                              {pos.side.toUpperCase()}
                            </Badge>
                            <button
                              type="button"
                              data-ocid={`positions.delete_button.${displayIdx + 1}`}
                              onClick={() => {
                                closeTrade(
                                  pos.id,
                                  pos.currentPrice,
                                  chartData.length - 1,
                                );
                                setPositions((prev) =>
                                  prev.filter((p) => p.id !== pos.id),
                                );
                              }}
                              className="text-[9px] text-muted-foreground hover:text-sell px-1 py-0 rounded transition-colors"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 text-[9px] text-muted-foreground">
                          <span>
                            Qty:{" "}
                            <span className="font-mono-num text-foreground">
                              {pos.quantity}
                            </span>
                          </span>
                          <span
                            className={`text-right font-mono-num font-semibold ${pos.pnl >= 0 ? "text-buy" : "text-sell"}`}
                          >
                            {pos.pnl >= 0 ? "+" : ""}
                            {formatCurrency(pos.pnl)}
                          </span>
                          <span>
                            Entry:{" "}
                            <span className="font-mono-num text-foreground">
                              {pos.entryPrice.toFixed(2)}
                            </span>
                          </span>
                          <span className="text-right">
                            Now:{" "}
                            <span className="font-mono-num text-foreground">
                              {pos.currentPrice.toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </aside>
      </div>

      {/* Bottom row: Market Analysis + Signal History mini-table */}
      <div className="border-t border-border shrink-0 flex flex-col md:flex-row h-auto md:h-72 overflow-hidden">
        {/* Market Analysis Panel */}
        <div className="flex-1 min-w-0 border-b md:border-b-0 md:border-r border-border overflow-hidden">
          <MarketAnalysisPanel
            analysis={analysis}
            symbol={selectedSymbol}
            mtf={mtf}
          />
        </div>

        {/* Mini Signal History */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full bg-buy animate-pulse-green shrink-0"
                style={{ boxShadow: "0 0 6px oklch(0.72 0.18 145 / 0.7)" }}
              />
              <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
                Recent Signals
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground font-mono-num">
                {selectedSymbol}
              </span>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="px-3 pb-3">
              {signalHistory.length === 0 ? (
                <div
                  data-ocid="signals.mini.empty_state"
                  className="text-center py-6 text-[10px] text-muted-foreground"
                >
                  Awaiting signals...
                </div>
              ) : (
                <div className="space-y-px">
                  {signalHistory.slice(0, 5).map((sig, idx) => (
                    <div
                      key={sig.id}
                      data-ocid={`signals.mini.row.${idx + 1}`}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded text-[9px] ${
                        idx % 2 === 0 ? "bg-secondary/30" : ""
                      }`}
                    >
                      <span className="font-mono-num text-muted-foreground w-16 shrink-0">
                        {formatSignalTime(sig.timestamp)}
                      </span>
                      <span
                        className={`font-bold text-[10px] w-8 shrink-0 ${
                          sig.signal === "BUY"
                            ? "text-buy"
                            : sig.signal === "SELL"
                              ? "text-sell"
                              : "text-muted-foreground"
                        }`}
                      >
                        {sig.signal}
                      </span>
                      <div
                        className="flex-1 rounded-full overflow-hidden"
                        style={{
                          height: "4px",
                          background: "oklch(0.22 0.012 240)",
                        }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${sig.confidence}%`,
                            background:
                              sig.signal === "BUY"
                                ? "oklch(0.72 0.18 145)"
                                : sig.signal === "SELL"
                                  ? "oklch(0.62 0.22 27)"
                                  : "oklch(0.52 0.01 220)",
                          }}
                        />
                      </div>
                      <span className="font-mono-num text-muted-foreground w-8 text-right shrink-0">
                        {sig.confidence}%
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {sig.tradeType}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Trade popup */}
      {activePopup && (
        <TradePopup
          trade={activePopup.trade}
          x={activePopup.x}
          y={activePopup.y}
          onClose={() => setActivePopup(null)}
        />
      )}
    </div>
  );
}
