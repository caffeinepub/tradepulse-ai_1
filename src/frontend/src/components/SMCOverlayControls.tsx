import type { SMCVisibility } from "../types/smc";

interface SMCOverlayControlsProps {
  visibility: SMCVisibility;
  onToggle: (key: keyof SMCVisibility) => void;
}

const ITEMS: {
  key: keyof SMCVisibility;
  label: string;
  color: string;
  ocid: string;
}[] = [
  {
    key: "liquidityZones",
    label: "Liquidity",
    color: "oklch(0.62 0.16 145)",
    ocid: "smc.liquidity_toggle",
  },
  {
    key: "orderBlocks",
    label: "Order Blocks",
    color: "oklch(0.62 0.22 27)",
    ocid: "smc.orderblock_toggle",
  },
  {
    key: "bosChoch",
    label: "BOS/CHOCH",
    color: "oklch(0.75 0.16 240)",
    ocid: "smc.bos_toggle",
  },
  {
    key: "fvg",
    label: "FVG",
    color: "oklch(0.72 0.18 60)",
    ocid: "smc.fvg_toggle",
  },
];

export function SMCOverlayControls({
  visibility,
  onToggle,
}: SMCOverlayControlsProps) {
  return (
    <div
      data-ocid="smc.overlay_controls"
      className="flex items-center gap-1 px-2 py-1 shrink-0"
      style={{
        background: "oklch(0.13 0.012 240)",
        borderBottom: "1px solid oklch(0.22 0.012 240)",
      }}
    >
      <span
        className="text-[9px] font-semibold uppercase tracking-widest mr-1"
        style={{ color: "oklch(0.45 0.02 240)" }}
      >
        SMC
      </span>
      {ITEMS.map((item) => {
        const active = visibility[item.key];
        return (
          <button
            key={item.key}
            type="button"
            data-ocid={item.ocid}
            onClick={() => onToggle(item.key)}
            title={`Toggle ${item.label}`}
            className="flex items-center gap-1 px-1.5 h-5 rounded text-[9px] font-mono font-semibold transition-all"
            style={{
              background: active
                ? `oklch(from ${item.color} l c h / 0.15)`
                : "transparent",
              border: active
                ? `1px solid oklch(from ${item.color} l c h / 0.4)`
                : "1px solid oklch(0.25 0.012 240)",
              color: active ? item.color : "oklch(0.42 0.015 240)",
              opacity: active ? 1 : 0.6,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: active ? item.color : "oklch(0.35 0.012 240)",
              }}
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
