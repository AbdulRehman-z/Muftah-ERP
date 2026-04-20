import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Target, Activity, Orbit } from "lucide-react";
import { motion } from "framer-motion";

/** Format a number as compact PKR value (e.g. 1500000 → "1.5M", 3000 → "3.0K") */
function fmtK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(0);
}

export function CapitalAllocationChart({
  rawStock,
  finishedStock,
  payroll,
  expenses,
  className,
}: any) {
  // Technical data processing
  const rawData = [
    { name: "Raw Material", value: rawStock || 0, color: "#f59e0b" },
    { name: "Finished Goods", value: finishedStock || 0, color: "#0ea5e9" },
    { name: "Payroll", value: payroll || 0, color: "#8b5cf6" },
    { name: "Opex", value: expenses || 0, color: "#f43f5e" },
  ];

  const hasData = rawData.some((d) => d.value > 0);
  const total = rawData.reduce((sum, item) => sum + item.value, 0);

  // If no data, show blueprint segments for "Real Chart" feel
  const chartData = hasData
    ? rawData.filter((d) => d.value > 0)
    : [
        { name: "Sector A", value: 25, color: "#94a3b833" },
        { name: "Sector B", value: 25, color: "#94a3b822" },
        { name: "Sector C", value: 25, color: "#94a3b833" },
        { name: "Sector D", value: 25, color: "#94a3b822" },
      ];

  return (
    <div
      className={cn(
        "relative border border-border/60 bg-card flex flex-col rounded-2xl  overflow-hidden",
        className,
      )}
    >
      {/* ── Technical Header ── */}
      <div className="px-5 py-5 border-b border-border/50 flex items-center justify-between bg-card/80 backdrop-blur-xl relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 border border-primary/20 bg-primary/10 rounded-xl">
            <Target className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tighter text-foreground leading-none">
              Capital Vector
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground mt-1.5 font-mono uppercase tracking-widest">
              Asset_Allocation_Probe
            </p>
          </div>
        </div>
        {!hasData && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
            <Activity className="size-3 text-amber-500 animate-pulse" />
            <span className="text-[8px] font-bold text-amber-500 uppercase font-mono">
              Ghost_Mode
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 p-5 flex flex-col justify-center relative bg-background/20">
        {/* ── Dynamic Background HUD ── */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
          <div className="size-48 rounded-full border border-dashed border-foreground" />
          <Orbit className="size-64 text-foreground animate-spin-slow" />
        </div>

        <div className="h-[280px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={85}
                outerRadius={110}
                paddingAngle={hasData ? 5 : 2}
                dataKey="value"
                stroke="none"
                cornerRadius={hasData ? 8 : 2}
                animationDuration={1000}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              {hasData && (
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="border border-primary/20 bg-background/90 backdrop-blur-xl p-3 rounded-xl shadow-sm">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-2 flex items-center gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: data.color }}
                          />{" "}
                          {data.name}
                        </p>
                        <p className="text-sm font-black tabular-nums text-foreground">
                          PKR {data.value.toLocaleString()}
                        </p>
                      </div>
                    );
                  }}
                />
              )}
            </PieChart>
          </ResponsiveContainer>

          {/* ── Central Reticle ── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground font-mono opacity-60">
              Total_Asset_Value
            </span>
            <span className="text-xl font-black tabular-nums mt-0.5 text-foreground">
              {hasData ? `PKR ${(total / 1000000).toFixed(1)}M` : "0.0M"}
            </span>
            {/* Scanning Laser Line */}
            <motion.div
              className="w-24 h-0.5 bg-primary/20 mt-3 rounded-full overflow-hidden relative"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="absolute inset-0 bg-primary"
                animate={{ x: [-100, 100] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        {/* ── Legend Grid ── */}
        <div className="grid grid-cols-2 gap-px mt-8 bg-border/20 border border-border/50 rounded-xl overflow-hidden">
          {rawData.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between p-3 bg-card/40"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "size-2 rounded-sm shrink-0",
                    !hasData && "bg-muted",
                  )}
                  style={{ backgroundColor: hasData ? item.color : undefined }}
                />
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-[10px] font-black tabular-nums text-foreground/80">
                  {hasData ? `${((item.value / total) * 100).toFixed(0)}%` : "0%"}
                </span>
                <span className="text-[9px] text-muted-foreground font-mono">
                  PKR {fmtK(item.value)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
