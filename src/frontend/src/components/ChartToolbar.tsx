import { Separator } from "@/components/ui/separator";
import {
  AlignLeft,
  BarChart2,
  LineChart,
  Minus,
  Pencil,
  Plus,
  TrendingUp,
} from "lucide-react";
import type { SMCVisibility } from "../types/smc";
import type { ChartType } from "./ChartCanvas";

const TIMEFRAMES = [
  { key: "1m", label: "1m" },
  { key: "3m", label: "3m" },
  { key: "5m", label: "5m" },
  { key: "15m", label: "15m" },
  { key: "1h", label: "1H" },
  { key: "4h", label: "4H" },
  { key: "1d", label: "1D" },
  { key: "1W", label: "1W" },
  { key: "1M", label: "1M" },
];

const SMC_TOGGLES: {
  key: keyof SMCVisibility;
  label: string;
  color: string;
}[] = [
  { key: "liquidityZones", label: "Liq", color: "text-blue-400" },
  { key: "orderBlocks", label: "OB", color: "text-green-400" },
  { key: "bosChoch", label: "BOS", color: "text-amber-400" },
  { key: "fvg", label: "FVG", color: "text-purple-400" },
];

interface ChartToolbarProps {
  symbol: string;
  precision: number;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  smcVisibility: SMCVisibility;
  onSMCToggle: (key: keyof SMCVisibility) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showDrawingToolbar: boolean;
  onToggleDrawingToolbar: () => void;
}

export function ChartToolbar({
  symbol,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  smcVisibility,
  onSMCToggle,
  onZoomIn,
  onZoomOut,
  showDrawingToolbar,
  onToggleDrawingToolbar,
}: ChartToolbarProps) {
  return (
    <div
      className="flex items-center gap-1 px-2 border-b border-border bg-background shrink-0 overflow-x-auto"
      style={{ height: 38 }}
    >
      {/* Symbol label only */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs font-bold text-foreground">{symbol}</span>
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

      {/* Timeframes */}
      <div className="flex items-center gap-px shrink-0">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.key}
            type="button"
            data-ocid="chart.timeframe.tab"
            aria-label={tf.label}
            onClick={() => onTimeframeChange(tf.key)}
            className={`px-1.5 h-6 text-[10px] font-mono rounded flex items-center justify-center transition-colors ${
              timeframe === tf.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

      {/* Chart type switcher */}
      <div className="flex items-center gap-px shrink-0">
        {[
          {
            key: "candlestick" as ChartType,
            Icon: BarChart2,
            label: "Candlestick",
          },
          { key: "line" as ChartType, Icon: TrendingUp, label: "Line" },
          { key: "area" as ChartType, Icon: AlignLeft, label: "Area" },
          { key: "bar" as ChartType, Icon: LineChart, label: "Bar" },
        ].map((ct) => (
          <button
            key={ct.key}
            type="button"
            data-ocid="chart.type.tab"
            aria-label={ct.label}
            onClick={() => onChartTypeChange(ct.key)}
            title={ct.label}
            className={`p-1 h-6 w-6 rounded flex items-center justify-center transition-colors ${
              chartType === ct.key
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <ct.Icon className="w-3 h-3" />
          </button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

      {/* SMC toggles */}
      <div className="flex items-center gap-px shrink-0">
        {SMC_TOGGLES.map((t) => (
          <button
            key={t.key}
            type="button"
            data-ocid="chart.smc.toggle"
            onClick={() => onSMCToggle(t.key)}
            className={`px-1.5 h-5 text-[9px] font-semibold rounded transition-colors ${
              smcVisibility[t.key]
                ? `${t.color} bg-secondary`
                : "text-muted-foreground/40 hover:text-muted-foreground"
            }`}
            title={t.key}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

      {/* Zoom buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          data-ocid="chart.zoom_out_button"
          onClick={onZoomOut}
          className="w-6 h-6 flex items-center justify-center rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          title="Zoom out"
        >
          <Minus className="w-3 h-3" />
        </button>
        <button
          type="button"
          data-ocid="chart.zoom_in_button"
          onClick={onZoomIn}
          className="w-6 h-6 flex items-center justify-center rounded border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          title="Zoom in"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      <Separator orientation="vertical" className="h-4 mx-0.5 shrink-0" />

      {/* Drawing toolbar toggle */}
      <button
        type="button"
        data-ocid="chart.drawing_toggle"
        onClick={onToggleDrawingToolbar}
        className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
          showDrawingToolbar
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }`}
        title="Drawing tools"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}
