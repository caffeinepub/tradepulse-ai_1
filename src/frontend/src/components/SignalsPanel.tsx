import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { useSignalLock } from "../hooks/useSignalLock";
import type { UnifiedSignal } from "../utils/unifiedSignalEngine";
import { LockedSignalCard } from "./LockedSignalCard";

interface SignalsPanelProps {
  currentSignal: UnifiedSignal | null;
  history: UnifiedSignal[];
  symbol: string;
  currentPrice?: number;
}

function SignalBadge({ signal }: { signal: UnifiedSignal["signal"] }) {
  const classes =
    signal === "BUY" || signal === "STRONG BUY"
      ? "bg-buy border-buy text-buy font-bold"
      : signal === "SELL" || signal === "STRONG SELL"
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
  } catch (_) {}
}

export function SignalsPanel({
  currentSignal,
  history,
  symbol,
  currentPrice = 0,
}: SignalsPanelProps) {
  const { lockedState, progressPercent, pips, signalAgeMs, clearLock } =
    useSignalLock({ currentSignal, currentPrice, symbol });

  const prevLockIdRef = useRef<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [notifDot, setNotifDot] = useState(false);
  const [flashBorder, setFlashBorder] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const isHoldOrNull = !currentSignal || currentSignal.signal === "HOLD";
  const holdReason =
    currentSignal?.holdReason ??
    currentSignal?.reason ??
    "Scanning for setup...";

  // Alert when a new signal gets locked
  useEffect(() => {
    if (!lockedState) return;
    const lockId = lockedState.signal.id;
    if (lockId === prevLockIdRef.current) return;
    prevLockIdRef.current = lockId;
    if (soundEnabled) {
      playBeep(660, 0.1);
      setTimeout(() => playBeep(880, 0.15), 180);
    }
    setNotifDot(true);
    setFlashBorder(true);
    setTimeout(() => setFlashBorder(false), 1200);
    setTimeout(() => setNotifDot(false), 4000);
  }, [lockedState, soundEnabled]);

  return (
    <div
      data-ocid="signals.panel"
      className={`flex flex-col h-full bg-card border-l border-border overflow-hidden transition-all duration-300 ${
        flashBorder ? "ring-2 ring-amber-400/60" : ""
      }`}
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              lockedState?.status === "ACTIVE"
                ? "bg-emerald-400 animate-pulse"
                : isHoldOrNull
                  ? "bg-amber-400 animate-pulse"
                  : "bg-muted-foreground"
            }`}
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

        {/* Locked signal card (ACTIVE or CLOSED) */}
        {lockedState ? (
          <LockedSignalCard
            lockedState={lockedState}
            currentPrice={currentPrice}
            progressPercent={progressPercent}
            pips={pips}
            signalAgeMs={signalAgeMs}
            onDismiss={lockedState.status !== "ACTIVE" ? clearLock : undefined}
          />
        ) : (
          /* HOLD State — no locked signal */
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
                          <TrendIcon trend={sig.trend} />
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
