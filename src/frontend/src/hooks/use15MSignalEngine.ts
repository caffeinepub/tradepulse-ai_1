import { useEffect, useRef, useState } from "react";

export interface IntraSignal {
  signal: "BUY" | "SELL" | "HOLD";
  signalTime: string;
  signalTimeDisplay: string;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  lotSize: number;
  confidence: number;
  confidenceLabel: "High" | "Medium";
  reason: string;
  holdReason?: string;
  expectedDuration: string;
  timeframe: string;
}

// ── Pure indicator functions ──────────────────────────────────────────────────

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

function calcVolume(data: { price: number; time: string }[]): number[] {
  if (data.length === 0) return [];
  return data.map((d, i) => {
    if (i === 0) return 100;
    return Math.abs(d.price - data[i - 1].price) * 1000 + 100;
  });
}

function estimateDuration(
  atr: number,
  price: number,
  volRatio: number,
  isBullish: boolean,
  rsi: number,
): string {
  const atrPct = price > 0 ? atr / price : 0;
  // Determine momentum strength
  const strongMomentum =
    atrPct > 0.003 &&
    volRatio > 1.3 &&
    ((isBullish && rsi >= 62) || (!isBullish && rsi <= 38));
  const moderateMomentum = atrPct > 0.0015 || volRatio > 1.2;

  if (strongMomentum) {
    const mins = 30 + Math.round(Math.random() * 15);
    return `~${mins} min`;
  }
  if (moderateMomentum) {
    const mins = 60 + Math.round(Math.random() * 30);
    return `~${mins} min`;
  }
  // Low ATR / weak momentum
  const mins = 90 + Math.round(Math.random() * 30);
  return `~${Math.min(mins, 120)} min`;
}

// ── Signal computation ────────────────────────────────────────────────────────

function normalizeTimeframeLabel(tf?: string): string {
  if (!tf) return "—";
  const map: Record<string, string> = {
    "1m": "1M",
    "5m": "5M",
    "15m": "15M",
    "1h": "1H",
    "4h": "4H",
    "1d": "1D",
    "1w": "1W",
    "1mo": "1MO",
  };
  return map[tf.toLowerCase()] ?? tf.toUpperCase();
}

function computeSignal(
  price: number,
  chartData: { price: number; time: string }[],
  positionSize: number,
  selectedTimeframe: string,
): IntraSignal {
  const now = new Date();
  const signalTime = now.toISOString();
  const hh = now.getUTCHours().toString().padStart(2, "0");
  const mm = now.getUTCMinutes().toString().padStart(2, "0");
  const signalTimeDisplay = `${hh}:${mm} UTC`;

  const prices = chartData.map((d) => d.price);

  if (prices.length < 20) {
    return {
      signal: "HOLD",
      signalTime,
      signalTimeDisplay,
      entryPrice: price,
      stopLoss: price,
      targetPrice: price,
      lotSize: positionSize,
      confidence: 0,
      confidenceLabel: "Medium",
      reason: "Insufficient data",
      holdReason: "Not enough candle history to compute indicators",
      expectedDuration: "—",
      timeframe: normalizeTimeframeLabel(selectedTimeframe),
    };
  }

  const ema20 = calcEMA(prices, 20);
  const ema50 = calcEMA(prices, 50);
  const vwap = calcVWAP(prices);
  const rsi = calcRSI(prices, 14);
  const atr = calcATR(prices, 14);
  const vols = calcVolume(chartData);

  const lastEma20 = ema20[ema20.length - 1];
  const lastEma50 = ema50[ema50.length - 1];

  const recentVols = vols.slice(-6);
  const avgVol5 = recentVols.slice(0, 5).reduce((s, v) => s + v, 0) / 5;
  const lastVol = recentVols[recentVols.length - 1] ?? 0;

  const isBullTrend = lastEma20 > lastEma50;
  const isBearTrend = lastEma20 < lastEma50;
  const priceAboveVwap = price > vwap;
  const priceBelowVwap = price < vwap;
  const volConfirm = lastVol > avgVol5;
  const vwapDiffPct = price > 0 ? Math.abs(price - vwap) / price : 0;
  const nearVwap = vwapDiffPct < 0.001;
  const emaGapPct = price > 0 ? Math.abs(lastEma20 - lastEma50) / price : 0;
  const emasTooClose = emaGapPct < 0.0005;

  const buyConditions =
    isBullTrend && priceAboveVwap && rsi >= 55 && rsi <= 70 && volConfirm;
  const sellConditions =
    isBearTrend && priceBelowVwap && rsi >= 30 && rsi <= 45 && volConfirm;

  if (!buyConditions && !sellConditions) {
    // Pick the most specific HOLD reason
    let holdReason = "Conditions not aligned";
    if (emasTooClose || (!isBullTrend && !isBearTrend)) {
      holdReason = "Trend unclear";
    } else if (!volConfirm) {
      holdReason = "Volume confirmation missing";
    } else if (isBullTrend && (rsi < 55 || rsi > 70)) {
      holdReason = "RSI not in valid range";
    } else if (isBearTrend && (rsi < 30 || rsi > 45)) {
      holdReason = "RSI not in valid range";
    } else if (nearVwap) {
      holdReason = "Price near VWAP with no momentum";
    } else {
      holdReason = "Trend unclear";
    }

    return {
      signal: "HOLD",
      signalTime,
      signalTimeDisplay,
      entryPrice: price,
      stopLoss: price,
      targetPrice: price,
      lotSize: positionSize,
      confidence: 0,
      confidenceLabel: "Medium",
      reason: "Conditions not fully met",
      holdReason,
      expectedDuration: "—",
      timeframe: normalizeTimeframeLabel(selectedTimeframe),
    };
  }

  const dir: "BUY" | "SELL" = buyConditions ? "BUY" : "SELL";
  const slDist = 1.2 * atr;
  const stopLoss = dir === "BUY" ? price - slDist : price + slDist;
  const targetPrice = dir === "BUY" ? price + slDist * 2 : price - slDist * 2;

  // Lot size: $5 risk / SL distance, clamped 0.01–0.05
  const rawLot = slDist > 0 ? 5 / slDist : positionSize;
  const lotSize = Math.min(
    Math.max(Number.parseFloat(rawLot.toFixed(2)), 0.01),
    0.05,
  );

  // Confidence
  let confidence = 60;
  if (emaGapPct > 0.001) confidence += 10;
  if (dir === "BUY" && rsi >= 60 && rsi <= 65) confidence += 10;
  if (dir === "SELL" && rsi >= 33 && rsi <= 40) confidence += 10;
  const volRatio = avgVol5 > 0 ? lastVol / avgVol5 : 1;
  if (volRatio >= 1.5) confidence += 10;
  if (atr > 0.002 * price) confidence += 10;
  confidence = Math.min(confidence, 95);
  const confidenceLabel: "High" | "Medium" =
    confidence >= 80 ? "High" : "Medium";

  const reason =
    dir === "BUY"
      ? `EMA20 > EMA50 (bullish), price above VWAP, RSI ${rsi.toFixed(1)}, volume confirmed`
      : `EMA20 < EMA50 (bearish), price below VWAP, RSI ${rsi.toFixed(1)}, volume confirmed`;

  const expectedDuration = estimateDuration(
    atr,
    price,
    volRatio,
    dir === "BUY",
    rsi,
  );

  return {
    signal: dir,
    signalTime,
    signalTimeDisplay,
    entryPrice: price,
    stopLoss: Number.parseFloat(stopLoss.toFixed(5)),
    targetPrice: Number.parseFloat(targetPrice.toFixed(5)),
    lotSize,
    confidence,
    confidenceLabel,
    reason,
    expectedDuration,
    timeframe: normalizeTimeframeLabel(selectedTimeframe),
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function use15MSignalEngine({
  symbol,
  price,
  chartData,
  selectedTimeframe,
  positionSize = 0.01,
  accountBalance: _accountBalance = 10000,
}: {
  symbol: string;
  price: number;
  chartData: { price: number; time: string }[];
  selectedTimeframe: string;
  positionSize?: number;
  accountBalance?: number;
}) {
  const [currentSignal, setCurrentSignal] = useState<IntraSignal | null>(null);
  const [history, setHistory] = useState<IntraSignal[]>([]);
  const prevSymbolRef = useRef(symbol);

  // Reset history on symbol change
  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setHistory([]);
      setCurrentSignal(null);
    }
  }, [symbol]);

  useEffect(() => {
    if (selectedTimeframe !== "5m" && selectedTimeframe !== "15m") {
      setCurrentSignal(null);
      return;
    }

    const evaluate = () => {
      if (price <= 0 || chartData.length < 20) return;
      const sig = computeSignal(
        price,
        chartData,
        positionSize,
        selectedTimeframe,
      );
      setCurrentSignal(sig);
      if (sig.signal !== "HOLD") {
        setHistory((prev) => [sig, ...prev].slice(0, 50));
      }
    };

    evaluate();
    const id = setInterval(evaluate, 15_000);
    return () => clearInterval(id);
  }, [selectedTimeframe, price, chartData, positionSize]);

  return { currentSignal, history };
}
