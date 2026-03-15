import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartCanvas, type ChartType } from "../components/ChartCanvas";
import { ChartDrawingToolbar } from "../components/ChartDrawingToolbar";
import { ChartToolbar } from "../components/ChartToolbar";
import { IntraSignalPanel } from "../components/IntraSignalPanel";
import { MarketAnalysisPanel } from "../components/MarketAnalysisPanel";
import type { Notification } from "../components/NotificationsPanel";
import { NotificationsPanel } from "../components/NotificationsPanel";
import { OpenTradePanel } from "../components/OpenTradePanel";
import { RiskManagementWidget } from "../components/RiskManagementWidget";
import { SessionInfoStrip } from "../components/SessionInfoStrip";
import { SignalsPanel } from "../components/SignalsPanel";
import { TradeChartOverlay } from "../components/TradeChartOverlay";
import { TradePopup } from "../components/TradePopup";
import { WatchlistPanel } from "../components/WatchlistPanel";
import { useAutoTrading } from "../hooks/useAutoTrading";
import { useCandleTimer } from "../hooks/useCandleTimer";
import { useChartDrawings } from "../hooks/useChartDrawings";
import { useChartViewport } from "../hooks/useChartViewport";
import { useLivePnL } from "../hooks/useLivePnL";
import { useMarketAnalysis } from "../hooks/useMarketAnalysis";
import { useMultiTimeframe } from "../hooks/useMultiTimeframe";
import { useNewsSentiment } from "../hooks/useNewsSentiment";
import { useUserProfile } from "../hooks/useQueries";
import { useSMCEngine } from "../hooks/useSMCEngine";
import { useStrategyOptimizer } from "../hooks/useStrategyOptimizer";
import { useTradeHistory } from "../hooks/useTradeHistory";
import { useUnifiedSignal } from "../hooks/useUnifiedSignal";
import { tradeStore } from "../store/tradeStore";
import type { Drawing, DrawingPoint } from "../types/drawing";
import type { SMCVisibility } from "../types/smc";
import type { TradeRecord } from "../types/trade";
import { getMarketType } from "../utils/aiSignalEngine";
import {
  type CandleData,
  SYMBOLS,
  type SymbolConfig,
  fetchLiveBinancePrices,
  formatCurrency,
  generateCandleHistory,
  generateChartData,
  getPriceState,
  updateLiveCandle,
  updatePricesWithScale,
} from "../utils/priceSimulator";
import {
  connectTwelveData,
  disconnectTwelveData,
} from "../utils/twelveDataService";

function getCandleParams(tf: string): { points: number; timeframeMs: number } {
  switch (tf) {
    case "1m":
      return { points: 80, timeframeMs: 60_000 };
    case "3m":
      return { points: 80, timeframeMs: 3 * 60_000 };
    case "5m":
      return { points: 80, timeframeMs: 5 * 60_000 };
    case "15m":
      return { points: 80, timeframeMs: 15 * 60_000 };
    case "1h":
      return { points: 80, timeframeMs: 60 * 60_000 };
    case "4h":
      return { points: 80, timeframeMs: 4 * 60 * 60_000 };
    case "1d":
      return { points: 60, timeframeMs: 24 * 60 * 60_000 };
    case "1W":
      return { points: 52, timeframeMs: 7 * 24 * 60 * 60_000 };
    case "1M":
      return { points: 24, timeframeMs: 30 * 24 * 60 * 60_000 };
    default:
      return { points: 80, timeframeMs: 60_000 };
  }
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
let notifCounter = 0;

export function DashboardPage() {
  const { data: profile } = useUserProfile();
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");
  const [timeframe, setTimeframe] = useState("1h");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [positionSize, setPositionSize] = useState(0.01);
  const [scalpsToday, setScalpsToday] = useState(0);
  const scalpsTodayDateRef = useRef(new Date().toDateString());
  const [candleFlash, setCandleFlash] = useState(false);

  // Track the most recent live price so handleNewCandle can seed the next candle correctly
  const livePriceRef = useRef<number>(0);

  // Watchlist / sidebar state
  const [watchlistCollapsed, setWatchlistCollapsed] = useState(false);
  const [showDrawingToolbar, setShowDrawingToolbar] = useState(true);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const prevSignalDirRef = useRef<string | null>(null);

  const pushNotification = useCallback(
    (type: Notification["type"], message: string) => {
      notifCounter += 1;
      setNotifications((prev) =>
        [
          {
            id: `n-${notifCounter}`,
            type,
            message,
            timestamp: new Date(),
            read: false,
          },
          ...prev,
        ].slice(0, 40),
      );
    },
    [],
  );

  const [chartData, setChartData] = useState(() =>
    generateChartData("BTC/USD"),
  );
  const [candleData, setCandleData] = useState<CandleData[]>(() => {
    const p = getCandleParams("1h");
    return generateCandleHistory("BTC/USD", p.points, p.timeframeMs);
  });
  const [prices, setPrices] = useState(() =>
    Object.fromEntries(SYMBOLS.map((s) => [s.symbol, getPriceState(s.symbol)])),
  );
  const [positions, setPositions] = useState<SimPosition[]>([
    {
      id: "pos-1",
      symbol: "BTC/USD",
      side: "buy",
      quantity: 0.1,
      entryPrice: 70800,
      currentPrice: 71055,
      pnl: 25.5,
    },
    {
      id: "pos-2",
      symbol: "ETH/USD",
      side: "sell",
      quantity: 1,
      entryPrice: 3520.0,
      currentPrice: 3500,
      pnl: 20.0,
    },
  ]);

  const [activePopup, setActivePopup] = useState<{
    trade: TradeRecord;
    x: number;
    y: number;
  } | null>(null);

  const [smcVisibility, setSmcVisibility] = useState<SMCVisibility>({
    liquidityZones: true,
    orderBlocks: true,
    bosChoch: true,
    fvg: true,
  });

  const handleSMCToggle = useCallback((key: keyof SMCVisibility) => {
    setSmcVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const {
    candleWidth,
    viewOffset,
    yScaleFactor,
    yPanOffset,
    freePanMode,
    handleWheel,
    handlePanDelta,
    handleYAxisDrag,
    handleFreePanDelta,
    toggleFreePanMode,
  } = useChartViewport();

  const {
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    setActiveTool,
    addDrawing,
    deleteDrawing,
    selectDrawing,
    setDrawingInProgress,
    generateId,
  } = useChartDrawings(selectedSymbol, timeframe);

  const [contextMenu, setContextMenu] = useState<{
    drawingId: string;
    x: number;
    y: number;
  } | null>(null);

  // --- Live Binance price fetch on mount ---
  useEffect(() => {
    fetchLiveBinancePrices().then(() => {
      const allPrices = Object.fromEntries(
        SYMBOLS.map((s) => [s.symbol, getPriceState(s.symbol)]),
      );
      setPrices(allPrices);
      const p = getCandleParams("1h");
      setChartData(generateChartData("BTC/USD"));
      const history = generateCandleHistory("BTC/USD", p.points, p.timeframeMs);
      const livePrice = allPrices["BTC/USD"]?.price ?? 0;
      if (history.length > 0 && livePrice > 0) {
        const last = { ...history[history.length - 1] };
        last.open = livePrice;
        last.close = livePrice;
        last.high = livePrice;
        last.low = livePrice;
        history[history.length - 1] = last;
        livePriceRef.current = livePrice;
      }
      setCandleData(history);
    });
  }, []);

  // Connect Twelve Data WebSocket for non-crypto symbols
  useEffect(() => {
    const mt = getMarketType(selectedSymbol);
    if (mt === "crypto") {
      disconnectTwelveData();
      return;
    }
    connectTwelveData(selectedSymbol, (livePrice) => {
      livePriceRef.current = livePrice;
      const config = SYMBOLS.find((s) => s.symbol === selectedSymbol);
      if (config) {
        setCandleData((prev) => updateLiveCandle(prev, livePrice, config));
      }
      setPrices((prev) => {
        const current = prev[selectedSymbol];
        if (!current) return prev;
        return { ...prev, [selectedSymbol]: { ...current, price: livePrice } };
      });
    });
    return () => {
      disconnectTwelveData();
    };
  }, [selectedSymbol]);

  const handleSymbolOrTimeframeChange = useCallback(
    (sym: string, tf: string) => {
      const p = getCandleParams(tf);
      setChartData(generateChartData(sym));
      const history = generateCandleHistory(sym, p.points, p.timeframeMs);
      const livePrice =
        livePriceRef.current > 0
          ? livePriceRef.current
          : getPriceState(sym).price;
      if (history.length > 0 && livePrice > 0) {
        const last = { ...history[history.length - 1] };
        last.open = livePrice;
        last.close = livePrice;
        last.high = livePrice;
        last.low = livePrice;
        history[history.length - 1] = last;
      }
      setCandleData(history);
    },
    [],
  );

  useEffect(() => {
    handleSymbolOrTimeframeChange(selectedSymbol, timeframe);
  }, [selectedSymbol, timeframe, handleSymbolOrTimeframeChange]);

  useEffect(() => {
    const p = getCandleParams(timeframe);
    const tickScaleFactor = Math.sqrt(60_000 / p.timeframeMs);

    const interval = setInterval(() => {
      updatePricesWithScale(tickScaleFactor);
      const newPrices = Object.fromEntries(
        SYMBOLS.map((s) => [s.symbol, getPriceState(s.symbol)]),
      );
      setPrices(newPrices);
      setPositions((prev) =>
        prev.map((pos) => {
          const current = newPrices[pos.symbol]?.price ?? pos.currentPrice;
          const pnl =
            pos.side === "buy"
              ? (current - pos.entryPrice) * pos.quantity
              : (pos.entryPrice - current) * pos.quantity;
          return { ...pos, currentPrice: current, pnl };
        }),
      );
      const livePrice = newPrices[selectedSymbol]?.price;
      if (livePrice) {
        livePriceRef.current = livePrice;
        const config = SYMBOLS.find((s) => s.symbol === selectedSymbol);
        if (config) {
          setCandleData((prev) => updateLiveCandle(prev, livePrice, config));
        }
      }
    }, 100);
    return () => clearInterval(interval);
  }, [selectedSymbol, timeframe]);

  useEffect(() => {
    const t = setInterval(() => {
      const today = new Date().toDateString();
      if (scalpsTodayDateRef.current !== today) {
        scalpsTodayDateRef.current = today;
        setScalpsToday(0);
      }
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  const handleNewCandle = useCallback(() => {
    const p = getCandleParams(timeframe);
    setChartData(generateChartData(selectedSymbol));
    setCandleData((prev) => {
      if (prev.length === 0) return prev;
      const lastClose = prev[prev.length - 1].close;
      const seedPrice =
        livePriceRef.current > 0 ? livePriceRef.current : lastClose;
      const now = Date.now();
      const d = new Date(now);
      const timeStr =
        p.timeframeMs < 86_400_000
          ? `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`
          : `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
      const newCandle: CandleData = {
        time: timeStr,
        open: seedPrice,
        high: seedPrice,
        low: seedPrice,
        close: seedPrice,
        index: prev.length,
      };
      const updated = [...prev, newCandle];
      return updated.length > 200
        ? updated.slice(updated.length - 200)
        : updated;
    });
    setCandleFlash(true);
    setTimeout(() => setCandleFlash(false), 600);
  }, [selectedSymbol, timeframe]);

  const { secondsRemaining } = useCandleTimer(timeframe, handleNewCandle);

  const selectedConfig: SymbolConfig =
    SYMBOLS.find((s) => s.symbol === selectedSymbol) ?? SYMBOLS[0];
  const selectedPrice = prices[selectedSymbol];

  const analysis = useMarketAnalysis(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
  );
  const mtf = useMultiTimeframe(
    selectedSymbol,
    selectedPrice?.price ?? 0,
    chartData,
  );
  const {
    headlines: newsHeadlines,
    overallSentiment,
    sentimentStrength,
  } = useNewsSentiment(selectedSymbol);

  const mtfBias = useMemo(() => {
    if (mtf?.higherTFBias === "Bullish") return "bullish";
    if (mtf?.higherTFBias === "Bearish") return "bearish";
    return "neutral";
  }, [mtf]);

  const { smcData, smcContext: _smcContext } = useSMCEngine(
    candleData,
    timeframe,
    mtfBias,
    selectedPrice?.price ?? 0,
  );

  const { currentSignal, history: signalHistory } = useUnifiedSignal({
    symbol: selectedSymbol,
    price: selectedPrice?.price ?? 0,
    chartData,
    timeframe,
    positionSize,
  });

  const {
    trades,
    chartRenderTrades,
    openTrade,
    closeTrade,
    dailyPnl,
    dailyLossLimitHit,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useTradeHistory(signalHistory as any, selectedSymbol, chartData);

  const closedTrades = useMemo(
    () => trades.filter((t) => t.status === "closed"),
    [trades],
  );

  const {
    weights: _optimizerWeights,
    optimizationSummary,
    dismissSummary,
  } = useStrategyOptimizer(selectedSymbol, closedTrades);

  const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
  const balance = profile?.balance ?? 10000;
  const equity = balance + totalPnL;
  const dailyLossUsed = Math.min(0, dailyPnl);

  useEffect(() => {
    if (!currentSignal) return;
    const dirKey = `${currentSignal.signal}-${currentSignal.entryPrice}`;
    if (prevSignalDirRef.current === dirKey) return;
    prevSignalDirRef.current = dirKey;
    if (currentSignal.signal === "BUY") {
      pushNotification(
        "signal_buy",
        `BUY ${selectedSymbol} @ ${currentSignal.entryPrice.toFixed(2)} (${currentSignal.tradeType})`,
      );
    } else if (currentSignal.signal === "SELL") {
      pushNotification(
        "signal_sell",
        `SELL ${selectedSymbol} @ ${currentSignal.entryPrice.toFixed(2)} (${currentSignal.tradeType})`,
      );
    }
  }, [currentSignal, selectedSymbol, pushNotification]);

  useEffect(() => {
    if (optimizationSummary) {
      pushNotification("optimizer", optimizationSummary);
    }
  }, [optimizationSummary, pushNotification]);

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

  const openTrades = chartRenderTrades.filter((t) => t.status === "open");

  const [storeOpenTrades, setStoreOpenTrades] = useState(() =>
    tradeStore.getTrades().filter((t) => t.status === "open"),
  );
  useEffect(() => {
    return tradeStore.subscribe(() => {
      setStoreOpenTrades(
        tradeStore.getTrades().filter((t) => t.status === "open"),
      );
    });
  }, []);

  // ── Daily loss state (reactive via tradeStore) ─────────────────────────
  const [storeDailyLoss, setStoreDailyLoss] = useState(() =>
    tradeStore.getDailyLoss(),
  );
  const storeDailyLossLimit = tradeStore.getDailyLossLimit();
  useEffect(() => {
    return tradeStore.subscribe(() => {
      setStoreDailyLoss(tradeStore.getDailyLoss());
    });
  }, []);
  const storeIsLimitReached = storeDailyLoss >= storeDailyLossLimit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useAutoTrading(
    currentSignal as any,
    selectedPrice?.price ?? 0,
    selectedSymbol,
  );
  useLivePnL(selectedPrice?.price ?? 0, selectedSymbol);

  const handlePlaceOrder = useCallback(
    (side: "buy" | "sell") => {
      if (dailyLossLimitHit) return;
      const price = prices[selectedSymbol]?.price ?? 0;
      positionCounter += 1;
      const newPos: SimPosition = {
        id: `pos-${positionCounter}`,
        symbol: selectedSymbol,
        side,
        quantity: positionSize,
        entryPrice: price,
        currentPrice: price,
        pnl: 0,
      };
      setPositions((prev) => [newPos, ...prev]);
      openTrade({
        symbol: selectedSymbol,
        side,
        source: "demo",
        entryPrice: price,
        entryIndex: chartData.length - 1,
      });
    },
    [
      selectedSymbol,
      prices,
      openTrade,
      chartData,
      dailyLossLimitHit,
      positionSize,
    ],
  );

  const handleClosePosition = useCallback(
    (id: string, price: number) => {
      closeTrade(id, price, chartData.length - 1);
      setPositions((prev) => prev.filter((p) => p.id !== id));
    },
    [closeTrade, chartData.length],
  );

  const handleDrawingStart = (point: DrawingPoint) => {
    if (activeTool === "hline") {
      addDrawing({
        id: generateId(),
        type: "hline",
        price: point.price,
        color: "#f59e0b",
      });
      return;
    }
    if (activeTool === "trendline") {
      setDrawingInProgress({
        id: generateId(),
        type: "trendline",
        start: point,
        end: point,
        color: "#3b82f6",
      });
    } else if (activeTool === "rectangle") {
      setDrawingInProgress({
        id: generateId(),
        type: "rectangle",
        start: point,
        end: point,
        color: "#22c55e",
      });
    } else if (activeTool === "fibonacci") {
      setDrawingInProgress({
        id: generateId(),
        type: "fibonacci",
        start: point,
        end: point,
        color: "#f59e0b",
      });
    }
  };

  const handleDrawingUpdate = (point: DrawingPoint) => {
    if (!drawingInProgress) return;
    setDrawingInProgress({ ...drawingInProgress, end: point } as Drawing);
  };

  const handleDrawingComplete = (point: DrawingPoint) => {
    if (!drawingInProgress) return;
    addDrawing({ ...drawingInProgress, end: point } as Drawing);
    setDrawingInProgress(null);
  };

  const handleDrawingClick = (id: string) => {
    selectDrawing(id || null);
  };

  const isChartUp =
    chartData.length > 1 &&
    chartData[chartData.length - 1].price >= chartData[0].price;

  // Shared chart canvas props
  const chartCanvasProps = {
    chartType,
    candles: candleData,
    chartData,
    openTrades,
    selectedConfig,
    isUp: isChartUp,
    candleWidth,
    viewOffset,
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    smcData,
    smcVisibility,
    onWheel: handleWheel,
    onPanDelta: handlePanDelta,
    onDrawingStart: handleDrawingStart,
    onDrawingUpdate: handleDrawingUpdate,
    onDrawingComplete: handleDrawingComplete,
    onDrawingClick: handleDrawingClick,
    onDrawingRightClick: (id: string, x: number, y: number) =>
      setContextMenu({ drawingId: id, x, y }),
    showEMA: true,
    showVWAP: true,
    livePrice: selectedPrice?.price ?? 0,
    secondsRemaining,
    selectedTimeframe: timeframe,
    yScaleFactor,
    yPanOffset,
    freePanMode,
    onYAxisDrag: handleYAxisDrag,
    onFreePanDelta: handleFreePanDelta,
    onDoubleClick: toggleFreePanMode,
    intra15mSignals: [],
  };

  // Shared overlays rendered inside chart container
  const renderChartOverlays = () => (
    <>
      <TradeChartOverlay
        trades={chartRenderTrades}
        chartData={chartData}
        containerRef={chartContainerRef}
        priceMin={priceMin}
        priceMax={priceMax}
        onMarkerClick={(trade, x, y) => setActivePopup({ trade, x, y })}
      />
      {activePopup && (
        <TradePopup
          trade={activePopup.trade}
          x={activePopup.x}
          y={activePopup.y}
          onClose={() => setActivePopup(null)}
        />
      )}
      {contextMenu && (
        <div
          className="fixed z-50 rounded border border-border bg-card shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="w-full px-4 py-1.5 text-xs text-destructive hover:bg-secondary transition-colors text-left"
            onClick={() => {
              deleteDrawing(contextMenu.drawingId);
              setContextMenu(null);
            }}
          >
            Delete Drawing
          </button>
          <button
            type="button"
            className="w-full px-4 py-1.5 text-xs text-muted-foreground hover:bg-secondary transition-colors text-left"
            onClick={() => setContextMenu(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );

  // Shared sidebar panels
  const renderSidebarPanels = () => (
    <>
      <SignalsPanel
        currentSignal={currentSignal}
        history={signalHistory}
        symbol={selectedSymbol}
      />
      <IntraSignalPanel
        currentSignal={currentSignal}
        history={signalHistory}
        selectedTimeframe={timeframe}
      />
      <OpenTradePanel
        positions={positions}
        positionSize={positionSize}
        onPositionSizeChange={setPositionSize}
        scalpsToday={scalpsToday}
        dailyPnl={dailyPnl}
        dailyLossLimitHit={dailyLossLimitHit}
        signalTrades={storeOpenTrades}
        onClosePosition={(id) => {
          const signalTrade = storeOpenTrades.find((t) => t.id === id);
          if (signalTrade) {
            const price = selectedPrice?.price ?? signalTrade.entryPrice;
            tradeStore.updateTrade({
              ...signalTrade,
              status: "closed",
              exitPrice: price,
              exitTime: new Date(),
              pnl:
                signalTrade.side === "buy"
                  ? price - signalTrade.entryPrice
                  : signalTrade.entryPrice - price,
            });
            return;
          }
          const pos = positions.find((p) => p.id === id);
          if (pos) handleClosePosition(id, pos.currentPrice);
        }}
      />
      {/* ── Risk Management Widget ── */}
      <RiskManagementWidget
        dailyLoss={storeDailyLoss}
        dailyLossLimit={storeDailyLossLimit}
        isLimitReached={storeIsLimitReached}
      />
      <div className="px-3 py-2 border-b border-border flex gap-2">
        <Button
          onClick={() => handlePlaceOrder("buy")}
          disabled={dailyLossLimitHit}
          data-ocid="dashboard.place_order_button"
          className="flex-1 h-7 text-xs font-bold bg-buy/20 border border-buy/40 text-buy hover:bg-buy/30"
        >
          BUY
        </Button>
        <Button
          onClick={() => handlePlaceOrder("sell")}
          disabled={dailyLossLimitHit}
          data-ocid="dashboard.sell_button"
          className="flex-1 h-7 text-xs font-bold bg-sell/20 border border-sell/40 text-sell hover:bg-sell/30"
        >
          SELL
        </Button>
      </div>
      <NotificationsPanel
        notifications={notifications}
        onClearAll={() => setNotifications([])}
      />
      <MarketAnalysisPanel
        analysis={analysis}
        symbol={selectedSymbol}
        mtf={mtf}
        headlines={newsHeadlines}
        overallSentiment={overallSentiment}
        sentimentStrength={sentimentStrength}
        optimizationSummary={optimizationSummary}
        dismissSummary={dismissSummary}
      />
    </>
  );

  return (
    <>
      {/* ── Mobile layout (portrait) ── */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 flex flex-col bg-background overflow-y-auto"
        style={{ top: "5.5rem", zIndex: 10 }}
      >
        {/* Chart section — fixed height */}
        <div className="flex flex-col shrink-0" style={{ height: "55vh" }}>
          <ChartToolbar
            symbol={selectedConfig.symbol}
            precision={selectedConfig.precision}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            chartType={chartType}
            onChartTypeChange={(t) => setChartType(t as ChartType)}
            smcVisibility={smcVisibility}
            onSMCToggle={handleSMCToggle}
            onZoomIn={() => handleWheel({ deltaY: -120 } as WheelEvent, 0.5)}
            onZoomOut={() => handleWheel({ deltaY: 120 } as WheelEvent, 0.5)}
            showDrawingToolbar={showDrawingToolbar}
            onToggleDrawingToolbar={() => setShowDrawingToolbar((v) => !v)}
          />
          {dailyLossLimitHit && (
            <div
              data-ocid="risk.daily_loss_limit_badge"
              className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold shrink-0"
              style={{
                background: "oklch(0.18 0.08 27 / 0.6)",
                borderBottom: "1px solid oklch(0.45 0.18 27 / 0.4)",
                color: "oklch(0.75 0.12 27)",
              }}
            >
              <AlertTriangle className="w-3 h-3 shrink-0" />
              Daily Loss Limit Reached — Demo Trading Paused. AI Signals
              Continue.
            </div>
          )}
          <div
            ref={chartContainerRef}
            className="flex-1 min-h-0 relative"
            style={{ minHeight: "200px" }}
          >
            <ChartCanvas {...chartCanvasProps} />
            {renderChartOverlays()}
          </div>
        </div>

        {/* Panels below chart — natural height, scrolls with parent */}
        <div className="flex flex-col border-t border-border">
          <SessionInfoStrip
            balance={balance}
            equity={equity}
            dailyPnl={dailyPnl}
            dailyLossUsed={dailyLossUsed}
            dailyLossLimit={200}
            scalpsToday={scalpsToday}
          />
          {renderSidebarPanels()}
        </div>
      </div>

      {/* ── Desktop layout — unchanged, hidden on mobile ── */}
      <div
        className="hidden md:flex fixed left-0 right-0 bottom-0 flex-col overflow-y-auto bg-background"
        style={{ top: "5.5rem", zIndex: 10 }}
      >
        <div className="flex flex-1 min-h-0">
          {/* Left: Watchlist */}
          <WatchlistPanel
            collapsed={watchlistCollapsed}
            onCollapse={setWatchlistCollapsed}
            selectedSymbol={selectedSymbol}
            onSymbolSelect={setSelectedSymbol}
            prices={prices}
          />

          {/* Center: Chart Area */}
          <main className="flex-1 flex flex-col min-w-0">
            <ChartToolbar
              symbol={selectedConfig.symbol}
              precision={selectedConfig.precision}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              chartType={chartType}
              onChartTypeChange={(t) => setChartType(t as ChartType)}
              smcVisibility={smcVisibility}
              onSMCToggle={handleSMCToggle}
              onZoomIn={() => handleWheel({ deltaY: -120 } as WheelEvent, 0.5)}
              onZoomOut={() => handleWheel({ deltaY: 120 } as WheelEvent, 0.5)}
              showDrawingToolbar={showDrawingToolbar}
              onToggleDrawingToolbar={() => setShowDrawingToolbar((v) => !v)}
            />

            {dailyLossLimitHit && (
              <div
                data-ocid="risk.daily_loss_limit_badge"
                className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold shrink-0"
                style={{
                  background: "oklch(0.18 0.08 27 / 0.6)",
                  borderBottom: "1px solid oklch(0.45 0.18 27 / 0.4)",
                  color: "oklch(0.75 0.12 27)",
                }}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                Daily Loss Limit Reached — Demo Trading Paused. AI Signals
                Continue.
              </div>
            )}

            <div
              className={`flex flex-1 min-h-0 transition-all ${
                candleFlash ? "candle-flash" : ""
              }`}
            >
              {showDrawingToolbar && (
                <ChartDrawingToolbar
                  activeTool={activeTool}
                  onToolChange={setActiveTool}
                />
              )}
              <div ref={chartContainerRef} className="flex-1 min-h-0 relative">
                <ChartCanvas {...chartCanvasProps} />
                {renderChartOverlays()}
              </div>
            </div>
          </main>

          {/* Right: Sidebar */}
          <aside
            className="hidden md:flex flex-col border-l border-border bg-background shrink-0"
            style={{ width: 300 }}
          >
            <SessionInfoStrip
              balance={balance}
              equity={equity}
              dailyPnl={dailyPnl}
              dailyLossUsed={dailyLossUsed}
              dailyLossLimit={200}
              scalpsToday={scalpsToday}
            />
            <ScrollArea className="flex-1">{renderSidebarPanels()}</ScrollArea>
          </aside>
        </div>
      </div>
    </>
  );
}
