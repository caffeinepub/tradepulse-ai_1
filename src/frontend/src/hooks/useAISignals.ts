import { useEffect, useRef, useState } from "react";
import type { FactorWeights, SMCSignalContext } from "../types/smc";
import {
  type AISignal,
  type MarketType,
  generateSignal,
  getSignalTimeout,
} from "../utils/aiSignalEngine";
import type { MarketAnalysis } from "../utils/marketAnalysisEngine";
import type { MultiTimeframeAnalysis } from "../utils/multiTimeframeEngine";
import type { SentimentLabel } from "../utils/newsService";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function useAISignals(
  symbol: string,
  price: number,
  chartData: { price: number; time: string }[],
  analysis?: MarketAnalysis | null,
  mtf?: MultiTimeframeAnalysis | null,
  overallSentiment?: SentimentLabel,
  sentimentStrength?: number,
  smcContext?: SMCSignalContext,
  optimizerWeights?: FactorWeights,
  selectedTimeframe?: string,
  scalpsToday?: number,
  positionSize?: number,
  marketType?: MarketType,
): {
  currentSignal: AISignal | null;
  history: AISignal[];
  signalExpiresAt: number | null;
} {
  const [liveSignal, setLiveSignal] = useState<AISignal | null>(null);
  const [history, setHistory] = useState<AISignal[]>([]);
  const [signalExpiresAt, setSignalExpiresAt] = useState<number | null>(null);

  const liveSignalRef = useRef<AISignal | null>(null);
  const expiryRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<string | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  const prevSymbolRef = useRef(symbol);
  const analysisRef = useRef(analysis);
  const mtfRef = useRef(mtf);
  const sentimentRef = useRef({ overallSentiment, sentimentStrength });
  const smcContextRef = useRef(smcContext);
  const optimizerWeightsRef = useRef(optimizerWeights);
  const timeframeRef = useRef(selectedTimeframe);
  const scalpsTodayRef = useRef(scalpsToday);
  const positionSizeRef = useRef(positionSize);
  const marketTypeRef = useRef(marketType);

  analysisRef.current = analysis;
  mtfRef.current = mtf;
  sentimentRef.current = { overallSentiment, sentimentStrength };
  smcContextRef.current = smcContext;
  optimizerWeightsRef.current = optimizerWeights;
  timeframeRef.current = selectedTimeframe;
  scalpsTodayRef.current = scalpsToday;
  positionSizeRef.current = positionSize;
  marketTypeRef.current = marketType;

  useEffect(() => {
    if (prevSymbolRef.current !== symbol) {
      prevSymbolRef.current = symbol;
      setHistory([]);
      setLiveSignal(null);
      liveSignalRef.current = null;
      expiryRef.current = null;
      lastDirectionRef.current = null;
      lastUpdateTimeRef.current = 0;
      setSignalExpiresAt(null);
    }
  }, [symbol]);

  useEffect(() => {
    const tick = () => {
      if (price <= 0 || chartData.length < 5) return;

      let signal = generateSignal(
        symbol,
        price,
        chartData,
        analysisRef.current,
        mtfRef.current,
        sentimentRef.current.overallSentiment,
        sentimentRef.current.sentimentStrength,
        timeframeRef.current,
        scalpsTodayRef.current,
        positionSizeRef.current,
        marketTypeRef.current,
      );

      // Apply SMC context adjustments
      const smc = smcContextRef.current;
      if (smc) {
        let conf = signal.confidence;
        let sig = signal.signal;

        if (smc.nearOrderBlock) conf = Math.min(95, conf + 6);
        if (smc.atLiquiditySweep) conf = Math.min(95, conf + 5);
        if (smc.bosConfirmed && sig === "BUY") conf = Math.min(95, conf + 5);
        if (smc.chochWarning && (sig === "BUY" || sig === "SELL")) {
          conf = Math.max(40, conf - 8);
          if (conf < 50) sig = "HOLD";
        }

        signal = { ...signal, signal: sig, confidence: Math.round(conf) };
      }

      // Apply optimizer weight scaling
      const w = optimizerWeightsRef.current;
      if (w) {
        const bd = signal.confidenceBreakdown;
        const weightedSum =
          bd.trendAlignment * w.trendAlignment +
          bd.indicatorConfluence * w.indicatorConfluence +
          bd.volumeConfirmation * w.volumeConfirmation +
          bd.structureSignals * w.structureSignals;
        const baseSum =
          bd.trendAlignment +
          bd.indicatorConfluence +
          bd.volumeConfirmation +
          bd.structureSignals;
        if (baseSum > 0) {
          const scale = weightedSum / baseSum;
          const newConf = Math.round(clamp(signal.confidence * scale, 40, 95));
          signal = { ...signal, confidence: newConf };
        }
      }

      const now = Date.now();
      const currentDir = liveSignalRef.current?.signal ?? null;
      const isExpired = expiryRef.current !== null && now > expiryRef.current;
      const directionChanged = signal.signal !== currentDir;
      const cooldownPassed = now - lastUpdateTimeRef.current >= 60_000;
      const candidateIsActionable =
        signal.signal === "BUY" || signal.signal === "SELL";

      // Decide whether to emit this signal
      const shouldEmit =
        isExpired ||
        directionChanged ||
        (cooldownPassed && candidateIsActionable && currentDir === null);

      if (shouldEmit) {
        if (candidateIsActionable) {
          // Emit BUY/SELL
          const expiresAt = now + getSignalTimeout(signal.tradeType);
          liveSignalRef.current = signal;
          expiryRef.current = expiresAt;
          lastDirectionRef.current = signal.signal;
          lastUpdateTimeRef.current = now;
          setLiveSignal(signal);
          setSignalExpiresAt(expiresAt);
          setHistory((prev) => [signal, ...prev].slice(0, 100));
        } else {
          // HOLD: only update if current is also HOLD or expired
          if (currentDir === "HOLD" || currentDir === null || isExpired) {
            liveSignalRef.current = signal;
            expiryRef.current = null;
            lastDirectionRef.current = "HOLD";
            setLiveSignal(signal);
            setSignalExpiresAt(null);
            // Do NOT add HOLD to history
          }
        }
      } else if (
        !candidateIsActionable &&
        currentDir !== "HOLD" &&
        currentDir !== null &&
        isExpired
      ) {
        // Current expired and candidate is HOLD - transition to HOLD
        liveSignalRef.current = signal;
        expiryRef.current = null;
        lastDirectionRef.current = "HOLD";
        setLiveSignal(signal);
        setSignalExpiresAt(null);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [symbol, price, chartData]);

  return { currentSignal: liveSignal, history, signalExpiresAt };
}
