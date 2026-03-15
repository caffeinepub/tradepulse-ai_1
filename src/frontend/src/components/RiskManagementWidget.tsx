import { AlertTriangle, ShieldCheck } from "lucide-react";

interface Props {
  dailyLoss: number;
  dailyLossLimit: number;
  isLimitReached: boolean;
}

export function RiskManagementWidget({
  dailyLoss,
  dailyLossLimit,
  isLimitReached,
}: Props) {
  const pct = Math.min((dailyLoss / dailyLossLimit) * 100, 100);

  // Color: green < 50%, yellow 50-80%, red > 80%
  const barColor =
    pct < 50
      ? "oklch(0.62 0.19 142)"
      : pct < 80
        ? "oklch(0.78 0.18 74)"
        : "oklch(0.55 0.22 27)";

  return (
    <div className="px-3 py-2 border-b border-border" data-ocid="risk.panel">
      {isLimitReached ? (
        <div
          data-ocid="risk.error_state"
          className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-semibold"
          style={{
            background: "oklch(0.18 0.08 27 / 0.5)",
            border: "1px solid oklch(0.45 0.18 27 / 0.4)",
            color: "oklch(0.75 0.12 27)",
          }}
        >
          <AlertTriangle className="w-3 h-3 shrink-0" />
          Daily loss limit reached. Trading paused until tomorrow.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 mb-1">
          <ShieldCheck
            className="w-3 h-3 shrink-0"
            style={{ color: barColor }}
          />
          <span className="text-[10px] text-muted-foreground">Daily Loss:</span>
          <span
            className="text-[10px] font-semibold ml-auto"
            style={{ color: barColor }}
          >
            ${dailyLoss.toFixed(2)}
            <span className="text-muted-foreground font-normal">
              {" "}
              / ${dailyLossLimit.toFixed(2)}
            </span>
          </span>
        </div>
      )}

      {/* Progress bar */}
      <div
        className="relative h-1 rounded-full overflow-hidden"
        style={{ background: "oklch(0.22 0.02 240)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
    </div>
  );
}
