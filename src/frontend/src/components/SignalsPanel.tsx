import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { UnifiedSignal } from "../utils/unifiedSignalEngine";

interface SignalsPanelProps {
  currentSignal: UnifiedSignal | null;
  history: UnifiedSignal[];
  symbol: string;
}

function TradeTypeBadge({ type }: { type: UnifiedSignal["tradeType"] }) {
  const map: Record<string, string> = {
    Intraday: "bg-blue-500/15 border-blue-500/40 text-blue-400",
    Swing: "bg-purple-500/15 border-purple-500/40 text-purple-400",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1.5 py-0 border ${map[type] ?? ""}`}
    >
      {type}
    </Badge>
  );
}

function SignalBadge({ signal }: { signal: UnifiedSignal["signal"] }) {
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

function TrendIcon({ trend }: { trend: UnifiedSignal["trend"] }) {
  if (trend === "Bullish")
    return <TrendingUp className="w-3.5 h-3.5 text-buy" />;
  if (trend === "Bearish")
    return <TrendingDown className="w-3.5 h-3.5 text-sell" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
}

function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

function formatPrice(value: number): string {
  if (value === 0) return "—";
  if (value > 1000) return value.toFixed(2);
  if (value > 10) return value.toFixed(4);
  return value.toFixed(5);
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
    // Audio context not available
  }
}

export function SignalsPanel({
  currentSignal,
  history,
  symbol,
}: SignalsPanelProps) {
  const secondsAgo = useSecondsAgo(currentSignal?.timestamp ?? null);
  const prevSignalIdRef = useRef<string | null>(null);
  const [flashBorder, setFlashBorder] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notifDot, setNotifDot] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const isHoldOrNull = !currentSignal || currentSignal.signal === "HOLD";

  const holdReason =
    currentSignal?.holdReason ??
    currentSignal?.reason ??
    "Scanning for setup...";

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
    if (soundEnabled) {
      playBeep(660, 0.1);
      setTimeout(() => playBeep(880, 0.15), 180);
    }
    setNotifDot(true);
    setFlashBorder(true);
    setTimeout(() => setFlashBorder(false), 1200);
    setTimeout(() => setNotifDot(false), 4000);
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
            className={`w-2 h-2 rounded-full shrink-0 ${
              isHoldOrNull
                ? "bg-amber-400 animate-pulse"
                : "bg-buy animate-pulse"
            }`}
            style={{
              boxShadow: isHoldOrNull
                ? "0 0 6px oklch(0.82 0.18 85 / 0.7)"
                : "0 0 6px oklch(0.72 0.18 145 / 0.7)",
            }}
          />
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Live Signal
          </span>
          {notifDot && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          )}
          <span className="ml-auto text-[9px] text-muted-foreground font-mono">
            {symbol}
          </span>
          <button
            type="button"
            data-ocid="signals.sound_toggle"
            onClick={() => setSoundEnabled((v) => !v)}
            className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
            title={soundEnabled ? "Mute alerts" : "Enable alerts"}
          >
            {soundEnabled ? (
              <Bell className="w-3 h-3" />
            ) : (
              <BellOff className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* HOLD State */}
        {isHoldOrNull ? (
          <div
            data-ocid="signals.hold_card"
            className="rounded p-3 terminal-border border-l-2 border-l-amber-500/40"
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shrink-0"
                style={{ boxShadow: "0 0 8px oklch(0.82 0.18 85 / 0.6)" }}
              />
              <span className="font-display font-bold text-xl leading-none text-amber-400 tracking-wider">
                HOLD
              </span>
              {currentSignal?.timeframe && currentSignal.timeframe !== "—" && (
                <span className="text-[9px] font-mono text-muted-foreground/60 ml-1">
                  — {currentSignal.timeframe}
                </span>
              )}
            </div>
            <p
              data-ocid="signals.hold_reason"
              className="text-xs text-muted-foreground mt-1 mb-1.5 italic leading-tight"
            >
              {holdReason}
            </p>
            <div className="mt-2 text-[9px] text-muted-foreground/60 border border-border/20 rounded px-2 py-1">
              Market Status: Waiting for Setup
            </div>
            <p className="text-[8px] text-muted-foreground/50 mt-1">
              AI monitoring{" "}
              <span className="font-mono text-muted-foreground/70">
                {symbol}
              </span>
            </p>
          </div>
        ) : (
          /* BUY/SELL State */
          <div
            data-ocid="signals.live_card"
            className={`rounded p-2.5 terminal-border ${
              currentSignal.signal === "BUY"
                ? "border-l-2 border-l-buy/60"
                : "border-l-2 border-l-sell/60"
            }`}
          >
            {/* Signal + Trade Type */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-display font-bold text-lg leading-none ${
                    currentSignal.signal === "BUY" ? "text-buy" : "text-sell"
                  }`}
                >
                  {currentSignal.signal}
                </span>
                {currentSignal.timeframe && currentSignal.timeframe !== "—" && (
                  <span className="text-[9px] font-mono font-semibold text-muted-foreground/70 tracking-wide">
                    — {currentSignal.timeframe}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <TradeTypeBadge type={currentSignal.tradeType} />
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
                  className={`font-mono text-[10px] font-semibold ${
                    currentSignal.confidence >= 85
                      ? "text-buy"
                      : currentSignal.confidence >= 70
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

            {/* Price levels */}
            <div
              className="grid gap-x-3 gap-y-1 text-[10px] mb-2"
              style={{ gridTemplateColumns: "repeat(2, 1fr)" }}
            >
              <div>
                <div className="text-muted-foreground">Entry</div>
                <div className="font-mono text-cyan-400 font-medium">
                  {formatPrice(currentSignal.entryPrice)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Stop Loss</div>
                <div className="font-mono text-sell font-medium">
                  {formatPrice(currentSignal.stopLoss)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TP1</div>
                <div className="font-mono text-buy font-medium">
                  {formatPrice(currentSignal.tp1)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">TP2</div>
                <div className="font-mono text-buy font-medium">
                  {formatPrice(currentSignal.tp2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">R:R</div>
                <div className="font-mono text-foreground font-medium">
                  1:{currentSignal.riskReward.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Lot Size</div>
                <div className="font-mono text-foreground font-medium">
                  {currentSignal.lotSize.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Reason */}
            {currentSignal.reason && (
              <div className="mt-2 text-[9px] text-muted-foreground/70 italic leading-tight border-t border-border/30 pt-1.5">
                {currentSignal.reason}
              </div>
            )}

            {/* Updated row */}
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[9px] text-muted-foreground">
                Updated {secondsAgo}s ago
              </span>
            </div>
          </div>
        )}
      </div>

      <Separator className="shrink-0" />

      {/* Collapsible Signal History */}
      <Collapsible
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        className="flex flex-col flex-1 min-h-0"
      >
        <CollapsibleTrigger
          data-ocid="signals.history.toggle"
          className="flex items-center justify-between px-3 py-2 shrink-0 hover:bg-secondary/30 transition-colors w-full text-left"
        >
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Signal History{" "}
            {history.length > 0 && (
              <span className="text-muted-foreground/60">
                ({history.length})
              </span>
            )}
          </span>
          {historyOpen ? (
            <ChevronUp className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          )}
        </CollapsibleTrigger>

        <CollapsibleContent className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div data-ocid="signals.history.table" className="px-2 pb-2">
              {history.length === 0 ? (
                <div
                  data-ocid="signals.history.empty_state"
                  className="text-center py-6 text-[10px] text-muted-foreground"
                >
                  No signals yet.
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
                          {sig.timeframe && sig.timeframe !== "—" && (
                            <span className="text-[8px] font-mono text-muted-foreground/60 border border-border/40 rounded px-1">
                              {sig.timeframe}
                            </span>
                          )}
                          <span className="font-mono text-muted-foreground">
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
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">
                          E:{" "}
                          <span className="text-foreground">
                            {formatPrice(sig.entryPrice)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          SL:{" "}
                          <span className="text-sell">
                            {formatPrice(sig.stopLoss)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          TP1:{" "}
                          <span className="text-buy">
                            {formatPrice(sig.tp1)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono">
                        <span className="text-muted-foreground">
                          RR:{" "}
                          <span className="text-foreground">
                            1:{sig.riskReward.toFixed(2)}
                          </span>
                        </span>
                        <span
                          className={`${
                            sig.confidence >= 85
                              ? "text-buy"
                              : sig.confidence >= 70
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
