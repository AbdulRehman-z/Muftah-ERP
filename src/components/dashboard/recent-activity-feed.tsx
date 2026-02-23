import {
    Activity,
    Package,
    CheckCircle2,
    Clock,
    XCircle,
    PlayCircle,
    Box,
    User2,
    ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityItem {
    id: string;
    batchId: string;
    productName: string;
    recipeName: string;
    cartonsProduced: number;
    containersProduced: number;
    status: string;
    operatorName: string;
    date: Date | string;
}

interface RecentActivityFeedProps {
    data: ActivityItem[];
    className?: string;
}

const statusConfig: Record<
    string,
    {
        label: string;
        icon: React.ElementType;
        badgeClass: string;
        iconClass: string;
        bgClass: string;
        ringClass: string;
    }
> = {
    completed: {
        label: "Completed",
        icon: CheckCircle2,
        badgeClass:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
        ringClass: "ring-emerald-200 dark:ring-emerald-800",
    },
    in_progress: {
        label: "In Progress",
        icon: PlayCircle,
        badgeClass:
            "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-50 dark:bg-blue-950/30",
        ringClass: "ring-blue-200 dark:ring-blue-800",
    },
    scheduled: {
        label: "Scheduled",
        icon: Clock,
        badgeClass:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        iconClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-50 dark:bg-amber-950/30",
        ringClass: "ring-amber-200 dark:ring-amber-800",
    },
    cancelled: {
        label: "Cancelled",
        icon: XCircle,
        badgeClass:
            "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-50 dark:bg-rose-950/30",
        ringClass: "ring-rose-200 dark:ring-rose-800",
    },
};

// BUG FIX: The original used parseISO on all strings without validating the result.
// parseISO("Unknown") or other non-ISO strings silently produce Invalid Date, which
// then crashes format(). This helper safely falls back to a dash.
function safeFormatDate(date: Date | string): string {
    try {
        const parsed = typeof date === "string" ? parseISO(date) : date;
        if (!isValid(parsed)) return "—";
        return format(parsed, "dd MMM, HH:mm");
    } catch {
        return "—";
    }
}

// Fallback config for unknown statuses so we never blow up on a missing key
const fallbackConfig = statusConfig.scheduled;

export function RecentActivityFeed({ data, className }: RecentActivityFeedProps) {
    const inProgress = data.filter((d) => d.status === "in_progress").length;

    return (
        <div className={cn("border border-border/60 rounded-xl overflow-hidden flex flex-col bg-card", className)}>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-muted/20 shrink-0">
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/10">
                    <Activity className="size-4 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest leading-none">
                        Production Activity
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Latest runs
                    </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                    {inProgress > 0 && (
                        <Badge
                            variant="outline"
                            className="text-[9px] font-bold bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-400 gap-1"
                        >
                            <span className="size-1.5 rounded-full bg-blue-500 animate-pulse inline-block" />
                            {inProgress} live
                        </Badge>
                    )}
                    {data.length > 0 && (
                        <Badge
                            variant="outline"
                            className="text-[9px] font-bold bg-primary/5 border-primary/20 text-primary"
                        >
                            {data.length}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center h-full">
                        <div className="p-4 rounded-2xl bg-muted/40 mb-4 ring-1 ring-border/50">
                            <Package className="size-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">
                            No production runs yet
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[160px]">
                            Activity will appear here once production starts.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="divide-y divide-border/30">
                            {data.map((item) => {
                                const config =
                                    statusConfig[item.status] ?? fallbackConfig;
                                const StatusIcon = config.icon;
                                const dateStr = safeFormatDate(item.date);
                                // Last 4 chars of batchId as a readable reference
                                const batchRef = item.batchId?.slice(-4).toUpperCase() ?? "????";

                                return (
                                    <div
                                        key={item.id}
                                        className="group flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-default"
                                    >
                                        {/* Status icon */}
                                        <div
                                            className={cn(
                                                "p-2 rounded-xl mt-0.5 shrink-0 ring-1 transition-all duration-200",
                                                "group-hover:scale-105 group-hover:",
                                                config.bgClass,
                                                config.ringClass
                                            )}
                                        >
                                            <StatusIcon
                                                className={cn(
                                                    "size-3.5",
                                                    config.iconClass,
                                                    item.status === "in_progress" &&
                                                    "animate-pulse"
                                                )}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            {/* Title row */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold truncate leading-tight">
                                                        {item.recipeName}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {item.productName}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] px-1.5 h-4 shrink-0 font-bold",
                                                        config.badgeClass
                                                    )}
                                                >
                                                    {config.label}
                                                </Badge>
                                            </div>

                                            {/* Meta row */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Box className="size-2.5 text-muted-foreground/50" />
                                                    <span className="text-[10px] font-black text-primary tabular-nums">
                                                        {item.cartonsProduced.toLocaleString()} CTNs
                                                    </span>
                                                </div>

                                                <ArrowRight className="size-2.5 text-muted-foreground/30 shrink-0" />

                                                <div className="flex items-center gap-1">
                                                    <User2 className="size-2.5 text-muted-foreground/50" />
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px]">
                                                        {item.operatorName !== "Unassigned"
                                                            ? item.operatorName
                                                            : `#${batchRef}`}
                                                    </span>
                                                </div>

                                                <span className="text-[10px] text-muted-foreground/50 ml-auto font-medium tabular-nums">
                                                    {dateStr}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                )}
            </div>
        </div>
    );
}