import { useEffect, useState } from "react";
import type { LockedSignalState } from "../hooks/useSignalLock";

function formatPrice(value: number): string {
  if (value === 0) return "—";
  if (value > 1000) return value.toFixed(2);
  if (value > 10) return value.toFixed(4);
  return value.toFixed(5);
}

function formatAge(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins === 0) return `${secs}s ago`;
  return `${mins}m ${secs}s ago`;
}

function StatusBadge({ status }: { status: LockedSignalState["status"] }) {
  const map: Record<string, string> = {
    ACTIVE: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
    TP1_HIT: "bg-blue-500/20 border-blue-500/50 text-blue-400",
    SL_HIT: "bg-rose-500/20 border-rose-500/50 text-rose-400",
    EXPIRED: "bg-zinc-700/60 border-zinc-600/60 text-zinc-400",
  };
  return (
    <span
      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-wider ${map[status] ?? ""}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

// Progress bar: left = SL (red), right = TP1 (green), yellow in middle
function ProgressBar({
  percent,
  status,
}: {
  percent: number;
  status: LockedSignalState["status"];
}) {
  // Only show for ACTIVE
  const clamped = Math.max(0, Math.min(100, percent));

  // Color the filled bar: red < 33%, yellow 33-66%, green > 66%
  const barColor =
    status !== "ACTIVE"
      ? "bg-zinc-600"
      : clamped < 33
        ? "bg-rose-500"
        : clamped < 66
          ? "bg-amber-400"
          : "bg-emerald-500";

  // Dot color mirrors bar
  const dotColor =
    status !== "ACTIVE"
      ? "border-zinc-500"
      : clamped < 33
        ? "border-rose-400 bg-rose-500/80"
        : clamped < 66
          ? "border-amber-300 bg-amber-400/80"
          : "border-emerald-300 bg-emerald-500/80";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[8px] text-muted-foreground font-mono">
        <span className="text-rose-400">SL</span>
        <span
          className={
            clamped >= 66
              ? "text-emerald-400 font-bold"
              : "text-muted-foreground"
          }
        >
          {status === "ACTIVE"
            ? `${clamped.toFixed(0)}% to TP1`
            : status.replace("_", " ")}
        </span>
        <span className="text-emerald-400">TP1</span>
      </div>
      {/* Bar track */}
      <div className="relative h-2 rounded-full bg-zinc-800 overflow-visible">
        {/* Filled portion */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
        {/* Moving dot marker */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 shadow-md transition-all duration-300 ${dotColor}`}
          style={{ left: `calc(${clamped}% - 6px)` }}
        />
      </div>
    </div>
  );
}

interface LockedSignalCardProps {
  lockedState: LockedSignalState;
  currentPrice: number;
  progressPercent: number;
  pips: number;
  signalAgeMs: number;
  onDismiss?: () => void;
}

export function LockedSignalCard({
  lockedState,
  currentPrice,
  progressPercent,
  pips,
  signalAgeMs,
  onDismiss,
}: LockedSignalCardProps) {
  const { signal, status } = lockedState;
  const isBuy = signal.signal === "BUY" || signal.signal === "STRONG BUY";
  const isActive = status === "ACTIVE";

  // Live age ticker
  const [age, setAge] = useState(signalAgeMs);
  useEffect(() => {
    if (!isActive) {
      setAge(signalAgeMs);
      return;
    }
    const id = setInterval(
      () => setAge(Date.now() - lockedState.lockedAt),
      1000,
    );
    return () => clearInterval(id);
  }, [isActive, lockedState.lockedAt, signalAgeMs]);

  // Border glow color
  const borderClass =
    status === "ACTIVE"
      ? isBuy
        ? "border-l-emerald-500/70"
        : "border-l-rose-500/70"
      : status === "TP1_HIT"
        ? "border-l-blue-500/70"
        : status === "SL_HIT"
          ? "border-l-rose-700/70"
          : "border-l-zinc-600/70";

  const signalColor =
    signal.signal === "BUY" || signal.signal === "STRONG BUY"
      ? "text-emerald-400"
      : "text-rose-400";

  // PnL display
  const pnlPositive = pips >= 0;
  const pnlColor = isActive
    ? pnlPositive
      ? "text-emerald-400"
      : "text-rose-400"
    : "text-muted-foreground";
  const pipsLabel = currentPrice > 500 ? "pts" : "pips";

  return (
    <div
      data-ocid="signals.locked_card"
      className={`rounded p-2.5 terminal-border border-l-2 ${borderClass} space-y-2`}
    >
      {/* Header row: signal type + status badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-display font-bold text-base leading-none ${signalColor}`}
          >
            {signal.signal}
          </span>
          {signal.timeframe && signal.timeframe !== "—" && (
            <span className="text-[9px] font-mono text-muted-foreground/70">
              — {signal.timeframe}
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Signal age */}
      <div className="flex items-center justify-between text-[9px]">
        <span className="text-muted-foreground">Signal age</span>
        <span className="font-mono text-muted-foreground/80">
          {formatAge(age)}
        </span>
      </div>

      {/* Price levels grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]">
        <div>
          <div className="text-muted-foreground">Entry</div>
          <div className="font-mono text-cyan-400 font-medium">
            {formatPrice(signal.entryPrice)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Stop Loss</div>
          <div className="font-mono text-rose-400 font-medium">
            {formatPrice(signal.stopLoss)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">TP1</div>
          <div className="font-mono text-emerald-400 font-medium">
            {formatPrice(signal.tp1)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">TP2</div>
          <div className="font-mono text-emerald-400/70 font-medium">
            {formatPrice(signal.tp2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Lot Size</div>
          <div className="font-mono text-foreground font-medium">
            {signal.lotSize.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Confidence</div>
          <div
            className={`font-mono font-bold ${
              signal.confidence >= 85 ? "text-emerald-400" : "text-amber-400"
            }`}
          >
            {signal.confidence}%
          </div>
        </div>
      </div>

      {/* Live P&L tracker */}
      {isActive && currentPrice > 0 && (
        <div className="rounded bg-zinc-900/60 border border-border/30 px-2 py-1.5">
          <div className="flex items-center justify-between text-[9px] mb-0.5">
            <span className="text-muted-foreground">Live Price</span>
            <span className="font-mono text-foreground">
              {formatPrice(currentPrice)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-muted-foreground">P&amp;L ({pipsLabel})</span>
            <span className={`font-mono font-bold ${pnlColor}`}>
              {pips >= 0 ? "+" : ""}
              {pips} {pipsLabel}
            </span>
          </div>
        </div>
      )}

      {/* Closed result */}
      {!isActive && (
        <div
          className={`rounded px-2 py-1.5 text-[10px] font-bold text-center ${
            status === "TP1_HIT"
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
              : status === "SL_HIT"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                : "bg-zinc-800/60 text-zinc-400 border border-zinc-600/40"
          }`}
        >
          CLOSED — {status.replace("_", " ")}
        </div>
      )}

      {/* SL→TP1 progress bar */}
      <ProgressBar percent={progressPercent} status={status} />

      {/* Reason */}
      <div className="text-[8px] text-muted-foreground/60 italic leading-tight border-t border-border/20 pt-1">
        {signal.reason}
      </div>

      {/* Dismiss button for closed signals */}
      {!isActive && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-full text-[9px] text-muted-foreground hover:text-foreground border border-border/30 rounded py-0.5 transition-colors"
        >
          Dismiss — wait for next signal
        </button>
      )}
    </div>
  );
}
