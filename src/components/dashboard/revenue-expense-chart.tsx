import { useState, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Activity, Crosshair, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function RevenueExpenseChart({ data, className }: any) {
  const [timeRange, setTimeRange] = useState("all");

  const filteredData = useMemo(() => {
    if (timeRange === "all" || data?.length === 0) return data || [];
    return data.slice(-(timeRange === "6m" ? 6 : 3));
  }, [data, timeRange]);

  const totals = useMemo(() => {
    const rev = filteredData.reduce((s: number, d: any) => s + (d.revenue || 0), 0);
    const exp = filteredData.reduce((s: number, d: any) => s + (d.expenses || 0), 0);
    const net = rev - exp;
    return { rev, exp, net };
  }, [filteredData]);

  const isProfit = totals.net >= 0;
  const hasData = filteredData.length > 0;

  return (
    <div className={cn("relative border border-border/60 bg-card flex flex-col rounded-2xl  overflow-hidden group", className)}>

      {/* ── Dashboard Header ── */}
      <div className="border-b border-border/50 relative z-10 bg-card/80 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 relative overflow-hidden">
              <Activity className="size-4 text-primary relative z-10" />
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-tighter text-foreground leading-none flex items-center gap-2">
                Flow Telemetry
                <span className="px-1.5 py-0.5 rounded-sm bg-emerald-500/10 text-emerald-500 text-[8px] font-bold border border-emerald-500/20 uppercase tracking-widest">Live_Link</span>
              </h3>
              <p className="text-[10px] font-bold text-muted-foreground mt-1.5 font-mono">OPEX_VS_REVENUE_METRIC_PROBE</p>
            </div>
          </div>

          <div className="flex border border-border/50 rounded-xl p-1 bg-muted/30 mt-4 sm:mt-0">
            {["3m", "6m", "all"].map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 transition-all rounded-lg outline-none",
                  timeRange === r ? "bg-background text-foreground  border border-border/50" : "text-muted-foreground hover:text-foreground border border-transparent"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* ── High-Density Stats Bar ── */}
        <div className="flex flex-wrap items-center gap-8 px-6 pb-5 border-t border-border/10 pt-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500/70 mb-1 font-mono">SYS_INFLOW</span>
            <span className="text-xl font-black tabular-nums text-foreground">PKR {totals.rev.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-rose-500/70 mb-1 font-mono">SYS_OUTFLOW</span>
            <span className="text-xl font-black tabular-nums text-foreground">PKR {totals.exp.toLocaleString()}</span>
          </div>
          <div className="w-px h-8 bg-border/50" />
          <div className="flex flex-col">
            <span className={cn("text-[9px] font-bold uppercase tracking-widest mb-1 font-mono", isProfit ? "text-emerald-500/70" : "text-rose-500/70")}>NET_EFFICIENCY</span>
            <span className={cn("text-xl font-black tabular-nums flex items-center gap-2", isProfit ? "text-emerald-500" : "text-rose-500")}>
              {isProfit ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
              PKR {totals.net.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Scientific Chart Area ── */}
      <div className="p-4 flex-1 min-h-[340px] relative z-10 bg-background/30">
        {!hasData ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="size-16 border-2 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary animate-pulse">Initializing_Data_Probe...</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fluidRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.25} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                <linearGradient id="fluidExpenses" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.25} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid vertical={true} horizontal={true} stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={0.5} opacity={0.3} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }} dy={10} />
              <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000)}k`} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }} dx={-10} />

              <Tooltip
                cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "4 4" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const rev = payload.find((p) => p.dataKey === "revenue")?.value as number ?? 0;
                  const exp = payload.find((p) => p.dataKey === "expenses")?.value as number ?? 0;
                  const net = rev - exp;
                  return (
                    <div className="border border-primary/20 bg-background/90 backdrop-blur-xl p-4 rounded-xl shadow-sm min-w-[200px]">
                      <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary font-mono">{label}</span>
                        <Zap className="size-3 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Revenue</span>
                          <span className="text-xs font-black tabular-nums text-emerald-500">PKR {rev.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-8">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Expenses</span>
                          <span className="text-xs font-black tabular-nums text-rose-500">PKR {exp.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-dashed border-border/50 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">Net_Yield</span>
                        <span className={cn("text-sm font-black tabular-nums", net >= 0 ? "text-emerald-500" : "text-rose-500")}>
                          {net >= 0 ? "+" : ""}PKR {net.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="4 4" />

              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f43f5e"
                strokeWidth={3}
                fill="url(#fluidExpenses)"
                activeDot={{ r: 6, fill: "#f43f5e", stroke: "white", strokeWidth: 2 }}
                animationDuration={2000}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#fluidRevenue)"
                activeDot={{ r: 6, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}