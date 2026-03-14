import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import type { AISignal } from "../utils/aiSignalEngine";

interface SignalsPanelProps {
  currentSignal: AISignal | null;
  history: AISignal[];
  symbol: string;
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

export function SignalsPanel({
  currentSignal,
  history,
  symbol,
}: SignalsPanelProps) {
  const secondsAgo = useSecondsAgo(currentSignal?.timestamp ?? null);

  return (
    <div
      data-ocid="signals.panel"
      className="flex flex-col h-full bg-card border-l border-border overflow-hidden"
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
          <span className="ml-auto text-[9px] text-muted-foreground font-mono-num">
            {symbol}
          </span>
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
            <div className="flex items-center justify-between mb-2">
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
              <Badge
                variant="outline"
                className="text-[9px] border-border text-muted-foreground px-1.5 py-0"
              >
                {currentSignal.tradeType}
              </Badge>
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

            <div className="mt-2 text-[9px] text-muted-foreground">
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
                      <span className="text-muted-foreground">
                        {sig.tradeType}
                      </span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
