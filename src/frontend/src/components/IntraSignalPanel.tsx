import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useState } from "react";
import type { UnifiedSignal } from "../utils/unifiedSignalEngine";

interface IntraSignalPanelProps {
  currentSignal: UnifiedSignal | null;
  history: UnifiedSignal[];
  selectedTimeframe: string;
}

function formatPrice(value: number): string {
  if (value === 0) return "—";
  if (value > 1000) return value.toFixed(2);
  if (value > 10) return value.toFixed(4);
  return value.toFixed(5);
}

function ConfidenceBar({
  value,
  label,
}: {
  value: number;
  label: "High" | "Medium" | "Low";
}) {
  const colorBar =
    label === "High"
      ? "bg-emerald-500"
      : label === "Medium"
        ? "bg-amber-400"
        : "bg-muted";
  const colorText =
    label === "High"
      ? "text-emerald-400"
      : label === "Medium"
        ? "text-amber-400"
        : "text-muted-foreground";
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between items-center">
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
          Confidence
        </span>
        <span className={`text-[10px] font-bold ${colorText}`}>{label}</span>
      </div>
      <Progress value={value} className={`h-1 ${colorBar}`} />
    </div>
  );
}

export function IntraSignalPanel({
  currentSignal,
  history,
  selectedTimeframe: _selectedTimeframe,
}: IntraSignalPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div data-ocid="intra_signal.panel" className="border-b border-border">
      {/* Header */}
      <div
        data-ocid="intra_signal.tab"
        className="flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-foreground uppercase tracking-widest">
            Intraday Signal Engine
          </span>
          <Badge
            variant="outline"
            className="text-[8px] px-1 py-0 border-cyan-500/40 text-cyan-400 bg-cyan-500/10"
          >
            {currentSignal?.timeframe ?? "—"}
          </Badge>
        </div>
        <Clock className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Body */}
      <div className="px-3 pb-3 space-y-2">
        {!currentSignal ? (
          <p className="text-[10px] text-muted-foreground italic py-1">
            Scanning…
          </p>
        ) : (
          <div
            data-ocid="intra_signal.card"
            className="rounded border border-border bg-card/50 p-2 space-y-2"
          >
            {/* Signal badge + time */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={`text-[11px] px-2 py-0.5 font-bold ${
                    currentSignal.signal === "BUY"
                      ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400"
                      : currentSignal.signal === "SELL"
                        ? "bg-rose-500/15 border-rose-500/50 text-rose-400"
                        : "bg-amber-500/10 border-amber-500/40 text-amber-400"
                  }`}
                >
                  {currentSignal.signal}
                </Badge>
                {currentSignal.timeframe && currentSignal.timeframe !== "—" && (
                  <span className="text-[9px] font-mono font-semibold text-muted-foreground/70">
                    — {currentSignal.timeframe}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-muted-foreground">
                {currentSignal.signalTimeDisplay}
              </span>
            </div>

            {currentSignal.signal === "HOLD" ? (
              <>
                <p className="text-[10px] text-amber-400/80">
                  {currentSignal.holdReason ?? "Waiting for setup"}
                </p>
                <div className="mt-1 text-[9px] text-muted-foreground/60 border border-border/20 rounded px-2 py-1">
                  Market Status: Waiting for Setup
                </div>
                {currentSignal.timeframe && currentSignal.timeframe !== "—" && (
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-muted-foreground">
                      Timeframe
                    </span>
                    <span className="text-[9px] font-mono border border-border/40 rounded px-1.5 text-muted-foreground/80">
                      {currentSignal.timeframe}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Price levels */}
                <div className="grid grid-cols-3 gap-1">
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase">
                      Entry
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400">
                      {formatPrice(currentSignal.entryPrice)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase">
                      Stop
                    </div>
                    <div className="text-[10px] font-mono text-rose-400">
                      {formatPrice(currentSignal.stopLoss)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[8px] text-muted-foreground uppercase">
                      Target
                    </div>
                    <div className="text-[10px] font-mono text-emerald-400">
                      {formatPrice(currentSignal.targetPrice)}
                    </div>
                  </div>
                </div>

                {/* Lot size + duration */}
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">
                    Suggested Lot
                  </span>
                  <span className="text-[10px] font-mono text-foreground">
                    {currentSignal.lotSize.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-muted-foreground">
                    Est. Duration
                  </span>
                  <span className="text-[10px] font-mono text-foreground">
                    {currentSignal.expectedDuration}
                  </span>
                </div>

                {/* Timeframe row */}
                {currentSignal.timeframe && currentSignal.timeframe !== "—" && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">
                      Timeframe
                    </span>
                    <span className="text-[9px] font-mono border border-border/40 rounded px-1.5 text-muted-foreground/80">
                      {currentSignal.timeframe}
                    </span>
                  </div>
                )}

                {/* Confidence bar */}
                <ConfidenceBar
                  value={currentSignal.confidence}
                  label={currentSignal.confidenceLabel}
                />

                {/* Reason */}
                <p className="text-[9px] text-muted-foreground leading-relaxed">
                  {currentSignal.reason}
                </p>
              </>
            )}
          </div>
        )}

        {/* Signal history */}
        {history.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <CollapsibleTrigger
              data-ocid="intra_signal.toggle"
              className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {historyOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              Signal History ({history.length})
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 space-y-0.5">
                {history.slice(0, 20).map((sig, i) => (
                  <div
                    key={sig.id}
                    data-ocid={`intra_signal.item.${i + 1}`}
                    className="flex items-center justify-between py-0.5 px-1 rounded hover:bg-secondary/30 transition-colors"
                  >
                    <span className="text-[8px] text-muted-foreground font-mono">
                      {sig.signalTimeDisplay}
                    </span>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[8px] px-1 py-0 ${
                          sig.signal === "BUY"
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-rose-500/40 text-rose-400"
                        }`}
                      >
                        {sig.signal}
                      </Badge>
                      {sig.timeframe && sig.timeframe !== "—" && (
                        <span className="text-[7px] font-mono text-muted-foreground/60 border border-border/40 rounded px-1">
                          {sig.timeframe}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] font-mono text-muted-foreground">
                      {formatPrice(sig.entryPrice)}
                    </span>
                    <span
                      className={`text-[8px] font-bold ${
                        sig.confidenceLabel === "High"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      {sig.confidenceLabel}
                    </span>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
