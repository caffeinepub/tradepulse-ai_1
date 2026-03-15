// Unified Signal Engine — single source of truth for both SignalsPanel and IntraSignalPanel

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

export function normalizeTimeframeLabel(tf: string): string {
  return TF_LABELS[tf] ?? tf.toUpperCase();
}

export interface UnifiedSignal {
  signal: "BUY" | "SELL" | "HOLD";
  timeframe: string;
  signalTime: string;
  signalTimeDisplay: string;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  tp2: number;
  confidence: number;
  confidenceLabel: "High" | "Medium" | "Low";
  tradeType: "Intraday" | "Swing";
  expectedDuration: string;
  lotSize: number;
  reason: string;
  holdReason?: string;
  id: string;
  // Legacy compat fields used by SignalsPanel history rendering
  trend: "Bullish" | "Bearish" | "Neutral";
  timestamp: Date;
  tp1: number;
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

function calcVWAP(prices: number[]): number {
  if (prices.length === 0) return 0;
  return prices.reduce((s, p) => s + p, 0) / prices.length;
}

function calcRSI(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function calcATR(prices: number[], period = 14): number {
  if (prices.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    trs.push(Math.abs(prices[i] - prices[i - 1]));
  }
  const recent = trs.slice(-period);
  return recent.reduce((s, v) => s + v, 0) / recent.length;
}

function calcVolumeProxy(prices: number[]): number[] {
  return prices.map((p, i) => {
    if (i === 0) return 100;
    return Math.abs(p - prices[i - 1]) * 1000 + 100;
  });
}

function estimateDuration(
  atr: number,
  price: number,
  volRatio: number,
  isSwing: boolean,
): string {
  const atrPct = price > 0 ? atr / price : 0;
  if (isSwing) {
    if (atrPct > 0.005 || volRatio > 1.5) return "~4-6h";
    return "~6-12h";
  }
  // Intraday
  if (atrPct > 0.003 && volRatio > 1.3) {
    const mins = 30 + Math.round(Math.random() * 20);
    return `~${mins} min`;
  }
  if (atrPct > 0.0015 || volRatio > 1.2) {
    const mins = 60 + Math.round(Math.random() * 30);
    return `~${mins} min`;
  }
  const mins = 80 + Math.round(Math.random() * 40);
  return `~${Math.min(mins, 120)} min`;
}

let _idCounter = 0;
function makeId() {
  _idCounter += 1;
  return `usig-${Date.now()}-${_idCounter}`;
}

// ── Main computation ─────────────────────────────────────────────────────────

export function computeUnifiedSignal(
  prices: number[],
  timeframe: string,
  _symbol: string,
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
    entryPrice: prices.length > 0 ? prices[prices.length - 1] : 0,
    stopLoss: 0,
    targetPrice: 0,
    tp2: 0,
    confidence: 0,
    confidenceLabel: "Low",
    tradeType: "Intraday",
    expectedDuration: "—",
    lotSize: positionSize,
    reason: holdReason,
    holdReason,
    id: makeId(),
    trend: "Neutral",
    timestamp: now,
    tp1: 0,
    riskReward: 0,
    confirmationReason: holdReason,
  });

  if (prices.length < 15) return holdBase("Insufficient price history");

  const price = prices[prices.length - 1];

  const ema20arr = calcEMA(prices, 20);
  const ema50arr = calcEMA(prices, Math.min(50, prices.length));
  const vwap = calcVWAP(prices);
  const rsi = calcRSI(prices, 14);
  const atr = calcATR(prices, 14);
  const volProxy = calcVolumeProxy(prices);

  const lastEma20 = ema20arr[ema20arr.length - 1];
  const lastEma50 = ema50arr[ema50arr.length - 1];

  const recentVols = volProxy.slice(-6);
  const avgVol5 = recentVols.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
  const lastVol = recentVols[recentVols.length - 1] ?? 0;
  const volRatio = avgVol5 > 0 ? lastVol / avgVol5 : 1;

  const isBullTrend = lastEma20 > lastEma50;
  const isBearTrend = lastEma20 < lastEma50;
  const priceAboveVwap = price > vwap;
  const priceBelowVwap = price < vwap;
  const volConfirm = lastVol > avgVol5;
  const emaGapPct = price > 0 ? Math.abs(lastEma20 - lastEma50) / price : 0;
  const emasTooClose = emaGapPct < 0.0005;
  const vwapDiffPct = price > 0 ? Math.abs(price - vwap) / price : 0;
  const nearVwap = vwapDiffPct < 0.001;
  const atrPct = price > 0 ? atr / price : 0;

  const buyConditions =
    isBullTrend && priceAboveVwap && rsi >= 55 && rsi <= 70 && volConfirm;
  const sellConditions =
    isBearTrend && priceBelowVwap && rsi >= 30 && rsi <= 45 && volConfirm;

  if (!buyConditions && !sellConditions) {
    let holdReason = "Trend unclear";
    if (emasTooClose) {
      holdReason = "EMA alignment not confirmed";
    } else if (!volConfirm) {
      holdReason = "Volume confirmation missing";
    } else if (nearVwap) {
      holdReason = "Price near VWAP with no momentum";
    } else if (
      (isBullTrend && (rsi < 55 || rsi > 70)) ||
      (isBearTrend && (rsi < 30 || rsi > 45))
    ) {
      holdReason = "RSI not in valid range";
    }
    return holdBase(holdReason);
  }

  const dir: "BUY" | "SELL" = buyConditions ? "BUY" : "SELL";
  const slDist = 1.2 * atr;
  const stopLoss = dir === "BUY" ? price - slDist : price + slDist;
  const tp1 = dir === "BUY" ? price + slDist * 2 : price - slDist * 2;
  const tp2 = dir === "BUY" ? price + slDist * 3 : price - slDist * 3;

  // Confidence calculation
  let confidence = 65;
  if (dir === "BUY" && rsi >= 62 && rsi <= 68) confidence += 10;
  if (dir === "SELL" && rsi >= 32 && rsi <= 38) confidence += 10;
  if (volRatio > 1.5) confidence += 10;
  if (atrPct > 0.002) confidence += 10;
  confidence = Math.min(confidence, 95);

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

  const reason =
    dir === "BUY"
      ? `EMA20 > EMA50 (bullish), price above VWAP, RSI ${rsi.toFixed(1)}, volume confirmed`
      : `EMA20 < EMA50 (bearish), price below VWAP, RSI ${rsi.toFixed(1)}, volume confirmed`;

  return {
    signal: dir,
    timeframe: tfLabel,
    signalTime,
    signalTimeDisplay,
    entryPrice: price,
    stopLoss: Number.parseFloat(stopLoss.toFixed(price > 100 ? 2 : 5)),
    targetPrice: Number.parseFloat(tp1.toFixed(price > 100 ? 2 : 5)),
    tp2: Number.parseFloat(tp2.toFixed(price > 100 ? 2 : 5)),
    confidence,
    confidenceLabel,
    tradeType,
    expectedDuration,
    lotSize,
    reason,
    id: makeId(),
    trend: dir === "BUY" ? "Bullish" : "Bearish",
    timestamp: now,
    tp1: Number.parseFloat(tp1.toFixed(price > 100 ? 2 : 5)),
    riskReward: Number.parseFloat(riskReward.toFixed(2)),
    confirmationReason: reason,
  };
}
