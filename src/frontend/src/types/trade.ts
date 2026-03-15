export interface TradeRecord {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  source: "signal" | "demo";
  entryPrice: number;
  exitPrice?: number;
  sl: number;
  tp1: number;
  tp2: number;
  tp3: number;
  entryTime: Date;
  exitTime?: Date;
  entryIndex: number;
  exitIndex?: number;
  status: "open" | "closed";
  pnl?: number;
  tradeType?: "Scalp" | "Intraday" | "Swing" | "Position";
  confirmationReason?: string;
}
