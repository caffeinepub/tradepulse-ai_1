export interface StructureEvent {
  type: "BOS" | "CHOCH" | "Breakout" | "Retest";
  direction: "bullish" | "bearish";
  price: number;
  timestamp: Date;
}

export interface MarketAnalysis {
  trend: "Bullish" | "Bearish" | "Sideways";
  trendStrength: number;
  momentumScore: number;
  momentumLabel: "Weak" | "Moderate" | "Strong";
  structureEvents: StructureEvent[];
  liquidityActivity: "High" | "Medium" | "Low";
  volumeSpike: boolean;
  supportLevels: number[];
  resistanceLevels: number[];
  orderBlocks: { price: number; direction: "bullish" | "bearish" }[];
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

// Rolling structure events per symbol — persist across calls
const rollingEvents: Record<string, StructureEvent[]> = {};
let lastTrendPerSymbol: Record<string, "Bullish" | "Bearish" | "Sideways"> = {};

export function analyzeMarket(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
): MarketAnalysis {
  const prices = chartData.map((d) => d.price);

  if (!rollingEvents[symbol]) rollingEvents[symbol] = [];
  const events = rollingEvents[symbol];

  // ── EMAs ──────────────────────────────────────────────────────────────────
  const ema5 = prices.length >= 5 ? ema(prices.slice(-5), 5) : price;
  const ema20 = prices.length >= 20 ? ema(prices.slice(-20), 20) : price;
  const ema50 = prices.length >= 50 ? ema(prices.slice(-50), 50) : price;

  // ── Trend ─────────────────────────────────────────────────────────────────
  let trend: MarketAnalysis["trend"];
  const emaDivPct = ema50 !== 0 ? Math.abs((ema5 - ema50) / ema50) * 100 : 0;
  if (ema5 > ema20 && price > ema50) {
    trend = "Bullish";
  } else if (ema5 < ema20 && price < ema50) {
    trend = "Bearish";
  } else {
    trend = "Sideways";
  }

  // ── Trend strength ────────────────────────────────────────────────────────
  const trendStrength = Math.round(clamp(emaDivPct * 400, 10, 100));

  // ── Momentum ──────────────────────────────────────────────────────────────
  const price10ago = prices.length >= 10 ? prices[prices.length - 10] : price;
  const momentumPct =
    price10ago !== 0 ? ((price - price10ago) / price10ago) * 100 : 0;
  const emaDivScore = clamp(emaDivPct * 300, 0, 50);
  const momentumRaw = clamp(Math.abs(momentumPct) * 300 + emaDivScore, 0, 100);
  const momentumScore = Math.round(momentumRaw);
  const momentumLabel: MarketAnalysis["momentumLabel"] =
    momentumScore >= 65 ? "Strong" : momentumScore >= 35 ? "Moderate" : "Weak";

  // ── Swing highs / lows ────────────────────────────────────────────────────
  const window = prices.slice(-30);
  const swingHighs: number[] = [];
  const swingLows: number[] = [];
  for (let i = 2; i < window.length - 2; i++) {
    if (
      window[i] > window[i - 1] &&
      window[i] > window[i - 2] &&
      window[i] > window[i + 1] &&
      window[i] > window[i + 2]
    ) {
      swingHighs.push(window[i]);
    }
    if (
      window[i] < window[i - 1] &&
      window[i] < window[i - 2] &&
      window[i] < window[i + 1] &&
      window[i] < window[i + 2]
    ) {
      swingLows.push(window[i]);
    }
  }
  const resistanceLevels = swingHighs.slice(-3);
  const supportLevels = swingLows.slice(-3);

  // ── Order blocks ─────────────────────────────────────────────────────────
  const last10 = prices.slice(-10);
  const orderBlocks: MarketAnalysis["orderBlocks"] = [];
  if (last10.length >= 4) {
    const midPrices = last10.slice(0, -2);
    const clusterMean = midPrices.reduce((a, b) => a + b, 0) / midPrices.length;
    const clusterStd = stddev(midPrices);
    if (clusterStd / clusterMean < 0.003) {
      orderBlocks.push({
        price: clusterMean,
        direction: trend === "Bullish" ? "bullish" : "bearish",
      });
    }
  }

  // ── Breakout detection ───────────────────────────────────────────────────
  const last20 = prices.slice(-20);
  const mean20 =
    last20.length > 0
      ? last20.reduce((a, b) => a + b, 0) / last20.length
      : price;
  const std20 = stddev(last20);
  const isBreakout = std20 > 0 && Math.abs(price - mean20) > 2 * std20;

  // ── Volume spike ─────────────────────────────────────────────────────────
  const moves = prices
    .slice(-20)
    .map((p, i, arr) => (i > 0 ? Math.abs(p - arr[i - 1]) : 0))
    .filter(Boolean);
  const avgMove =
    moves.length > 0 ? moves.reduce((a, b) => a + b, 0) / moves.length : 0;
  const lastMove =
    prices.length >= 2
      ? Math.abs(prices[prices.length - 1] - prices[prices.length - 2])
      : 0;
  const volumeSpike = avgMove > 0 && lastMove > avgMove * 1.5;

  // ── Liquidity ────────────────────────────────────────────────────────────
  const rangeVol = std20 / (mean20 || 1);
  const liquidityActivity: MarketAnalysis["liquidityActivity"] =
    rangeVol > 0.008 ? "High" : rangeVol > 0.003 ? "Medium" : "Low";

  // ── Structure event generation (probabilistic) ──────────────────────────
  const prevTrend = lastTrendPerSymbol[symbol];
  const now = new Date();

  // BOS: break of structure based on swing high/low
  if (
    swingHighs.length > 0 &&
    price > Math.max(...swingHighs) &&
    Math.random() < 0.08
  ) {
    events.unshift({
      type: "BOS",
      direction: "bullish",
      price,
      timestamp: now,
    });
  } else if (
    swingLows.length > 0 &&
    price < Math.min(...swingLows) &&
    Math.random() < 0.08
  ) {
    events.unshift({
      type: "BOS",
      direction: "bearish",
      price,
      timestamp: now,
    });
  }

  // CHOCH: change of character when trend flips
  if (
    prevTrend &&
    prevTrend !== trend &&
    trend !== "Sideways" &&
    Math.random() < 0.5
  ) {
    events.unshift({
      type: "CHOCH",
      direction: trend === "Bullish" ? "bullish" : "bearish",
      price,
      timestamp: now,
    });
  }

  // Breakout
  if (isBreakout && Math.random() < 0.12) {
    events.unshift({
      type: "Breakout",
      direction: price > mean20 ? "bullish" : "bearish",
      price,
      timestamp: now,
    });
  }

  // Retest: price near support/resistance
  const allLevels = [...supportLevels, ...resistanceLevels];
  const nearLevel = allLevels.find(
    (lvl) => Math.abs(price - lvl) / lvl < 0.002,
  );
  if (nearLevel && Math.random() < 0.06) {
    events.unshift({
      type: "Retest",
      direction: price >= nearLevel ? "bullish" : "bearish",
      price,
      timestamp: now,
    });
  }

  // Organic random events at low probability
  if (Math.random() < 0.015) {
    const types: StructureEvent["type"][] = [
      "BOS",
      "CHOCH",
      "Breakout",
      "Retest",
    ];
    const dirs: StructureEvent["direction"][] = ["bullish", "bearish"];
    events.unshift({
      type: types[Math.floor(Math.random() * types.length)],
      direction:
        trend === "Bullish"
          ? "bullish"
          : trend === "Bearish"
            ? "bearish"
            : dirs[Math.floor(Math.random() * dirs.length)],
      price,
      timestamp: now,
    });
  }

  // Cap at 20
  rollingEvents[symbol] = events.slice(0, 20);
  lastTrendPerSymbol[symbol] = trend;

  return {
    trend,
    trendStrength,
    momentumScore,
    momentumLabel,
    structureEvents: rollingEvents[symbol],
    liquidityActivity,
    volumeSpike,
    supportLevels,
    resistanceLevels,
    orderBlocks,
  };
}
