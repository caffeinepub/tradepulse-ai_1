import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AISignal } from "../utils/aiSignalEngine";

interface SignalsPanelProps {
  currentSignal: AISignal | null;
  history: AISignal[];
  symbol: string;
  scalpsToday?: number;
}

function TradeTypeBadge({
  type,
  scalpsToday,
}: {
  type: AISignal["tradeType"];
  scalpsToday?: number;
}) {
  const map = {
    Scalp: "bg-amber-500/15 border-amber-500/40 text-amber-400",
    Intraday: "bg-blue-500/15 border-blue-500/40 text-blue-400",
    Swing: "bg-purple-500/15 border-purple-500/40 text-purple-400",
    Position: "bg-emerald-500/15 border-emerald-500/40 text-emerald-400",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 border ${map[type]}`}
    >
      {type}
      {type === "Scalp" && scalpsToday !== undefined && scalpsToday > 0 && (
        <span className="ml-1 opacity-70">({scalpsToday}/3)</span>
      )}
    </Badge>
  );
}

function SignalBadge({ signal }: { signal: AISignal["signal"] }) {
  const classes =
    signal === "BUY"
      ? "bg-buy border-buy text-buy font-bold"
      : signal === "SELL"
        ? "bg-sell border-sell text-sell font-bold"
        : "bg-muted border-border text-muted-foreground font-bold";
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${classes}`}>
      {signal}
    </Badge>
  );
}

function TrendIcon({ trend }: { trend: AISignal["trend"] }) {
  if (trend === "Bullish")
    return <TrendingUp className="w-3.5 h-3.5 text-buy" />;
  if (trend === "Bearish")
    return <TrendingDown className="w-3.5 h-3.5 text-sell" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

function useSecondsAgo(timestamp: Date | null): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!timestamp) return;
    const update = () =>
      setSeconds(Math.floor((Date.now() - timestamp.getTime()) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timestamp]);
  return seconds;
}

function playBeep(freq = 880, duration = 0.15) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
    osc.onended = () => ctx.close();
  } catch (_) {
    // Audio context not available — silently ignore
  }
}

export function SignalsPanel({
  currentSignal,
  history,
  symbol,
  scalpsToday,
}: SignalsPanelProps) {
  const secondsAgo = useSecondsAgo(currentSignal?.timestamp ?? null);
  const prevSignalIdRef = useRef<string | null>(null);
  const [flashBorder, setFlashBorder] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notifDot, setNotifDot] = useState(false);

  // Alert system: detect new signals
  useEffect(() => {
    if (!currentSignal) return;
    if (currentSignal.id === prevSignalIdRef.current) return;
    if (currentSignal.signal === "HOLD") {
      prevSignalIdRef.current = currentSignal.id;
      return;
    }
    const isNew = prevSignalIdRef.current !== null;
    prevSignalIdRef.current = currentSignal.id;
    if (!isNew) return;

    if (currentSignal.tradeType === "Scalp") {
      // Always flash + beep for scalp
      playBeep(880, 0.15);
      setFlashBorder(true);
      setTimeout(() => setFlashBorder(false), 1200);
    } else if (soundEnabled) {
      // Non-scalp: only beep if sound enabled
      playBeep(660, 0.1);
      setNotifDot(true);
      setTimeout(() => setNotifDot(false), 4000);
    } else {
      setNotifDot(true);
      setTimeout(() => setNotifDot(false), 4000);
    }
  }, [currentSignal, soundEnabled]);

  return (
    <div
      data-ocid="signals.panel"
      className={`flex flex-col h-full bg-card border-l border-border overflow-hidden transition-all duration-300 ${
        flashBorder ? "ring-2 ring-amber-400/60" : ""
      }`}
    >
      {/* Live Signal Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full bg-buy animate-pulse-green shrink-0"
            style={{ boxShadow: "0 0 6px oklch(0.72 0.18 145 / 0.7)" }}
          />
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Live Signal
          </span>
          {notifDot && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          )}
          <span className="ml-auto text-[9px] text-muted-foreground font-mono-num">
            {symbol}
          </span>
          {/* Sound toggle for non-scalp signals */}
          <button
            type="button"
            data-ocid="signals.sound_toggle"
            onClick={() => setSoundEnabled((v) => !v)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            title={
              soundEnabled ? "Mute non-scalp alerts" : "Enable non-scalp alerts"
            }
          >
            {soundEnabled ? (
              <Bell className="w-3 h-3" />
            ) : (
              <BellOff className="w-3 h-3" />
            )}
          </button>
        </div>

        {currentSignal ? (
          <div
            data-ocid="signals.live_card"
            className={`rounded p-2.5 terminal-border ${
              currentSignal.signal === "BUY"
                ? "border-l-2 border-l-buy/60"
                : currentSignal.signal === "SELL"
                  ? "border-l-2 border-l-sell/60"
                  : "border-l-2 border-l-border"
            }`}
          >
            {/* Signal + Trade Type */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-display font-bold text-lg leading-none ${
                    currentSignal.signal === "BUY"
                      ? "text-buy"
                      : currentSignal.signal === "SELL"
                        ? "text-sell"
                        : "text-muted-foreground"
                  }`}
                >
                  {currentSignal.signal}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <TradeTypeBadge
                  type={currentSignal.tradeType}
                  scalpsToday={scalpsToday}
                />
                <Badge
                  variant="outline"
                  className="text-[9px] border-border text-muted-foreground/60 px-1.5 py-0"
                >
                  {currentSignal.expectedDuration}
                </Badge>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-muted-foreground">
                  Confidence
                </span>
                <span
                  className={`font-mono-num text-[10px] font-semibold ${
                    currentSignal.confidence >= 70
                      ? "text-buy"
                      : currentSignal.confidence >= 55
                        ? "text-foreground"
                        : "text-sell"
                  }`}
                >
                  {currentSignal.confidence}%
                </span>
              </div>
              <Progress
                value={currentSignal.confidence}
                className="h-1.5"
                style={{ background: "oklch(0.16 0.012 240)" }}
              />
            </div>

            {/* Confidence Breakdown */}
            {currentSignal.confidenceBreakdown && (
              <div className="mb-2 space-y-0.5">
                {(
                  [
                    ["Trend", currentSignal.confidenceBreakdown.trendAlignment],
                    [
                      "Indicators",
                      currentSignal.confidenceBreakdown.indicatorConfluence,
                    ],
                    [
                      "Volume",
                      currentSignal.confidenceBreakdown.volumeConfirmation,
                    ],
                    [
                      "Structure",
                      currentSignal.confidenceBreakdown.structureSignals,
                    ],
                  ] as [string, number][]
                ).map(([label, val]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="text-[8px] text-muted-foreground w-14 shrink-0">
                      {label}
                    </span>
                    <div
                      className="flex-1 rounded-full overflow-hidden"
                      style={{
                        height: "3px",
                        background: "oklch(0.16 0.012 240)",
                      }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(val / 25) * 100}%`,
                          background:
                            val >= 18
                              ? "oklch(0.72 0.18 145)"
                              : val >= 10
                                ? "oklch(0.72 0.18 60)"
                                : "oklch(0.52 0.01 220)",
                        }}
                      />
                    </div>
                    <span className="text-[8px] font-mono-num text-muted-foreground w-4 text-right">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Trend */}
            <div className="flex items-center gap-1 mb-2">
              <TrendIcon trend={currentSignal.trend} />
              <span
                className={`text-[10px] font-semibold ${
                  currentSignal.trend === "Bullish"
                    ? "text-buy"
                    : currentSignal.trend === "Bearish"
                      ? "text-sell"
                      : "text-muted-foreground"
                }`}
              >
                {currentSignal.trend}
              </span>
            </div>

            {/* Price grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
              <div>
                <div className="text-muted-foreground">Entry</div>
                <div className="font-mono-num text-foreground font-medium">
                  {currentSignal.entryPrice.toFixed(
                    currentSignal.entryPrice > 100 ? 2 : 5,
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="font-mono-num text-sell font-medium">
                  {currentSignal.stopLoss.toFixed(
                    currentSignal.stopLoss > 100 ? 2 : 5,
                  )}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TP1</div>
                <div className="font-mono-num text-buy font-medium">
                  {currentSignal.tp1.toFixed(currentSignal.tp1 > 100 ? 2 : 5)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">R:R</div>
                <div className="font-mono-num text-foreground font-medium">
                  1:{currentSignal.riskReward.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TP2</div>
                <div className="font-mono-num text-buy font-medium">
                  {currentSignal.tp2.toFixed(currentSignal.tp2 > 100 ? 2 : 5)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TP3</div>
                <div className="font-mono-num text-buy font-medium">
                  {currentSignal.tp3.toFixed(currentSignal.tp3 > 100 ? 2 : 5)}
                </div>
              </div>
            </div>

            {/* Confirmation reason */}
            {currentSignal.confirmationReason && (
              <div className="mt-2 text-[9px] text-muted-foreground/70 italic leading-tight border-t border-border/30 pt-1.5">
                {currentSignal.confirmationReason}
              </div>
            )}

            <div className="mt-1.5 text-[9px] text-muted-foreground">
              Updated {secondsAgo}s ago
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-[10px] text-muted-foreground">
            Analyzing market data...
          </div>
        )}
      </div>

      <Separator className="shrink-0" />

      {/* Signal History Header */}
      <div className="px-3 py-2 shrink-0">
        <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
          Signal History
        </span>
      </div>

      {/* History Table */}
      <ScrollArea className="flex-1 min-h-0">
        <div data-ocid="signals.history.table" className="px-2 pb-2">
          {history.length === 0 ? (
            <div
              data-ocid="signals.history.empty_state"
              className="text-center py-6 text-[10px] text-muted-foreground"
            >
              Signals will appear here.
            </div>
          ) : (
            <div className="space-y-px">
              {history.map((sig, idx) => (
                <div
                  key={sig.id}
                  data-ocid={`signals.history.row.${idx + 1}`}
                  className={`rounded px-2 py-1.5 text-[9px] flex flex-col gap-0.5 ${
                    idx % 2 === 0 ? "bg-secondary/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <SignalBadge signal={sig.signal} />
                      <span className="font-mono-num text-muted-foreground">
                        {formatTime(sig.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] ${
                          sig.trend === "Bullish"
                            ? "text-buy"
                            : sig.trend === "Bearish"
                              ? "text-sell"
                              : "text-muted-foreground"
                        }`}
                      >
                        {sig.trend}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <TradeTypeBadge type={sig.tradeType} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between font-mono-num">
                    <span className="text-muted-foreground">
                      E:{" "}
                      <span className="text-foreground">
                        {sig.entryPrice.toFixed(sig.entryPrice > 100 ? 2 : 5)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      SL:{" "}
                      <span className="text-sell">
                        {sig.stopLoss.toFixed(sig.stopLoss > 100 ? 2 : 5)}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      TP1:{" "}
                      <span className="text-buy">
                        {sig.tp1.toFixed(sig.tp1 > 100 ? 2 : 5)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-mono-num">
                    <span className="text-muted-foreground">
                      RR:{" "}
                      <span className="text-foreground">
                        1:{sig.riskReward.toFixed(2)}
                      </span>
                    </span>
                    <span
                      className={`${
                        sig.confidence >= 70
                          ? "text-buy"
                          : sig.confidence >= 55
                            ? "text-foreground"
                            : "text-sell"
                      }`}
                    >
                      {sig.confidence}%
                    </span>
                  </div>
                  {sig.confirmationReason && (
                    <div className="text-[8px] text-muted-foreground/60 italic truncate">
                      {sig.confirmationReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
