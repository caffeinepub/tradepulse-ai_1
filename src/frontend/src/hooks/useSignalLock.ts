import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLivePrice } from "../utils/twelveDataService";
import type { UnifiedSignal } from "../utils/unifiedSignalEngine";

export type LockStatus = "ACTIVE" | "TP1_HIT" | "SL_HIT" | "EXPIRED";

export interface LockedSignalState {
  signal: UnifiedSignal;
  lockedAt: number; // ms timestamp
  status: LockStatus;
  closedAt?: number;
}

const LOCK_CONFIDENCE_THRESHOLD = 75;
const EXPIRY_MS = 90 * 60 * 1000; // 90 minutes
const CLOSED_DISPLAY_MS = 30 * 1000; // show closed result for 30s then clear

// Crypto pairs that use Binance WebSocket
const CRYPTO_PAIRS = new Set([
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

// Map pair to Binance WebSocket symbol (e.g. BTC/USD -> btcusdt)
function toBinanceWsSymbol(pair: string): string {
  const base = pair.split("/")[0].toLowerCase();
  return `${base}usdt`;
}

function isCryptoPair(pair: string): boolean {
  return CRYPTO_PAIRS.has(pair);
}

function calcProgress(
  currentPrice: number,
  sl: number,
  tp1: number,
  isBuy: boolean,
): number {
  if (isBuy) {
    const range = tp1 - sl;
    if (range <= 0) return 50;
    return Math.max(0, Math.min(100, ((currentPrice - sl) / range) * 100));
  }
  // SELL: SL is above entry, TP1 is below entry
  const range = sl - tp1;
  if (range <= 0) return 50;
  return Math.max(0, Math.min(100, ((sl - currentPrice) / range) * 100));
}

function calcPips(
  currentPrice: number,
  entryPrice: number,
  isBuy: boolean,
  pair: string,
): number {
  const diff = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
  const isJpy = pair.includes("JPY");
  const isCryptoOrMetal = currentPrice > 500;
  if (isCryptoOrMetal) return Number.parseFloat(diff.toFixed(2));
  if (isJpy) return Number.parseFloat((diff * 100).toFixed(1));
  return Number.parseFloat((diff * 10000).toFixed(1));
}

export function useSignalLock(params: {
  currentSignal: UnifiedSignal | null;
  currentPrice: number;
  symbol: string;
}) {
  const { currentSignal, currentPrice, symbol } = params;

  const [lockedState, setLockedState] = useState<LockedSignalState | null>(
    null,
  );
  const [livePrice, setLivePrice] = useState<number>(0);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const symbolRef = useRef(symbol);
  const wsPriceRef = useRef<WebSocket | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Internal live price fetching — routed by pair type
  useEffect(() => {
    // Cleanup previous connections
    if (wsPriceRef.current) {
      wsPriceRef.current.close();
      wsPriceRef.current = null;
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    if (!symbol) return;

    if (isCryptoPair(symbol)) {
      // Binance WebSocket for live crypto price
      const wsSymbol = toBinanceWsSymbol(symbol);
      const ws = new WebSocket(
        `wss://stream.binance.com:9443/ws/${wsSymbol}@miniTicker`,
      );
      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          const price = Number.parseFloat(data.c);
          if (price > 0) setLivePrice(price);
        } catch {
          // ignore parse errors
        }
      };
      wsPriceRef.current = ws;
    } else {
      // Twelve Data REST API polling for forex/commodities
      const poll = async () => {
        try {
          const price = await fetchLivePrice(symbol);
          if (price > 0) setLivePrice(price);
        } catch {
          // ignore fetch errors
        }
      };
      poll(); // immediate first fetch
      pollTimerRef.current = setInterval(poll, 3000); // poll every 3 seconds
    }

    return () => {
      if (wsPriceRef.current) {
        wsPriceRef.current.close();
        wsPriceRef.current = null;
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [symbol]);

  // Use internally fetched live price; fallback to prop if not yet available
  const activePrice = livePrice > 0 ? livePrice : currentPrice;

  // Track symbol changes for reset
  useEffect(() => {
    if (symbolRef.current !== symbol) {
      symbolRef.current = symbol;
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      setLockedState(null);
      setLivePrice(0);
    }
  });

  // Lock a new signal when conditions are met
  useEffect(() => {
    if (!currentSignal) return;
    const sig = currentSignal;
    const isBuySell =
      sig.signal === "BUY" ||
      sig.signal === "SELL" ||
      sig.signal === "STRONG BUY" ||
      sig.signal === "STRONG SELL";
    if (!isBuySell) return;
    if (sig.confidence < LOCK_CONFIDENCE_THRESHOLD) return;

    setLockedState((prev) => {
      // Don't lock a new signal if one is already ACTIVE
      if (prev && prev.status === "ACTIVE") {
        const prevIsBuy =
          prev.signal.signal === "BUY" || prev.signal.signal === "STRONG BUY";
        const newIsStrongSell = sig.signal === "STRONG SELL" && !prevIsBuy;
        const newIsStrongBuy = sig.signal === "STRONG BUY" && prevIsBuy;
        if (!newIsStrongSell && !newIsStrongBuy) return prev;
      }
      // Already locked same signal
      if (prev && prev.signal.id === sig.id && prev.status === "ACTIVE")
        return prev;
      // Don't re-lock a closed signal
      if (prev && prev.status !== "ACTIVE" && prev.signal.id === sig.id)
        return prev;

      return { signal: sig, lockedAt: Date.now(), status: "ACTIVE" };
    });
  }, [currentSignal]);

  // Monitor price and time for ACTIVE locked signals
  useEffect(() => {
    if (!lockedState || lockedState.status !== "ACTIVE") return;
    if (activePrice <= 0) return;

    const { signal, lockedAt } = lockedState;
    const isBuy = signal.signal === "BUY" || signal.signal === "STRONG BUY";
    const sl = signal.stopLoss;
    const tp1 = signal.tp1;
    const now = Date.now();

    if (now - lockedAt >= EXPIRY_MS) {
      closeSignal("EXPIRED");
      return;
    }

    if (isBuy) {
      if (activePrice <= sl) {
        closeSignal("SL_HIT");
        return;
      }
      if (activePrice >= tp1) {
        closeSignal("TP1_HIT");
        return;
      }
    } else {
      if (activePrice >= sl) {
        closeSignal("SL_HIT");
        return;
      }
      if (activePrice <= tp1) {
        closeSignal("TP1_HIT");
        return;
      }
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: closeSignal is stable
  }, [activePrice, lockedState]);

  function closeSignal(status: LockStatus) {
    setLockedState((prev) =>
      prev ? { ...prev, status, closedAt: Date.now() } : null,
    );
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(
      () => setLockedState(null),
      CLOSED_DISPLAY_MS,
    );
  }

  const clearLock = useCallback(() => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setLockedState(null);
  }, []);

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    },
    [],
  );

  const isBuy = lockedState
    ? lockedState.signal.signal === "BUY" ||
      lockedState.signal.signal === "STRONG BUY"
    : false;

  const progressPercent =
    lockedState && activePrice > 0
      ? calcProgress(
          activePrice,
          lockedState.signal.stopLoss,
          lockedState.signal.tp1,
          isBuy,
        )
      : 0;

  const pips =
    lockedState && activePrice > 0
      ? calcPips(activePrice, lockedState.signal.entryPrice, isBuy, symbol)
      : 0;

  const signalAgeMs = lockedState ? Date.now() - lockedState.lockedAt : 0;

  return {
    lockedState,
    progressPercent,
    pips,
    signalAgeMs,
    clearLock,
    isLocked: lockedState?.status === "ACTIVE",
  };
}
