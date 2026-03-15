/**
 * Twelve Data WebSocket service for live market data.
 * Free tier API key — users can replace with their own from twelvedata.com
 * Falls back silently to simulated prices on connection errors.
 */

import { SYMBOLS, TWELVE_DATA_SYMBOL_MAP, priceStates } from "./priceSimulator";

const TWELVE_DATA_API_KEY = "demo"; // Replace with real key from twelvedata.com

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
