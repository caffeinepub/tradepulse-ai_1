import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Award,
  BarChart2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { useAnalyticsTrades } from "../hooks/useAnalyticsTrades";
import type { TradeRecord } from "../types/trade";

type TimeRange = "today" | "week" | "month" | "all";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  all: "All Time",
};

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfWeek(d: Date) {
  const r = new Date(d);
  r.setDate(r.getDate() - r.getDay());
  r.setHours(0, 0, 0, 0);
  return r;
}
function startOfMonth(d: Date) {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

function filterTrades(trades: TradeRecord[], range: TimeRange): TradeRecord[] {
  const closed = trades.filter((t) => t.status === "closed" && t.exitTime);
  if (range === "all") return closed;
  const now = new Date();
  let cutoff: Date;
  if (range === "today") cutoff = startOfDay(now);
  else if (range === "week") cutoff = startOfWeek(now);
  else cutoff = startOfMonth(now);
  return closed.filter((t) => t.exitTime! >= cutoff);
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function tradeDuration(t: TradeRecord): string {
  if (!t.exitTime) return "—";
  return formatDuration(t.exitTime.getTime() - t.entryTime.getTime());
}

function TradeDetailCard({
  trade,
  label,
  accent,
}: {
  trade: TradeRecord;
  label: string;
  accent: "buy" | "sell";
}) {
  const pnl = trade.pnl ?? 0;
  const exitPrice = trade.exitPrice ?? trade.entryPrice;

  return (
    <Card
      className="flex-1 min-w-[240px] terminal-border"
      style={{
        background: "oklch(0.14 0.012 240)",
        borderLeft: `3px solid ${
          accent === "buy" ? "oklch(0.72 0.18 145)" : "oklch(0.62 0.22 27)"
        }`,
      }}
      data-ocid={`analytics.${label.toLowerCase().replace(" ", "_")}_card`}
    >
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          {accent === "buy" ? (
            <Award className="w-3.5 h-3.5 text-buy" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5 text-sell" />
          )}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm">
              {trade.symbol}
            </span>
            <Badge
              variant="outline"
              className={`text-[9px] py-0 ${
                trade.side === "buy"
                  ? "border-buy text-buy"
                  : "border-sell text-sell"
              }`}
            >
              {trade.side.toUpperCase()}
            </Badge>
            <Badge
              variant="outline"
              className="text-[9px] py-0 text-muted-foreground"
            >
              {trade.source === "signal" ? "Signal" : "Manual"}
            </Badge>
          </div>
          <span
            className={`font-mono-num font-bold text-sm ${
              pnl >= 0 ? "text-buy" : "text-sell"
            }`}
          >
            {pnl >= 0 ? "+" : ""}
            {pnl.toFixed(2)} USDT
          </span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-mono-num">{trade.entryPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Exit</span>
            <span className="font-mono-num">{exitPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-mono-num">{tradeDuration(trade)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="font-mono-num capitalize">
              {trade.source === "signal" ? "Signal" : "Manual"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  label,
  value,
  sub,
  positive,
  ocid,
}: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  ocid: string;
}) {
  return (
    <div
      data-ocid={ocid}
      className="flex-1 min-w-[120px] rounded px-4 py-3 terminal-border"
      style={{ background: "oklch(0.14 0.012 240)" }}
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </div>
      <div
        className={`font-mono-num font-bold text-xl ${
          positive === undefined
            ? "text-foreground"
            : positive
              ? "text-buy"
              : "text-sell"
        }`}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>
      )}
    </div>
  );
}

export function AnalyticsPage() {
  const allTrades = useAnalyticsTrades();
  const [range, setRange] = useState<TimeRange>("all");

  const filtered = useMemo(
    () => filterTrades(allTrades, range),
    [allTrades, range],
  );

  // Summary stats
  const totalTrades = filtered.length;
  const wins = filtered.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const totalPnl = filtered.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const avgRR =
    filtered.length > 0
      ? filtered.reduce((s, t) => {
          const reward = Math.abs((t.exitPrice ?? t.entryPrice) - t.entryPrice);
          const risk = Math.abs(t.sl - t.entryPrice);
          return s + (risk > 0 ? reward / risk : 0);
        }, 0) / filtered.length
      : 0;

  const bestTrade = filtered.reduce<TradeRecord | null>(
    (best, t) =>
      t.pnl !== undefined &&
      (best === null ||
        (t.pnl ?? Number.NEGATIVE_INFINITY) >
          (best.pnl ?? Number.NEGATIVE_INFINITY))
        ? t
        : best,
    null,
  );
  const worstTrade = filtered.reduce<TradeRecord | null>(
    (worst, t) =>
      t.pnl !== undefined &&
      (worst === null ||
        (t.pnl ?? Number.POSITIVE_INFINITY) <
          (worst.pnl ?? Number.POSITIVE_INFINITY))
        ? t
        : worst,
    null,
  );

  // Daily P&L chart data
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of filtered) {
      const d = (t.exitTime ?? t.entryTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      map.set(d, (map.get(d) ?? 0) + (t.pnl ?? 0));
    }
    return Array.from(map.entries())
      .map(([date, pnl]) => ({ date, pnl: Number.parseFloat(pnl.toFixed(2)) }))
      .slice(-14);
  }, [filtered]);

  // Equity curve
  const equityCurve = useMemo(() => {
    let balance = 10000;
    return [
      { date: "Start", balance },
      ...filtered.map((t) => {
        balance += t.pnl ?? 0;
        return {
          date: (t.exitTime ?? t.entryTime).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          balance: Number.parseFloat(balance.toFixed(2)),
        };
      }),
    ];
  }, [filtered]);

  // Win rate per day
  const winRateData = useMemo(() => {
    const map = new Map<string, { wins: number; total: number }>();
    for (const t of filtered) {
      const d = (t.exitTime ?? t.entryTime).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const entry = map.get(d) ?? { wins: 0, total: 0 };
      map.set(d, {
        wins: entry.wins + ((t.pnl ?? 0) > 0 ? 1 : 0),
        total: entry.total + 1,
      });
    }
    return Array.from(map.entries())
      .map(([date, v]) => ({
        date,
        winRate: v.total > 0 ? Math.round((v.wins / v.total) * 100) : 0,
      }))
      .slice(-14);
  }, [filtered]);

  const isEmpty = totalTrades === 0;

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.10 0.010 240)" }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: "oklch(0.22 0.06 200 / 0.3)",
                border: "1px solid oklch(0.42 0.10 200 / 0.4)",
              }}
            >
              <BarChart2
                className="w-4 h-4"
                style={{ color: "oklch(0.72 0.14 200)" }}
              />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Analytics</h1>
              <p className="text-[11px] text-muted-foreground">
                Demo account performance metrics
              </p>
            </div>
          </div>

          {/* Time range filter */}
          <div
            data-ocid="analytics.time_range_filter"
            className="flex items-center gap-px p-0.5 rounded"
            style={{ background: "oklch(0.16 0.012 240)" }}
          >
            {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((r, i) => (
              <Button
                key={r}
                variant="ghost"
                size="sm"
                data-ocid={`analytics.time_range_tab.${i + 1}`}
                onClick={() => setRange(r)}
                className={`h-7 px-3 text-xs rounded transition-colors ${
                  range === r
                    ? "bg-card text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {TIME_RANGE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-3 mb-6">
          <StatCard
            label="Total Trades"
            value={totalTrades.toString()}
            sub={`${wins}W / ${totalTrades - wins}L`}
            ocid="analytics.total_trades_card"
          />
          <StatCard
            label="Win Rate"
            value={`${winRate}%`}
            sub={totalTrades > 0 ? `${wins} wins` : "No trades yet"}
            positive={winRate >= 50}
            ocid="analytics.win_rate_card"
          />
          <StatCard
            label="Total P&L"
            value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`}
            positive={totalPnl >= 0}
            ocid="analytics.total_pnl_card"
          />
          <StatCard
            label="Avg Risk/Reward"
            value={`1:${avgRR.toFixed(2)}`}
            sub={filtered.length > 0 ? "per closed trade" : "No data"}
            ocid="analytics.avg_rr_card"
          />
        </div>

        {/* Best / Worst trade cards */}
        {!isEmpty && bestTrade && worstTrade && (
          <div className="flex flex-wrap gap-3 mb-6">
            <TradeDetailCard
              trade={bestTrade}
              label="Best Trade"
              accent="buy"
            />
            <TradeDetailCard
              trade={worstTrade}
              label="Worst Trade"
              accent="sell"
            />
          </div>
        )}

        {isEmpty ? (
          <div
            data-ocid="analytics.empty_state"
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <Activity
              className="w-10 h-10 text-muted-foreground mb-4"
              strokeWidth={1}
            />
            <p className="text-sm text-muted-foreground">
              No closed trades yet in this time range.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Head to the Dashboard — trades will appear here as they close.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Daily P&L chart */}
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardHeader className="pb-2 px-5 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-buy" />
                  Daily Profit / Loss
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {dailyData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                    No daily data
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      pnl: {
                        label: "P&L (USDT)",
                        color: "oklch(0.72 0.18 145)",
                      },
                    }}
                    className="h-48 w-full"
                  >
                    <BarChart
                      data={dailyData}
                      margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 240)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 10,
                          fill: "oklch(0.52 0.01 220)",
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: "oklch(0.52 0.01 220)",
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={48}
                      />
                      <ReferenceLine
                        y={0}
                        stroke="oklch(0.40 0.01 220)"
                        strokeDasharray="4 2"
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "oklch(0.22 0.012 240 / 0.4)" }}
                      />
                      <Bar
                        dataKey="pnl"
                        radius={[3, 3, 0, 0]}
                        fill="oklch(0.72 0.18 145)"
                        // color bars by sign
                        label={false}
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Equity curve */}
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardHeader className="pb-2 px-5 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.14 200)" }}
                  />
                  Equity Curve
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <ChartContainer
                  config={{
                    balance: {
                      label: "Balance (USDT)",
                      color: "oklch(0.72 0.14 200)",
                    },
                  }}
                  className="h-48 w-full"
                >
                  <LineChart
                    data={equityCurve}
                    margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.22 0.012 240)"
                    />
                    <XAxis
                      dataKey="date"
                      tick={{
                        fontSize: 10,
                        fill: "oklch(0.52 0.01 220)",
                      }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{
                        fontSize: 10,
                        fill: "oklch(0.52 0.01 220)",
                      }}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                      tickFormatter={(v) => `$${v.toFixed(0)}`}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      cursor={{ stroke: "oklch(0.42 0.10 200 / 0.5)" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      stroke="oklch(0.72 0.14 200)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "oklch(0.72 0.14 200)",
                        stroke: "oklch(0.13 0.012 240)",
                        strokeWidth: 2,
                      }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Win rate per day */}
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardHeader className="pb-2 px-5 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award
                    className="w-4 h-4"
                    style={{ color: "oklch(0.72 0.18 60)" }}
                  />
                  Daily Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                {winRateData.length === 0 ? (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                    No data
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      winRate: {
                        label: "Win Rate (%)",
                        color: "oklch(0.72 0.18 60)",
                      },
                    }}
                    className="h-48 w-full"
                  >
                    <BarChart
                      data={winRateData}
                      margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 240)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{
                          fontSize: 10,
                          fill: "oklch(0.52 0.01 220)",
                        }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{
                          fontSize: 10,
                          fill: "oklch(0.52 0.01 220)",
                        }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <ReferenceLine
                        y={50}
                        stroke="oklch(0.40 0.01 220)"
                        strokeDasharray="4 2"
                        label={{
                          value: "50%",
                          position: "right",
                          fontSize: 9,
                          fill: "oklch(0.52 0.01 220)",
                        }}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        cursor={{ fill: "oklch(0.22 0.012 240 / 0.4)" }}
                      />
                      <Bar
                        dataKey="winRate"
                        radius={[3, 3, 0, 0]}
                        fill="oklch(0.72 0.18 60)"
                      />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            {/* Trade history table */}
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardHeader className="pb-2 px-5 pt-4">
                <CardTitle className="text-sm font-semibold">
                  Trade History
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                <ScrollArea className="h-64">
                  <div className="px-2">
                    <table
                      data-ocid="analytics.trade_history_table"
                      className="w-full text-[11px]"
                    >
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Symbol",
                            "Side",
                            "Entry",
                            "Exit",
                            "P&L",
                            "Duration",
                            "Source",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.slice(0, 100).map((t, idx) => (
                          <tr
                            key={t.id}
                            data-ocid={`analytics.trade_history.row.${idx + 1}`}
                            className={`border-b border-border/40 ${
                              idx % 2 === 0 ? "bg-secondary/10" : ""
                            } hover:bg-secondary/20 transition-colors`}
                          >
                            <td className="py-1.5 px-3 font-semibold">
                              {t.symbol}
                            </td>
                            <td
                              className={`py-1.5 px-3 font-bold ${
                                t.side === "buy" ? "text-buy" : "text-sell"
                              }`}
                            >
                              {t.side.toUpperCase()}
                            </td>
                            <td className="py-1.5 px-3 font-mono-num">
                              {t.entryPrice.toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 font-mono-num">
                              {t.exitPrice?.toFixed(2) ?? "—"}
                            </td>
                            <td
                              className={`py-1.5 px-3 font-mono-num font-semibold ${
                                (t.pnl ?? 0) >= 0 ? "text-buy" : "text-sell"
                              }`}
                            >
                              {(t.pnl ?? 0) >= 0 ? "+" : ""}
                              {(t.pnl ?? 0).toFixed(2)}
                            </td>
                            <td className="py-1.5 px-3 text-muted-foreground">
                              {tradeDuration(t)}
                            </td>
                            <td className="py-1.5 px-3">
                              <Badge
                                variant="outline"
                                className="text-[9px] py-0"
                              >
                                {t.source === "signal" ? "Signal" : "Manual"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
