import { useMemo } from "react";
import type {
  BOSCHOCHEvent,
  FVGZone,
  LiquidityZone,
  OrderBlock,
  SMCData,
  SMCSignalContext,
} from "../types/smc";
import type { CandleData } from "../utils/priceSimulator";

function getLookback(timeframe: string): number {
  if (timeframe === "1m" || timeframe === "5m") return 30;
  if (timeframe === "15m" || timeframe === "1H") return 75;
  return 150;
}

export function useSMCEngine(
  candles: CandleData[],
  timeframe: string,
  mtfBias: "bullish" | "bearish" | "neutral",
  currentPrice: number,
): { smcData: SMCData; smcContext: SMCSignalContext } {
  return useMemo(() => {
    const empty: SMCData = {
      liquidityZones: [],
      orderBlocks: [],
      bosChochEvents: [],
      fvgZones: [],
    };
    const emptyCtx: SMCSignalContext = {
      nearOrderBlock: false,
      atLiquiditySweep: false,
      bosConfirmed: false,
      chochWarning: false,
    };

    const lookback = getLookback(timeframe);
    const slice = candles.slice(-lookback);
    const offset = Math.max(0, candles.length - lookback);

    if (slice.length < 6) return { smcData: empty, smcContext: emptyCtx };

    // ── Liquidity Zones (swing highs / lows) ──────────────────────────
    const SW = 3;
    const liquidityZones: LiquidityZone[] = [];
    for (let i = SW; i < slice.length - SW; i++) {
      let isHigh = true;
      let isLow = true;
      for (let j = i - SW; j <= i + SW; j++) {
        if (j === i) continue;
        if (slice[j].high >= slice[i].high) isHigh = false;
        if (slice[j].low <= slice[i].low) isLow = false;
      }
      if (isHigh) {
        liquidityZones.push({
          id: `liq-sell-${offset + i}`,
          type: "sell",
          priceHigh: slice[i].high * 1.0008,
          priceLow: slice[i].high,
          startIndex: offset + i,
          active: currentPrice < slice[i].high,
        });
      }
      if (isLow) {
        liquidityZones.push({
          id: `liq-buy-${offset + i}`,
          type: "buy",
          priceHigh: slice[i].low,
          priceLow: slice[i].low * 0.9992,
          startIndex: offset + i,
          active: currentPrice > slice[i].low,
        });
      }
    }

    // ── Order Blocks ──────────────────────────────────────────────────
    const orderBlocks: OrderBlock[] = [];
    const MIN_IMPULSE = 3;
    for (let i = 0; i < slice.length - MIN_IMPULSE - 1; i++) {
      const c = slice[i];
      const isBear = c.close < c.open;
      const isBull = c.close > c.open;

      if (isBear) {
        let bullCount = 0;
        for (let j = i + 1; j <= i + MIN_IMPULSE + 1 && j < slice.length; j++) {
          if (slice[j].close > slice[j].open) bullCount++;
        }
        if (bullCount >= MIN_IMPULSE) {
          const mid = (c.high + c.low) / 2;
          const mitigated = currentPrice >= c.low && currentPrice <= c.high;
          orderBlocks.push({
            id: `ob-bull-${offset + i}`,
            type: "bull",
            open: c.open,
            close: c.close,
            high: c.high,
            low: c.low,
            index: offset + i,
            mitigated,
          });
          void mid;
        }
      }

      if (isBull) {
        let bearCount = 0;
        for (let j = i + 1; j <= i + MIN_IMPULSE + 1 && j < slice.length; j++) {
          if (slice[j].close < slice[j].open) bearCount++;
        }
        if (bearCount >= MIN_IMPULSE) {
          const mitigated = currentPrice >= c.low && currentPrice <= c.high;
          orderBlocks.push({
            id: `ob-bear-${offset + i}`,
            type: "bear",
            open: c.open,
            close: c.close,
            high: c.high,
            low: c.low,
            index: offset + i,
            mitigated,
          });
        }
      }
    }

    // ── BOS / CHOCH Events ────────────────────────────────────────────
    const bosChochEvents: BOSCHOCHEvent[] = [];
    if (slice.length >= 10) {
      for (let i = 5; i < slice.length; i++) {
        const window = slice.slice(i - 5, i);
        const prevHigh = Math.max(...window.map((c) => c.high));
        const prevLow = Math.min(...window.map((c) => c.low));

        if (slice[i].close > prevHigh) {
          const isBOS = mtfBias === "bullish";
          bosChochEvents.push({
            id: `${isBOS ? "bos" : "choch"}-up-${offset + i}`,
            type: isBOS ? "BOS" : "CHOCH",
            direction: "up",
            price: prevHigh,
            index: offset + i,
          });
        } else if (slice[i].close < prevLow) {
          const isBOS = mtfBias === "bearish";
          bosChochEvents.push({
            id: `${isBOS ? "bos" : "choch"}-dn-${offset + i}`,
            type: isBOS ? "BOS" : "CHOCH",
            direction: "down",
            price: prevLow,
            index: offset + i,
          });
        }
      }
    }

    // ── Fair Value Gaps ───────────────────────────────────────────────
    const fvgZones: FVGZone[] = [];
    for (let i = 2; i < slice.length; i++) {
      const c0 = slice[i - 2];
      const c2 = slice[i];
      if (c0.high < c2.low) {
        // Bullish FVG: gap between c0.high and c2.low
        const filled = currentPrice >= c0.high && currentPrice <= c2.low;
        fvgZones.push({
          id: `fvg-bull-${offset + i}`,
          type: "bull",
          high: c2.low,
          low: c0.high,
          startIndex: offset + i - 2,
          filled,
        });
      } else if (c0.low > c2.high) {
        // Bearish FVG: gap between c2.high and c0.low
        const filled = currentPrice >= c2.high && currentPrice <= c0.low;
        fvgZones.push({
          id: `fvg-bear-${offset + i}`,
          type: "bear",
          high: c0.low,
          low: c2.high,
          startIndex: offset + i - 2,
          filled,
        });
      }
    }

    // ── SMC Signal Context ────────────────────────────────────────────
    const nearOrderBlock = orderBlocks
      .filter((ob) => !ob.mitigated)
      .some(
        (ob) =>
          Math.abs(currentPrice - (ob.high + ob.low) / 2) / currentPrice <
          0.003,
      );

    const last3 = slice.slice(-3);
    const atLiquiditySweep = liquidityZones.some((z) =>
      last3.some(
        (c) =>
          (z.type === "sell" && c.high >= z.priceLow) ||
          (z.type === "buy" && c.low <= z.priceHigh),
      ),
    );

    const recentEvents = bosChochEvents.slice(-5);
    const bosConfirmed = recentEvents.some(
      (e) =>
        e.type === "BOS" &&
        ((e.direction === "up" && mtfBias === "bullish") ||
          (e.direction === "down" && mtfBias === "bearish")),
    );
    const chochWarning = recentEvents.some((e) => e.type === "CHOCH");

    return {
      smcData: {
        liquidityZones: liquidityZones.slice(-8),
        orderBlocks: orderBlocks.slice(-6),
        bosChochEvents: bosChochEvents.slice(-10),
        fvgZones: fvgZones.slice(-8),
      },
      smcContext: {
        nearOrderBlock,
        atLiquiditySweep,
        bosConfirmed,
        chochWarning,
      },
    };
  }, [candles, timeframe, mtfBias, currentPrice]);
}
