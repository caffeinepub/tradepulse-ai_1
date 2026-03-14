import { useEffect, useRef, useState } from "react";
import type { TradeRecord } from "../types/trade";

interface TradeChartOverlayProps {
  trades: TradeRecord[];
  chartData: { time: string; price: number }[];
  onMarkerClick: (trade: TradeRecord, x: number, y: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  priceMin: number;
  priceMax: number;
}

function mapX(
  index: number,
  totalPoints: number,
  plotLeft: number,
  plotRight: number,
): number {
  if (totalPoints <= 1) return plotLeft;
  return plotLeft + (index / (totalPoints - 1)) * (plotRight - plotLeft);
}

function mapY(
  price: number,
  priceMin: number,
  priceMax: number,
  plotTop: number,
  plotBottom: number,
): number {
  if (priceMax === priceMin) return (plotTop + plotBottom) / 2;
  return (
    plotBottom -
    ((price - priceMin) / (priceMax - priceMin)) * (plotBottom - plotTop)
  );
}

const YAXIS_WIDTH = 60;
const CHART_MARGIN_TOP = 8;
const CHART_MARGIN_RIGHT = 8;
const XAXIS_HEIGHT = 24;
const CONTAINER_PADDING = 8;

export function TradeChartOverlay({
  trades,
  chartData,
  onMarkerClick,
  containerRef,
  priceMin,
  priceMax,
}: TradeChartOverlayProps) {
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observerRef.current = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDims({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [containerRef]);

  if (dims.width === 0 || dims.height === 0) return null;
  if (chartData.length === 0) return null;

  // Compute plot area
  const plotLeft = CONTAINER_PADDING + YAXIS_WIDTH + CHART_MARGIN_TOP;
  const plotRight = dims.width - CONTAINER_PADDING - CHART_MARGIN_RIGHT;
  const plotTop = CONTAINER_PADDING + CHART_MARGIN_TOP;
  const plotBottom = dims.height - CONTAINER_PADDING - XAXIS_HEIGHT;

  const totalPoints = chartData.length;
  const paddedMin = priceMin - (priceMax - priceMin) * 0.05;
  const paddedMax = priceMax + (priceMax - priceMin) * 0.05;

  function handleMarkerKey(e: React.KeyboardEvent, trade: TradeRecord) {
    if (e.key === "Enter" || e.key === " ") {
      onMarkerClick(trade, 0, 0);
    }
  }

  return (
    <svg
      aria-label="Trade markers overlay"
      role="img"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {trades.map((trade) => {
        const color =
          trade.side === "buy" ? "oklch(0.72 0.18 145)" : "oklch(0.62 0.22 27)";
        const ex = mapX(trade.entryIndex, totalPoints, plotLeft, plotRight);
        const ey = mapY(
          trade.entryPrice,
          paddedMin,
          paddedMax,
          plotTop,
          plotBottom,
        );

        const exitX =
          trade.exitIndex !== undefined
            ? mapX(trade.exitIndex, totalPoints, plotLeft, plotRight)
            : null;
        const exitY =
          trade.exitPrice !== undefined
            ? mapY(trade.exitPrice, paddedMin, paddedMax, plotTop, plotBottom)
            : null;

        return (
          <g key={trade.id}>
            {/* Connecting line for closed trades */}
            {trade.status === "closed" && exitX !== null && exitY !== null && (
              <line
                x1={ex}
                y1={ey}
                x2={exitX}
                y2={exitY}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.5}
              />
            )}

            {/* Entry marker */}
            <g
              aria-label={`${trade.side.toUpperCase()} trade entry at ${trade.entryPrice}`}
              tabIndex={0}
              style={{ pointerEvents: "all", cursor: "pointer" }}
              onClick={(e) => {
                e.stopPropagation();
                onMarkerClick(trade, e.clientX, e.clientY);
              }}
              onKeyDown={(e) => handleMarkerKey(e, trade)}
            >
              {trade.source === "signal" ? (
                <>
                  <circle cx={ex} cy={ey} r={8} fill={color} opacity={0.9} />
                  <text
                    x={ex}
                    y={ey}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="oklch(0.12 0.01 240)"
                    fontSize={7}
                    fontWeight="bold"
                    fontFamily="JetBrainsMono, monospace"
                  >
                    S
                  </text>
                </>
              ) : (
                <>
                  <polygon
                    points={
                      trade.side === "buy"
                        ? `${ex},${ey - 10} ${ex - 7},${ey + 4} ${ex + 7},${ey + 4}`
                        : `${ex},${ey + 10} ${ex - 7},${ey - 4} ${ex + 7},${ey - 4}`
                    }
                    fill={color}
                    opacity={0.9}
                  />
                  <text
                    x={ex}
                    y={trade.side === "buy" ? ey - 3 : ey + 3}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="oklch(0.12 0.01 240)"
                    fontSize={6}
                    fontWeight="bold"
                    fontFamily="JetBrainsMono, monospace"
                  >
                    T
                  </text>
                </>
              )}
            </g>

            {/* Exit marker for closed trades */}
            {trade.status === "closed" && exitX !== null && exitY !== null && (
              <g
                aria-label={`Trade exit at ${trade.exitPrice}`}
                tabIndex={0}
                style={{ pointerEvents: "all", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkerClick(trade, e.clientX, e.clientY);
                }}
                onKeyDown={(e) => handleMarkerKey(e, trade)}
              >
                <circle
                  cx={exitX}
                  cy={exitY}
                  r={5}
                  fill="oklch(0.15 0.01 240)"
                  stroke={color}
                  strokeWidth={1.5}
                />
                <line
                  x1={exitX - 3}
                  y1={exitY - 3}
                  x2={exitX + 3}
                  y2={exitY + 3}
                  stroke={color}
                  strokeWidth={1.5}
                />
                <line
                  x1={exitX + 3}
                  y1={exitY - 3}
                  x2={exitX - 3}
                  y2={exitY + 3}
                  stroke={color}
                  strokeWidth={1.5}
                />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
