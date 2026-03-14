import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "../utils/priceSimulator";

interface SessionInfoStripProps {
  balance: number;
  equity: number;
  dailyPnl: number;
  dailyLossUsed: number;
  dailyLossLimit: number;
  scalpsToday: number;
}

export function SessionInfoStrip({
  balance,
  equity,
  dailyPnl,
  dailyLossUsed,
  dailyLossLimit,
  scalpsToday,
}: SessionInfoStripProps) {
  const lossPercent = Math.min(
    100,
    (Math.abs(dailyLossUsed) / dailyLossLimit) * 100,
  );

  return (
    <div
      data-ocid="session.strip"
      className="px-3 py-2 border-b border-border shrink-0"
      style={{ background: "oklch(0.11 0.012 240)" }}
    >
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div data-ocid="session.balance">
          <span className="text-[9px] text-muted-foreground">Balance</span>
          <div className="font-mono text-[11px] font-bold text-foreground">
            {formatCurrency(balance)}
          </div>
        </div>
        <div data-ocid="session.daily_pnl">
          <span className="text-[9px] text-muted-foreground">Equity</span>
          <div className="font-mono text-[11px] font-bold text-foreground">
            {formatCurrency(equity)}
          </div>
        </div>
        <div>
          <span className="text-[9px] text-muted-foreground">Daily P&L</span>
          <div
            className={`font-mono text-[11px] font-bold ${
              dailyPnl >= 0 ? "text-buy" : "text-sell"
            }`}
          >
            {dailyPnl >= 0 ? "+" : ""}
            {formatCurrency(dailyPnl)}
          </div>
        </div>
        <div data-ocid="session.scalp_counter">
          <span className="text-[9px] text-muted-foreground">Scalps</span>
          <div className="font-mono text-[11px] font-bold text-foreground">
            {scalpsToday}/3
          </div>
        </div>
      </div>
      <div className="mt-1.5">
        <div className="flex justify-between text-[8px] text-muted-foreground mb-0.5">
          <span>Daily loss limit</span>
          <span className="font-mono">
            {formatCurrency(Math.abs(dailyLossUsed))}/
            {formatCurrency(dailyLossLimit)}
          </span>
        </div>
        <Progress
          value={lossPercent}
          className="h-1"
          style={{
            background: "oklch(0.18 0.012 240)",
          }}
        />
      </div>
    </div>
  );
}
