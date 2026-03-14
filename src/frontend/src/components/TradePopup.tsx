import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { TradeRecord } from "../types/trade";

interface TradePopupProps {
  trade: TradeRecord;
  x: number;
  y: number;
  onClose: () => void;
}

function formatDuration(start: Date, end?: Date): string {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 10) return p.toFixed(4);
  return p.toFixed(5);
}

export function TradePopup({ trade, x, y, onClose }: TradePopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // Smart reposition to stay in viewport
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const popW = 240;
  const popH = 280;
  let left = x + 12;
  let top = y - 40;
  if (left + popW > vpW - 8) left = x - popW - 12;
  if (top + popH > vpH - 8) top = vpH - popH - 8;
  if (top < 8) top = 8;

  const isBuy = trade.side === "buy";
  const sideColor = isBuy ? "oklch(0.72 0.18 145)" : "oklch(0.62 0.22 27)";
  const pnl = trade.pnl ?? 0;
  const pnlColor = pnl >= 0 ? "oklch(0.72 0.18 145)" : "oklch(0.62 0.22 27)";

  return (
    <div
      ref={popupRef}
      data-ocid="trade.popup"
      style={{
        position: "fixed",
        left,
        top,
        zIndex: 9999,
        width: popW,
        background: "oklch(0.13 0.01 240)",
        border: "1px solid oklch(0.25 0.012 240)",
        borderRadius: "8px",
        boxShadow: "0 8px 32px oklch(0 0 0 / 0.6)",
        padding: "12px",
        fontSize: "11px",
        fontFamily: "JetBrainsMono, monospace",
        color: "oklch(0.85 0.01 220)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span
            style={{
              background: sideColor,
              color: "oklch(0.12 0.01 240)",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              fontSize: 10,
            }}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>
          <span
            style={{
              background: "oklch(0.22 0.012 240)",
              color: "oklch(0.65 0.01 220)",
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 9,
              textTransform: "uppercase",
            }}
          >
            {trade.source}
          </span>
          <span style={{ color: "oklch(0.55 0.01 220)", fontSize: 10 }}>
            {trade.symbol}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-ocid="trade.close_button"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "oklch(0.5 0.01 220)",
            padding: 2,
            lineHeight: 1,
          }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        <Row label="Entry" value={formatPrice(trade.entryPrice)} />
        {trade.exitPrice !== undefined && (
          <Row label="Exit" value={formatPrice(trade.exitPrice)} />
        )}
        <Row
          label="SL"
          value={formatPrice(trade.sl)}
          valueStyle={{ color: "oklch(0.62 0.22 27)" }}
        />
        <Row
          label="TP1"
          value={formatPrice(trade.tp1)}
          valueStyle={{ color: "oklch(0.72 0.18 145)" }}
        />
        <Row
          label="TP2"
          value={formatPrice(trade.tp2)}
          valueStyle={{ color: "oklch(0.72 0.18 145)" }}
        />
        <Row
          label="TP3"
          value={formatPrice(trade.tp3)}
          valueStyle={{ color: "oklch(0.72 0.18 145)" }}
        />
        <div
          style={{
            borderTop: "1px solid oklch(0.22 0.012 240)",
            marginTop: 4,
            paddingTop: 6,
          }}
        >
          <Row
            label="Duration"
            value={formatDuration(trade.entryTime, trade.exitTime)}
          />
          {trade.status === "closed" && (
            <Row
              label="P&L"
              value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`}
              valueStyle={{ color: pnlColor, fontWeight: 700 }}
            />
          )}
          <Row
            label="Status"
            value={trade.status.toUpperCase()}
            valueStyle={{
              color:
                trade.status === "open"
                  ? "oklch(0.72 0.18 145)"
                  : "oklch(0.55 0.01 220)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ color: "oklch(0.5 0.01 220)" }}>{label}</span>
      <span style={{ ...valueStyle }}>{value}</span>
    </div>
  );
}
