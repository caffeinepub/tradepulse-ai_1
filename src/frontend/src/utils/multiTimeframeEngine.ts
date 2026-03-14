// Multi-Timeframe Analysis Engine
// Analyzes market trend across 5 timeframes: 1m, 5m, 15m (entry) and 4H, 1D (higher)

export type TFTrend = "Bullish" | "Bearish" | "Sideways" | "Pullback";

export interface TimeframeTrend {
  tf: string;
  trend: TFTrend;
  strength: number; // 0-100
}

export interface MultiTimeframeAnalysis {
  higherTF: TimeframeTrend[]; // [4H, 1D]
  entryTF: TimeframeTrend[]; // [1m, 5m, 15m]
  higherTFBias: "Bullish" | "Bearish" | "Sideways" | "Conflict";
  entryAlignment: number; // 0-3 entry TFs that align with higher TF bias
  confluenceScore: number; // 0-100
  confluenceBias: "BUY" | "SELL" | "HOLD";
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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Downsample prices by grouping into buckets of `step` and taking the last price per bucket
function downsample(prices: number[], step: number): number[] {
  if (step <= 1) return prices;
  const result: number[] = [];
  for (let i = step - 1; i < prices.length; i += step) {
    result.push(prices[i]);
  }
  // Always include the latest price
  if (
    prices.length > 0 &&
    result[result.length - 1] !== prices[prices.length - 1]
  ) {
    result.push(prices[prices.length - 1]);
  }
  return result;
}

// For shorter entry TFs, use the tail of the price series with higher sensitivity
function upsample(prices: number[], tail: number): number[] {
  return prices.slice(-tail);
}

function computeTrend(
  prices: number[],
  shortPeriod: number,
  longPeriod: number,
  overallBias?: "Bullish" | "Bearish" | "Sideways" | null,
): { trend: TFTrend; strength: number } {
  if (prices.length < 4) return { trend: "Sideways", strength: 20 };

  const currentPrice = prices[prices.length - 1];
  const shortEMA = ema(prices.slice(-shortPeriod * 2), shortPeriod);
  const longEMA = ema(prices.slice(-longPeriod * 2), longPeriod);

  const emaDiff = longEMA !== 0 ? ((shortEMA - longEMA) / longEMA) * 100 : 0;
  const strength = Math.round(clamp(Math.abs(emaDiff) * 500, 10, 100));

  let trend: TFTrend;

  if (shortEMA > longEMA * 1.0005) {
    // Price pulled back below short EMA in a bull structure?
    if (overallBias === "Bullish" && currentPrice < shortEMA * 0.9998) {
      trend = "Pullback";
    } else {
      trend = "Bullish";
    }
  } else if (shortEMA < longEMA * 0.9995) {
    if (overallBias === "Bearish" && currentPrice > shortEMA * 1.0002) {
      trend = "Pullback";
    } else {
      trend = "Bearish";
    }
  } else {
    trend = "Sideways";
  }

  return { trend, strength };
}

export function analyzeMultiTimeframe(
  _symbol: string,
  _price: number,
  chartData: { price: number; time: string }[],
): MultiTimeframeAnalysis {
  const prices = chartData.map((d) => d.price);
  if (prices.length < 10) {
    const fallback: MultiTimeframeAnalysis = {
      higherTF: [
        { tf: "4H", trend: "Sideways", strength: 20 },
        { tf: "1D", trend: "Sideways", strength: 20 },
      ],
      entryTF: [
        { tf: "1m", trend: "Sideways", strength: 20 },
        { tf: "5m", trend: "Sideways", strength: 20 },
        { tf: "15m", trend: "Sideways", strength: 20 },
      ],
      higherTFBias: "Sideways",
      entryAlignment: 0,
      confluenceScore: 20,
      confluenceBias: "HOLD",
    };
    return fallback;
  }

  // ── Higher timeframes: downsample to simulate 4H and 1D candles ─────────
  // 4H → take every 4th data point from the full series (longer-term view)
  const prices4H = downsample(
    prices,
    Math.max(1, Math.floor(prices.length / 25)),
  );
  const prices1D = downsample(
    prices,
    Math.max(1, Math.floor(prices.length / 10)),
  );

  // ── Entry timeframes: use recent tails with different sensitivities ──────
  const prices1m = upsample(prices, 15);
  const prices5m = upsample(prices, 30);
  const prices15m = upsample(prices, 50);

  // Compute higher TF trends first (no pullback override at this level)
  const tf4H = computeTrend(prices4H, 3, 7, null);
  const tf1D = computeTrend(prices1D, 3, 6, null);

  // Higher TF bias: both must agree, otherwise Conflict
  let higherTFBias: MultiTimeframeAnalysis["higherTFBias"];
  const h4Trend = tf4H.trend;
  const h1DTrend = tf1D.trend;

  // Normalize Pullback back to Bullish/Bearish for bias assessment
  const normH4 = h4Trend === "Pullback" ? "Sideways" : h4Trend;
  const normH1D = h1DTrend === "Pullback" ? "Sideways" : h1DTrend;

  if (normH4 === "Bullish" && normH1D === "Bullish") {
    higherTFBias = "Bullish";
  } else if (normH4 === "Bearish" && normH1D === "Bearish") {
    higherTFBias = "Bearish";
  } else if (normH4 === "Sideways" && normH1D === "Sideways") {
    higherTFBias = "Sideways";
  } else if (
    (normH4 === "Bullish" && normH1D === "Sideways") ||
    (normH4 === "Sideways" && normH1D === "Bullish")
  ) {
    higherTFBias = "Bullish";
  } else if (
    (normH4 === "Bearish" && normH1D === "Sideways") ||
    (normH4 === "Sideways" && normH1D === "Bearish")
  ) {
    higherTFBias = "Bearish";
  } else {
    higherTFBias = "Conflict";
  }

  // Compute entry TF trends (Pullback aware against higher TF bias)
  const biasFeed =
    higherTFBias === "Conflict" || higherTFBias === "Sideways"
      ? null
      : higherTFBias;

  const tf1m = computeTrend(prices1m, 3, 6, biasFeed);
  const tf5m = computeTrend(prices5m, 4, 9, biasFeed);
  const tf15m = computeTrend(prices15m, 5, 12, biasFeed);

  // Count entry TFs aligned with higher TF bias
  const entryTrends = [tf1m.trend, tf5m.trend, tf15m.trend];
  let entryAlignment = 0;
  if (higherTFBias === "Bullish") {
    entryAlignment = entryTrends.filter(
      (t) => t === "Bullish" || t === "Pullback",
    ).length;
  } else if (higherTFBias === "Bearish") {
    entryAlignment = entryTrends.filter(
      (t) => t === "Bearish" || t === "Pullback",
    ).length;
  } else {
    // Sideways or Conflict: no strong alignment
    entryAlignment = 0;
  }

  // Confluence score: 0-100 based on how well everything aligns
  const higherStrength = (tf4H.strength + tf1D.strength) / 2;
  const entryStrength = (tf1m.strength + tf5m.strength + tf15m.strength) / 3;
  const alignmentBonus = entryAlignment * 15;
  const biasBonus =
    higherTFBias === "Conflict" ? -20 : higherTFBias === "Sideways" ? 0 : 10;
  const confluenceScore = Math.round(
    clamp(
      higherStrength * 0.5 + entryStrength * 0.3 + alignmentBonus + biasBonus,
      10,
      100,
    ),
  );

  // Confluence bias
  let confluenceBias: MultiTimeframeAnalysis["confluenceBias"];
  if (higherTFBias === "Bullish" && entryAlignment >= 2) {
    confluenceBias = "BUY";
  } else if (higherTFBias === "Bearish" && entryAlignment >= 2) {
    confluenceBias = "SELL";
  } else {
    confluenceBias = "HOLD";
  }

  return {
    higherTF: [
      { tf: "4H", trend: tf4H.trend, strength: tf4H.strength },
      { tf: "1D", trend: tf1D.trend, strength: tf1D.strength },
    ],
    entryTF: [
      { tf: "1m", trend: tf1m.trend, strength: tf1m.strength },
      { tf: "5m", trend: tf5m.trend, strength: tf5m.strength },
      { tf: "15m", trend: tf15m.trend, strength: tf15m.strength },
    ],
    higherTFBias,
    entryAlignment,
    confluenceScore,
    confluenceBias,
  };
}
