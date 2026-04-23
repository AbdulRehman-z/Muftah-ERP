import { useMemo } from "react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmtK(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

export function RevenueExpenseChart({
  data,
  className,
}: {
  data: any[];
  className?: string;
}) {
  const totals = useMemo(() => {
    if (!data?.length) return { rev: 0, exp: 0, net: 0 };
    const rev = data.reduce((s: number, d: any) => s + (d.revenue || 0), 0);
    const exp = data.reduce((s: number, d: any) => s + (d.expenses || 0), 0);
    return { rev, exp, net: rev - exp };
  }, [data]);

  const isProfit = totals.net >= 0;

  return (
    <div
      className={cn(
        "border border-border/60 bg-card rounded-2xl overflow-hidden flex flex-col",
        className,
      )}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/15">
              <BarChart2 className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Revenue vs Expenses
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Date range filtered
              </p>
            </div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase  mb-1">
              Revenue
            </p>
            <p className="text-lg font-black tabular-nums text-emerald-600">
              PKR {fmtK(totals.rev)}
            </p>
          </div>
          <div className="w-px h-8 bg-border/40" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase  mb-1">
              Expenses
            </p>
            <p className="text-lg font-black tabular-nums text-rose-500">
              PKR {fmtK(totals.exp)}
            </p>
          </div>
          <div className="w-px h-8 bg-border/40" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase  mb-1">
              Net
            </p>
            <p
              className={cn(
                "text-lg font-black tabular-nums flex items-center gap-1.5",
                isProfit ? "text-emerald-600" : "text-rose-500",
              )}
            >
              {isProfit ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              PKR {fmtK(Math.abs(totals.net))}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[280px] px-2 py-4">
        {!data.length ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                strokeWidth={0.6}
                opacity={0.4}
              />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                  fontWeight: 600,
                }}
                dy={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${fmtK(v)}`}
                tick={{
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                  fontWeight: 600,
                }}
                dx={-4}
              />
              <Tooltip
                cursor={{
                  stroke: "hsl(var(--border))",
                  strokeWidth: 1.5,
                  strokeDasharray: "4 3",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const rev =
                    (payload.find((p) => p.dataKey === "revenue")
                      ?.value as number) ?? 0;
                  const exp =
                    (payload.find((p) => p.dataKey === "expenses")
                      ?.value as number) ?? 0;
                  const net = rev - exp;
                  return (
                    <div className="bg-card border border-border/60 rounded-xl shadow-lg p-3 min-w-[180px] text-xs">
                      <p className="font-bold text-foreground mb-2.5 text-[11px]">
                        {label}
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between gap-6">
                          <span className="text-muted-foreground">Revenue</span>
                          <span className="font-bold text-emerald-600 tabular-nums">
                            PKR {rev.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between gap-6">
                          <span className="text-muted-foreground">
                            Expenses
                          </span>
                          <span className="font-bold text-rose-500 tabular-nums">
                            PKR {exp.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between gap-6 pt-1.5 mt-1.5 border-t border-border/40">
                          <span className="text-muted-foreground font-semibold">
                            Net
                          </span>
                          <span
                            className={cn(
                              "font-black tabular-nums",
                              net >= 0 ? "text-emerald-600" : "text-rose-500",
                            )}
                          >
                            {net >= 0 ? "+" : ""}PKR {net.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#f43f5e"
                strokeWidth={2}
                fill="url(#gradExp)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#f43f5e",
                  strokeWidth: 2,
                  stroke: "white",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#gradRev)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#10b981",
                  strokeWidth: 2,
                  stroke: "white",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 px-6 pb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Revenue
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-rose-500 rounded-full" />
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Expenses
          </span>
        </div>
      </div>
    </div>
  );
}
