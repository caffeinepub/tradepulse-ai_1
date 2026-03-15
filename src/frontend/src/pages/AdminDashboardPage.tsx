import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  LogOut,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { isAdminAuth, setAdminAuth } from "../adminAuth";
import type { AdminStats } from "../backend.d";
import { useActor } from "../hooks/useActor";

type StatCard = {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
};

export function AdminDashboardPage() {
  const { actor, isFetching } = useActor();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdminAuth()) {
      window.location.href = "/admin";
      return;
    }
    if (isFetching || !actor) return;
    actor
      .getAdminStats()
      .then((s) => {
        setStats(s);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats.");
        setLoading(false);
      });
  }, [actor, isFetching]);

  function handleSignOut() {
    setAdminAuth(false);
    window.location.href = "/admin";
  }

  const statCards: StatCard[] = stats
    ? [
        {
          id: "total-users",
          label: "Total Users",
          value: stats.totalUsers.toString(),
          icon: <Users className="w-5 h-5" />,
          color: "#58a6ff",
        },
        {
          id: "premium-users",
          label: "Premium Users",
          value: stats.premiumUsers.toString(),
          icon: <Star className="w-5 h-5" />,
          color: "#dca327",
        },
        {
          id: "free-users",
          label: "Free Users",
          value: stats.freeUsers.toString(),
          icon: <User className="w-5 h-5" />,
          color: "#3fb950",
        },
        {
          id: "total-trades",
          label: "Total Trades",
          value: stats.totalTrades.toString(),
          icon: <BarChart3 className="w-5 h-5" />,
          color: "#a371f7",
        },
        {
          id: "win-rate",
          label: "Platform Win Rate",
          value: `${stats.platformWinRate.toFixed(1)}%`,
          icon: <TrendingUp className="w-5 h-5" />,
          color: "#3fb950",
        },
        {
          id: "most-traded",
          label: "Most Traded Symbol",
          value: stats.mostTradedSymbol || "\u2014",
          icon: <Activity className="w-5 h-5" />,
          color: "#58a6ff",
        },
      ]
    : [];

  const skeletonIds = ["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"];

  return (
    <div className="min-h-screen" style={{ background: "#0d1117" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "#21262d", background: "#161b22" }}
      >
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5" style={{ color: "#dca327" }} />
          <span className="font-semibold text-lg" style={{ color: "#e6edf3" }}>
            Admin Control Panel
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{
              background: "rgba(220,163,39,0.12)",
              color: "#dca327",
              border: "1px solid rgba(220,163,39,0.25)",
            }}
          >
            SECURE
          </span>
        </div>
        <Button
          data-ocid="admin.signout_button"
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="gap-2"
          style={{ color: "#8b949e" }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </header>

      {/* Main content */}
      <main className="p-6 max-w-5xl mx-auto" data-ocid="admin.dashboard_panel">
        <div className="mb-6">
          <h1 className="text-xl font-semibold" style={{ color: "#e6edf3" }}>
            Platform Overview
          </h1>
          <p className="text-sm mt-1" style={{ color: "#8b949e" }}>
            Real-time platform metrics and analytics
          </p>
        </div>

        {loading && (
          <div
            data-ocid="admin.loading_state"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {skeletonIds.map((sid) => (
              <Card
                key={sid}
                style={{ background: "#161b22", borderColor: "#30363d" }}
              >
                <CardHeader className="pb-2">
                  <Skeleton
                    className="h-4 w-24"
                    style={{ background: "#21262d" }}
                  />
                </CardHeader>
                <CardContent>
                  <Skeleton
                    className="h-8 w-16"
                    style={{ background: "#21262d" }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div
            className="text-sm py-3 px-4 rounded"
            style={{
              background: "rgba(248,81,73,0.1)",
              color: "#f85149",
              border: "1px solid rgba(248,81,73,0.2)",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {statCards.map((card) => (
              <Card
                key={card.id}
                style={{ background: "#161b22", borderColor: "#30363d" }}
                className="transition-colors"
              >
                <CardHeader className="pb-1 pt-4 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className="text-xs font-medium tracking-widest uppercase"
                      style={{ color: "#8b949e" }}
                    >
                      {card.label}
                    </CardTitle>
                    <span style={{ color: card.color }}>{card.icon}</span>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <p
                    className="text-2xl font-bold font-mono"
                    style={{ color: card.color }}
                  >
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
