/**
 * Twelve Data WebSocket service for live market data.
 * Free tier API key — users can replace with their own from twelvedata.com
 * Falls back silently to simulated prices on connection errors.
 */

import { TWELVE_DATA_API_KEY } from "../marketConfig";
import { SYMBOLS, TWELVE_DATA_SYMBOL_MAP, priceStates } from "./priceSimulator";

// Crypto symbols are handled by Binance WebSocket, not Twelve Data
const CRYPTO_SYMBOLS = new Set(["BTC/USD", "ETH/USD", "SOL/USD"]);

let ws: WebSocket | null = null;
let activeSymbol: string | null = null;
let priceCallback: ((price: number) => void) | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let intentionalClose = false;

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
