import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Menu, TrendingDown, TrendingUp, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { SignalsPanel } from "../components/SignalsPanel";
import { useAISignals } from "../hooks/useAISignals";
import { useCandleTimer } from "../hooks/useCandleTimer";
import { useUserProfile } from "../hooks/useQueries";
import {
  SYMBOLS,
  type SymbolConfig,
  formatCurrency,
  generateChartData,
  getPriceState,
  updatePrices,
} from "../utils/priceSimulator";

const CATEGORIES = [
  { key: "crypto", label: "Crypto" },
  { key: "forex", label: "Forex" },
  { key: "gold", label: "Gold" },
  { key: "indices", label: "Indices" },
];

const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];

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
  const [chartData, setChartData] = useState(() =>
    generateChartData("BTC/USD"),
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

  // Regenerate chart when symbol or timeframe changes
  const handleSymbolOrTimeframeChange = useCallback(
    (sym: string, tf: string) => {
      setChartData(generateChartData(sym));
      // tf is used to trigger re-run when timeframe changes
      void tf;
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
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleNewCandle = useCallback(() => {
    setChartData(generateChartData(selectedSymbol));
    setCandleFlash(true);
    setTimeout(() => setCandleFlash(false), 600);
  }, [selectedSymbol]);

  const { secondsRemaining, progress } = useCandleTimer(
    timeframe,
    handleNewCandle,
  );

  const handlePlaceOrder = useCallback(() => {
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
  }, [order, selectedSymbol, prices]);

  const selectedConfig: SymbolConfig =
    SYMBOLS.find((s) => s.symbol === selectedSymbol) ?? SYMBOLS[0];
  const selectedPrice = prices[selectedSymbol];

  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const balance = profile?.balance ?? 10000;
  const equity = balance + totalPnL;

  const isChartUp =
    chartData.length > 1 &&
    chartData[chartData.length - 1].price >= chartData[0].price;

  const { currentSignal, history: signalHistory } = useAISignals(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
  );

  const progressFillColor =
    progress >= 80 ? "oklch(0.72 0.18 60)" : "oklch(0.72 0.18 145)";

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
            {/* Symbol + Price */}
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
                    "—"}
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

            {/* Timeframe tabs */}
            <div className="ml-auto">
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
            className={`flex-1 min-h-0 p-2 transition-all ${candleFlash ? "candle-flash" : ""}`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient
                    id="chartGradientUp"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(0.72 0.18 145)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.72 0.18 145)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="chartGradientDown"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="oklch(0.62 0.22 27)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="oklch(0.62 0.22 27)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "oklch(0.52 0.01 220)",
                    fontSize: 9,
                    fontFamily: "JetBrainsMono",
                  }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{
                    fill: "oklch(0.52 0.01 220)",
                    fontSize: 9,
                    fontFamily: "JetBrainsMono",
                  }}
                  tickLine={false}
                  axisLine={false}
                  domain={["auto", "auto"]}
                  width={60}
                  tickFormatter={(v) => v.toFixed(selectedConfig.precision)}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "oklch(0.13 0.01 240)",
                    border: "1px solid oklch(0.22 0.012 240)",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontFamily: "JetBrainsMono",
                  }}
                  labelStyle={{ color: "oklch(0.52 0.01 220)" }}
                  itemStyle={{
                    color: isChartUp
                      ? "oklch(0.72 0.18 145)"
                      : "oklch(0.62 0.22 27)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={
                    isChartUp ? "oklch(0.72 0.18 145)" : "oklch(0.62 0.22 27)"
                  }
                  strokeWidth={1.5}
                  fill={
                    isChartUp
                      ? "url(#chartGradientUp)"
                      : "url(#chartGradientDown)"
                  }
                  dot={false}
                  animationDuration={300}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </main>

        {/* Right panel: Signals + Order + Positions */}
        <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-border overflow-hidden">
          {/* Signals panel — takes available space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <SignalsPanel
              currentSignal={currentSignal}
              history={signalHistory}
              symbol={selectedSymbol}
            />
          </div>

          <Separator />

          {/* Order entry + Open positions — fixed bottom section */}
          <div className="h-72 flex flex-col overflow-hidden shrink-0">
            <ScrollArea className="flex-1">
              {/* Order entry */}
              <div className="p-3 border-b border-border">
                <div className="text-[10px] font-semibold text-muted-foreground mb-2">
                  PLACE ORDER
                </div>

                {/* Buy/Sell toggle */}
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
                        ) ?? "—"}
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
                    data-ocid="dashboard.place_order_button"
                    className={`w-full h-7 text-xs font-bold ${
                      order.side === "buy"
                        ? "bg-buy/20 border border-buy/40 text-buy hover:bg-buy/30"
                        : "bg-sell/20 border border-sell/40 text-sell hover:bg-sell/30"
                    }`}
                  >
                    {order.side === "buy" ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {order.side.toUpperCase()}{" "}
                    {selectedConfig.symbol.split("/")[0]}
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
    </div>
  );
}
