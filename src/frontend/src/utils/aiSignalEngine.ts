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
  tradeType: "Scalp" | "Intraday" | "Swing";
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

export function generateSignal(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
  analysis?: MarketAnalysis | null,
  mtf?: MultiTimeframeAnalysis | null,
  overallSentiment?: "Bullish" | "Bearish" | "Neutral",
  sentimentStrength?: number,
): AISignal {
  const prices = chartData.map((d) => d.price);

  const shortEMA = prices.length >= 5 ? ema(prices.slice(-5), 5) : price;
  const longEMA = prices.length >= 20 ? ema(prices.slice(-20), 20) : price;

  const price10ago = prices.length >= 10 ? prices[prices.length - 10] : price;
  const momentum =
    price10ago !== 0 ? ((price - price10ago) / price10ago) * 100 : 0;

  const last20 = prices.slice(-20);
  const vol =
    last20.length > 1
      ? stddev(last20) / (last20.reduce((a, b) => a + b, 0) / last20.length)
      : 0;

  let signalType: "BUY" | "SELL" | "HOLD";
  if (shortEMA > longEMA && momentum > 0.1) {
    signalType = "BUY";
  } else if (shortEMA < longEMA && momentum < -0.1) {
    signalType = "SELL";
  } else {
    signalType = "HOLD";
  }

  // ── Confidence breakdown (each component 0-25, total 0-100) ─────────────
  const emaAlignScore =
    longEMA !== 0 ? Math.abs((shortEMA - longEMA) / longEMA) * 500 : 0;
  const trendAlignment = Math.round(
    clamp(emaAlignScore + Math.abs(momentum) * 30, 0, 25),
  );

  const priceVsEmaScore =
    longEMA !== 0 ? Math.abs((price - longEMA) / longEMA) * 300 : 0;
  const indicatorConfluence = Math.round(
    clamp(priceVsEmaScore + (vol > 0.001 ? 8 : 4), 0, 25),
  );

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

  // ── Apply market analysis (single-TF) bias ───────────────────────────────
  if (analysis) {
    const { trend, momentumScore } = analysis;

    if (trend === "Bullish") {
      if (signalType === "BUY") {
        confidence = Math.min(95, Math.round(confidence * 1.1));
      } else if (signalType === "SELL" && confidence < 65) {
        signalType = "HOLD";
        confidence = Math.round(confidence * 0.9);
      }
    } else if (trend === "Bearish") {
      if (signalType === "SELL") {
        confidence = Math.min(95, Math.round(confidence * 1.1));
      } else if (signalType === "BUY" && confidence < 65) {
        signalType = "HOLD";
        confidence = Math.round(confidence * 0.9);
      }
    } else if (trend === "Sideways") {
      confidence = Math.round(confidence * 0.92);
      if ((signalType === "BUY" || signalType === "SELL") && confidence < 60) {
        signalType = "HOLD";
      }
    }

    if (
      momentumScore >= 70 &&
      ((trend === "Bullish" && signalType === "BUY") ||
        (trend === "Bearish" && signalType === "SELL"))
    ) {
      confidence = Math.min(95, confidence + 4);
    }
  }

  // ── Apply Multi-Timeframe confluence rules ──────────────────────────────
  if (mtf) {
    const { higherTFBias, entryAlignment, confluenceBias, confluenceScore } =
      mtf;

    if (higherTFBias === "Conflict") {
      if (signalType !== "HOLD") signalType = "HOLD";
      confidence = Math.round(confidence * 0.75);
    } else if (higherTFBias === "Bullish") {
      if (entryAlignment >= 2) {
        if (signalType === "BUY") {
          confidence = Math.min(95, Math.round(confidence * 1.18));
        } else if (signalType === "SELL") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.7);
        }
      } else {
        if (signalType === "BUY") {
          confidence = Math.round(confidence * 0.88);
        } else if (signalType === "SELL") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.72);
        }
      }
    } else if (higherTFBias === "Bearish") {
      if (entryAlignment >= 2) {
        if (signalType === "SELL") {
          confidence = Math.min(95, Math.round(confidence * 1.18));
        } else if (signalType === "BUY") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.7);
        }
      } else {
        if (signalType === "SELL") {
          confidence = Math.round(confidence * 0.88);
        } else if (signalType === "BUY") {
          signalType = "HOLD";
          confidence = Math.round(confidence * 0.72);
        }
      }
    } else if (higherTFBias === "Sideways") {
      confidence = Math.round(confidence * 0.88);
      if ((signalType === "BUY" || signalType === "SELL") && confidence < 58) {
        signalType = "HOLD";
      }
    }

    if (confluenceBias === signalType && confluenceScore >= 70) {
      confidence = Math.min(95, confidence + 5);
    }
  }

  // ── Apply sentiment nudge ────────────────────────────────────────────────
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

  confidence = Math.round(clamp(confidence, 40, 95));

  // ── Compute SL and TP levels ─────────────────────────────────────────────
  const atr = price * Math.max(vol, 0.002);

  const stopLoss =
    signalType === "BUY"
      ? price - 1.5 * atr
      : signalType === "SELL"
        ? price + 1.5 * atr
        : price * (1 - vol * 0.3);

  const slDist = Math.abs(price - stopLoss);

  const tp1 =
    signalType === "BUY"
      ? price + 1.5 * atr
      : signalType === "SELL"
        ? price - 1.5 * atr
        : price + atr;

  const tp2 =
    signalType === "BUY"
      ? price + 2.5 * atr
      : signalType === "SELL"
        ? price - 2.5 * atr
        : price + atr * 1.5;

  const tp3 =
    signalType === "BUY"
      ? price + 4 * atr
      : signalType === "SELL"
        ? price - 4 * atr
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

  const tradeType: AISignal["tradeType"] =
    vol > 0.005 ? "Scalp" : vol > 0.002 ? "Intraday" : "Swing";

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
    timestamp: new Date(),
  };
}
