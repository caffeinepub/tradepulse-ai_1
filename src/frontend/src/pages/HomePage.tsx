import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Globe,
  LayoutDashboard,
  LogIn,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  SYMBOLS,
  fetchLiveBinancePrices,
  fetchLiveMetalPrices,
  getPriceState,
  updatePrices,
} from "../utils/priceSimulator";

interface MarketEntry {
  symbol: string;
  name: string;
  category: "Crypto" | "Forex" | "Commodities";
  precision: number;
  price: number;
  changePercent: number;
  change24h: number;
}

const ALL_MARKET_SYMBOLS: {
  symbol: string;
  category: "Crypto" | "Forex" | "Commodities";
}[] = [
  // Crypto
  { symbol: "BTC/USD", category: "Crypto" },
  { symbol: "ETH/USD", category: "Crypto" },
  { symbol: "SOL/USD", category: "Crypto" },
  { symbol: "BNB/USD", category: "Crypto" },
  { symbol: "XRP/USD", category: "Crypto" },
  { symbol: "ADA/USD", category: "Crypto" },
  { symbol: "DOGE/USD", category: "Crypto" },
  { symbol: "AVAX/USD", category: "Crypto" },
  { symbol: "MATIC/USD", category: "Crypto" },
  { symbol: "DOT/USD", category: "Crypto" },
  // Forex
  { symbol: "EUR/USD", category: "Forex" },
  { symbol: "GBP/USD", category: "Forex" },
  { symbol: "USD/JPY", category: "Forex" },
  { symbol: "USD/CHF", category: "Forex" },
  { symbol: "AUD/USD", category: "Forex" },
  { symbol: "NZD/USD", category: "Forex" },
  { symbol: "USD/CAD", category: "Forex" },
  { symbol: "GBP/JPY", category: "Forex" },
  { symbol: "EUR/JPY", category: "Forex" },
  { symbol: "EUR/GBP", category: "Forex" },
  // Commodities
  { symbol: "XAU/USD", category: "Commodities" },
  { symbol: "XAG/USD", category: "Commodities" },
  { symbol: "WTI/USD", category: "Commodities" },
];

function buildMarketEntries(): MarketEntry[] {
  return ALL_MARKET_SYMBOLS.map(({ symbol, category }) => {
    const cfg = SYMBOLS.find((s) => s.symbol === symbol);
    const state = getPriceState(symbol);
    return {
      symbol,
      name: cfg?.name ?? symbol,
      category,
      precision: cfg?.precision ?? 2,
      price: state.price,
      changePercent: state.changePercent,
      change24h: state.change24h,
    };
  });
}

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Signals",
    description:
      "Machine learning algorithms analyze market patterns and deliver high-confidence buy/sell signals in real time.",
  },
  {
    icon: Globe,
    title: "Multi-Market Coverage",
    description:
      "Trade crypto, forex, gold, and commodities from a single unified terminal interface.",
  },
  {
    icon: Shield,
    title: "Demo Account System",
    description:
      "Practice with $10,000 virtual funds. No risk, full market exposure, real trading mechanics.",
  },
  {
    icon: Zap,
    title: "Real-Time Data",
    description:
      "Live price feeds and market data updated every second. Never miss a movement that matters.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Crypto: "text-yellow-400",
  Forex: "text-blue-400",
  Commodities: "text-amber-400",
};

export function HomePage() {
  const { identity, login } = useInternetIdentity();
  const isAuthed = !!identity;
  const [activeTab, setActiveTab] = useState<
    "Crypto" | "Forex" | "Commodities"
  >("Crypto");

  const [marketData, setMarketData] =
    useState<MarketEntry[]>(buildMarketEntries);

  // Fetch real prices on mount
  useEffect(() => {
    fetchLiveBinancePrices().then(() => {
      setMarketData(buildMarketEntries());
    });
    fetchLiveMetalPrices().then(() => {
      setMarketData(buildMarketEntries());
    });
  }, []);

  // Periodic simulated updates (non-gold, non-crypto will drift slightly)
  useEffect(() => {
    const interval = setInterval(() => {
      updatePrices();
      setMarketData(buildMarketEntries());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch real metal prices every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveMetalPrices().then(() => {
        setMarketData(buildMarketEntries());
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const displayed = marketData.filter((m) => m.category === activeTab);

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-16 overflow-hidden"
        style={{
          backgroundImage:
            "url('/assets/generated/hero-trading-bg.dim_1600x900.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-background/80" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 60%, oklch(0.72 0.18 145 / 0.06) 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <Badge className="mb-6 bg-primary/10 border border-primary/30 text-buy font-mono text-xs px-3 py-1">
            <span className="animate-pulse-green mr-1.5 inline-block w-1.5 h-1.5 rounded-full bg-buy" />
            LIVE — AI Signals Active
          </Badge>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight tracking-tight mb-6">
            Trade Smarter
            <br />
            <span className="text-buy">with AI</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Professional-grade AI signals, real-time market data, and a full
            demo account system. Start trading crypto, forex, gold, and indices
            with confidence.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthed ? (
              <Link to="/dashboard">
                <Button
                  size="lg"
                  data-ocid="hero.go_to_dashboard_button"
                  className="bg-primary/20 border border-primary/50 text-buy hover:bg-primary/30 glow-buy font-semibold gap-2 w-full sm:w-auto"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Button
                size="lg"
                data-ocid="hero.signin_button"
                onClick={() => login()}
                className="bg-primary/20 border border-primary/50 text-buy hover:bg-primary/30 glow-buy font-semibold gap-2 w-full sm:w-auto"
              >
                <LogIn className="w-4 h-4" />
                Sign In with Internet Identity
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="relative z-10 mt-16 grid grid-cols-3 gap-4 max-w-md mx-auto"
        >
          {[
            { label: "Win Rate", value: "78%" },
            { label: "Signals/Day", value: "10+" },
            { label: "Markets", value: "23" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-mono text-2xl font-bold text-buy">
                {stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Live Markets */}
      <section className="px-4 py-16 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-mono text-muted-foreground px-3">
              LIVE MARKETS
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 mb-5">
            {(["Crypto", "Forex", "Commodities"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                data-ocid={`markets.${tab.toLowerCase()}.tab`}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded text-xs font-mono font-medium border transition-colors ${
                  activeTab === tab
                    ? "bg-primary/20 border-primary/50 text-buy"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                }`}
              >
                {tab}
                <span className="ml-1.5 text-muted-foreground">
                  ({ALL_MARKET_SYMBOLS.filter((m) => m.category === tab).length}
                  )
                </span>
              </button>
            ))}
          </div>

          {/* Scrollable market grid */}
          <div className="max-h-[480px] overflow-y-auto pr-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {displayed.map((market, i) => (
                <motion.div
                  key={market.symbol}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35, delay: i * 0.04 }}
                >
                  <div className="terminal-border bg-card rounded p-3 transition-colors h-full">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div
                          className={`text-xs font-mono font-medium ${CATEGORY_COLORS[market.category]}`}
                        >
                          {market.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[80px]">
                          {market.name}
                        </div>
                      </div>
                      <Badge
                        className={`text-xs font-mono shrink-0 ${
                          market.changePercent >= 0
                            ? "bg-buy/10 border-buy/30 text-buy"
                            : "bg-sell/10 border-sell/30 text-sell"
                        }`}
                        variant="outline"
                      >
                        {market.changePercent >= 0 ? "+" : ""}
                        {market.changePercent.toFixed(2)}%
                      </Badge>
                    </div>
                    <div className="font-mono text-sm font-bold">
                      {market.price.toFixed(market.precision)}
                    </div>
                    <div
                      className={`text-xs font-mono mt-0.5 ${
                        market.change24h >= 0 ? "text-buy" : "text-sell"
                      }`}
                    >
                      {market.change24h >= 0 ? "+" : ""}
                      {market.change24h.toFixed(market.precision)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="px-4 py-16 max-w-screen-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            The Complete <span className="text-buy">Trading Suite</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Everything you need to analyze markets, receive AI signals, and
            execute trades with precision.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="terminal-border bg-card rounded p-6 flex gap-4"
            >
              <div className="shrink-0 w-10 h-10 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <feature.icon className="w-5 h-5 text-buy" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center terminal-border bg-card rounded-lg p-10"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.13 0.01 240) 0%, oklch(0.11 0.015 200) 100%)",
          }}
        >
          <TrendingUp className="w-10 h-10 text-buy mx-auto mb-4" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">
            Ready to Start Trading?
          </h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of traders using AI signals to maximize returns.
          </p>
          {isAuthed ? (
            <Link to="/dashboard">
              <Button
                size="lg"
                data-ocid="hero.go_to_dashboard_button"
                className="bg-primary/20 border border-primary/50 text-buy hover:bg-primary/30 glow-buy font-semibold gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Go to Dashboard
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              data-ocid="hero.signin_button"
              onClick={() => login()}
              className="bg-primary/20 border border-primary/50 text-buy hover:bg-primary/30 glow-buy font-semibold gap-2"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Internet Identity
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-screen-xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-buy" />
            <span className="font-display font-semibold">TradePulse AI</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            {isAuthed && (
              <Link
                to="/dashboard"
                className="hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()}. Built with love by{" "}
            <span className="text-buy">Shaarif</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
