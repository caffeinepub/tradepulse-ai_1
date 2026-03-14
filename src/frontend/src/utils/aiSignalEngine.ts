export interface AISignal {
  id: string;
  asset: string;
  signal: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  probability: number;
  trend: "Bullish" | "Bearish" | "Neutral";
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

  const stopLoss =
    signalType === "BUY"
      ? price * (1 - vol * 0.5)
      : signalType === "SELL"
        ? price * (1 + vol * 0.5)
        : price * (1 - vol * 0.3);

  const takeProfit =
    signalType === "BUY"
      ? price + (price - stopLoss) * 1.5
      : signalType === "SELL"
        ? price - (stopLoss - price) * 1.5
        : price * (1 + vol * 0.45);

  const slDist = Math.abs(price - stopLoss);
  const tpDist = Math.abs(takeProfit - price);
  const riskReward =
    slDist > 0 ? Math.round((tpDist / slDist) * 100) / 100 : 1.5;

  const rawProb =
    50 +
    Math.abs(momentum) * 200 +
    (longEMA !== 0 ? ((shortEMA - longEMA) / longEMA) * 1000 : 0);
  const probability = Math.round(clamp(rawProb, 45, 95));

  const trend: AISignal["trend"] =
    signalType === "BUY"
      ? "Bullish"
      : signalType === "SELL"
        ? "Bearish"
        : "Neutral";

  const tradeType: AISignal["tradeType"] =
    vol > 0.005 ? "Scalp" : vol > 0.002 ? "Intraday" : "Swing";

  return {
    id: `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    asset: symbol,
    signal: signalType,
    entryPrice: price,
    stopLoss,
    takeProfit,
    riskReward,
    probability,
    trend,
    tradeType,
    timestamp: new Date(),
  };
}
