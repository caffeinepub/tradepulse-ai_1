export interface SymbolConfig {
  symbol: string;
  name: string;
  basePrice: number;
  category: "crypto" | "forex" | "gold" | "indices" | "futures" | "commodities";
  precision: number;
  volatility: number;
}

export const SYMBOLS: SymbolConfig[] = [
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    basePrice: 71055,
    category: "crypto",
    precision: 2,
    volatility: 0.004,
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    basePrice: 3500,
    category: "crypto",
    precision: 2,
    volatility: 0.005,
  },
  {
    symbol: "SOL/USD",
    name: "Solana",
    basePrice: 155,
    category: "crypto",
    precision: 3,
    volatility: 0.006,
  },
  {
    symbol: "EUR/USD",
    name: "Euro / Dollar",
    basePrice: 1.0852,
    category: "forex",
    precision: 5,
    volatility: 0.0003,
  },
  {
    symbol: "GBP/USD",
    name: "Pound / Dollar",
    basePrice: 1.2645,
    category: "forex",
    precision: 5,
    volatility: 0.0004,
  },
  {
    symbol: "XAU/USD",
    name: "Gold",
    basePrice: 2380,
    category: "gold",
    precision: 2,
    volatility: 0.002,
  },
  {
    symbol: "SPX",
    name: "S&P 500",
    basePrice: 5200,
    category: "indices",
    precision: 2,
    volatility: 0.002,
  },
  {
    symbol: "NDX",
    name: "Nasdaq 100",
    basePrice: 18200,
    category: "indices",
    precision: 2,
    volatility: 0.003,
  },
  {
    symbol: "NQ1!",
    name: "Nasdaq Futures",
    basePrice: 19800,
    category: "futures",
    precision: 2,
    volatility: 0.003,
  },
  {
    symbol: "ES1!",
    name: "S&P Futures",
    basePrice: 5280,
    category: "futures",
    precision: 2,
    volatility: 0.002,
  },
  {
    symbol: "OIL/USD",
    name: "Crude Oil",
    basePrice: 82,
    category: "commodities",
    precision: 2,
    volatility: 0.005,
  },
  {
    symbol: "SILVER/USD",
    name: "Silver",
    basePrice: 29,
    category: "commodities",
    precision: 3,
    volatility: 0.004,
  },
];

export const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "XAU/USD": "XAU/USD",
  SPX: "SPX",
  NDX: "NDX",
  "NQ1!": "NQ1!",
  "ES1!": "ES1!",
  "OIL/USD": "WTI/USD",
  "SILVER/USD": "XAG/USD",
};

export interface PriceState {
  price: number;
  change24h: number;
  changePercent: number;
  high24h: number;
  low24h: number;
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  index: number;
}

export const priceStates = new Map<string, PriceState>();

function initPriceState(config: SymbolConfig): PriceState {
  const spread = config.basePrice * 0.015;
  return {
    price: config.basePrice,
    change24h: (Math.random() - 0.5) * spread * 2,
    changePercent: (Math.random() - 0.5) * 3,
    high24h: config.basePrice * (1 + Math.random() * 0.02),
    low24h: config.basePrice * (1 - Math.random() * 0.02),
  };
}

export function getPriceState(symbol: string): PriceState {
  if (!priceStates.has(symbol)) {
    const config = SYMBOLS.find((s) => s.symbol === symbol);
    if (config) {
      priceStates.set(symbol, initPriceState(config));
    }
  }
  return (
    priceStates.get(symbol) ?? {
      price: 0,
      change24h: 0,
      changePercent: 0,
      high24h: 0,
      low24h: 0,
    }
  );
}

/**
 * Updates all symbol prices by one tick at standard (1m-calibrated) volatility.
 * Kept for backward compatibility — prefer updatePricesWithScale for timeframe-aware updates.
 */
export function updatePrices(): void {
  for (const config of SYMBOLS) {
    const state = getPriceState(config.symbol);
    const delta = state.price * config.volatility * (Math.random() - 0.5) * 2;
    const newPrice = Math.max(state.price + delta, config.basePrice * 0.5);
    const newChange = newPrice - config.basePrice;
    const newChangePercent = (newChange / config.basePrice) * 100;
    priceStates.set(config.symbol, {
      price: newPrice,
      change24h: newChange,
      changePercent: newChangePercent,
      high24h: Math.max(state.high24h, newPrice),
      low24h: Math.min(state.low24h, newPrice),
    });
  }
}

/**
 * Updates all symbol prices with a timeframe-aware delta scale.
 *
 * tickScaleFactor is typically: Math.sqrt(60_000 / timeframeMs)
 *   1m  → 1.000  (full speed)
 *   5m  → 0.447
 *   15m → 0.258
 *   1H  → 0.129
 *   4H  → 0.065
 *   1D  → 0.026
 *
 * This prevents higher-timeframe candles from moving as fast as 1m candles
 * in terms of tick-to-tick price change.
 */
export function updatePricesWithScale(tickScaleFactor: number): void {
  for (const config of SYMBOLS) {
    const state = getPriceState(config.symbol);
    // Scale per-tick volatility by the timeframe factor
    const scaledVolatility = config.volatility * tickScaleFactor;
    const delta = state.price * scaledVolatility * (Math.random() - 0.5) * 2;
    const newPrice = Math.max(state.price + delta, config.basePrice * 0.5);
    const newChange = newPrice - config.basePrice;
    const newChangePercent = (newChange / config.basePrice) * 100;
    priceStates.set(config.symbol, {
      price: newPrice,
      change24h: newChange,
      changePercent: newChangePercent,
      high24h: Math.max(state.high24h, newPrice),
      low24h: Math.min(state.low24h, newPrice),
    });
  }
}

// Binance ticker symbol → internal symbol mapping
const BINANCE_SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: "BTC/USD",
  ETHUSDT: "ETH/USD",
  SOLUSDT: "SOL/USD",
};

/**
 * Fetches live prices from the Binance REST API for BTC, ETH, and SOL.
 * Updates the SYMBOLS basePrice and seeds the priceStates map with real values.
 * Falls back silently to hardcoded values on any error.
 */
export async function fetchLiveBinancePrices(): Promise<void> {
  try {
    const url =
      "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%5D";
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("[TradePulse] Binance REST fetch failed:", res.status);
      return;
    }
    const tickers: Array<{
      symbol: string;
      lastPrice: string;
      highPrice: string;
      lowPrice: string;
      priceChange: string;
      priceChangePercent: string;
    }> = await res.json();

    for (const ticker of tickers) {
      const internalSymbol = BINANCE_SYMBOL_MAP[ticker.symbol];
      if (!internalSymbol) continue;

      const lastPrice = Number.parseFloat(ticker.lastPrice);
      const highPrice = Number.parseFloat(ticker.highPrice);
      const lowPrice = Number.parseFloat(ticker.lowPrice);
      const priceChange = Number.parseFloat(ticker.priceChange);
      const priceChangePercent = Number.parseFloat(ticker.priceChangePercent);

      // Update basePrice in the SYMBOLS array so future simulated drift is anchored to the real price
      const configEntry = SYMBOLS.find((s) => s.symbol === internalSymbol);
      if (configEntry) {
        configEntry.basePrice = lastPrice;
      }

      // Seed the live price state with real Binance values
      priceStates.set(internalSymbol, {
        price: lastPrice,
        change24h: priceChange,
        changePercent: priceChangePercent,
        high24h: highPrice,
        low24h: lowPrice,
      });
    }
  } catch (err) {
    console.warn(
      "[TradePulse] Binance live price fetch error — using hardcoded values.",
      err,
    );
  }
}

export function generateChartData(
  symbol: string,
  points = 120,
): Array<{ time: string; price: number }> {
  const config = SYMBOLS.find((s) => s.symbol === symbol);
  if (!config) return [];

  const data: Array<{ time: string; price: number }> = [];
  let price = config.basePrice * (1 - Math.random() * 0.03);
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const delta = price * config.volatility * (Math.random() - 0.48) * 2;
    price = Math.max(price + delta, config.basePrice * 0.5);
    const ts = now - i * 60000;
    const d = new Date(ts);
    const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    data.push({ time: timeStr, price });
  }

  return data;
}

/**
 * Formats a timestamp into a time label appropriate for the given timeframe.
 * - Sub-day: "HH:MM"
 * - Day or longer: "MMM DD" (e.g. "Mar 14")
 */
function formatCandleTime(ts: number, timeframeMs: number): string {
  const d = new Date(ts);
  if (timeframeMs < 86_400_000) {
    // Less than 1 day → show hours:minutes
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  // 1 day or longer → show month abbr + day
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${month} ${d.getDate()}`;
}

export function generateCandleHistory(
  symbol: string,
  points = 80,
  timeframeMs = 60_000,
): CandleData[] {
  const config = SYMBOLS.find((s) => s.symbol === symbol);
  if (!config) return [];

  // Scale volatility by square root of timeframe relative to 1m baseline
  // This mimics Brownian motion: larger timeframes produce proportionally larger moves
  const volatilityMultiplier = Math.sqrt(timeframeMs / 60_000);

  const candles: CandleData[] = [];
  let price = config.basePrice * (0.97 + Math.random() * 0.06);
  const now = Date.now();

  for (let i = points - 1; i >= 0; i--) {
    const open = price;
    // Generate realistic intra-candle movement scaled by timeframe
    const numTicks = 10;
    let high = open;
    let low = open;
    let close = open;
    for (let t = 0; t < numTicks; t++) {
      const tick =
        close *
        config.volatility *
        volatilityMultiplier *
        (Math.random() - 0.48) *
        3;
      close = Math.max(close + tick, config.basePrice * 0.3);
      high = Math.max(high, close);
      low = Math.min(low, close);
    }
    // Extend wicks slightly, also scaled by timeframe
    const wickMult = config.volatility * volatilityMultiplier * open * 0.4;
    high += Math.random() * wickMult;
    low -= Math.random() * wickMult;

    const ts = now - i * timeframeMs;
    const timeStr = formatCandleTime(ts, timeframeMs);

    candles.push({
      time: timeStr,
      open,
      high,
      low,
      close,
      index: candles.length,
    });
    price = close;
  }

  return candles;
}

export function updateLiveCandle(
  candles: CandleData[],
  newPrice: number,
  _symbolConfig: SymbolConfig,
): CandleData[] {
  if (candles.length === 0) return candles;
  const updated = [...candles];
  const last = { ...updated[updated.length - 1] };
  last.close = newPrice;
  last.high = Math.max(last.high, newPrice);
  last.low = Math.min(last.low, newPrice);
  updated[updated.length - 1] = last;
  return updated;
}

export function formatPrice(price: number, precision: number): string {
  return price.toFixed(precision);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
