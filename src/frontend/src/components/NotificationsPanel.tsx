import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  BrainCircuit,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";

export interface Notification {
  id: string;
  type: "signal_buy" | "signal_sell" | "smc" | "optimizer" | "alert";
  message: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationsPanelProps {
  notifications: Notification[];
  onClearAll: () => void;
}

const TYPE_ICON: Record<Notification["type"], React.ElementType> = {
  signal_buy: TrendingUp,
  signal_sell: TrendingDown,
  smc: Zap,
  optimizer: BrainCircuit,
  alert: Bell,
};

const TYPE_COLOR: Record<Notification["type"], string> = {
  signal_buy: "text-buy",
  signal_sell: "text-sell",
  smc: "text-amber-400",
  optimizer: "text-purple-400",
  alert: "text-blue-400",
};

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

export function NotificationsPanel({
  notifications,
  onClearAll,
}: NotificationsPanelProps) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div data-ocid="notifications.panel" className="border-b border-border">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
            Alerts
          </span>
          {unread > 0 && (
            <Badge
              variant="outline"
              className="text-[8px] h-4 px-1.5 text-amber-400 border-amber-400/30"
            >
              {unread}
            </Badge>
          )}
        </div>
        <button
          type="button"
          data-ocid="notifications.clear_button"
          onClick={onClearAll}
          className="text-[9px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
        >
          <X className="w-2.5 h-2.5" /> Clear
        </button>
      </div>

      <ScrollArea style={{ maxHeight: 180 }}>
        <div data-ocid="notifications.list" className="py-1">
          {notifications.length === 0 ? (
            <div className="text-center py-4 text-[10px] text-muted-foreground">
              No alerts
            </div>
          ) : (
            notifications.slice(0, 20).map((n, i) => {
              const Icon = TYPE_ICON[n.type];
              const color = TYPE_COLOR[n.type];
              return (
                <div
                  key={n.id}
                  data-ocid={`notifications.item.${i + 1}`}
                  className={`flex items-start gap-2 px-3 py-1.5 transition-colors ${
                    n.read ? "" : "bg-secondary/20"
                  }`}
                >
                  <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-foreground/90 leading-snug">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-muted-foreground font-mono">
                      {formatTime(n.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
