export interface SymbolConfig {
  symbol: string;
  name: string;
  basePrice: number;
  category: "crypto" | "forex" | "gold" | "indices";
  precision: number;
  volatility: number;
}

export const SYMBOLS: SymbolConfig[] = [
  {
    symbol: "BTC/USD",
    name: "Bitcoin",
    basePrice: 65000,
    category: "crypto",
    precision: 2,
    volatility: 0.004,
  },
  {
    symbol: "ETH/USD",
    name: "Ethereum",
    basePrice: 3400,
    category: "crypto",
    precision: 2,
    volatility: 0.005,
  },
  {
    symbol: "SOL/USD",
    name: "Solana",
    basePrice: 145,
    category: "crypto",
    precision: 3,
    volatility: 0.006,
  },
  {
    symbol: "EUR/USD",
    name: "Euro / Dollar",
    basePrice: 1.0852,
    category: "forex",
    precision: 5,
    volatility: 0.0003,
  },
  {
    symbol: "GBP/USD",
    name: "Pound / Dollar",
    basePrice: 1.2645,
    category: "forex",
    precision: 5,
    volatility: 0.0004,
  },
  {
    symbol: "XAU/USD",
    name: "Gold",
    basePrice: 2340,
    category: "gold",
    precision: 2,
    volatility: 0.002,
  },
  {
    symbol: "SPX",
    name: "S&P 500",
    basePrice: 5200,
    category: "indices",
    precision: 2,
    volatility: 0.002,
  },
  {
    symbol: "NDX",
    name: "Nasdaq 100",
    basePrice: 18200,
    category: "indices",
    precision: 2,
    volatility: 0.003,
  },
];

export interface PriceState {
  price: number;
  change24h: number;
  changePercent: number;
  high24h: number;
  low24h: number;
}

const priceStates = new Map<string, PriceState>();

function initPriceState(config: SymbolConfig): PriceState {
  const spread = config.basePrice * 0.015;
  return {
    price: config.basePrice,
    change24h: (Math.random() - 0.5) * spread * 2,
    changePercent: (Math.random() - 0.5) * 3,
    high24h: config.basePrice * (1 + Math.random() * 0.02),
    low24h: config.basePrice * (1 - Math.random() * 0.02),
  };
}

export function getPriceState(symbol: string): PriceState {
  if (!priceStates.has(symbol)) {
    const config = SYMBOLS.find((s) => s.symbol === symbol);
    if (config) {
      priceStates.set(symbol, initPriceState(config));
    }
  }
  return (
    priceStates.get(symbol) ?? {
      price: 0,
      change24h: 0,
      changePercent: 0,
      high24h: 0,
      low24h: 0,
    }
  );
}

export function updatePrices(): void {
  for (const config of SYMBOLS) {
    const state = getPriceState(config.symbol);
    const delta = state.price * config.volatility * (Math.random() - 0.5) * 2;
    const newPrice = Math.max(state.price + delta, config.basePrice * 0.5);
    const newChange = newPrice - config.basePrice;
    const newChangePercent = (newChange / config.basePrice) * 100;
    priceStates.set(config.symbol, {
      price: newPrice,
      change24h: newChange,
      changePercent: newChangePercent,
      high24h: Math.max(state.high24h, newPrice),
      low24h: Math.min(state.low24h, newPrice),
    });
  }
}

export function generateChartData(
  symbol: string,
  points = 120,
): Array<{ time: string; price: number }> {
  const config = SYMBOLS.find((s) => s.symbol === symbol);
  if (!config) return [];

  const data: Array<{ time: string; price: number }> = [];
  let price = config.basePrice * (1 - Math.random() * 0.03);
  const now = Date.now();

  for (let i = points; i >= 0; i--) {
    const delta = price * config.volatility * (Math.random() - 0.48) * 2;
    price = Math.max(price + delta, config.basePrice * 0.5);
    const ts = now - i * 60000;
    const d = new Date(ts);
    const timeStr = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    data.push({ time: timeStr, price });
  }

  return data;
}

export function formatPrice(price: number, precision: number): string {
  return price.toFixed(precision);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}
