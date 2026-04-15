import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  XCircle,
  Calendar,
  ArrowRight,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ActivityItem = {
  id: string;
  batchId: string;
  productName: string;
  recipeName: string;
  cartonsProduced: number;
  containersProduced: number;
  status: string;
  operatorName: string;
  date: string | Date;
  totalProductionCost?: number;
};

const STATUS_CONFIG = {
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    dot: "bg-emerald-500",
  },
  in_progress: {
    label: "In Progress",
    icon: PlayCircle,
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200/60 dark:border-blue-800/40",
    dot: "bg-blue-500 animate-pulse",
  },
  scheduled: {
    label: "Scheduled",
    icon: Calendar,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200/60 dark:border-amber-800/40",
    dot: "bg-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    color: "text-rose-600",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200/60 dark:border-rose-800/40",
    dot: "bg-rose-500",
  },
};

function fmtDate(d: string | Date) {
  const obj = typeof d === "string" ? parseISO(d) : d;
  if (!isValid(obj)) return "—";
  return format(obj, "dd MMM, hh:mm a");
}

function fmtPKR(v: number) {
  if (!v) return null;
  if (v >= 1_000_000) return `PKR ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `PKR ${(v / 1_000).toFixed(0)}K`;
  return `PKR ${v.toLocaleString()}`;
}

export function RecentActivityFeed({
  data,
  className,
}: {
  data: ActivityItem[];
  className?: string;
}) {
  const hasData = data && data.length > 0;
  const activeCount =
    data?.filter((d) => d.status === "in_progress").length ?? 0;

  return (
    <div
      className={cn(
        "border border-border/60 bg-card rounded-2xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
            <Package className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Production Log
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {activeCount > 0 ? (
                <span className="text-blue-600 font-semibold">
                  {activeCount} run{activeCount !== 1 ? "s" : ""} active
                </span>
              ) : (
                "Recent batch activity"
              )}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] font-semibold text-muted-foreground hover:text-foreground gap-1 px-2"
          asChild
        >
          <Link to="/manufacturing/productions">
            All runs
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </div>

      {/* Feed */}
      <div className="flex-1">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Package className="size-8 opacity-20" />
            <p className="text-xs font-semibold">No production runs yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {data.map((item) => {
              const cfg =
                STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ??
                STATUS_CONFIG.scheduled;
              const StatusIcon = cfg.icon;
              const cost = item.totalProductionCost
                ? fmtPKR(item.totalProductionCost)
                : null;
              const output =
                item.cartonsProduced > 0
                  ? `${item.cartonsProduced.toLocaleString()} cartons`
                  : `${item.containersProduced.toLocaleString()} units`;

              return (
                <div
                  key={item.id}
                  className="px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left */}
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Status dot */}
                      <div
                        className={cn(
                          "size-2 rounded-full shrink-0 mt-1.5",
                          cfg.dot,
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                          {item.recipeName}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                          {item.productName}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-mono text-muted-foreground/70">
                            #{item.batchId?.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-muted-foreground/30">·</span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.operatorName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] h-5 px-1.5 font-semibold border gap-1",
                          cfg.color,
                          cfg.bg,
                          cfg.border,
                        )}
                      >
                        <StatusIcon className="size-2.5" />
                        {cfg.label}
                      </Badge>
                      {item.status === "completed" && (
                        <p className="text-[11px] font-bold text-foreground">
                          {output}
                        </p>
                      )}
                      {cost && (
                        <p className="text-[10px] font-semibold text-muted-foreground">
                          {cost}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60">
                        {fmtDate(item.date)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasData && (
        <div className="px-5 py-3 border-t border-border/30 bg-muted/20">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            asChild
          >
            <Link to="/manufacturing/productions">
              View all production runs
              <ArrowRight className="size-3 ml-1.5" />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
