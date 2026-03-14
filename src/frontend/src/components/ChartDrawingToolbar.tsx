import {
  Minus,
  MousePointer2,
  Sliders,
  Square,
  TrendingUp,
} from "lucide-react";
import type { DrawingTool } from "../types/drawing";

interface ChartDrawingToolbarProps {
  activeTool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
}

const TOOLS: {
  key: DrawingTool;
  icon: React.ReactNode;
  label: string;
  ocid: string;
}[] = [
  {
    key: "cursor",
    icon: <MousePointer2 className="w-4 h-4" />,
    label: "Cursor",
    ocid: "chart.cursor_tool",
  },
  {
    key: "trendline",
    icon: <TrendingUp className="w-4 h-4" />,
    label: "Trendline",
    ocid: "chart.trendline_tool",
  },
  {
    key: "hline",
    icon: <Minus className="w-4 h-4" />,
    label: "Horizontal Line",
    ocid: "chart.hline_tool",
  },
  {
    key: "rectangle",
    icon: <Square className="w-4 h-4" />,
    label: "Rectangle",
    ocid: "chart.rectangle_tool",
  },
  {
    key: "fibonacci",
    icon: <Sliders className="w-4 h-4" />,
    label: "Fibonacci",
    ocid: "chart.fibonacci_tool",
  },
];

export function ChartDrawingToolbar({
  activeTool,
  onToolChange,
}: ChartDrawingToolbarProps) {
  return (
    <div
      data-ocid="chart.drawing_toolbar"
      className="flex flex-col gap-0.5 p-1 shrink-0 border-r border-border"
      style={{ background: "oklch(0.13 0.012 240)", width: 36 }}
    >
      {TOOLS.map((tool) => {
        const isActive = activeTool === tool.key;
        return (
          <div key={tool.key} className="relative group">
            <button
              type="button"
              data-ocid={tool.ocid}
              title={tool.label}
              onClick={() => onToolChange(tool.key)}
              className="w-7 h-7 flex items-center justify-center rounded transition-colors"
              style={{
                background: isActive
                  ? "oklch(0.45 0.22 240 / 0.4)"
                  : "transparent",
                border: isActive
                  ? "1px solid oklch(0.55 0.22 240 / 0.7)"
                  : "1px solid transparent",
                color: isActive
                  ? "oklch(0.82 0.18 240)"
                  : "oklch(0.52 0.04 240)",
              }}
            >
              {tool.icon}
            </button>
            {/* Tooltip */}
            <div
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: "oklch(0.18 0.02 240)",
                border: "1px solid oklch(0.28 0.02 240)",
                color: "oklch(0.82 0.04 240)",
              }}
            >
              {tool.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
