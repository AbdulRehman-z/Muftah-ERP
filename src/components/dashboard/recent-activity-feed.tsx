import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Activity, Package, CheckCircle2, Clock, XCircle, PlayCircle,
    Box, User2
} from "lucide-react";
import { format, parseISO } from "date-fns";
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
}

const statusConfig: Record<string, {
    label: string;
    icon: any;
    badgeClass: string;
    dotClass: string;
    iconClass: string;
    bgClass: string;
}> = {
    completed: {
        label: "Completed",
        icon: CheckCircle2,
        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        dotClass: "bg-emerald-500",
        iconClass: "text-emerald-600 dark:text-emerald-400",
        bgClass: "bg-emerald-50 dark:bg-emerald-950/30",
    },
    in_progress: {
        label: "In Progress",
        icon: PlayCircle,
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
        dotClass: "bg-blue-500 animate-pulse",
        iconClass: "text-blue-600 dark:text-blue-400",
        bgClass: "bg-blue-50 dark:bg-blue-950/30",
    },
    scheduled: {
        label: "Scheduled",
        icon: Clock,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        dotClass: "bg-amber-500",
        iconClass: "text-amber-600 dark:text-amber-400",
        bgClass: "bg-amber-50 dark:bg-amber-950/30",
    },
    cancelled: {
        label: "Cancelled",
        icon: XCircle,
        badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        dotClass: "bg-rose-500",
        iconClass: "text-rose-600 dark:text-rose-400",
        bgClass: "bg-rose-50 dark:bg-rose-950/30",
    },
};

export function RecentActivityFeed({ data }: RecentActivityFeedProps) {
    return (
        <Card className="border border-border/60 rounded-xl col-span-1 lg:col-span-4 overflow-hidden flex flex-col">
            <CardHeader className="pb-3 border-b border-border/40 bg-muted/20 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 border border-primary/10">
                        <Activity className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">
                            Recent Activity
                        </CardTitle>
                        <CardDescription className="text-[10px] mt-0.5">
                            Latest production runs
                        </CardDescription>
                    </div>
                    {data.length > 0 && (
                        <Badge
                            variant="outline"
                            className="text-[9px] font-bold bg-primary/5 border-primary/20 text-primary shrink-0"
                        >
                            {data.length} runs
                        </Badge>
                    )}
                </div>
            </CardHeader>

            <CardContent className="p-0 flex-1 min-h-0">
                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6 h-full">
                        <div className="p-4 rounded-2xl bg-muted/40 mb-4">
                            <Package className="size-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground">No production runs yet</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-[160px]">
                            Activity will appear here once production starts.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        <div className="divide-y divide-border/30">
                            {data.map((item) => {
                                const config = statusConfig[item.status] || statusConfig.scheduled;
                                const StatusIcon = config.icon;
                                const dateStr = typeof item.date === "string"
                                    ? format(parseISO(item.date), "dd MMM, HH:mm")
                                    : format(item.date, "dd MMM, HH:mm");

                                return (
                                    <div
                                        key={item.id}
                                        className="flex items-start gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors group"
                                    >
                                        {/* Status icon */}
                                        <div className={cn(
                                            "p-2 rounded-xl mt-0.5 shrink-0 transition-transform group-hover:scale-110",
                                            config.bgClass
                                        )}>
                                            <StatusIcon className={cn("size-3.5", config.iconClass)} />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 space-y-1.5">
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
                                                    <Box className="size-2.5 text-muted-foreground/60" />
                                                    <span className="text-[10px] font-bold text-primary">
                                                        {item.cartonsProduced} CTNs
                                                    </span>
                                                </div>
                                                <span className="text-muted-foreground/30 text-[10px]">·</span>
                                                <div className="flex items-center gap-1">
                                                    <User2 className="size-2.5 text-muted-foreground/60" />
                                                    <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[70px]">
                                                        {item.operatorName || `Batch #${item.batchId.slice(-4).toUpperCase()}`}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-muted-foreground/60 ml-auto font-medium">
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
            </CardContent>
        </Card>
    );
}
