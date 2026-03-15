import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  BarChart2,
  Copy,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { tradeStore } from "../store/tradeStore";
import type { TradeRecord } from "../types/trade";

const TRADE_TYPE_COLORS: Record<string, string> = {
  Scalp: "text-yellow-400 border-yellow-400/40",
  Intraday: "text-blue-400 border-blue-400/40",
  Swing: "text-purple-400 border-purple-400/40",
  Position: "text-orange-400 border-orange-400/40",
};

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <Card
      className="terminal-border"
      style={{ background: "oklch(0.14 0.012 240)" }}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-secondary/60 mt-0.5 shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">
            {label}
          </p>
          <p
            className={`font-mono font-bold text-lg leading-none ${color ?? "text-foreground"}`}
          >
            {value}
          </p>
          {sub && (
            <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TradeTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const cls = TRADE_TYPE_COLORS[type] ?? "text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`text-[9px] py-0 px-1.5 h-4 ${cls}`}>
      {type}
    </Badge>
  );
}

export function ProfilePage() {
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString() ?? null;
  const [copied, setCopied] = useState(false);
  const [trades, setTrades] = useState<TradeRecord[]>(() =>
    tradeStore.getTrades(),
  );

  useEffect(() => {
    return tradeStore.subscribe(() => {
      setTrades(tradeStore.getTrades());
    });
  }, []);

  const openTrades = trades.filter((t) => t.status === "open");
  const closedTrades = trades.filter((t) => t.status === "closed");
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  const winRate =
    closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
  const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);

  // Performance by trade type
  const typeStats = ["Scalp", "Intraday", "Swing", "Position"].map((type) => {
    const typeTrades = closedTrades.filter((t) => t.tradeType === type);
    const typeWins = typeTrades.filter((t) => (t.pnl ?? 0) > 0).length;
    const typePnl = typeTrades.reduce((s, t) => s + (t.pnl ?? 0), 0);
    return {
      type,
      count: typeTrades.length,
      winRate: typeTrades.length > 0 ? (typeWins / typeTrades.length) * 100 : 0,
      pnl: typePnl,
    };
  });

  const copyPrincipal = () => {
    if (!principal) return;
    navigator.clipboard.writeText(principal).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <main
      className="min-h-screen pt-6 pb-16 px-4 max-w-screen-xl mx-auto"
      data-ocid="profile.page"
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-5"
      >
        {/* User identity card */}
        <Card
          className="terminal-border"
          style={{ background: "oklch(0.13 0.012 240)" }}
          data-ocid="profile.card"
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-buy" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                  Trader Profile
                  <Badge
                    variant="outline"
                    className="text-[9px] border-buy/30 text-buy"
                  >
                    Demo Account
                  </Badge>
                </h1>
                {principal ? (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      {principal}
                    </span>
                    <button
                      type="button"
                      data-ocid="profile.copy_button"
                      onClick={copyPrincipal}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy principal ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                    {copied && (
                      <span className="text-[10px] text-buy animate-in fade-in">
                        Copied!
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Not logged in
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Trades"
            value={String(closedTrades.length)}
            sub={`${openTrades.length} open`}
            icon={<Activity className="w-4 h-4 text-buy" />}
          />
          <StatCard
            label="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            sub={`${wins} wins / ${closedTrades.length - wins} losses`}
            icon={
              <BarChart2
                className="w-4 h-4"
                style={{ color: "oklch(0.72 0.18 60)" }}
              />
            }
            color={winRate >= 50 ? "text-buy" : "text-sell"}
          />
          <StatCard
            label="Total P&L"
            value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`}
            icon={
              totalPnl >= 0 ? (
                <TrendingUp className="w-4 h-4 text-buy" />
              ) : (
                <TrendingDown className="w-4 h-4 text-sell" />
              )
            }
            color={totalPnl >= 0 ? "text-buy" : "text-sell"}
          />
          <StatCard
            label="Open Positions"
            value={String(openTrades.length)}
            sub="live exposure"
            icon={<Activity className="w-4 h-4 text-purple-400" />}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="open" data-ocid="profile.tab">
          <TabsList className="bg-secondary/40 border border-border h-8">
            <TabsTrigger
              value="open"
              className="text-[11px] h-6"
              data-ocid="profile.open_trades.tab"
            >
              Open Trades ({openTrades.length})
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="text-[11px] h-6"
              data-ocid="profile.history.tab"
            >
              Trade History ({closedTrades.length})
            </TabsTrigger>
            <TabsTrigger
              value="performance"
              className="text-[11px] h-6"
              data-ocid="profile.performance.tab"
            >
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Open Trades */}
          <TabsContent value="open">
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardContent className="p-0">
                {openTrades.length === 0 ? (
                  <div
                    data-ocid="profile.open_trades.empty_state"
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No open positions
                  </div>
                ) : (
                  <ScrollArea className="max-h-[480px]">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Symbol",
                            "Type",
                            "Side",
                            "Entry",
                            "Live P&L",
                            "Reason",
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
                        {openTrades.map((t, i) => (
                          <tr
                            key={t.id}
                            data-ocid={`profile.open_trades.row.${i + 1}`}
                            className="border-b border-border/40 hover:bg-secondary/20 transition-colors"
                          >
                            <td className="py-2 px-3 font-semibold">
                              {t.symbol}
                            </td>
                            <td className="py-2 px-3">
                              <TradeTypeBadge type={t.tradeType} />
                            </td>
                            <td
                              className={`py-2 px-3 font-bold ${t.side === "buy" ? "text-buy" : "text-sell"}`}
                            >
                              {t.side.toUpperCase()}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {t.entryPrice.toFixed(2)}
                            </td>
                            <td
                              className={`py-2 px-3 font-mono font-semibold ${
                                (t.pnl ?? 0) >= 0 ? "text-buy" : "text-sell"
                              }`}
                            >
                              {(t.pnl ?? 0) >= 0 ? "+" : ""}
                              {(t.pnl ?? 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">
                              {t.confirmationReason ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trade History */}
          <TabsContent value="history">
            <Card
              className="terminal-border"
              style={{ background: "oklch(0.13 0.012 240)" }}
            >
              <CardContent className="p-0">
                {closedTrades.length === 0 ? (
                  <div
                    data-ocid="profile.trade_history.empty_state"
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    No closed trades yet
                  </div>
                ) : (
                  <ScrollArea className="max-h-[480px]">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-border">
                          {[
                            "Symbol",
                            "Type",
                            "Side",
                            "Entry",
                            "Exit",
                            "P&L",
                            "Reason",
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
                        {closedTrades.slice(0, 200).map((t, i) => (
                          <tr
                            key={t.id}
                            data-ocid={`profile.trade_history.row.${i + 1}`}
                            className={`border-b border-border/40 hover:bg-secondary/20 transition-colors ${
                              i % 2 === 0 ? "bg-secondary/10" : ""
                            }`}
                          >
                            <td className="py-2 px-3 font-semibold">
                              {t.symbol}
                            </td>
                            <td className="py-2 px-3">
                              <TradeTypeBadge type={t.tradeType} />
                            </td>
                            <td
                              className={`py-2 px-3 font-bold ${t.side === "buy" ? "text-buy" : "text-sell"}`}
                            >
                              {t.side.toUpperCase()}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {t.entryPrice.toFixed(2)}
                            </td>
                            <td className="py-2 px-3 font-mono">
                              {t.exitPrice?.toFixed(2) ?? "—"}
                            </td>
                            <td
                              className={`py-2 px-3 font-mono font-semibold ${
                                (t.pnl ?? 0) >= 0 ? "text-buy" : "text-sell"
                              }`}
                            >
                              {(t.pnl ?? 0) >= 0 ? "+" : ""}
                              {(t.pnl ?? 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">
                              {t.confirmationReason ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance by type */}
          <TabsContent value="performance">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {typeStats.map((s) => (
                <Card
                  key={s.type}
                  className="terminal-border"
                  style={{ background: "oklch(0.14 0.012 240)" }}
                  data-ocid={`profile.performance.${s.type.toLowerCase()}_card`}
                >
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TradeTypeBadge type={s.type} />
                      <span className="text-foreground font-semibold">
                        {s.type}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {s.count === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        No trades yet
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            Trades
                          </p>
                          <p className="font-mono font-bold text-base">
                            {s.count}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            Win Rate
                          </p>
                          <p
                            className={`font-mono font-bold text-base ${s.winRate >= 50 ? "text-buy" : "text-sell"}`}
                          >
                            {s.winRate.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            P&L
                          </p>
                          <p
                            className={`font-mono font-bold text-base ${s.pnl >= 0 ? "text-buy" : "text-sell"}`}
                          >
                            {s.pnl >= 0 ? "+" : ""}
                            {s.pnl.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </main>
  );
}
