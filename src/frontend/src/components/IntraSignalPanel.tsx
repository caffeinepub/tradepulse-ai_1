import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { useState } from "react";
import { useSignalLock } from "../hooks/useSignalLock";
import type { UnifiedSignal } from "../utils/unifiedSignalEngine";
import { LockedSignalCard } from "./LockedSignalCard";

interface IntraSignalPanelProps {
  currentSignal: UnifiedSignal | null;
  history: UnifiedSignal[];
  selectedTimeframe: string;
  currentPrice?: number;
  symbol?: string;
}

function formatPrice(value: number): string {
  if (value === 0) return "—";
  if (value > 1000) return value.toFixed(2);
  if (value > 10) return value.toFixed(4);
  return value.toFixed(5);
}

export function IntraSignalPanel({
  currentSignal,
  history,
  selectedTimeframe: _selectedTimeframe,
  currentPrice = 0,
  symbol = "",
}: IntraSignalPanelProps) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const { lockedState, progressPercent, pips, signalAgeMs, clearLock } =
    useSignalLock({ currentSignal, currentPrice, symbol });

  const isHold = !currentSignal || currentSignal.signal === "HOLD";

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
            {lockedState?.signal.timeframe ?? currentSignal?.timeframe ?? "—"}
          </Badge>
          {lockedState?.status === "ACTIVE" && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>
        <Clock className="w-3 h-3 text-muted-foreground" />
      </div>

      {/* Body */}
      <div className="px-3 pb-3 space-y-2">
        {/* Locked signal card (shared with SignalsPanel via same hook) */}
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
          <div
            data-ocid="intra_signal.card"
            className="rounded border border-border bg-card/50 p-2 space-y-2"
          >
            {/* HOLD or scanning */}
            {isHold ? (
              <>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="text-[11px] px-2 py-0.5 font-bold bg-amber-500/10 border-amber-500/40 text-amber-400"
                  >
                    HOLD
                  </Badge>
                  <span className="text-[9px] text-muted-foreground">
                    {currentSignal?.signalTimeDisplay ?? ""}
                  </span>
                </div>
                <p className="text-[10px] text-amber-400/80">
                  {currentSignal?.holdReason ?? "Scanning for setup…"}
                </p>
                <div className="mt-1 text-[9px] text-muted-foreground/60 border border-border/20 rounded px-2 py-1">
                  Market Status: Waiting for Setup
                </div>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground italic py-1">
                Signal confidence below lock threshold (
                {currentSignal?.confidence}% / need 75%)
              </p>
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
                          sig.signal === "BUY" || sig.signal === "STRONG BUY"
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
