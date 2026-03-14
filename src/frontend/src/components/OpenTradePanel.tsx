import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "../utils/priceSimulator";

interface SimPosition {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

interface OpenTradePanelProps {
  positions: SimPosition[];
  positionSize: number;
  onPositionSizeChange: (v: number) => void;
  scalpsToday: number;
  dailyPnl: number;
  dailyLossLimitHit: boolean;
  onClosePosition: (id: string, price: number) => void;
}

export function OpenTradePanel({
  positions,
  positionSize,
  onPositionSizeChange,
  scalpsToday,
  dailyPnl,
  dailyLossLimitHit,
  onClosePosition,
}: OpenTradePanelProps) {
  return (
    <div data-ocid="open_trades.panel" className="border-b border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          Open Trades
        </span>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1.5 border-border"
          >
            {positions.length}
          </Badge>
          {dailyLossLimitHit && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 text-destructive border-destructive/30"
            >
              Paused
            </Badge>
          )}
        </div>
      </div>

      {/* Session stats */}
      <div className="px-3 py-1.5 flex items-center gap-3 border-b border-border">
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground">Scalps:</span>
          <span className="font-mono text-foreground">{scalpsToday}/3</span>
        </div>
        <div className="flex items-center gap-1 text-[9px]">
          <span className="text-muted-foreground">Daily P&L:</span>
          <span
            className={`font-mono font-semibold ${
              dailyPnl >= 0 ? "text-buy" : "text-sell"
            }`}
          >
            {dailyPnl >= 0 ? "+" : ""}
            {formatCurrency(dailyPnl)}
          </span>
        </div>
      </div>

      {/* Positions list */}
      <ScrollArea style={{ maxHeight: 180 }}>
        <div className="p-2 space-y-1.5">
          {positions.length === 0 ? (
            <div
              data-ocid="open_trades.empty_state"
              className="text-center py-4 text-[10px] text-muted-foreground"
            >
              No open positions
            </div>
          ) : (
            positions.map((pos, i) => (
              <div
                key={pos.id}
                data-ocid={`open_trades.item.${i + 1}`}
                className={`rounded p-2 text-[10px] border border-border/50 ${
                  pos.side === "buy"
                    ? "border-l-2 border-l-buy/60"
                    : "border-l-2 border-l-sell/60"
                }`}
                style={{ background: "oklch(0.13 0.012 240)" }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[10px] text-foreground">
                    {pos.symbol}
                  </span>
                  <div className="flex items-center gap-1">
                    <Badge
                      variant="outline"
                      className={`text-[8px] py-0 px-1 h-3.5 ${
                        pos.side === "buy"
                          ? "text-buy border-buy/30"
                          : "text-sell border-sell/30"
                      }`}
                    >
                      {pos.side.toUpperCase()}
                    </Badge>
                    <button
                      type="button"
                      data-ocid={`open_trades.delete_button.${i + 1}`}
                      onClick={() => onClosePosition(pos.id, pos.currentPrice)}
                      className="text-[9px] text-muted-foreground hover:text-sell px-1 rounded transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-x-2 text-[9px] text-muted-foreground">
                  <span>
                    Entry:{" "}
                    <span className="font-mono text-foreground">
                      {pos.entryPrice.toFixed(2)}
                    </span>
                  </span>
                  <span
                    className={`text-right font-mono font-bold ${
                      pos.pnl >= 0 ? "text-buy" : "text-sell"
                    }`}
                  >
                    {pos.pnl >= 0 ? "+" : ""}
                    {formatCurrency(pos.pnl)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Position size input */}
      <div className="px-3 py-2 border-t border-border">
        <Label className="text-[9px] text-muted-foreground uppercase tracking-wider">
          Position Size (lot)
        </Label>
        <Input
          data-ocid="open_trades.position_size_input"
          type="number"
          step="0.01"
          min="0.01"
          value={positionSize}
          onChange={(e) =>
            onPositionSizeChange(Number.parseFloat(e.target.value) || 0.05)
          }
          className="h-6 text-[10px] font-mono mt-1 bg-secondary border-border"
        />
        <p className="text-[8px] text-muted-foreground mt-0.5">
          Default: 0.05 lot. Adjust if needed.
        </p>
      </div>
    </div>
  );
}
