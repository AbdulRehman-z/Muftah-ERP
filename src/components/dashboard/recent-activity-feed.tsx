import { Package, Activity, Beaker, CheckCircle2, Clock, XCircle, PlayCircle, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

export function RecentActivityFeed({ data, className }: any) {
  const inProgress = data?.filter((d: any) => d.status === "in_progress").length || 0;
  const hasData = data && data.length > 0;

  return (
    <div className={cn("relative border border-border/60 bg-card flex flex-col rounded-2xl  overflow-hidden", className)}>

      {/* ── Lab Tracking Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-card/80 backdrop-blur-xl shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 border border-primary/20 bg-primary/10 rounded-xl">
            <Beaker className="size-4 text-primary" />
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-1.5 leading-none">
            Batch Tracking
          </p>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {inProgress > 0 ? (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <span className="size-1.5 bg-blue-500 animate-pulse rounded-full" />
              {inProgress} Active
            </span>
          ) : (<span className="px-3 py-1 rounded-full bg-muted/50 border border-border/50">{data?.length || 0} Runs</span>)}
        </div>
      </div>

      {/* ── Log Output Area ─────────────────────────────────────────────── */}
      <div className="flex-1 min-h-[300px] bg-background/50 relative z-10">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="p-4 rounded-full bg-muted/30 mb-3"><Activity className="size-6 text-muted-foreground/40" /></div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">System Standby</p>
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[440px]">
            <div className="flex flex-col p-2 gap-2">
              {data.map((item: any) => {
                const isActive = item.status === 'in_progress';
                return (
                  <div key={item.id} className={cn(
                    "flex flex-col gap-2.5 px-4 py-3.5 rounded-xl border transition-all duration-300",
                    isActive ? "bg-blue-500/5 border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.1)]" : "bg-card border-border/50 hover:border-border hover:"
                  )}>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <div className="flex items-center gap-2">
                        {/* Soft Glowing Status Light */}
                        <div className={cn(
                          "size-2 rounded-full",
                          item.status === 'completed' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" :
                            isActive ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" :
                              item.status === 'scheduled' ? "bg-amber-500" : "bg-rose-500"
                        )} />
                        <span className={cn("font-mono text-[10px] font-bold uppercase", isActive ? "text-blue-500" : "text-muted-foreground")}>Batch #{item.batchId?.slice(-6).toUpperCase() || "000000"}</span>
                      </div>
                      {(() => {
                        const dateObj = typeof item.date === 'string' ? parseISO(item.date) : new Date(item.date);
                        return (
                          <span className="font-mono text-[9px] font-bold text-muted-foreground uppercase">
                            {isValid(dateObj) ? format(dateObj, "dd MMM HH:mm") : "--:--"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="flex items-start justify-between gap-4 pt-1">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold leading-tight text-foreground">{item.recipeName}</span>
                        <span className="text-[10px] font-bold text-muted-foreground mt-1">{item.productName}</span>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end">
                        <span className={cn("text-sm font-black tabular-nums flex items-center gap-1", isActive ? "text-blue-500" : "text-foreground")}>
                          {item.cartonsProduced > 0 ? `${item.cartonsProduced.toLocaleString()} CTN` : `${item.containersProduced.toLocaleString()} EA`}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mt-1 flex items-center gap-1">
                          <ArrowRight className="size-2.5" />
                          {item.operatorName !== "Unassigned" ? item.operatorName : "Automated"}
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