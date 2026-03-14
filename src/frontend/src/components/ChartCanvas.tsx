import { useCallback, useEffect, useRef } from "react";
import {
  type Drawing,
  type DrawingPoint,
  type DrawingTool,
  FIB_LEVELS,
} from "../types/drawing";
import type { TradeRecord } from "../types/trade";
import type { CandleData, SymbolConfig } from "../utils/priceSimulator";

export type ChartType = "candlestick" | "line" | "area" | "bar";

const CANDLE_UP = "#26a69a";
const CANDLE_DOWN = "#ef5350";
const LABEL_COLOR = "#7b8fa1";
const GRID_COLOR = "rgba(255,255,255,0.04)";

const PLOT_LEFT = 72;
const PLOT_TOP = 10;

// Drawing colors (literal for canvas)
const TRENDLINE_COLOR = "#3b82f6"; // blue
const HLINE_COLOR = "#f59e0b"; // amber
const RECT_COLOR = "rgba(34,197,94,0.15)"; // green fill
const RECT_STROKE = "#22c55e";
const FIB_COLOR = "#f59e0b";
const SELECTED_COLOR = "#facc15";

interface ViewportInfo {
  pMin: number;
  pMax: number;
  plotTop: number;
  plotBottom: number;
  plotLeft: number;
  plotRight: number;
  visibleStart: number;
  candleWidth: number;
  W: number;
  H: number;
}

interface ChartCanvasProps {
  chartType: ChartType;
  candles: CandleData[];
  chartData: { time: string; price: number }[];
  openTrades: TradeRecord[];
  selectedConfig: SymbolConfig;
  isUp: boolean;
  // Viewport
  candleWidth: number;
  viewOffset: number;
  // Drawing
  drawings: Drawing[];
  activeTool: DrawingTool;
  selectedDrawingId: string | null;
  drawingInProgress: Drawing | null;
  onWheel: (e: WheelEvent, mouseXFraction: number) => void;
  onPanDelta: (deltaX: number) => void;
  onDrawingStart: (point: DrawingPoint) => void;
  onDrawingUpdate: (point: DrawingPoint) => void;
  onDrawingComplete: (point: DrawingPoint) => void;
  onDrawingClick: (drawingId: string) => void;
  onDrawingRightClick: (drawingId: string, x: number, y: number) => void;
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

function absIndexToX(
  absIdx: number,
  visibleStart: number,
  plotLeft: number,
  cw: number,
): number {
  const relIdx = absIdx - visibleStart;
  return plotLeft + (relIdx + 0.5) * cw;
}

function drawCandlestick(
  ctx: CanvasRenderingContext2D,
  candles: CandleData[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotTop: number,
  plotBottom: number,
  candleWidth: number,
) {
  const total = candles.length;
  if (total === 0) return;
  const bodyW = Math.max(1, candleWidth * 0.65);

  for (let i = 0; i < total; i++) {
    const c = candles[i];
    const cx = plotLeft + (i + 0.5) * candleWidth;
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
      ctx.fillStyle = `${color}99`;
      ctx.fillRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
      ctx.strokeRect(cx - bodyW / 2, bodyTop, bodyW, bodyH);
    }
  }
}

function drawBar(
  ctx: CanvasRenderingContext2D,
  candles: CandleData[],
  pMin: number,
  pMax: number,
  plotLeft: number,
  plotTop: number,
  plotBottom: number,
  candleWidth: number,
) {
  const total = candles.length;
  if (total === 0) return;
  const tickLen = Math.max(2, candleWidth * 0.3);

  for (let i = 0; i < total; i++) {
    const c = candles[i];
    const cx = plotLeft + (i + 0.5) * candleWidth;
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
  const total = data.length;
  for (let i = 0; i < total; i++) {
    const x = plotLeft + (i / (total - 1)) * (plotRight - plotLeft);
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

  const total = data.length;
  ctx.beginPath();
  for (let i = 0; i < total; i++) {
    const x = plotLeft + (i / (total - 1)) * (plotRight - plotLeft);
    const y = mapY(data[i].price, pMin, pMax, plotTop, plotBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const lastX = plotLeft + ((total - 1) / (total - 1)) * (plotRight - plotLeft);
  ctx.lineTo(lastX, plotBottom);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = isUp ? CANDLE_UP : CANDLE_DOWN;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i < total; i++) {
    const x = plotLeft + (i / (total - 1)) * (plotRight - plotLeft);
    const y = mapY(data[i].price, pMin, pMax, plotTop, plotBottom);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function renderDrawing(
  ctx: CanvasRenderingContext2D,
  drawing: Drawing,
  vp: ViewportInfo,
  isSelected: boolean,
  isPreview: boolean,
) {
  const {
    pMin,
    pMax,
    plotTop,
    plotBottom,
    plotLeft,
    plotRight,
    visibleStart,
    candleWidth,
  } = vp;
  const alpha = isPreview ? 0.7 : 1;
  ctx.globalAlpha = alpha;

  if (drawing.type === "hline") {
    const y = mapY(drawing.price, pMin, pMax, plotTop, plotBottom);
    const color = isSelected ? SELECTED_COLOR : HLINE_COLOR;
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 1.5 : 1;
    ctx.setLineDash(isSelected ? [6, 3] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    ctx.fillText(drawing.price.toFixed(2), plotRight - 2, y - 3);
  } else if (drawing.type === "trendline") {
    const x1 = absIndexToX(
      drawing.start.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y1 = mapY(drawing.start.price, pMin, pMax, plotTop, plotBottom);
    const x2 = absIndexToX(
      drawing.end.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y2 = mapY(drawing.end.price, pMin, pMax, plotTop, plotBottom);
    const color = isSelected ? SELECTED_COLOR : TRENDLINE_COLOR;
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Endpoint dots
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x1, y1, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x2, y2, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (drawing.type === "rectangle") {
    const x1 = absIndexToX(
      drawing.start.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y1 = mapY(drawing.start.price, pMin, pMax, plotTop, plotBottom);
    const x2 = absIndexToX(
      drawing.end.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y2 = mapY(drawing.end.price, pMin, pMax, plotTop, plotBottom);
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);
    const strokeColor = isSelected ? SELECTED_COLOR : RECT_STROKE;
    ctx.fillStyle = isSelected ? "rgba(250,204,21,0.08)" : RECT_COLOR;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.setLineDash(isSelected ? [6, 3] : []);
    ctx.strokeRect(rx, ry, rw, rh);
    ctx.setLineDash([]);
  } else if (drawing.type === "fibonacci") {
    const x1 = absIndexToX(
      drawing.start.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const x2 = absIndexToX(
      drawing.end.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const highPrice = Math.max(drawing.start.price, drawing.end.price);
    const lowPrice = Math.min(drawing.start.price, drawing.end.price);
    const priceRange = highPrice - lowPrice;
    const color = isSelected ? SELECTED_COLOR : FIB_COLOR;

    // Main line
    const y1 = mapY(drawing.start.price, pMin, pMax, plotTop, plotBottom);
    const y2 = mapY(drawing.end.price, pMin, pMax, plotTop, plotBottom);
    ctx.strokeStyle = `${color}60`;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Level lines
    const minX = Math.min(x1, x2);
    for (const level of FIB_LEVELS) {
      // From high going down to low
      const levelPrice = highPrice - level * priceRange;
      const ly = mapY(levelPrice, pMin, pMax, plotTop, plotBottom);
      const alpha2 = level === 0 || level === 1 ? 0.8 : 0.5;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha * alpha2;
      ctx.lineWidth = level === 0.618 ? 1.5 : 1;
      ctx.setLineDash(level === 0 || level === 1 ? [] : [4, 4]);
      ctx.beginPath();
      ctx.moveTo(minX, ly);
      ctx.lineTo(plotRight, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "right";
      ctx.fillText(
        `${(level * 100).toFixed(1)}%  ${levelPrice.toFixed(2)}`,
        plotRight - 2,
        ly - 3,
      );
    }
  }

  ctx.globalAlpha = 1;
}

function hitTestDrawing(
  drawing: Drawing,
  mouseX: number,
  mouseY: number,
  vp: ViewportInfo,
): boolean {
  const {
    pMin,
    pMax,
    plotTop,
    plotBottom,
    plotLeft,
    plotRight,
    visibleStart,
    candleWidth,
  } = vp;
  const THRESHOLD = 7;

  if (drawing.type === "hline") {
    const y = mapY(drawing.price, pMin, pMax, plotTop, plotBottom);
    return (
      Math.abs(mouseY - y) < THRESHOLD &&
      mouseX >= plotLeft &&
      mouseX <= plotRight
    );
  }

  if (drawing.type === "trendline") {
    const x1 = absIndexToX(
      drawing.start.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y1 = mapY(drawing.start.price, pMin, pMax, plotTop, plotBottom);
    const x2 = absIndexToX(
      drawing.end.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y2 = mapY(drawing.end.price, pMin, pMax, plotTop, plotBottom);
    // Distance from point to line segment
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(mouseX - x1, mouseY - y1) < THRESHOLD;
    let t = ((mouseX - x1) * dx + (mouseY - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const nx = x1 + t * dx;
    const ny = y1 + t * dy;
    return Math.hypot(mouseX - nx, mouseY - ny) < THRESHOLD;
  }

  if (drawing.type === "rectangle") {
    const x1 = absIndexToX(
      drawing.start.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y1 = mapY(drawing.start.price, pMin, pMax, plotTop, plotBottom);
    const x2 = absIndexToX(
      drawing.end.candleIndex,
      visibleStart,
      plotLeft,
      candleWidth,
    );
    const y2 = mapY(drawing.end.price, pMin, pMax, plotTop, plotBottom);
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);
    // Check near border
    const nearLeft =
      Math.abs(mouseX - rx) < THRESHOLD &&
      mouseY >= ry - THRESHOLD &&
      mouseY <= ry + rh + THRESHOLD;
    const nearRight =
      Math.abs(mouseX - (rx + rw)) < THRESHOLD &&
      mouseY >= ry - THRESHOLD &&
      mouseY <= ry + rh + THRESHOLD;
    const nearTop =
      Math.abs(mouseY - ry) < THRESHOLD &&
      mouseX >= rx - THRESHOLD &&
      mouseX <= rx + rw + THRESHOLD;
    const nearBottom =
      Math.abs(mouseY - (ry + rh)) < THRESHOLD &&
      mouseX >= rx - THRESHOLD &&
      mouseX <= rx + rw + THRESHOLD;
    return nearLeft || nearRight || nearTop || nearBottom;
  }

  if (drawing.type === "fibonacci") {
    const highPrice = Math.max(drawing.start.price, drawing.end.price);
    const lowPrice = Math.min(drawing.start.price, drawing.end.price);
    const priceRange = highPrice - lowPrice;
    for (const level of FIB_LEVELS) {
      const levelPrice = highPrice - level * priceRange;
      const ly = mapY(levelPrice, pMin, pMax, plotTop, plotBottom);
      if (
        Math.abs(mouseY - ly) < THRESHOLD &&
        mouseX >= plotLeft &&
        mouseX <= plotRight
      ) {
        return true;
      }
    }
    return false;
  }

  return false;
}

export function ChartCanvas({
  chartType,
  candles,
  chartData,
  openTrades,
  selectedConfig,
  isUp,
  candleWidth,
  viewOffset,
  drawings,
  activeTool,
  selectedDrawingId,
  drawingInProgress,
  onWheel,
  onPanDelta,
  onDrawingStart,
  onDrawingUpdate,
  onDrawingComplete,
  onDrawingClick,
  onDrawingRightClick,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport info ref for event handlers
  const vpRef = useRef<ViewportInfo | null>(null);

  // Drag state
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    lastX: 0,
    isDrawing: false,
  });

  const propsRef = useRef({
    chartType,
    candles,
    chartData,
    openTrades,
    selectedConfig,
    isUp,
    candleWidth,
    viewOffset,
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    onWheel,
    onPanDelta,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingComplete,
    onDrawingClick,
    onDrawingRightClick,
  });
  propsRef.current = {
    chartType,
    candles,
    chartData,
    openTrades,
    selectedConfig,
    isUp,
    candleWidth,
    viewOffset,
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    onWheel,
    onPanDelta,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingComplete,
    onDrawingClick,
    onDrawingRightClick,
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const p = propsRef.current;
    const {
      chartType: ct,
      candles: cls,
      chartData: cd,
      openTrades: ot,
      selectedConfig: sc,
      isUp: up,
    } = p;

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

    const PL = PLOT_LEFT;
    const PR = W - 8;
    const PT = PLOT_TOP;
    const PB = H - 22;
    const plotWidth = PR - PL;
    const prec = sc.precision;

    // Viewport calculation
    const cw = p.candleWidth;
    const visCount = Math.max(1, Math.floor(plotWidth / cw));

    let pMin: number;
    let pMax: number;
    let visibleCandles: CandleData[];
    let visibleData: { time: string; price: number }[];
    let visibleStart: number;

    if (ct === "candlestick" || ct === "bar") {
      if (cls.length === 0) return;
      const total = cls.length;
      const visEnd = Math.max(0, total - p.viewOffset);
      visibleStart = Math.max(0, visEnd - visCount);
      visibleCandles = cls.slice(visibleStart, visEnd);
      visibleData = [];
      pMin = Math.min(...visibleCandles.map((c) => c.low));
      pMax = Math.max(...visibleCandles.map((c) => c.high));
    } else {
      if (cd.length === 0) return;
      const total = cd.length;
      const visEnd = Math.max(0, total - p.viewOffset);
      visibleStart = Math.max(0, visEnd - visCount);
      visibleData = cd.slice(visibleStart, visEnd);
      visibleCandles = [];
      pMin = Math.min(...visibleData.map((d) => d.price));
      pMax = Math.max(...visibleData.map((d) => d.price));
    }

    const pad = (pMax - pMin) * 0.08;
    pMin -= pad;
    pMax += pad;

    // Store viewport for event handlers
    const vp: ViewportInfo = {
      pMin,
      pMax,
      plotTop: PT,
      plotBottom: PB,
      plotLeft: PL,
      plotRight: PR,
      visibleStart,
      candleWidth: cw,
      W,
      H,
    };
    vpRef.current = vp;

    // Grid
    const numGridLines = 5;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= numGridLines; i++) {
      const y = PT + (i / numGridLines) * (PB - PT);
      ctx.beginPath();
      ctx.moveTo(PL, y);
      ctx.lineTo(PR, y);
      ctx.stroke();
    }

    // Y-axis labels
    ctx.fillStyle = LABEL_COLOR;
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= numGridLines; i++) {
      const price = pMax - (i / numGridLines) * (pMax - pMin);
      const y = PT + (i / numGridLines) * (PB - PT);
      ctx.fillText(price.toFixed(prec), PL - 4, y + 3);
    }

    // Chart
    if (ct === "candlestick") {
      drawCandlestick(ctx, visibleCandles, pMin, pMax, PL, PT, PB, cw);
    } else if (ct === "bar") {
      drawBar(ctx, visibleCandles, pMin, pMax, PL, PT, PB, cw);
    } else if (ct === "line") {
      drawLine(ctx, visibleData, pMin, pMax, PL, PR, PT, PB, up);
    } else if (ct === "area") {
      drawArea(ctx, visibleData, pMin, pMax, PL, PR, PT, PB, up);
    }

    // X-axis time labels
    const timeData =
      ct === "candlestick" || ct === "bar" ? visibleCandles : visibleData;
    if (timeData.length > 1) {
      ctx.fillStyle = LABEL_COLOR;
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      const step = Math.max(1, Math.floor(timeData.length / 6));
      for (let i = 0; i < timeData.length; i += step) {
        const x = PL + (i + 0.5) * cw;
        ctx.fillText(timeData[i].time, x, H - 6);
      }
    }

    // Trade lines (from openTrades)
    for (const trade of ot) {
      const tradeColor = trade.side === "buy" ? CANDLE_UP : CANDLE_DOWN;
      ctx.font = "9px JetBrains Mono, monospace";
      ctx.textAlign = "right";

      ctx.setLineDash([6, 3]);
      ctx.strokeStyle = tradeColor;
      ctx.lineWidth = 1;
      const ey = mapY(trade.entryPrice, pMin, pMax, PT, PB);
      ctx.beginPath();
      ctx.moveTo(PL, ey);
      ctx.lineTo(PR, ey);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = tradeColor;
      ctx.fillText(`Entry: ${trade.entryPrice.toFixed(prec)}`, PR - 2, ey - 3);

      ctx.setLineDash([]);
      ctx.strokeStyle = CANDLE_DOWN;
      ctx.lineWidth = 1.5;
      const sly = mapY(trade.sl, pMin, pMax, PT, PB);
      ctx.beginPath();
      ctx.moveTo(PL, sly);
      ctx.lineTo(PR, sly);
      ctx.stroke();
      ctx.fillStyle = CANDLE_DOWN;
      ctx.fillText(`SL: ${trade.sl.toFixed(prec)}`, PR - 2, sly - 3);

      const tp1y = mapY(trade.tp1, pMin, pMax, PT, PB);
      ctx.setLineDash([]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PL, tp1y);
      ctx.lineTo(PR, tp1y);
      ctx.stroke();
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP1: ${trade.tp1.toFixed(prec)}`, PR - 2, tp1y - 3);

      const tp2y = mapY(trade.tp2, pMin, pMax, PT, PB);
      ctx.setLineDash([4, 2]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.beginPath();
      ctx.moveTo(PL, tp2y);
      ctx.lineTo(PR, tp2y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP2: ${trade.tp2.toFixed(prec)}`, PR - 2, tp2y - 3);

      const tp3y = mapY(trade.tp3, pMin, pMax, PT, PB);
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = CANDLE_UP;
      ctx.beginPath();
      ctx.moveTo(PL, tp3y);
      ctx.lineTo(PR, tp3y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = CANDLE_UP;
      ctx.fillText(`TP3: ${trade.tp3.toFixed(prec)}`, PR - 2, tp3y - 3);
    }

    // Drawings
    for (const d of p.drawings) {
      renderDrawing(ctx, d, vp, d.id === p.selectedDrawingId, false);
    }
    if (p.drawingInProgress) {
      renderDrawing(ctx, p.drawingInProgress, vp, false, true);
    }
  }, []);

  // Event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function getCanvasPoint(e: MouseEvent): { x: number; y: number } {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function mouseToDrawingPoint(x: number, y: number): DrawingPoint | null {
      const vp = vpRef.current;
      if (!vp) return null;
      const {
        pMin,
        pMax,
        plotTop,
        plotBottom,
        plotLeft,
        visibleStart,
        candleWidth: cw,
      } = vp;
      const relIdx = Math.floor((x - plotLeft) / cw);
      const absIdx = visibleStart + Math.max(0, relIdx);
      const price =
        pMax - ((y - plotTop) / (plotBottom - plotTop)) * (pMax - pMin);
      return { candleIndex: absIdx, price };
    }

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const vp = vpRef.current;
      if (!vp) return;
      const { x } = getCanvasPoint(e);
      const plotWidth = vp.plotRight - vp.plotLeft;
      const frac = Math.max(0, Math.min(1, (x - vp.plotLeft) / plotWidth));
      propsRef.current.onWheel(e, frac);
    }

    function handleMouseDown(e: MouseEvent) {
      const { activeTool: tool } = propsRef.current;
      const { x, y } = getCanvasPoint(e);
      if (tool === "cursor") {
        dragRef.current.isDragging = true;
        dragRef.current.startX = x;
        dragRef.current.lastX = x;
        dragRef.current.isDrawing = false;
        canvas!.style.cursor = "grabbing";
      } else {
        const point = mouseToDrawingPoint(x, y);
        if (point) {
          dragRef.current.isDrawing = true;
          dragRef.current.isDragging = false;
          propsRef.current.onDrawingStart(point);
        }
      }
    }

    function handleMouseMove(e: MouseEvent) {
      const { x, y } = getCanvasPoint(e);
      if (dragRef.current.isDragging && !dragRef.current.isDrawing) {
        const delta = x - dragRef.current.lastX;
        dragRef.current.lastX = x;
        propsRef.current.onPanDelta(delta);
      } else if (dragRef.current.isDrawing) {
        const point = mouseToDrawingPoint(x, y);
        if (point) propsRef.current.onDrawingUpdate(point);
      } else {
        // Update cursor
        const vp = vpRef.current;
        if (vp && propsRef.current.activeTool === "cursor") {
          const hit = propsRef.current.drawings.some((d) =>
            hitTestDrawing(d, x, y, vp),
          );
          canvas!.style.cursor = hit ? "pointer" : "default";
        } else if (propsRef.current.activeTool !== "cursor") {
          canvas!.style.cursor = "crosshair";
        }
      }
    }

    function handleMouseUp(e: MouseEvent) {
      if (dragRef.current.isDrawing) {
        const { x, y } = getCanvasPoint(e);
        const point = mouseToDrawingPoint(x, y);
        if (point) propsRef.current.onDrawingComplete(point);
        dragRef.current.isDrawing = false;
      }
      if (dragRef.current.isDragging) {
        dragRef.current.isDragging = false;
        canvas!.style.cursor = "default";
      }
    }

    function handleClick(e: MouseEvent) {
      if (propsRef.current.activeTool !== "cursor") return;
      const { x, y } = getCanvasPoint(e);
      const vp = vpRef.current;
      if (!vp) return;
      // Hit-test drawings
      const drawings = propsRef.current.drawings;
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], x, y, vp)) {
          propsRef.current.onDrawingClick(drawings[i].id);
          return;
        }
      }
      // No hit - deselect
      propsRef.current.onDrawingClick("");
    }

    function handleContextMenu(e: MouseEvent) {
      const { x, y } = getCanvasPoint(e);
      const vp = vpRef.current;
      if (!vp) return;
      const drawings = propsRef.current.drawings;
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], x, y, vp)) {
          e.preventDefault();
          propsRef.current.onDrawingRightClick(
            drawings[i].id,
            e.clientX,
            e.clientY,
          );
          return;
        }
      }
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", handleContextMenu);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(draw);
    obs.observe(container);
    return () => obs.disconnect();
  }, [draw]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: draw reads all props via propsRef.current
  useEffect(() => {
    draw();
  }, [
    chartType,
    candles,
    chartData,
    openTrades,
    selectedConfig,
    isUp,
    candleWidth,
    viewOffset,
    drawings,
    activeTool,
    selectedDrawingId,
    drawingInProgress,
    draw,
  ]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        data-ocid="chart.canvas_target"
        style={{
          display: "block",
          cursor: activeTool === "cursor" ? "default" : "crosshair",
        }}
      />
    </div>
  );
}
