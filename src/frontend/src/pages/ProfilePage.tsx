import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Save, TrendingDown, TrendingUp, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useSaveUserProfile, useUserProfile } from "../hooks/useQueries";
import { formatCurrency } from "../utils/priceSimulator";

const DEMO_HISTORY = [
  {
    id: "th-1",
    symbol: "BTC/USD",
    side: "buy" as const,
    entryPrice: 62400.5,
    closePrice: 65100.2,
    quantity: 0.1,
    pnl: 269.97,
    date: "2026-03-10",
  },
  {
    id: "th-2",
    symbol: "ETH/USD",
    side: "sell" as const,
    entryPrice: 3520.0,
    closePrice: 3380.0,
    quantity: 0.5,
    pnl: 70.0,
    date: "2026-03-09",
  },
  {
    id: "th-3",
    symbol: "XAU/USD",
    side: "buy" as const,
    entryPrice: 2310.0,
    closePrice: 2298.0,
    quantity: 0.5,
    pnl: -6.0,
    date: "2026-03-08",
  },
  {
    id: "th-4",
    symbol: "EUR/USD",
    side: "sell" as const,
    entryPrice: 1.088,
    closePrice: 1.083,
    quantity: 1000,
    pnl: 50.0,
    date: "2026-03-07",
  },
];

export function ProfilePage() {
  const { identity } = useInternetIdentity();
  const { data: profile, isLoading } = useUserProfile();
  const { mutate: saveProfile, isPending } = useSaveUserProfile();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setEmail(profile.email);
    }
  }, [profile]);

  const handleSave = () => {
    if (!profile) return;
    saveProfile(
      { ...profile, displayName, email },
      {
        onSuccess: () => toast.success("Profile saved"),
        onError: () => toast.error("Failed to save profile"),
      },
    );
  };

  const totalPnL = DEMO_HISTORY.reduce((sum, t) => sum + t.pnl, 0);
  const wins = DEMO_HISTORY.filter((t) => t.pnl > 0).length;
  const winRate = Math.round((wins / DEMO_HISTORY.length) * 100);
  const principal = identity?.getPrincipal().toString();

  return (
    <main className="min-h-screen pt-8 pb-16 px-4 max-w-screen-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-display text-2xl font-bold mb-6">
          Account Profile
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-1 space-y-4">
            <div className="terminal-border bg-card rounded-lg p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-3">
                  <User className="w-8 h-8 text-buy" />
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-4 w-48" />
                  </>
                ) : (
                  <>
                    <div className="font-display font-bold text-lg">
                      {profile?.displayName || "Demo Trader"}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {profile?.email || "demo@tradepulse.ai"}
                    </div>
                  </>
                )}
                {principal && (
                  <div className="mt-2 text-[10px] font-mono-num text-muted-foreground bg-secondary rounded px-2 py-0.5 truncate max-w-full">
                    {principal.slice(0, 20)}…
                  </div>
                )}
                <Badge
                  variant="outline"
                  className="mt-3 text-xs border-primary/30 text-buy"
                >
                  Demo Account
                </Badge>
              </div>
            </div>

            <div className="terminal-border bg-card rounded-lg p-4">
              <div className="text-xs font-semibold text-muted-foreground mb-3">
                EDIT PROFILE
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Display Name
                  </Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-ocid="profile.name_input"
                    className="bg-input border-border mt-1 h-8 text-sm"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Email
                  </Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-ocid="profile.email_input"
                    className="bg-input border-border mt-1 h-8 text-sm font-mono-num"
                    placeholder="you@example.com"
                  />
                </div>
                <Button
                  onClick={handleSave}
                  data-ocid="profile.save_button"
                  disabled={isPending}
                  className="w-full h-8 text-xs bg-primary/20 border border-primary/40 text-buy hover:bg-primary/30 gap-1.5"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                  Save Profile
                </Button>
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Balance",
                  value: formatCurrency(profile?.balance ?? 10000),
                  color: "text-foreground",
                },
                {
                  label: "Total Equity",
                  value: formatCurrency((profile?.balance ?? 10000) + totalPnL),
                  color: "text-foreground",
                },
                {
                  label: "Open Positions",
                  value: String(profile?.openPositions?.length ?? 2),
                  color: "text-cyan",
                },
                { label: "Win Rate", value: `${winRate}%`, color: "text-buy" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="terminal-border bg-card rounded p-3"
                >
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {stat.label}
                  </div>
                  <div
                    className={`font-mono-num text-lg font-bold ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="terminal-border bg-card rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <div className="text-xs font-semibold text-muted-foreground">
                  TRADE HISTORY
                </div>
              </div>
              {DEMO_HISTORY.length === 0 ? (
                <div
                  data-ocid="trade_history.empty_state"
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  No closed trades yet. Start trading to see your history.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-[10px] text-muted-foreground font-normal">
                        Symbol
                      </TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-normal">
                        Side
                      </TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-normal">
                        Entry
                      </TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-normal">
                        Exit
                      </TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-normal text-right">
                        P&amp;L
                      </TableHead>
                      <TableHead className="text-[10px] text-muted-foreground font-normal text-right">
                        Date
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DEMO_HISTORY.map((trade, displayIdx) => (
                      <TableRow
                        key={trade.id}
                        data-ocid={`trade_history.row.${displayIdx + 1}`}
                        className="border-border hover:bg-secondary/30"
                      >
                        <TableCell className="font-mono-num text-xs font-semibold py-2">
                          {trade.symbol}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 ${
                              trade.side === "buy"
                                ? "bg-buy border-buy text-buy"
                                : "bg-sell border-sell text-sell"
                            }`}
                          >
                            {trade.side.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono-num text-xs py-2 text-muted-foreground">
                          {trade.entryPrice.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-mono-num text-xs py-2 text-muted-foreground">
                          {trade.closePrice.toFixed(2)}
                        </TableCell>
                        <TableCell
                          className={`font-mono-num text-xs py-2 text-right font-semibold ${trade.pnl >= 0 ? "text-buy" : "text-sell"}`}
                        >
                          {trade.pnl >= 0 ? "+" : ""}
                          {formatCurrency(trade.pnl)}
                        </TableCell>
                        <TableCell className="font-mono-num text-xs py-2 text-right text-muted-foreground">
                          {trade.date}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="flex items-center justify-between terminal-border bg-card rounded p-3 text-xs">
              <span className="text-muted-foreground">
                {DEMO_HISTORY.length} closed trades
              </span>
              <div className="flex items-center gap-1.5">
                {totalPnL >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-buy" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-sell" />
                )}
                <span
                  className={`font-mono-num font-semibold ${totalPnL >= 0 ? "text-buy" : "text-sell"}`}
                >
                  Total P&amp;L: {totalPnL >= 0 ? "+" : ""}
                  {formatCurrency(totalPnL)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
