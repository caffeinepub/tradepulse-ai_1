// Unified Signal Engine — single source of truth for both SignalsPanel and IntraSignalPanel
// Uses real candle data from Twelve Data REST API via fetchCandles()

import { fetchCandles, fetchLivePrice } from "./twelveDataService";
import type { Candle } from "./twelveDataService";

const TF_LABELS: Record<string, string> = {
  "1m": "1M",
  "3m": "3M",
  "5m": "5M",
  "15m": "15M",
  "30m": "30M",
  "1h": "1H",
  "4h": "4H",
  "1d": "1D",
  "1W": "1W",
  "1M": "1MO",
};

// Timeframe → Twelve Data interval mapping (only 5min and 15min are real-candle supported)
const TF_TO_INTERVAL: Record<string, "5min" | "15min" | null> = {
  "5m": "5min",
  "15m": "15min",
};

// Supported pairs for real candle data
export const SUPPORTED_PAIRS = ["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD"];

export function normalizeTimeframeLabel(tf: string): string {
  return TF_LABELS[tf] ?? tf.toUpperCase();
}

export type SignalType = "BUY" | "SELL" | "STRONG BUY" | "STRONG SELL" | "HOLD";

export interface UnifiedSignal {
  signal: SignalType;
  timeframe: string;
  signalTime: string;
  signalTimeDisplay: string;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number; // TP1
  tp1: number;
  tp2: number;
  confidence: number;
  confidenceLabel: "High" | "Medium" | "Low";
  tradeType: "Intraday" | "Swing";
  expectedDuration: string;
  lotSize: number;
  reason: string;
  holdReason?: string;
  id: string;
  conditionsMet: number; // how many of the 4 conditions were true
  // Legacy compat fields
  trend: "Bullish" | "Bearish" | "Neutral";
  timestamp: Date;
  riskReward: number;
  confirmationReason?: string;
}

// ── Indicator helpers ────────────────────────────────────────────────────────

function calcEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcVWAP(candles: Candle[]): number {
  // VWAP = sum(typical_price * volume) / sum(volume)
  let sumPV = 0;
  let sumV = 0;
  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = c.volume > 0 ? c.volume : 1;
    sumPV += typicalPrice * vol;
    sumV += vol;
  }
  return sumV > 0 ? sumPV / sumV : (candles[candles.length - 1]?.close ?? 0);
}

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose),
    );
    trs.push(tr);
  }
  const recent = trs.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

function estimateDuration(
  atr: number,
  price: number,
  volRatio: number,
  isSwing: boolean,
): string {
  const atrPct = price > 0 ? atr / price : 0;
  if (isSwing) {
    return atrPct > 0.005 || volRatio > 1.5 ? "~4-6h" : "~6-12h";
  }
  if (atrPct > 0.003 && volRatio > 1.3) return "~30-50 min";
  if (atrPct > 0.0015 || volRatio > 1.2) return "~60-90 min";
  return "~90-120 min";
}

let _idCounter = 0;
function makeId() {
  _idCounter += 1;
  return `usig-${Date.now()}-${_idCounter}`;
}

// ── Core signal computation from real candles ────────────────────────────────

function computeFromCandles(
  candles: Candle[],
  livePrice: number,
  timeframe: string,
  positionSize: number,
): UnifiedSignal {
  const now = new Date();
  const signalTime = now.toISOString();
  const hh = now.getUTCHours().toString().padStart(2, "0");
  const mm = now.getUTCMinutes().toString().padStart(2, "0");
  const signalTimeDisplay = `${hh}:${mm} UTC`;
  const tfLabel = normalizeTimeframeLabel(timeframe);

  const holdBase = (holdReason: string): UnifiedSignal => ({
    signal: "HOLD",
    timeframe: tfLabel,
    signalTime,
    signalTimeDisplay,
    entryPrice: livePrice,
    stopLoss: 0,
    targetPrice: 0,
    tp1: 0,
    tp2: 0,
    confidence: 0,
    confidenceLabel: "Low",
    tradeType: "Intraday",
    expectedDuration: "—",
    lotSize: positionSize,
    reason: holdReason,
    holdReason,
    id: makeId(),
    conditionsMet: 0,
    trend: "Neutral",
    timestamp: now,
    riskReward: 0,
    confirmationReason: holdReason,
  });

  if (candles.length < 20) return holdBase("Insufficient candle history");

  const closes = candles.map((c) => c.close);
  const price = livePrice > 0 ? livePrice : closes[closes.length - 1];

  // ── Indicators ──
  const ema20arr = calcEMA(closes, 20);
  const ema50arr = calcEMA(closes, Math.min(50, closes.length));
  const vwap = calcVWAP(candles);
  const rsi = calcRSI(closes, 14);
  const atr = calcATR(candles, 14);

  const lastEma20 = ema20arr[ema20arr.length - 1];
  const lastEma50 = ema50arr[ema50arr.length - 1];

  // Volume: last candle vs 3-candle average
  const lastCandle = candles[candles.length - 1];
  const prev3 = candles.slice(-4, -1);
  const avg3Vol =
    prev3.length > 0
      ? prev3.reduce((s, c) => s + (c.volume > 0 ? c.volume : 1), 0) /
        prev3.length
      : 1;
  const lastVol = lastCandle.volume > 0 ? lastCandle.volume : 1;
  const volAboveAvg = lastVol > avg3Vol;
  const volRatio = avg3Vol > 0 ? lastVol / avg3Vol : 1;

  // ── 4 BUY conditions ──
  const buyC1 = lastEma20 > lastEma50; // EMA20 > EMA50
  const buyC2 = price > vwap; // Price > VWAP
  const buyC3 = rsi >= 45 && rsi <= 72; // RSI 45–72
  const buyC4 = volAboveAvg; // Volume > 3-candle avg
  const buyCount = [buyC1, buyC2, buyC3, buyC4].filter(Boolean).length;

  // ── 4 SELL conditions ──
  const sellC1 = lastEma20 < lastEma50; // EMA20 < EMA50
  const sellC2 = price < vwap; // Price < VWAP
  const sellC3 = rsi >= 28 && rsi <= 48; // RSI 28–48
  const sellC4 = volAboveAvg; // Volume > 3-candle avg
  const sellCount = [sellC1, sellC2, sellC3, sellC4].filter(Boolean).length;

  // ── Signal decision ──
  // STRONG BUY/SELL = all 4 true, BUY/SELL = any 3 out of 4
  const isStrongBuy = buyCount === 4;
  const isBuy = buyCount >= 3;
  const isStrongSell = sellCount === 4;
  const isSell = sellCount >= 3;

  // Prefer buy direction if tied (unlikely but possible)
  const hasBuySignal = isBuy && !isSell;
  const hasSellSignal = isSell && !isBuy;
  const hasBothSignals = isBuy && isSell; // resolve by EMA direction

  let dir: "BUY" | "SELL" | null = null;
  let conditionsMet = 0;

  if (hasBothSignals) {
    // Use EMA trend as tiebreaker
    dir = buyC1 ? "BUY" : "SELL";
    conditionsMet = dir === "BUY" ? buyCount : sellCount;
  } else if (hasBuySignal) {
    dir = "BUY";
    conditionsMet = buyCount;
  } else if (hasSellSignal) {
    dir = "SELL";
    conditionsMet = sellCount;
  }

  if (!dir) {
    // Build HOLD reason
    let holdReason = "Conditions not met (need 3 of 4)";
    const emaGapPct = price > 0 ? Math.abs(lastEma20 - lastEma50) / price : 0;
    if (emaGapPct < 0.0005) {
      holdReason = "EMA alignment too weak";
    } else if (!buyC3 && !sellC3) {
      holdReason = "RSI not in valid range";
    } else if (!buyC4 && !sellC4) {
      holdReason = "Volume confirmation missing";
    } else if (Math.abs(price - vwap) / price < 0.001) {
      holdReason = "Price near VWAP with no momentum";
    } else {
      holdReason = "Trend unclear";
    }
    return holdBase(holdReason);
  }

  // ── Risk management ──
  const slDist = 1.5 * atr; // Stop Loss = 1.5 × ATR(14)
  const stopLoss = dir === "BUY" ? price - slDist : price + slDist;
  const tp1 = dir === "BUY" ? price + slDist * 2 : price - slDist * 2; // 1:2 RR
  const tp2 = dir === "BUY" ? price + slDist * 3 : price - slDist * 3; // 1:3 RR

  // ── Confidence ──
  let confidence = 55 + conditionsMet * 8;
  if (conditionsMet === 4) confidence = Math.max(confidence, 88);
  if (dir === "BUY" && rsi >= 55 && rsi <= 68) confidence += 5;
  if (dir === "SELL" && rsi >= 32 && rsi <= 42) confidence += 5;
  if (volRatio > 1.5) confidence += 5;
  confidence = Math.min(confidence, 97);

  const confidenceLabel: "High" | "Medium" | "Low" =
    confidence >= 85 ? "High" : confidence >= 70 ? "Medium" : "Low";

  const isSwing = ["1h", "4h", "1d", "1W", "1M"].includes(timeframe);
  const tradeType: "Intraday" | "Swing" = isSwing ? "Swing" : "Intraday";
  const expectedDuration = estimateDuration(atr, price, volRatio, isSwing);

  const rawLot = slDist > 0 ? 5 / slDist : positionSize;
  const lotSize = Math.min(
    Math.max(Number.parseFloat(rawLot.toFixed(2)), 0.01),
    0.05,
  );

  const riskReward = slDist > 0 ? Math.abs(tp1 - price) / slDist : 2;

  const signal: SignalType =
    dir === "BUY"
      ? isStrongBuy
        ? "STRONG BUY"
        : "BUY"
      : isStrongSell
        ? "STRONG SELL"
        : "SELL";

  const condLabel =
    conditionsMet === 4 ? "all 4 conditions" : `${conditionsMet}/4 conditions`;
  const reason =
    dir === "BUY"
      ? `${signal}: EMA20${buyC1 ? ">" : "≤"}EMA50, price${buyC2 ? ">" : "≤"}VWAP, RSI ${rsi.toFixed(1)}${buyC3 ? " ✓" : " ✗"}, vol${buyC4 ? " ✓" : " ✗"} — ${condLabel} met`
      : `${signal}: EMA20${sellC1 ? "<" : "≥"}EMA50, price${sellC2 ? "<" : "≥"}VWAP, RSI ${rsi.toFixed(1)}${sellC3 ? " ✓" : " ✗"}, vol${sellC4 ? " ✓" : " ✗"} — ${condLabel} met`;

  const decimals = price > 100 ? 2 : 5;
  const fmt = (n: number) => Number.parseFloat(n.toFixed(decimals));

  return {
    signal,
    timeframe: tfLabel,
    signalTime,
    signalTimeDisplay,
    entryPrice: fmt(price),
    stopLoss: fmt(stopLoss),
    targetPrice: fmt(tp1),
    tp1: fmt(tp1),
    tp2: fmt(tp2),
    confidence,
    confidenceLabel,
    tradeType,
    expectedDuration,
    lotSize,
    reason,
    id: makeId(),
    conditionsMet,
    trend: dir === "BUY" ? "Bullish" : "Bearish",
    timestamp: now,
    riskReward: Number.parseFloat(riskReward.toFixed(2)),
    confirmationReason: reason,
  };
}

// ── Async API: fetch real candles then compute signal ────────────────────────

export async function computeUnifiedSignal(
  pair: string,
  timeframe: string,
  positionSize = 0.01,
): Promise<UnifiedSignal> {
  const now = new Date();
  const tfLabel = normalizeTimeframeLabel(timeframe);

  const holdBase = (holdReason: string): UnifiedSignal => ({
    signal: "HOLD",
    timeframe: tfLabel,
    signalTime: now.toISOString(),
    signalTimeDisplay: `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")} UTC`,
    entryPrice: 0,
    stopLoss: 0,
    targetPrice: 0,
    tp1: 0,
    tp2: 0,
    confidence: 0,
    confidenceLabel: "Low",
    tradeType: "Intraday",
    expectedDuration: "—",
    lotSize: positionSize,
    reason: holdReason,
    holdReason,
    id: makeId(),
    conditionsMet: 0,
    trend: "Neutral",
    timestamp: now,
    riskReward: 0,
    confirmationReason: holdReason,
  });

  // Only supported pairs and intervals
  if (!SUPPORTED_PAIRS.includes(pair)) {
    return holdBase(
      `Pair ${pair} not supported — use EUR/USD, GBP/USD, USD/JPY, XAU/USD`,
    );
  }

  const interval = TF_TO_INTERVAL[timeframe];
  if (!interval) {
    return holdBase(
      `Timeframe ${tfLabel} not supported for real candles — use 5M or 15M`,
    );
  }

  try {
    const [candles, livePrice] = await Promise.all([
      fetchCandles(pair, interval, 60),
      fetchLivePrice(pair),
    ]);

    if (candles.length === 0) {
      return holdBase("No candle data available (API quota or network error)");
    }

    return computeFromCandles(candles, livePrice, timeframe, positionSize);
  } catch (err) {
    console.error("computeUnifiedSignal error:", err);
    return holdBase("Data fetch error — check API key or network");
  }
}

// ── Sync fallback: compute from tick-based price array (legacy support) ──────
// Used by panels that still pass a prices[] array directly (non-forex timeframes)

export function computeUnifiedSignalSync(
  prices: number[],
  timeframe: string,
  _symbol: string,
  positionSize: number,
): UnifiedSignal {
  const now = new Date();
  const tfLabel = normalizeTimeframeLabel(timeframe);

  const holdBase = (holdReason: string): UnifiedSignal => ({
    signal: "HOLD",
    timeframe: tfLabel,
    signalTime: now.toISOString(),
    signalTimeDisplay: `${now.getUTCHours().toString().padStart(2, "0")}:${now.getUTCMinutes().toString().padStart(2, "0")} UTC`,
    entryPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
    stopLoss: 0,
    targetPrice: 0,
    tp1: 0,
    tp2: 0,
    confidence: 0,
    confidenceLabel: "Low",
    tradeType: "Intraday",
    expectedDuration: "—",
    lotSize: positionSize,
    reason: holdReason,
    holdReason,
    id: makeId(),
    conditionsMet: 0,
    trend: "Neutral",
    timestamp: now,
    riskReward: 0,
    confirmationReason: holdReason,
  });

  if (prices.length < 20) return holdBase("Insufficient price history");

  // Build synthetic candles from tick prices
  const syntheticCandles: Candle[] = prices.map((p, i) => ({
    time: Math.floor(Date.now() / 1000) - (prices.length - i) * 60,
    open: i > 0 ? prices[i - 1] : p,
    high: Math.max(p, i > 0 ? prices[i - 1] : p),
    low: Math.min(p, i > 0 ? prices[i - 1] : p),
    close: p,
    volume: 0, // no real volume available in tick mode
  }));

  return computeFromCandles(
    syntheticCandles,
    prices[prices.length - 1],
    timeframe,
    positionSize,
  );
}
