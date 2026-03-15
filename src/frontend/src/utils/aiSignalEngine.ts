import type { SMCSignalContext } from "../types/smc";
import type { MarketAnalysis } from "./marketAnalysisEngine";
import type { MultiTimeframeAnalysis } from "./multiTimeframeEngine";

export interface AISignal {
  id: string;
  asset: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
  confidence: number;
  confidenceBreakdown: {
    trendAlignment: number;
    indicatorConfluence: number;
    volumeConfirmation: number;
    structureSignals: number;
  };
  trend: "Bullish" | "Bearish" | "Sideways";
  tradeType: "Scalp" | "Intraday" | "Swing" | "Position";
  confirmationReason: string;
  expectedDuration: string;
  positionSize: number;
  timestamp: Date;
}

function ema(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  const k = 2 / (period + 1);
  let val = prices[0];
  for (let i = 1; i < prices.length; i++) {
    val = prices[i] * k + val * (1 - k);
  }
  return val;
}

function rsi(prices: number[], period = 14): number {
  if (prices.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function macd(prices: number[]): { histogram: number; signal: number } {
  if (prices.length < 26) return { histogram: 0, signal: 0 };
  const ema12 = ema(prices.slice(-12), 12);
  const ema26 = ema(prices.slice(-26), 26);
  const macdLine = ema12 - ema26;
  const macdValues: number[] = [];
  for (let i = Math.max(0, prices.length - 35); i < prices.length; i++) {
    const slice = prices.slice(0, i + 1);
    if (slice.length < 26) {
      macdValues.push(0);
      continue;
    }
    const e12 = ema(slice.slice(-12), 12);
    const e26 = ema(slice.slice(-26), 26);
    macdValues.push(e12 - e26);
  }
  const signalLine =
    macdValues.length >= 9 ? ema(macdValues.slice(-9), 9) : macdLine;
  return { histogram: macdLine - signalLine, signal: signalLine };
}

function stddev(prices: number[]): number {
  if (prices.length === 0) return 0;
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
  return Math.sqrt(variance);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function getTradeTypeFromTimeframe(
  tf: string | undefined,
  confidence?: number,
  volatility?: number,
): "Scalp" | "Intraday" | "Swing" | "Position" | null {
  if (!tf) return null;
  const t = tf.toLowerCase();
  if (t === "1m" || t === "3m" || t === "5m") return "Scalp";
  if (t === "15m" || t === "30m") {
    // Flexible override: very high confidence + extreme short-term momentum
    if (
      confidence !== undefined &&
      volatility !== undefined &&
      confidence > 82 &&
      volatility > 0.004
    ) {
      return "Scalp";
    }
    return "Intraday";
  }
  if (t === "1h") {
    // Flexible override: high confidence + strong momentum on 1h
    if (
      confidence !== undefined &&
      volatility !== undefined &&
      confidence > 80 &&
      volatility > 0.005
    ) {
      return "Intraday";
    }
    return "Swing";
  }
  if (t === "4h") return "Swing";
  if (t === "1d") return "Position";
  return null;
}

/**
 * Returns timeout in milliseconds for a given trade type.
 */
export function getSignalTimeout(tradeType: AISignal["tradeType"]): number {
  switch (tradeType) {
    case "Scalp":
      return 15 * 60 * 1000;
    case "Intraday":
      return 3 * 60 * 60 * 1000;
    case "Swing":
      return 24 * 60 * 60 * 1000;
    case "Position":
      return 72 * 60 * 60 * 1000;
  }
}

/**
 * Returns a contextual HOLD message based on current SMC state.
 */
export function getContextualHoldMessage(
  smcContext?: SMCSignalContext,
): string {
  if (!smcContext) return "Scanning for setup...";
  if (smcContext.atLiquiditySweep)
    return "Liquidity grab in progress — waiting for confirmation";
  if (smcContext.nearOrderBlock)
    return "Price at institutional zone — evaluating entry";
  if (smcContext.bosConfirmed)
    return "BOS confirmed — scanning for pullback entry";
  if (smcContext.chochWarning)
    return "CHOCH detected — monitoring structure shift";
  return "Scanning for setup...";
}

// ── Market-type helpers ──────────────────────────────────────────

export type MarketType =
  | "crypto"
  | "forex"
  | "indices"
  | "futures"
  | "commodities"
  | "gold";

export function getMarketType(symbol: string): MarketType {
  if (["BTC/USD", "ETH/USD", "SOL/USD"].includes(symbol)) return "crypto";
  if (["EUR/USD", "GBP/USD"].includes(symbol)) return "forex";
  if (["SPX", "NDX"].includes(symbol)) return "indices";
  if (["NQ1!", "ES1!"].includes(symbol)) return "futures";
  if (["OIL/USD", "SILVER/USD"].includes(symbol)) return "commodities";
  if (symbol === "XAU/USD") return "gold";
  return "crypto";
}

/** Returns true if the current UTC time is within London (07:00-16:00) or NY (12:00-21:00) sessions */
function isForexSessionActive(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const inLondon = utcHour >= 7 && utcHour < 16;
  const inNewYork = utcHour >= 12 && utcHour < 21;
  return inLondon || inNewYork;
}

/** Returns true if within 1 hour of major session opens (NYSE 13:30 UTC, LSE 08:00 UTC) */
function isNearSessionOpen(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const totalMin = utcHour * 60 + utcMin;
  // LSE open: 08:00 UTC ± 60 min = 420-540
  const nearLSE = totalMin >= 420 && totalMin <= 540;
  // NYSE open: 13:30 UTC ± 60 min = 750-870
  const nearNYSE = totalMin >= 750 && totalMin <= 870;
  return nearLSE || nearNYSE;
}

function buildHoldSignal(
  symbol: string,
  price: number,
  vol: number,
  lotSize: number,
  selectedTimeframe?: string,
  positionSize?: number,
  reason?: string,
): AISignal {
  const atr = price * Math.max(vol, 0.002);
  const tradeType: AISignal["tradeType"] =
    selectedTimeframe === "1m" || selectedTimeframe === "5m"
      ? "Scalp"
      : selectedTimeframe === "15m" || selectedTimeframe === "30m"
        ? "Intraday"
        : selectedTimeframe === "1h" || selectedTimeframe === "4h"
          ? "Swing"
          : "Position";
  return {
    id: `${symbol}-hold-${Date.now()}`,
    asset: symbol,
    signal: "HOLD",
    entryPrice: price,
    stopLoss: price - atr,
    tp1: price + atr,
    tp2: price + atr * 1.5,
    tp3: price + atr * 2,
    riskReward: 1.5,
    confidence: 40,
    confidenceBreakdown: {
      trendAlignment: 10,
      indicatorConfluence: 10,
      volumeConfirmation: 10,
      structureSignals: 10,
    },
    trend: "Sideways",
    tradeType,
    confirmationReason: reason ?? "Scanning for setup...",
    expectedDuration: "—",
    positionSize: positionSize ?? lotSize,
    timestamp: new Date(),
  };
}

export function generateSignal(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
  analysis?: MarketAnalysis | null,
  mtf?: MultiTimeframeAnalysis | null,
  overallSentiment?: "Bullish" | "Bearish" | "Neutral",
  sentimentStrength?: number,
  selectedTimeframe?: string,
  scalpsToday?: number,
  positionSize?: number,
  marketType?: MarketType,
): AISignal {
  const prices = chartData.map((d) => d.price);
  const lotSize = positionSize ?? 0.05;

  const shortEMA = prices.length >= 5 ? ema(prices.slice(-5), 5) : price;
  const longEMA = prices.length >= 20 ? ema(prices.slice(-20), 20) : price;
  const ema20 = prices.length >= 20 ? ema(prices.slice(-20), 20) : price;
  const ema50 = prices.length >= 50 ? ema(prices.slice(-50), 50) : price;

  const price10ago = prices.length >= 10 ? prices[prices.length - 10] : price;
  const momentum =
    price10ago !== 0 ? ((price - price10ago) / price10ago) * 100 : 0;

  const last20 = prices.slice(-20);
  const vol =
    last20.length > 1
      ? stddev(last20) / (last20.reduce((a, b) => a + b, 0) / last20.length)
      : 0;

  const rsiValue = rsi(prices, 14);
  const macdResult = macd(prices);

  // ── Market-specific gates ────────────────────────────────────────

  const resolvedMarketType = marketType ?? getMarketType(symbol);

  // Forex: only trade during active London / NY sessions
  if (resolvedMarketType === "forex" && !isForexSessionActive()) {
    return buildHoldSignal(
      symbol,
      price,
      vol,
      lotSize,
      selectedTimeframe,
      positionSize,
      "Outside active trading session (London/NY)",
    );
  }

  // Commodities: require minimum volatility before trading
  const COMMODITY_VOL_THRESHOLD = 0.003;
  if (resolvedMarketType === "commodities" && vol < COMMODITY_VOL_THRESHOLD) {
    return buildHoldSignal(
      symbol,
      price,
      vol,
      lotSize,
      selectedTimeframe,
      positionSize,
      "Insufficient volatility for commodity trade",
    );
  }

  let signalType: "BUY" | "SELL" | "HOLD";
  if (shortEMA > longEMA && momentum > 0.1) {
    signalType = "BUY";
  } else if (shortEMA < longEMA && momentum < -0.1) {
    signalType = "SELL";
  } else {
    signalType = "HOLD";
  }

  const emaAlignScore =
    longEMA !== 0 ? Math.abs((shortEMA - longEMA) / longEMA) * 500 : 0;
  const trendAlignment = Math.round(
    clamp(emaAlignScore + Math.abs(momentum) * 30, 0, 25),
  );

  const priceVsEmaScore =
    longEMA !== 0 ? Math.abs((price - longEMA) / longEMA) * 300 : 0;
  let indicatorConfluence = Math.round(
    clamp(priceVsEmaScore + (vol > 0.001 ? 8 : 4), 0, 25),
  );

  if (rsiValue > 50 && signalType === "BUY")
    indicatorConfluence = Math.min(25, indicatorConfluence + 3);
  if (rsiValue < 50 && signalType === "SELL")
    indicatorConfluence = Math.min(25, indicatorConfluence + 3);
  if (rsiValue > 70 && signalType === "BUY")
    indicatorConfluence = Math.max(0, indicatorConfluence - 4);
  if (rsiValue < 30 && signalType === "SELL")
    indicatorConfluence = Math.max(0, indicatorConfluence - 4);
  if (macdResult.histogram > 0 && signalType === "BUY")
    indicatorConfluence = Math.min(25, indicatorConfluence + 3);
  if (macdResult.histogram < 0 && signalType === "SELL")
    indicatorConfluence = Math.min(25, indicatorConfluence + 3);

  const volScore = vol * 2000;
  const volumeConfirmation = Math.round(clamp(volScore, 2, 25));

  let structureSignals = 8;
  if (analysis?.structureEvents && analysis.structureEvents.length > 0) {
    const recentEvents = analysis.structureEvents.slice(0, 3);
    const confirming = recentEvents.filter(
      (e) =>
        (signalType === "BUY" && e.direction === "bullish") ||
        (signalType === "SELL" && e.direction === "bearish"),
    ).length;
    structureSignals = Math.round(
      clamp(8 + confirming * 5 + (analysis.momentumScore / 100) * 7, 0, 25),
    );
  }

  let confidence =
    trendAlignment +
    indicatorConfluence +
    volumeConfirmation +
    structureSignals;

  if (analysis) {
    const { trend, momentumScore } = analysis;
    if (trend === "Bullish") {
      if (signalType === "BUY")
        confidence = Math.min(95, Math.round(confidence * 1.1));
      else if (signalType === "SELL" && confidence < 65) {
        signalType = "HOLD";
        confidence = Math.round(confidence * 0.9);
      }
    } else if (trend === "Bearish") {
      if (signalType === "SELL")
        confidence = Math.min(95, Math.round(confidence * 1.1));
      else if (signalType === "BUY" && confidence < 65) {
        signalType = "HOLD";
        confidence = Math.round(confidence * 0.9);
      }
    } else if (trend === "Sideways") {
      confidence = Math.round(confidence * 0.92);
      if ((signalType === "BUY" || signalType === "SELL") && confidence < 60)
        signalType = "HOLD";
    }
    if (
      momentumScore >= 70 &&
      ((trend === "Bullish" && signalType === "BUY") ||
        (trend === "Bearish" && signalType === "SELL"))
    ) {
      confidence = Math.min(95, confidence + 4);
    }
  }

  if (mtf) {
    const { higherTFBias, entryAlignment, confluenceBias, confluenceScore } =
      mtf;
    if (higherTFBias === "Conflict") {
      if (signalType !== "HOLD") signalType = "HOLD";
      confidence = Math.round(confidence * 0.75);
    } else if (higherTFBias === "Bullish") {
      if (entryAlignment >= 2) {
        if (signalType === "BUY")
          confidence = Math.min(95, Math.round(confidence * 1.18));
        else if (signalType === "SELL") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.7);
        }
      } else {
        if (signalType === "BUY") confidence = Math.round(confidence * 0.88);
        else if (signalType === "SELL") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.72);
        }
      }
    } else if (higherTFBias === "Bearish") {
      if (entryAlignment >= 2) {
        if (signalType === "SELL")
          confidence = Math.min(95, Math.round(confidence * 1.18));
        else if (signalType === "BUY") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.7);
        }
      } else {
        if (signalType === "SELL") confidence = Math.round(confidence * 0.88);
        else if (signalType === "BUY") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.72);
        }
      }
    } else if (higherTFBias === "Sideways") {
      confidence = Math.round(confidence * 0.88);
      if ((signalType === "BUY" || signalType === "SELL") && confidence < 58)
        signalType = "HOLD";
    }
    if (confluenceBias === signalType && confluenceScore >= 70)
      confidence = Math.min(95, confidence + 5);
  }

  if (overallSentiment && sentimentStrength !== undefined) {
    if (
      overallSentiment === "Bullish" &&
      sentimentStrength > 70 &&
      signalType === "BUY"
    ) {
      confidence = Math.min(
        95,
        confidence + Math.round((sentimentStrength - 70) * 0.27),
      );
    } else if (
      overallSentiment === "Bearish" &&
      sentimentStrength > 70 &&
      signalType === "SELL"
    ) {
      confidence = Math.min(
        95,
        confidence + Math.round((sentimentStrength - 70) * 0.27),
      );
    }
  }

  // Indices & Futures: boost confidence near session open; require ATR trend strength
  if (resolvedMarketType === "indices" || resolvedMarketType === "futures") {
    if (isNearSessionOpen()) {
      confidence = Math.min(95, confidence + 7);
    }
    // Require a minimum trend strength (ATR-based) — if vol is very low, reduce confidence
    if (vol < 0.001) {
      confidence = Math.round(confidence * 0.85);
      if (confidence < 55 && (signalType === "BUY" || signalType === "SELL")) {
        signalType = "HOLD";
      }
    }
  }

  confidence = Math.round(clamp(confidence, 40, 95));

  // Determine trade type from timeframe with flexible override
  let tradeType: AISignal["tradeType"];
  const tfType = getTradeTypeFromTimeframe(selectedTimeframe, confidence, vol);
  if (tfType) {
    tradeType = tfType;
  } else {
    tradeType = vol > 0.005 ? "Scalp" : vol > 0.002 ? "Intraday" : "Swing";
  }

  let confirmationReason = "";
  // Note if flexible override was applied
  const baseTfType = getTradeTypeFromTimeframe(selectedTimeframe);
  if (baseTfType && baseTfType !== tradeType) {
    confirmationReason = `Overridden to ${tradeType} — high confidence + momentum on ${selectedTimeframe}. `;
  }

  if (
    tradeType === "Scalp" &&
    (scalpsToday ?? 0) >= 3 &&
    signalType !== "HOLD"
  ) {
    signalType = "HOLD";
    confirmationReason = "Scalping session limit reached (3/3 trades today)";
  }

  const atr = price * Math.max(vol, 0.002);

  let slMultiplier = 1.5;
  let tp1Mult = 1.5;
  let tp2Mult = 2.5;
  let tp3Mult = 4.0;

  if (tradeType === "Scalp") {
    slMultiplier = 0.8;
    tp1Mult = 1.2;
    tp2Mult = 1.8;
    tp3Mult = 2.5;
  } else if (tradeType === "Intraday") {
    slMultiplier = 1.5;
    tp1Mult = 2.0;
    tp2Mult = 3.0;
    tp3Mult = 4.5;
  } else if (tradeType === "Swing") {
    slMultiplier = 2.5;
    tp1Mult = 3.0;
    tp2Mult = 5.0;
    tp3Mult = 7.0;
  } else if (tradeType === "Position") {
    slMultiplier = 4.0;
    tp1Mult = 5.0;
    tp2Mult = 8.0;
    tp3Mult = 12.0;
  }

  const stopLoss =
    signalType === "BUY"
      ? price - slMultiplier * atr
      : signalType === "SELL"
        ? price + slMultiplier * atr
        : price * (1 - vol * 0.3);

  const slDist = Math.abs(price - stopLoss);

  const tp1 =
    signalType === "BUY"
      ? price + tp1Mult * atr
      : signalType === "SELL"
        ? price - tp1Mult * atr
        : price + atr;

  const tp2 =
    signalType === "BUY"
      ? price + tp2Mult * atr
      : signalType === "SELL"
        ? price - tp2Mult * atr
        : price + atr * 1.5;

  const tp3 =
    signalType === "BUY"
      ? price + tp3Mult * atr
      : signalType === "SELL"
        ? price - tp3Mult * atr
        : price + atr * 2;

  const tpDist = Math.abs(tp1 - price);
  const riskReward =
    slDist > 0 ? Math.round((tpDist / slDist) * 100) / 100 : 1.5;

  const trend: AISignal["trend"] =
    signalType === "BUY"
      ? "Bullish"
      : signalType === "SELL"
        ? "Bearish"
        : "Sideways";

  const durationMap: Record<AISignal["tradeType"], string> = {
    Scalp: "3–12 min",
    Intraday: "1–3 hours",
    Swing: "2–5 days",
    Position: "2–6 weeks",
  };
  const expectedDuration = durationMap[tradeType];

  if (!confirmationReason && signalType !== "HOLD") {
    const reasons: string[] = [];
    if (analysis?.structureEvents?.some((e) => e.type === "BOS")) {
      reasons.push(signalType === "BUY" ? "BOS confirmed" : "BOS confirmed");
    }
    if (analysis?.structureEvents?.some((e) => e.type === "CHOCH")) {
      reasons.push("CHOCH signal");
    }
    if (ema20 > ema50 && signalType === "BUY") reasons.push("EMA(20) uptrend");
    else if (ema20 < ema50 && signalType === "SELL")
      reasons.push("EMA(50) downtrend");
    else if (ema20 !== ema50)
      reasons.push(
        signalType === "BUY" ? "EMA(20) uptrend" : "EMA(50) downtrend",
      );
    if (vol > 0.003) reasons.push("volume spike");
    if (Math.abs(macdResult.histogram) > 0.0001)
      reasons.push("MACD confirmation");
    if (
      (rsiValue > 55 && signalType === "BUY") ||
      (rsiValue < 45 && signalType === "SELL")
    ) {
      reasons.push("RSI momentum");
    }
    if (analysis?.trend === "Bullish" && signalType === "BUY")
      reasons.unshift("Bullish order block");
    else if (analysis?.trend === "Bearish" && signalType === "SELL")
      reasons.unshift("Bearish order block");
    confirmationReason =
      reasons.slice(0, 3).join(" + ") ||
      (signalType === "BUY" ? "Bullish momentum" : "Bearish momentum");
  } else if (!confirmationReason) {
    confirmationReason =
      analysis?.trend === "Sideways"
        ? "Market sideways, awaiting breakout"
        : "Conflicting signals, holding position";
  }

  return {
    id: `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    asset: symbol,
    signal: signalType,
    entryPrice: price,
    stopLoss,
    tp1,
    tp2,
    tp3,
    riskReward,
    confidence,
    confidenceBreakdown: {
      trendAlignment,
      indicatorConfluence,
      volumeConfirmation,
      structureSignals,
    },
    trend,
    tradeType,
    confirmationReason,
    expectedDuration,
    positionSize: lotSize,
    timestamp: new Date(),
  };
}
