import { useCallback, useEffect, useRef } from "react";
import type { TradeRecord } from "../types/trade";
import type { CandleData, SymbolConfig } from "../utils/priceSimulator";

export type ChartType = "candlestick" | "line" | "area" | "bar";

const CANDLE_UP = "#26a69a";
const CANDLE_DOWN = "#ef5350";
const LABEL_COLOR = "#7b8fa1";
const GRID_COLOR = "rgba(255,255,255,0.04)";

interface ChartCanvasProps {
  chartType: ChartType;
  candles: CandleData[];
  chartData: { time: string; price: number }[];
  openTrades: TradeRecord[];
  selectedConfig: SymbolConfig;
  isUp: boolean;
}

function mapY(
  price: number,
  pMin: number,
  pMax: number,
  plotTop: number,
  plotBottom: number,
): number {
  if (pMax === pMin) return (plotTop + plotBottom) / 2;
  return plotBottom - ((price - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
}

function mapXIndex(
  idx: number,
  total: number,
  plotLeft: number,
  plotRight: number,
): number {
  if (total <= 1) return plotLeft;
  return plotLeft + (idx / (total - 1)) * (plotRight - plotLeft);
}

function drawCandlestick(
  ctx: CanvasRenderingContext2D,
  candles: CandleData[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotRight: number,
  plotTop: number,
  plotBottom: number,
) {
  const total = candles.length;
  if (total === 0) return;
  const slotW = (plotRight - plotLeft) / total;
  const bodyW = Math.max(1, slotW * 0.65);

  for (let i = 0; i < total; i++) {
    const c = candles[i];
    const cx = plotLeft + (i + 0.5) * slotW;
    const isBull = c.close >= c.open;
    const color = isBull ? CANDLE_UP : CANDLE_DOWN;
    const highY = mapY(c.high, pMin, pMax, plotTop, plotBottom);
    const lowY = mapY(c.low, pMin, pMax, plotTop, plotBottom);
    const openY = mapY(c.open, pMin, pMax, plotTop, plotBottom);
    const closeY = mapY(c.close, pMin, pMax, plotTop, plotBottom);
    const bodyTop = Math.min(openY, closeY);
    const bodyH = Math.max(1, Math.abs(closeY - openY));

    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, highY);
    ctx.lineTo(cx, lowY);
    ctx.stroke();

    if (isBull) {
      ctx.fillStyle = color;
      ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    } else {
      ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
      ctx.fillStyle = `${color}99`;
      ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    }
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  candles: CandleData[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotRight: number,
  plotTop: number,
  plotBottom: number,
) {
  const total = candles.length;
  if (total === 0) return;
  const slotW = (plotRight - plotLeft) / total;
  const tickLen = Math.max(2, slotW * 0.3);

  for (let i = 0; i < total; i++) {
    const c = candles[i];
    const cx = plotLeft + (i + 0.5) * slotW;
    const isBull = c.close >= c.open;
    const color = isBull ? CANDLE_UP : CANDLE_DOWN;
    const highY = mapY(c.high, pMin, pMax, plotTop, plotBottom);
    const lowY = mapY(c.low, pMin, pMax, plotTop, plotBottom);
    const openY = mapY(c.open, pMin, pMax, plotTop, plotBottom);
    const closeY = mapY(c.close, pMin, pMax, plotTop, plotBottom);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, highY);
    ctx.lineTo(cx, lowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - tickLen, openY);
    ctx.lineTo(cx, openY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, closeY);
    ctx.lineTo(cx + tickLen, closeY);
    ctx.stroke();
  }
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  data: { time: string; price: number }[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotRight: number,
  plotTop: number,
  plotBottom: number,
  isUp: boolean,
) {
  if (data.length < 2) return;
  ctx.strokeStyle = isUp ? CANDLE_UP : CANDLE_DOWN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = mapXIndex(i, data.length, plotLeft, plotRight);
    const y = mapY(data[i].price, pMin, pMax, plotTop, plotBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawArea(
  ctx: CanvasRenderingContext2D,
  data: { time: string; price: number }[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotRight: number,
  plotTop: number,
  plotBottom: number,
  isUp: boolean,
) {
  if (data.length < 2) return;
  const grad = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
  grad.addColorStop(0, isUp ? "rgba(38,166,154,0.28)" : "rgba(239,83,80,0.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");

  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = mapXIndex(i, data.length, plotLeft, plotRight);
    const y = mapY(data[i].price, pMin, pMax, plotTop, plotBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const lastX = mapXIndex(data.length - 1, data.length, plotLeft, plotRight);
  ctx.lineTo(lastX, plotBottom);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = isUp ? CANDLE_UP : CANDLE_DOWN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < data.length; i++) {
    const x = mapXIndex(i, data.length, plotLeft, plotRight);
    const y = mapY(data[i].price, pMin, pMax, plotTop, plotBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function ChartCanvas({
  chartType,
  candles,
  chartData,
  openTrades,
  selectedConfig,
  isUp,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const propsRef = useRef({
    chartType,
    candles,
    chartData,
    openTrades,
    selectedConfig,
    isUp,
  });
  propsRef.current = {
    chartType,
    candles,
    chartData,
    openTrades,
    selectedConfig,
    isUp,
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const {
      chartType: ct,
      candles: cls,
      chartData: cd,
      openTrades: ot,
      selectedConfig: sc,
      isUp: up,
    } = propsRef.current;

    const dpr = window.devicePixelRatio || 1;
    const W = container.clientWidth;
    const H = container.clientHeight;
    if (W === 0 || H === 0) return;

    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const PLOT_LEFT = 72;
    const PLOT_RIGHT = W - 8;
    const PLOT_TOP = 10;
    const PLOT_BOTTOM = H - 22;
    const prec = sc.precision;

    let pMin: number;
    let pMax: number;

    if (ct === "candlestick" || ct === "bar") {
      if (cls.length === 0) return;
      pMin = Math.min(...cls.map((c) => c.low));
      pMax = Math.max(...cls.map((c) => c.high));
    } else {
      if (cd.length === 0) return;
      pMin = Math.min(...cd.map((d) => d.price));
      pMax = Math.max(...cd.map((d) => d.price));
    }

    const pad = (pMax - pMin) * 0.08;
    pMin -= pad;
    pMax += pad;

    const numGridLines = 5;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= numGridLines; i++) {
      const y = PLOT_TOP + (i / numGridLines) * (PLOT_BOTTOM - PLOT_TOP);
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, y);
      ctx.lineTo(PLOT_RIGHT, y);
      ctx.stroke();
    }

    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= numGridLines; i++) {
      const price = pMax - (i / numGridLines) * (pMax - pMin);
      const y = PLOT_TOP + (i / numGridLines) * (PLOT_BOTTOM - PLOT_TOP);
      ctx.fillText(price.toFixed(prec), PLOT_LEFT - 4, y + 3);
    }

    if (ct === "candlestick") {
      drawCandlestick(
        ctx,
        cls,
        pMin,
        pMax,
        PLOT_LEFT,
        PLOT_RIGHT,
        PLOT_TOP,
        PLOT_BOTTOM,
      );
    } else if (ct === "bar") {
      drawBar(
        ctx,
        cls,
        pMin,
        pMax,
        PLOT_LEFT,
        PLOT_RIGHT,
        PLOT_TOP,
        PLOT_BOTTOM,
      );
    } else if (ct === "line") {
      drawLine(
        ctx,
        cd,
        pMin,
        pMax,
        PLOT_LEFT,
        PLOT_RIGHT,
        PLOT_TOP,
        PLOT_BOTTOM,
        up,
      );
    } else if (ct === "area") {
      drawArea(
        ctx,
        cd,
        pMin,
        pMax,
        PLOT_LEFT,
        PLOT_RIGHT,
        PLOT_TOP,
        PLOT_BOTTOM,
        up,
      );
    }

    const timeData = ct === "candlestick" || ct === "bar" ? cls : cd;
    if (timeData.length > 1) {
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      const step = Math.max(1, Math.floor(timeData.length / 6));
      for (let i = 0; i < timeData.length; i += step) {
        const x = mapXIndex(i, timeData.length, PLOT_LEFT, PLOT_RIGHT);
        ctx.fillText(timeData[i].time, x, H - 6);
      }
    }

    for (const trade of ot) {
      const tradeColor = trade.side === "buy" ? CANDLE_UP : CANDLE_DOWN;
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "right";

      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = tradeColor;
      ctx.lineWidth = 1;
      const ey = mapY(trade.entryPrice, pMin, pMax, PLOT_TOP, PLOT_BOTTOM);
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, ey);
      ctx.lineTo(PLOT_RIGHT, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tradeColor;
      ctx.fillText(
        `Entry: ${trade.entryPrice.toFixed(prec)}`,
        PLOT_RIGHT - 2,
        ey - 3,
      );

      ctx.setLineDash([]);
      ctx.strokeStyle = CANDLE_DOWN;
      ctx.lineWidth = 1.5;
      const sly = mapY(trade.sl, pMin, pMax, PLOT_TOP, PLOT_BOTTOM);
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, sly);
      ctx.lineTo(PLOT_RIGHT, sly);
      ctx.stroke();
      ctx.fillStyle = CANDLE_DOWN;
      ctx.fillText(`SL: ${trade.sl.toFixed(prec)}`, PLOT_RIGHT - 2, sly - 3);

      const tp1y = mapY(trade.tp1, pMin, pMax, PLOT_TOP, PLOT_BOTTOM);
      ctx.setLineDash([]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, tp1y);
      ctx.lineTo(PLOT_RIGHT, tp1y);
      ctx.stroke();
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP1: ${trade.tp1.toFixed(prec)}`, PLOT_RIGHT - 2, tp1y - 3);

      const tp2y = mapY(trade.tp2, pMin, pMax, PLOT_TOP, PLOT_BOTTOM);
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, tp2y);
      ctx.lineTo(PLOT_RIGHT, tp2y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP2: ${trade.tp2.toFixed(prec)}`, PLOT_RIGHT - 2, tp2y - 3);

      const tp3y = mapY(trade.tp3, pMin, pMax, PLOT_TOP, PLOT_BOTTOM);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.beginPath();
      ctx.moveTo(PLOT_LEFT, tp3y);
      ctx.lineTo(PLOT_RIGHT, tp3y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP3: ${trade.tp3.toFixed(prec)}`, PLOT_RIGHT - 2, tp3y - 3);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(draw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [draw]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draw reads all props via propsRef.current; listing them here is intentional to trigger re-renders
  useEffect(() => {
    draw();
  }, [chartType, candles, chartData, openTrades, selectedConfig, isUp, draw]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
