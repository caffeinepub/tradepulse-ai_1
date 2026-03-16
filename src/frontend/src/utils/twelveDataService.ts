/**
 * Twelve Data WebSocket service for live market data.
 * Free tier API key — users can replace with their own from twelvedata.com
 * Falls back silently to simulated prices on connection errors.
 */

import { TWELVE_DATA_API_KEY } from "../marketConfig";
import { fetchMetalsLivePrice } from "./metalsService";
import { SYMBOLS, TWELVE_DATA_SYMBOL_MAP, priceStates } from "./priceSimulator";

// Crypto symbols are handled by Binance WebSocket, not Twelve Data
const CRYPTO_SYMBOLS = new Set([
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "BNB/USD",
  "XRP/USD",
  "ADA/USD",
  "DOGE/USD",
  "AVAX/USD",
  "MATIC/USD",
  "DOT/USD",
]);

// Metals pairs use metals.live API instead of Twelve Data
const METALS_PAIRS = new Set(["XAU/USD", "XAG/USD"]);

let ws: WebSocket | null = null;
let activeSymbol: string | null = null;
let priceCallback: ((price: number) => void) | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;
let metalsStopPolling: (() => void) | null = null;

function startMetalsLivePolling(
  pair: "XAU/USD" | "XAG/USD",
  onPrice: (price: number) => void,
): void {
  if (metalsStopPolling) {
    metalsStopPolling();
    metalsStopPolling = null;
  }
  const poll = async () => {
    const price = await fetchMetalsLivePrice(pair);
    if (price > 0) {
      const current = priceStates.get(pair);
      if (current) {
        priceStates.set(pair, {
          ...current,
          price,
          high24h: Math.max(current.high24h, price),
          low24h: Math.min(current.low24h, price),
        });
      }
      const config = SYMBOLS.find((s) => s.symbol === pair);
      if (config) config.basePrice = price;
      onPrice(price);
    }
  };
  poll();
  const timer = setInterval(poll, 5000);
  metalsStopPolling = () => clearInterval(timer);
}

function getTwelveDataSymbol(internalSymbol: string): string | null {
  return TWELVE_DATA_SYMBOL_MAP[internalSymbol] ?? null;
}

function reconnect() {
  if (intentionalClose || !activeSymbol) return;
  reconnectTimer = setTimeout(() => {
    if (!intentionalClose && activeSymbol) {
      connectTwelveData(activeSymbol, priceCallback!);
    }
  }, 3000);
}

export function connectTwelveData(
  symbol: string,
  onPrice: (price: number) => void,
): void {
  // Crypto uses Binance — skip
  if (CRYPTO_SYMBOLS.has(symbol)) return;

  // Metals (XAU/USD, XAG/USD) use metals.live — skip Twelve Data WebSocket
  if (METALS_PAIRS.has(symbol)) {
    startMetalsLivePolling(symbol as "XAU/USD" | "XAG/USD", onPrice);
    return;
  }

  const tdSymbol = getTwelveDataSymbol(symbol);
  if (!tdSymbol) return;

  intentionalClose = false;
  activeSymbol = symbol;
  priceCallback = onPrice;

  // Close any existing connection
  if (ws) {
    intentionalClose = true;
    ws.close();
    ws = null;
    intentionalClose = false;
  }

  try {
    ws = new WebSocket(
      `wss://ws.twelvedata.com/v1/quotes/price?apikey=${TWELVE_DATA_API_KEY}`,
    );

    ws.onopen = () => {
      ws?.send(
        JSON.stringify({
          action: "subscribe",
          params: { symbols: tdSymbol },
        }),
      );
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.event === "price" && typeof data.price === "number") {
          const price = Number(data.price);
          if (price > 0) {
            // Update priceStates so the rest of the app sees the real price
            const current = priceStates.get(symbol);
            if (current) {
              priceStates.set(symbol, {
                ...current,
                price,
                high24h: Math.max(current.high24h, price),
                low24h: Math.min(current.low24h, price),
              });
            }
            // Also update basePrice to keep simulated drift anchored
            const config = SYMBOLS.find((s) => s.symbol === symbol);
            if (config) config.basePrice = price;
            onPrice(price);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => {
      // WebSocket error — fall back to simulation, attempt reconnect
    };

    ws.onclose = () => {
      if (!intentionalClose) reconnect();
    };
  } catch {
    // WebSocket not supported or blocked — silently fall back
  }
}

export function disconnectTwelveData(): void {
  intentionalClose = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  if (metalsStopPolling) {
    metalsStopPolling();
    metalsStopPolling = null;
  }
  activeSymbol = null;
  priceCallback = null;
}

// ─── REST API: Real OHLC Candle Data ────────────────────────────────────────

export interface Candle {
  time: number; // Unix timestamp (seconds)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const FOREX_SYMBOL_MAP: Record<string, string> = {
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "USD/JPY": "USD/JPY",
  "XAU/USD": "XAU/USD",
  // New forex pairs
  "USD/CHF": "USD/CHF",
  "AUD/USD": "AUD/USD",
  "NZD/USD": "NZD/USD",
  "USD/CAD": "USD/CAD",
  "GBP/JPY": "GBP/JPY",
  "EUR/JPY": "EUR/JPY",
  "EUR/GBP": "EUR/GBP",
  "XAG/USD": "XAG/USD",
  "WTI/USD": "WTI/USD",
};

/** Fetch real OHLC candles from Twelve Data REST API */
export async function fetchCandles(
  pair: string,
  interval: "5min" | "15min",
  outputsize = 50,
): Promise<Candle[]> {
  const symbol = FOREX_SYMBOL_MAP[pair] ?? pair;
  const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${TWELVE_DATA_API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === "error") {
      console.error("Twelve Data error:", json.message);
      return [];
    }

    // Twelve Data returns newest-first — reverse to oldest-first
    const values: any[] = json.values ?? [];
    return values.reverse().map((v) => ({
      time: Math.floor(new Date(v.datetime).getTime() / 1000),
      open: Number.parseFloat(v.open),
      high: Number.parseFloat(v.high),
      low: Number.parseFloat(v.low),
      close: Number.parseFloat(v.close),
      volume: Number.parseFloat(v.volume ?? "0"),
    }));
  } catch {
    return [];
  }
}

/** Fetch latest live price from Twelve Data REST API */
export async function fetchLivePrice(pair: string): Promise<number> {
  if (pair === "XAU/USD" || pair === "XAG/USD") {
    return fetchMetalsLivePrice(pair as "XAU/USD" | "XAG/USD");
  }
  const symbol = FOREX_SYMBOL_MAP[pair] ?? pair;
  const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_DATA_API_KEY}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    return Number.parseFloat(json.price ?? "0");
  } catch {
    return 0;
  }
}

/**
 * Start polling candles every 60 seconds (safe for free plan rate limits).
 * Returns a cleanup function to stop polling.
 */
export function startCandlePolling(
  pair: string,
  interval: "5min" | "15min",
  onUpdate: (candles: Candle[]) => void,
): () => void {
  const fetchAndNotify = async () => {
    const candles = await fetchCandles(pair, interval);
    if (candles.length > 0) onUpdate(candles);
  };

  fetchAndNotify(); // fetch immediately on start
  const timer = setInterval(fetchAndNotify, 60_000);

  return () => clearInterval(timer);
}

// ─── Binance REST API: OHLC Candle Data for Crypto ──────────────────────────

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  "BTC/USD": "BTCUSDT",
  "ETH/USD": "ETHUSDT",
  "SOL/USD": "SOLUSDT",
  // New crypto pairs
  "BNB/USD": "BNBUSDT",
  "XRP/USD": "XRPUSDT",
  "ADA/USD": "ADAUSDT",
  "DOGE/USD": "DOGEUSDT",
  "AVAX/USD": "AVAXUSDT",
  "MATIC/USD": "MATICUSDT",
  "DOT/USD": "DOTUSDT",
};

const BINANCE_INTERVAL_MAP: Record<string, string> = {
  "1m": "1m",
  "3m": "3m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
  "1W": "1w",
  "1M": "1M",
};

/** Fetch real OHLC candles from Binance REST API for crypto pairs */
export async function fetchBinanceCandles(
  symbol: string,
  timeframe: string,
  limit = 60,
): Promise<Candle[]> {
  const binanceSymbol = BINANCE_SYMBOL_MAP[symbol];
  if (!binanceSymbol) return [];
  const interval = BINANCE_INTERVAL_MAP[timeframe] ?? "5m";
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;

  try {
    const res = await fetch(url);
    const data: any[][] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((k) => ({
      time: Math.floor(Number(k[0]) / 1000),
      open: Number.parseFloat(k[1]),
      high: Number.parseFloat(k[2]),
      low: Number.parseFloat(k[3]),
      close: Number.parseFloat(k[4]),
      volume: Number.parseFloat(k[5]),
    }));
  } catch {
    return [];
  }
}

/** Fetch live crypto price from Binance REST API */
export async function fetchBinanceLivePrice(symbol: string): Promise<number> {
  const binanceSymbol = BINANCE_SYMBOL_MAP[symbol];
  if (!binanceSymbol) return 0;
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    return Number.parseFloat(json.price ?? "0");
  } catch {
    return 0;
  }
}
