import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Drawing,
  type DrawingPoint,
  type DrawingTool,
  FIB_LEVELS,
} from "../types/drawing";
import type { SMCData, SMCVisibility } from "../types/smc";
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
const TRENDLINE_COLOR = "#3b82f6";
const HLINE_COLOR = "#f59e0b";
const RECT_COLOR = "rgba(34,197,94,0.15)";
const RECT_STROKE = "#22c55e";
const FIB_COLOR = "#f59e0b";
const SELECTED_COLOR = "#facc15";

// SMC colors
const SMC_BUY_FILL = "rgba(34,197,94,0.08)";
const SMC_BUY_BORDER = "rgba(34,197,94,0.35)";
const SMC_BUY_TEXT = "rgba(34,197,94,0.7)";
const SMC_SELL_FILL = "rgba(239,68,68,0.08)";
const SMC_SELL_BORDER = "rgba(239,68,68,0.35)";
const SMC_SELL_TEXT = "rgba(239,68,68,0.7)";
const SMC_OB_BULL_FILL = "rgba(34,197,94,0.13)";
const SMC_OB_BULL_ACCENT = "rgba(34,197,94,0.55)";
const SMC_OB_BEAR_FILL = "rgba(239,68,68,0.13)";
const SMC_OB_BEAR_ACCENT = "rgba(239,68,68,0.55)";
const SMC_FVG_BULL = "rgba(34,197,94,0.18)";
const SMC_FVG_BEAR = "rgba(239,68,68,0.18)";
const SMC_BOS_UP = "rgba(34,197,94,0.9)";
const SMC_BOS_DN = "rgba(239,68,68,0.9)";
const SMC_CHOCH = "rgba(251,146,60,0.9)";

// EMA/VWAP overlay colors
const EMA20_COLOR = "#d4a020"; // amber ~ oklch(0.72 0.18 60)
const EMA50_COLOR = "#5b9bd5"; // blue  ~ oklch(0.72 0.16 240)
const VWAP_COLOR = "#c77dff"; // violet~ oklch(0.82 0.14 300)

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
  candleWidth: number;
  viewOffset: number;
  drawings: Drawing[];
  activeTool: DrawingTool;
  selectedDrawingId: string | null;
  drawingInProgress: Drawing | null;
  smcData?: SMCData;
  smcVisibility?: SMCVisibility;
  onWheel: (e: WheelEvent, mouseXFraction: number) => void;
  onPanDelta: (deltaX: number) => void;
  onDrawingStart: (point: DrawingPoint) => void;
  onDrawingUpdate: (point: DrawingPoint) => void;
  onDrawingComplete: (point: DrawingPoint) => void;
  onDrawingClick: (drawingId: string) => void;
  onDrawingRightClick: (drawingId: string, x: number, y: number) => void;
  showEMA?: boolean;
  showVWAP?: boolean;
  livePrice?: number;
  secondsRemaining?: number;
  selectedTimeframe?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
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

function drawSMCOverlays(
  ctx: CanvasRenderingContext2D,
  smcData: SMCData,
  smcVisibility: SMCVisibility,
  pMin: number,
  pMax: number,
  PL: number,
  PR: number,
  PT: number,
  PB: number,
  visibleStart: number,
  visCount: number,
  cw: number,
  isCandleChart: boolean,
) {
  ctx.save();

  // ── Liquidity Zones ────────────────────────────────────────────────
  if (smcVisibility.liquidityZones) {
    for (const zone of smcData.liquidityZones) {
      const y1 = mapY(zone.priceLow, pMin, pMax, PT, PB);
      const y2 = mapY(zone.priceHigh, pMin, pMax, PT, PB);
      const yTop = Math.min(y1, y2);
      const yBot = Math.max(y1, y2);
      const h = Math.max(2, yBot - yTop);

      if (zone.type === "sell") {
        ctx.fillStyle = SMC_SELL_FILL;
        ctx.fillRect(PL, yTop, PR - PL, h);
        ctx.strokeStyle = SMC_SELL_BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(PL, yTop);
        ctx.lineTo(PR, yTop);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = SMC_SELL_TEXT;
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "right";
        ctx.fillText("Sell Liq", PR - 4, yTop - 2);
      } else {
        ctx.fillStyle = SMC_BUY_FILL;
        ctx.fillRect(PL, yTop, PR - PL, h);
        ctx.strokeStyle = SMC_BUY_BORDER;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(PL, yBot);
        ctx.lineTo(PR, yBot);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = SMC_BUY_TEXT;
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "right";
        ctx.fillText("Buy Liq", PR - 4, yBot + 9);
      }
    }
  }

  // ── Fair Value Gaps ────────────────────────────────────────────────
  if (smcVisibility.fvg) {
    for (const fvg of smcData.fvgZones) {
      const y1 = mapY(fvg.high, pMin, pMax, PT, PB);
      const y2 = mapY(fvg.low, pMin, pMax, PT, PB);
      const yTop = Math.min(y1, y2);
      const h = Math.max(2, Math.abs(y2 - y1));

      ctx.globalAlpha = fvg.filled ? 0.3 : 1;
      ctx.fillStyle = fvg.type === "bull" ? SMC_FVG_BULL : SMC_FVG_BEAR;
      ctx.fillRect(PL, yTop, PR - PL, h);

      if (fvg.filled) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle =
          fvg.type === "bull" ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(PL, yTop, PR - PL, h);
        ctx.setLineDash([]);
        ctx.fillStyle =
          fvg.type === "bull" ? "rgba(34,197,94,0.55)" : "rgba(239,68,68,0.55)";
        ctx.font = "8px JetBrains Mono, monospace";
        ctx.textAlign = "right";
        ctx.fillText("Filled", PR - 4, yTop + 9);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── Order Blocks (only for candle-based charts) ────────────────────
  if (smcVisibility.orderBlocks && isCandleChart) {
    for (const ob of smcData.orderBlocks) {
      const relIdx = ob.index - visibleStart;
      if (relIdx < 0 || relIdx >= visCount) continue;

      const x1 = absIndexToX(ob.index, visibleStart, PL, cw) - cw / 2;
      const rectW = PR - x1;
      const y1 = mapY(ob.high, pMin, pMax, PT, PB);
      const y2 = mapY(ob.low, pMin, pMax, PT, PB);
      const yTop = Math.min(y1, y2);
      const h = Math.max(2, Math.abs(y2 - y1));

      ctx.globalAlpha = ob.mitigated ? 0.4 : 0.9;

      if (ob.type === "bull") {
        ctx.fillStyle = SMC_OB_BULL_FILL;
        ctx.fillRect(x1, yTop, rectW, h);
        ctx.fillStyle = SMC_OB_BULL_ACCENT;
        ctx.fillRect(x1, yTop, 2, h);
        ctx.fillStyle = SMC_OB_BULL_ACCENT;
      } else {
        ctx.fillStyle = SMC_OB_BEAR_FILL;
        ctx.fillRect(x1, yTop, rectW, h);
        ctx.fillStyle = SMC_OB_BEAR_ACCENT;
        ctx.fillRect(x1, yTop, 2, h);
        ctx.fillStyle = SMC_OB_BEAR_ACCENT;
      }

      ctx.font = "8px JetBrains Mono, monospace";
      ctx.textAlign = "left";
      ctx.fillText("OB", x1 + 4, yTop + 9);
      ctx.globalAlpha = 1;
    }
  }

  // ── BOS / CHOCH Markers (only for candle-based charts) ────────────
  if (smcVisibility.bosChoch && isCandleChart) {
    for (const event of smcData.bosChochEvents) {
      const relIdx = event.index - visibleStart;
      if (relIdx < 0 || relIdx >= visCount) continue;

      const x = absIndexToX(event.index, visibleStart, PL, cw);
      const y = mapY(event.price, pMin, pMax, PT, PB);

      ctx.font = "bold 8px JetBrains Mono, monospace";
      ctx.textAlign = "center";

      if (event.type === "BOS") {
        ctx.fillStyle = event.direction === "up" ? SMC_BOS_UP : SMC_BOS_DN;
      } else {
        ctx.fillStyle = SMC_CHOCH;
      }

      const label = `${event.type} ${event.direction === "up" ? "\u2191" : "\u2193"}`;
      const yOff = event.direction === "up" ? y - 6 : y + 14;
      ctx.fillText(label, x, yOff);
    }
  }

  ctx.restore();
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

    const minX = Math.min(x1, x2);
    for (const level of FIB_LEVELS) {
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
  smcData,
  smcVisibility,
  onWheel,
  onPanDelta,
  onDrawingStart,
  onDrawingUpdate,
  onDrawingComplete,
  onDrawingClick,
  onDrawingRightClick,
  showEMA = true,
  showVWAP = true,
  livePrice,
  secondsRemaining,
  selectedTimeframe,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const vpRef = useRef<ViewportInfo | null>(null);
  const [smcTooltip, setSmcTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: string;
    price: string;
    direction: string;
  } | null>(null);
  const smcSetTooltipRef = useRef(setSmcTooltip);
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
    smcData,
    smcVisibility,
    onWheel,
    onPanDelta,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingComplete,
    onDrawingClick,
    onDrawingRightClick,
    showEMA,
    showVWAP,
    livePrice,
    secondsRemaining,
    selectedTimeframe,
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
    smcData,
    smcVisibility,
    onWheel,
    onPanDelta,
    onDrawingStart,
    onDrawingUpdate,
    onDrawingComplete,
    onDrawingClick,
    onDrawingRightClick,
    showEMA,
    showVWAP,
    livePrice,
    secondsRemaining,
    selectedTimeframe,
  };
  smcSetTooltipRef.current = setSmcTooltip;

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

    // EMA / VWAP overlays
    if (p.showEMA || p.showVWAP) {
      // Collect close prices for visible + preceding data to seed EMAs
      const emaSource =
        ct === "candlestick" || ct === "bar"
          ? cls.map((c) => c.close)
          : cd.map((d) => d.price);
      const visEnd2 = Math.max(
        0,
        emaSource.length - propsRef.current.viewOffset,
      );
      const visStart2 = Math.max(0, visEnd2 - visCount);

      function calcEMALine(
        closes: number[],
        period: number,
      ): (number | null)[] {
        if (closes.length < period) return closes.map(() => null);
        const k = 2 / (period + 1);
        let emv = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
        const out: number[] = new Array(period).fill(Number.NaN);
        out[period - 1] = emv;
        for (let i = period; i < closes.length; i++) {
          emv = closes[i] * k + emv * (1 - k);
          out.push(emv);
        }
        return out.map((v) => (Number.isNaN(v) ? null : v));
      }

      if (p.showEMA && (ct === "candlestick" || ct === "bar")) {
        const ema20line = calcEMALine(emaSource, 20);
        const ema50line = calcEMALine(emaSource, 50);

        // EMA20
        ctx.save();
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeStyle = EMA20_COLOR;
        ctx.beginPath();
        let started20 = false;
        for (let i = visStart2; i < visEnd2; i++) {
          const val = ema20line[i];
          if (val === null || val === undefined) {
            started20 = false;
            continue;
          }
          const relI = i - visStart2;
          const x = PL + (relI + 0.5) * cw;
          const y = mapY(val, pMin, pMax, PT, PB);
          if (!started20) {
            ctx.moveTo(x, y);
            started20 = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        // Label
        const lastEma20 = ema20line[visEnd2 - 1];
        if (lastEma20 !== null && lastEma20 !== undefined) {
          ctx.fillStyle = EMA20_COLOR;
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.textAlign = "right";
          ctx.fillText(
            "EMA20",
            PR - 4,
            mapY(lastEma20, pMin, pMax, PT, PB) - 3,
          );
        }

        // EMA50
        ctx.strokeStyle = EMA50_COLOR;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        let started50 = false;
        for (let i = visStart2; i < visEnd2; i++) {
          const val = ema50line[i];
          if (val === null || val === undefined) {
            started50 = false;
            continue;
          }
          const relI = i - visStart2;
          const x = PL + (relI + 0.5) * cw;
          const y = mapY(val, pMin, pMax, PT, PB);
          if (!started50) {
            ctx.moveTo(x, y);
            started50 = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        const lastEma50 = ema50line[visEnd2 - 1];
        if (lastEma50 !== null && lastEma50 !== undefined) {
          ctx.fillStyle = EMA50_COLOR;
          ctx.font = "8px JetBrains Mono, monospace";
          ctx.textAlign = "right";
          ctx.fillText(
            "EMA50",
            PR - 4,
            mapY(lastEma50, pMin, pMax, PT, PB) + 10,
          );
        }
        ctx.restore();
      }

      // VWAP
      if (
        p.showVWAP &&
        (ct === "candlestick" || ct === "bar") &&
        visEnd2 > visStart2
      ) {
        ctx.save();
        let cumPV = 0;
        let cumV = 0;
        ctx.strokeStyle = VWAP_COLOR;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        let vwapStarted = false;
        for (let i = visStart2; i < visEnd2; i++) {
          const c = cls[i];
          if (!c) continue;
          const typPrice = (c.high + c.low + c.close) / 3;
          const vol2 = (c as { volume?: number }).volume ?? 1000;
          cumPV += typPrice * vol2;
          cumV += vol2;
          const vwap = cumV > 0 ? cumPV / cumV : typPrice;
          const relI = i - visStart2;
          const x = PL + (relI + 0.5) * cw;
          const y = mapY(vwap, pMin, pMax, PT, PB);
          if (!vwapStarted) {
            ctx.moveTo(x, y);
            vwapStarted = true;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        if (vwapStarted) {
          const lastC = cls[visEnd2 - 1];
          if (lastC) {
            let cv = 0;
            let cpv = 0;
            for (let i = visStart2; i < visEnd2; i++) {
              const c2 = cls[i];
              if (!c2) continue;
              const tp = (c2.high + c2.low + c2.close) / 3;
              const v2 = (c2 as { volume?: number }).volume ?? 1000;
              cpv += tp * v2;
              cv += v2;
            }
            const finalVwap = cv > 0 ? cpv / cv : lastC.close;
            ctx.fillStyle = VWAP_COLOR;
            ctx.font = "8px JetBrains Mono, monospace";
            ctx.textAlign = "right";
            ctx.fillText(
              "VWAP",
              PR - 4,
              mapY(finalVwap, pMin, pMax, PT, PB) - 3,
            );
          }
        }
        ctx.restore();
      }
    }

    // SMC overlays (after chart, before trade lines)
    if (p.smcData && p.smcVisibility) {
      const isCandleChart = ct === "candlestick" || ct === "bar";
      drawSMCOverlays(
        ctx,
        p.smcData,
        p.smcVisibility,
        pMin,
        pMax,
        PL,
        PR,
        PT,
        PB,
        visibleStart,
        visCount,
        cw,
        isCandleChart,
      );
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

    // Trade lines (open trades)
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

    // User drawings
    for (const d of p.drawings) {
      renderDrawing(ctx, d, vp, d.id === p.selectedDrawingId, false);
    }
    if (p.drawingInProgress) {
      renderDrawing(ctx, p.drawingInProgress, vp, false, true);
    }
    // ── Live Price Line ──────────────────────────────────────────────────
    const liveP = p.livePrice;
    if (liveP !== undefined && liveP > 0 && liveP >= pMin && liveP <= pMax) {
      const ly = mapY(liveP, pMin, pMax, PT, PB);
      const lastCandle =
        visibleCandles.length > 0
          ? visibleCandles[visibleCandles.length - 1]
          : null;
      const prevClose = lastCandle?.close ?? liveP;
      const lineColor = liveP >= prevClose ? "#26a69a" : "#ef5350";

      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(PL, ly);
      ctx.lineTo(PR, ly);
      ctx.stroke();
      ctx.setLineDash([]);

      const prec2 = sc.precision;
      const labelText = liveP.toFixed(prec2);
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      const textW = ctx.measureText(labelText).width;
      const labelPad = 4;
      const boxW = textW + labelPad * 2;
      const boxH = 16;
      const boxX = PR;
      const boxY = ly - boxH / 2;

      ctx.fillStyle = lineColor;
      ctx.fillRect(boxX, boxY, boxW, boxH);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(labelText, boxX + labelPad, ly + 4);
      ctx.restore();
    }

    // ── Candle Countdown Timer ────────────────────────────────────────────
    const secs = p.secondsRemaining;
    const tf = p.selectedTimeframe ?? "1h";
    if (
      secs !== undefined &&
      secs >= 0 &&
      (visibleCandles.length > 0 || visibleData.length > 0)
    ) {
      const shortTFs = ["1m", "3m", "5m", "15m"];
      let timerText: string;
      if (shortTFs.includes(tf)) {
        const mm = Math.floor(secs / 60)
          .toString()
          .padStart(2, "0");
        const ss = (secs % 60).toString().padStart(2, "0");
        timerText = `${mm}:${ss}`;
      } else {
        const hh = Math.floor(secs / 3600)
          .toString()
          .padStart(2, "0");
        const mm2 = Math.floor((secs % 3600) / 60)
          .toString()
          .padStart(2, "0");
        timerText = `${hh}:${mm2}`;
      }

      const lastIdx =
        ct === "candlestick" || ct === "bar"
          ? visibleCandles.length - 1
          : visibleData.length - 1;
      const lastX = PL + (lastIdx + 1) * cw;
      const textY = PB - 4;

      ctx.save();
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillStyle = "#888888";
      ctx.textAlign = "left";
      ctx.fillText(timerText, Math.min(lastX, PR - 40), textY);
      ctx.restore();
    }
  }, []);

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

    function hitTestSMC(x: number, y: number) {
      const vp = vpRef.current;
      const smcData = propsRef.current.smcData;
      const smcVis = propsRef.current.smcVisibility;
      if (!vp || !smcData || !smcVis) return null;
      const {
        pMin,
        pMax,
        plotTop,
        plotBottom,
        plotLeft,
        plotRight,
        visibleStart,
        candleWidth: cw,
      } = vp;
      const inPlot =
        x >= plotLeft && x <= plotRight && y >= plotTop && y <= plotBottom;
      if (!inPlot) return null;

      if (smcVis.orderBlocks) {
        for (const ob of smcData.orderBlocks) {
          const y1 =
            plotBottom -
            ((ob.high - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const y2 =
            plotBottom -
            ((ob.low - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const x1 = plotLeft + (ob.index - visibleStart + 0.5) * cw - cw / 2;
          const yTop = Math.min(y1, y2);
          const yBot = Math.max(y1, y2);
          if (x >= x1 && x <= plotRight && y >= yTop && y <= yBot) {
            return {
              type: "Order Block",
              price: `${ob.low.toFixed(2)}–${ob.high.toFixed(2)}`,
              direction: ob.type === "bull" ? "Bullish" : "Bearish",
            };
          }
        }
      }
      if (smcVis.fvg) {
        for (const fvg of smcData.fvgZones) {
          const y1 =
            plotBottom -
            ((fvg.high - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const y2 =
            plotBottom -
            ((fvg.low - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const yTop = Math.min(y1, y2);
          const yBot = Math.max(y1, y2);
          if (x >= plotLeft && x <= plotRight && y >= yTop && y <= yBot) {
            return {
              type: fvg.filled ? "FVG (Filled)" : "Fair Value Gap",
              price: `${fvg.low.toFixed(2)}–${fvg.high.toFixed(2)}`,
              direction: fvg.type === "bull" ? "Bullish" : "Bearish",
            };
          }
        }
      }
      if (smcVis.liquidityZones) {
        for (const lz of smcData.liquidityZones) {
          const ph = (lz as any).priceHigh ?? (lz as any).high ?? 0;
          const pl = (lz as any).priceLow ?? (lz as any).low ?? 0;
          const y1 =
            plotBottom - ((ph - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const y2 =
            plotBottom - ((pl - pMin) / (pMax - pMin)) * (plotBottom - plotTop);
          const yTop = Math.min(y1, y2) - 4;
          const yBot = Math.max(y1, y2) + 4;
          if (x >= plotLeft && x <= plotRight && y >= yTop && y <= yBot) {
            return {
              type: "Liquidity Zone",
              price: ph.toFixed(2),
              direction: lz.type === "sell" ? "Sell-Side" : "Buy-Side",
            };
          }
        }
      }
      return null;
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
        const vp = vpRef.current;
        if (vp && propsRef.current.activeTool === "cursor") {
          const hit = propsRef.current.drawings.some((d) =>
            hitTestDrawing(d, x, y, vp),
          );
          canvas!.style.cursor = hit ? "pointer" : "default";
        } else if (propsRef.current.activeTool !== "cursor") {
          canvas!.style.cursor = "crosshair";
        }
        // SMC hover tooltip
        const rect2 = canvas!.getBoundingClientRect();
        const smcHit = hitTestSMC(
          e.clientX - rect2.left,
          e.clientY - rect2.top,
        );
        if (smcHit) {
          smcSetTooltipRef.current({
            visible: true,
            x: e.clientX - rect2.left + 12,
            y: e.clientY - rect2.top - 10,
            ...smcHit,
          });
        } else {
          smcSetTooltipRef.current(null);
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
      const drawings = propsRef.current.drawings;
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (hitTestDrawing(drawings[i], x, y, vp)) {
          propsRef.current.onDrawingClick(drawings[i].id);
          return;
        }
      }
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

    function handleMouseLeave() {
      smcSetTooltipRef.current(null);
    }
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("contextmenu", handleContextMenu);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("contextmenu", handleContextMenu);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
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
    smcData,
    smcVisibility,
    showEMA,
    showVWAP,
    livePrice,
    secondsRemaining,
    selectedTimeframe,
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
      {smcTooltip && (
        <div
          style={{
            position: "absolute",
            left: smcTooltip.x,
            top: smcTooltip.y,
            pointerEvents: "none",
            zIndex: 20,
          }}
          className="bg-card/95 border border-border rounded shadow-lg px-2 py-1.5 text-xs backdrop-blur-sm"
        >
          <div className="font-semibold text-foreground">{smcTooltip.type}</div>
          <div className="text-muted-foreground font-mono">
            {smcTooltip.price}
          </div>
          <div
            className={
              smcTooltip.direction.includes("Bull") ||
              smcTooltip.direction.includes("Buy")
                ? "text-buy"
                : "text-sell"
            }
          >
            {smcTooltip.direction}
          </div>
        </div>
      )}
    </div>
  );
}
