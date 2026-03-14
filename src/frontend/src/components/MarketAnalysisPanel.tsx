import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ArrowDown,
  ArrowUp,
  BarChart2,
  Layers,
  Newspaper,
  Zap,
} from "lucide-react";
import type {
  MarketAnalysis,
  StructureEvent,
} from "../utils/marketAnalysisEngine";
import type {
  MultiTimeframeAnalysis,
  TFTrend,
} from "../utils/multiTimeframeEngine";
import type { NewsItem, SentimentLabel } from "../utils/newsService";

interface MarketAnalysisPanelProps {
  analysis: MarketAnalysis | null;
  symbol: string;
  mtf?: MultiTimeframeAnalysis | null;
  headlines?: NewsItem[];
  overallSentiment?: SentimentLabel;
  sentimentStrength?: number;
}

function EventTypeBadge({ type }: { type: StructureEvent["type"] }) {
  const styles = {
    BOS: "bg-blue-500/15 border-blue-500/40 text-blue-400",
    CHOCH: "bg-purple-500/15 border-purple-500/40 text-purple-400",
    Breakout: "bg-orange-500/15 border-orange-500/40 text-orange-400",
    Retest: "bg-zinc-500/15 border-zinc-500/40 text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0 rounded border text-[9px] font-bold font-mono tracking-wider ${styles[type]}`}
    >
      {type}
    </span>
  );
}

function TFTrendBadge({ trend }: { trend: TFTrend }) {
  const styles: Record<TFTrend, string> = {
    Bullish: "text-buy",
    Bearish: "text-sell",
    Sideways: "text-amber-400",
    Pullback: "text-purple-400",
  };
  const icons: Record<TFTrend, React.ReactNode> = {
    Bullish: <ArrowUp className="w-2.5 h-2.5" />,
    Bearish: <ArrowDown className="w-2.5 h-2.5" />,
    Sideways: <BarChart2 className="w-2.5 h-2.5" />,
    Pullback: <ArrowDown className="w-2.5 h-2.5 opacity-70" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold text-[10px] ${styles[trend]}`}
    >
      {icons[trend]}
      {trend}
    </span>
  );
}

function formatEventTime(date: Date): string {
  return date.toTimeString().slice(0, 8);
}

function getBiasColor(bias: MultiTimeframeAnalysis["higherTFBias"]) {
  if (bias === "Bullish") return "text-buy";
  if (bias === "Bearish") return "text-sell";
  if (bias === "Conflict") return "text-red-400";
  return "text-amber-400";
}

function getBiasBg(bias: MultiTimeframeAnalysis["higherTFBias"]) {
  if (bias === "Bullish") return "bg-buy/10 border-buy/25";
  if (bias === "Bearish") return "bg-sell/10 border-sell/25";
  if (bias === "Conflict") return "bg-red-500/10 border-red-500/25";
  return "bg-amber-500/10 border-amber-500/25";
}

function getConfluenceColor(score: number) {
  if (score >= 65) return "oklch(0.72 0.18 145)";
  if (score >= 40) return "oklch(0.72 0.18 60)";
  return "oklch(0.62 0.22 27)";
}

export function MarketAnalysisPanel({
  analysis,
  symbol,
  mtf,
  headlines = [],
  overallSentiment = "Neutral",
  sentimentStrength = 50,
}: MarketAnalysisPanelProps) {
  const trendColor =
    analysis?.trend === "Bullish"
      ? "text-buy"
      : analysis?.trend === "Bearish"
        ? "text-sell"
        : "text-amber-400";

  const trendBg =
    analysis?.trend === "Bullish"
      ? "bg-buy/10 border-buy/30"
      : analysis?.trend === "Bearish"
        ? "bg-sell/10 border-sell/30"
        : "bg-amber-500/10 border-amber-500/30";

  const momentumBarColor =
    (analysis?.momentumScore ?? 0) >= 65
      ? "oklch(0.72 0.18 145)"
      : (analysis?.momentumScore ?? 0) >= 35
        ? "oklch(0.72 0.18 60)"
        : "oklch(0.62 0.22 27)";

  const momentumLabelColor =
    analysis?.momentumLabel === "Strong"
      ? "text-buy"
      : analysis?.momentumLabel === "Moderate"
        ? "text-amber-400"
        : "text-sell";

  const liquidityColor =
    analysis?.liquidityActivity === "High"
      ? "text-buy"
      : analysis?.liquidityActivity === "Medium"
        ? "text-amber-400"
        : "text-muted-foreground";

  return (
    <div
      data-ocid="analysis.panel"
      className="flex flex-col h-full bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shrink-0"
            style={{ boxShadow: "0 0 6px oklch(0.7 0.2 300 / 0.7)" }}
          />
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">
            Market Analysis
          </span>
          <span className="ml-auto text-[9px] text-muted-foreground font-mono-num">
            {symbol}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 pb-3 space-y-3">
          {!analysis ? (
            <div className="text-center py-6 text-[10px] text-muted-foreground">
              Analyzing market structure...
            </div>
          ) : (
            <>
              {/* ── Multi-Timeframe Analysis ─────────────────────────────── */}
              {mtf && (
                <>
                  <div data-ocid="analysis.mtf.panel">
                    {/* MTF Header with bias */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                        Multi-TF Analysis
                      </div>
                      <div
                        data-ocid="analysis.mtf.bias_badge"
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${getBiasBg(mtf.higherTFBias)}`}
                      >
                        <span className={getBiasColor(mtf.higherTFBias)}>
                          {mtf.higherTFBias === "Conflict"
                            ? "⚡ Conflict"
                            : mtf.higherTFBias}
                        </span>
                      </div>
                    </div>

                    {/* Higher TF block */}
                    <div className="terminal-border rounded p-2 mb-1.5">
                      <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Higher Timeframe
                      </div>
                      <div className="space-y-1">
                        {mtf.higherTF.map((item) => (
                          <div
                            key={item.tf}
                            className="flex items-center justify-between"
                          >
                            <span className="font-mono-num text-[10px] text-muted-foreground w-8">
                              {item.tf}
                            </span>
                            <span className="text-[10px] text-muted-foreground mx-1">
                              →
                            </span>
                            <div className="flex-1">
                              <TFTrendBadge trend={item.trend} />
                            </div>
                            <div
                              className="w-12 rounded-full overflow-hidden ml-2"
                              style={{
                                height: "3px",
                                background: "oklch(0.22 0.012 240)",
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${item.strength}%`,
                                  background: getConfluenceColor(item.strength),
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Entry TF block */}
                    <div className="terminal-border rounded p-2 mb-1.5">
                      <div className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Entry Timeframe
                      </div>
                      <div className="space-y-1">
                        {mtf.entryTF.map((item) => (
                          <div
                            key={item.tf}
                            className="flex items-center justify-between"
                          >
                            <span className="font-mono-num text-[10px] text-muted-foreground w-8">
                              {item.tf}
                            </span>
                            <span className="text-[10px] text-muted-foreground mx-1">
                              →
                            </span>
                            <div className="flex-1">
                              <TFTrendBadge trend={item.trend} />
                            </div>
                            <div
                              className="w-12 rounded-full overflow-hidden ml-2"
                              style={{
                                height: "3px",
                                background: "oklch(0.22 0.012 240)",
                              }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${item.strength}%`,
                                  background: getConfluenceColor(item.strength),
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Confluence score */}
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        Confluence
                      </span>
                      <div
                        className="flex-1 rounded-full overflow-hidden"
                        style={{
                          height: "4px",
                          background: "oklch(0.22 0.012 240)",
                        }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${mtf.confluenceScore}%`,
                            background: getConfluenceColor(mtf.confluenceScore),
                          }}
                        />
                      </div>
                      <span className="font-mono-num text-[10px] text-foreground w-7 text-right">
                        {mtf.confluenceScore}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                          mtf.confluenceBias === "BUY"
                            ? "bg-buy/15 border-buy/40 text-buy"
                            : mtf.confluenceBias === "SELL"
                              ? "bg-sell/15 border-sell/40 text-sell"
                              : "bg-secondary/50 border-border text-muted-foreground"
                        }`}
                      >
                        {mtf.confluenceBias}
                      </span>
                    </div>
                  </div>

                  <Separator className="opacity-40" />
                </>
              )}

              {/* ── Single-TF Trend ─────────────────────────────────────── */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Trend
                </div>
                <div
                  data-ocid="analysis.trend_badge"
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${trendBg}`}
                >
                  {analysis.trend === "Bullish" ? (
                    <ArrowUp className="w-3 h-3 text-buy" />
                  ) : analysis.trend === "Bearish" ? (
                    <ArrowDown className="w-3 h-3 text-sell" />
                  ) : (
                    <BarChart2 className="w-3 h-3 text-amber-400" />
                  )}
                  <span className={`text-xs font-bold ${trendColor}`}>
                    {analysis.trend}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono-num ml-1">
                    {analysis.trendStrength}%
                  </span>
                </div>
                <div
                  className="mt-1.5 rounded-full overflow-hidden"
                  style={{ height: "3px", background: "oklch(0.22 0.012 240)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${analysis.trendStrength}%`,
                      background:
                        analysis.trend === "Bullish"
                          ? "oklch(0.72 0.18 145)"
                          : analysis.trend === "Bearish"
                            ? "oklch(0.62 0.22 27)"
                            : "oklch(0.72 0.18 60)",
                    }}
                  />
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* Momentum */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Momentum Strength
                </div>
                <div
                  data-ocid="analysis.momentum_bar"
                  className="flex items-center gap-2"
                >
                  <span className="font-mono-num text-sm font-bold text-foreground w-8 shrink-0">
                    {analysis.momentumScore}
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{
                      height: "6px",
                      background: "oklch(0.22 0.012 240)",
                    }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${analysis.momentumScore}%`,
                        background: momentumBarColor,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold shrink-0 ${momentumLabelColor}`}
                  >
                    {analysis.momentumLabel}
                  </span>
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* Structure Events */}
              <div>
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Structure Events
                </div>
                <div data-ocid="analysis.events.table" className="space-y-px">
                  {analysis.structureEvents.length === 0 ? (
                    <div className="text-[10px] text-muted-foreground py-2">
                      Monitoring price action...
                    </div>
                  ) : (
                    analysis.structureEvents.slice(0, 8).map((event, idx) => (
                      <div
                        key={`${event.type}-${event.timestamp.getTime()}-${idx}`}
                        data-ocid={`analysis.events.row.${idx + 1}`}
                        className={`flex items-center gap-2 px-2 py-1 rounded text-[9px] ${
                          idx % 2 === 0 ? "bg-secondary/30" : ""
                        }`}
                      >
                        <EventTypeBadge type={event.type} />
                        {event.direction === "bullish" ? (
                          <ArrowUp className="w-3 h-3 text-buy shrink-0" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-sell shrink-0" />
                        )}
                        <span className="font-mono-num text-muted-foreground">
                          {event.price.toFixed(event.price > 100 ? 2 : 5)}
                        </span>
                        <span className="ml-auto font-mono-num text-muted-foreground">
                          {formatEventTime(event.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* Liquidity & Order Blocks */}
              <div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  <Layers className="w-3 h-3" />
                  Liquidity &amp; Blocks
                </div>
                <div className="grid grid-cols-3 gap-2 text-[9px]">
                  <div className="terminal-border rounded p-1.5">
                    <div className="text-muted-foreground mb-0.5">
                      Liquidity
                    </div>
                    <div className={`font-semibold ${liquidityColor}`}>
                      {analysis.liquidityActivity}
                    </div>
                  </div>
                  <div className="terminal-border rounded p-1.5">
                    <div className="text-muted-foreground mb-0.5">
                      Vol Spike
                    </div>
                    <div
                      className={`font-semibold flex items-center gap-0.5 ${
                        analysis.volumeSpike
                          ? "text-amber-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {analysis.volumeSpike && <Zap className="w-2.5 h-2.5" />}
                      {analysis.volumeSpike ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="terminal-border rounded p-1.5">
                    <div className="text-muted-foreground mb-0.5">OBs</div>
                    <div className="font-mono-num text-foreground font-semibold">
                      {analysis.orderBlocks.length}
                    </div>
                  </div>
                </div>
              </div>

              <Separator className="opacity-40" />

              {/* Market Sentiment */}
              <div data-ocid="analysis.sentiment.panel">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                  <Newspaper className="w-3 h-3" />
                  Market Sentiment
                </div>

                {/* Sentiment badge + strength */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    data-ocid="analysis.sentiment.badge"
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-[9px] font-bold tracking-wide ${
                      overallSentiment === "Bullish"
                        ? "bg-buy/10 border-buy/30 text-buy"
                        : overallSentiment === "Bearish"
                          ? "bg-sell/10 border-sell/30 text-sell"
                          : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    }`}
                  >
                    {overallSentiment === "Bullish"
                      ? "▲"
                      : overallSentiment === "Bearish"
                        ? "▼"
                        : "●"}{" "}
                    {overallSentiment}
                  </span>
                  <span className="font-mono-num text-[10px] text-foreground">
                    {sentimentStrength}%
                  </span>
                </div>

                {/* Strength bar */}
                <div
                  data-ocid="analysis.sentiment.bar"
                  className="rounded-full overflow-hidden mb-2"
                  style={{ height: "4px", background: "oklch(0.22 0.012 240)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${sentimentStrength}%`,
                      background:
                        overallSentiment === "Bullish"
                          ? "oklch(0.72 0.18 145)"
                          : overallSentiment === "Bearish"
                            ? "oklch(0.62 0.22 27)"
                            : "oklch(0.72 0.18 60)",
                    }}
                  />
                </div>

                {/* Headlines list */}
                {headlines.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground py-2">
                    Fetching market news...
                  </div>
                ) : (
                  <div
                    data-ocid="analysis.sentiment.headlines.list"
                    className="space-y-1 overflow-y-auto pr-0.5"
                    style={{ maxHeight: "180px" }}
                  >
                    {headlines.map((item, idx) => (
                      <div
                        key={item.id}
                        data-ocid={`analysis.sentiment.headline.${idx + 1}`}
                        className={`px-1.5 py-1 rounded text-[9px] ${idx % 2 === 0 ? "bg-secondary/30" : ""}`}
                      >
                        <div className="flex items-start gap-1.5 mb-0.5">
                          <span
                            className={`shrink-0 px-1 py-0 rounded border font-bold text-[8px] tracking-wider ${
                              item.sentiment === "Bullish"
                                ? "bg-buy/10 border-buy/30 text-buy"
                                : item.sentiment === "Bearish"
                                  ? "bg-sell/10 border-sell/30 text-sell"
                                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {item.sentiment === "Bullish"
                              ? "B"
                              : item.sentiment === "Bearish"
                                ? "S"
                                : "N"}
                          </span>
                          <span className="text-[10px] text-foreground/80 leading-tight line-clamp-2 flex-1">
                            {item.headline}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-muted-foreground pl-5">
                          <span>{item.source}</span>
                          <span className="font-mono-num">
                            {Math.floor(
                              (Date.now() - item.timestamp.getTime()) / 60000,
                            )}
                            m ago
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
