import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  IsoMixingVat,
  IsoBottlingLine,
  IsoExpenseSilo,
  IsoYieldPacker,
  IsoNetYieldChart,
  IsoStaffTerminal,
  IsoStockDrums,
  IsoWarehouseRack
} from "@/components/illustrations/dashboard-isometric";

function formatPKR(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}₨ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₨ ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₨ ${abs.toLocaleString()}`;
}

export interface KpiData {
  totalRevenue: number;
  invoiceCount: number;
  activeProductionRuns: number;
  completedProductionRuns: number;
  totalCartonsProduced: number;
  rawStockValue: number;
  finishedStockValue: number;
  totalStockValue: number;
  totalPayrollCost: number;
  totalExpenses: number;
  totalCost: number;
  netProfit: number;
  activeEmployees: number;
}

export function DashboardKpiCards({ data }: { data: KpiData }) {
  const profitPositive = data.netProfit > 0;
  const profitMargin = data.totalRevenue > 0 ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-4">
      {/* ── Top Row: Physical Manufacturing Operations ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumSaaSCard
          title="Gross Revenue"
          value={formatPKR(data.totalRevenue)}
          trendLabel={data.totalRevenue > 0 ? "Earning" : "Idle"}
          trend={data.totalRevenue > 0 ? "up" : "neutral"}
          theme="emerald"
          Illustration={IsoMixingVat}
        />
        <PremiumSaaSCard
          title="Production Runs"
          value={data.activeProductionRuns.toString()}
          trendLabel={data.activeProductionRuns > 0 ? "Running" : "Standby"}
          trend={data.activeProductionRuns > 0 ? "up" : "neutral"}
          theme="blue"
          Illustration={IsoBottlingLine}
        />
        <PremiumSaaSCard
          title="Operational Burn"
          value={formatPKR(data.totalExpenses)}
          trendLabel="Non-Payroll"
          trend="neutral"
          theme="rose"
          Illustration={IsoExpenseSilo}
        />
        <PremiumSaaSCard
          title="Cartons Yield"
          value={data.totalCartonsProduced.toLocaleString()}
          trendLabel="Output Vol"
          trend={data.totalCartonsProduced > 0 ? "up" : "neutral"}
          theme="cyan"
          Illustration={IsoYieldPacker}
        />
      </div>

      {/* ── Bottom Row: Fiscal & Resource Analytics ────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <PremiumSaaSCard
          title="Net Yield / Deficit"
          value={formatPKR(data.netProfit)}
          trendLabel={profitPositive ? `${profitMargin}% Margin` : "Loss"}
          trend={profitPositive ? "up" : "down"}
          theme={profitPositive ? "emerald" : "rose"}
          Illustration={IsoNetYieldChart}
        />
        <PremiumSaaSCard
          title="Payroll Liabilities"
          value={formatPKR(data.totalPayrollCost)}
          trendLabel={`${data.activeEmployees} Staff`}
          trend="neutral"
          theme="violet"
          Illustration={IsoStaffTerminal}
        />
        <PremiumSaaSCard
          title="Raw Stock Capital"
          value={formatPKR(data.rawStockValue)}
          trendLabel="Materials"
          trend="neutral"
          theme="amber"
          Illustration={IsoStockDrums}
        />
        <PremiumSaaSCard
          title="Finished Goods Asset"
          value={formatPKR(data.finishedStockValue)}
          trendLabel="Warehouse"
          trend={data.finishedStockValue > 0 ? "up" : "neutral"}
          theme="sky"
          Illustration={IsoWarehouseRack}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED PREMIUM SAAS CARD UI
// ─────────────────────────────────────────────────────────────────────────────

interface PremiumSaaSCardProps {
  title: string;
  value: string;
  trendLabel: string;
  trend: "up" | "down" | "neutral";
  theme: "emerald" | "blue" | "rose" | "cyan" | "violet" | "amber" | "sky";
  Illustration: React.ElementType;
}

function PremiumSaaSCard({ title, value, trend, trendLabel, theme, Illustration }: PremiumSaaSCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  // Extremely clean, modern aesthetic. Light/Dark mode compatible.
  // We use very subtle top borders to hint at the color theme, keeping the rest of the card pristine.
  const styleMap: Record<PremiumSaaSCardProps["theme"], string> = {
    emerald: "border-t-emerald-500 text-emerald-600 dark:text-emerald-500",
    blue: "border-t-blue-500 text-blue-600 dark:text-blue-500",
    rose: "border-t-rose-500 text-rose-600 dark:text-rose-500",
    cyan: "border-t-cyan-500 text-cyan-600 dark:text-cyan-500",
    violet: "border-t-violet-500 text-violet-600 dark:text-violet-500",
    amber: "border-t-amber-500 text-amber-600 dark:text-amber-500",
    sky: "border-t-sky-500 text-sky-600 dark:text-sky-500",
  };

  const colors = styleMap[theme];

  return (
    <div className={cn(
      "relative h-[180px] bg-card border border-border rounded-xl p-5 flex flex-col justify-between overflow-hidden group  hover:shadow-md transition-all duration-300 border-t-2",
      colors.split(" ")[0] // Applies the specific border-t color
    )}>

      {/* 3D Scene Container (Right aligned, slightly scaled up for depth) */}
      <div className="absolute right-[-10%] bottom-[-5%] w-[200px] h-[200px] pointer-events-none z-0 group-hover:scale-105 transition-transform duration-500 ease-out">
        <Illustration />
      </div>

      {/* Top Badge */}
      <div className="relative z-10 flex items-start">
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background/80 backdrop-blur-sm",
          colors.split(" ")[1], // Text color
          colors.split(" ")[2]  // Dark mode text color
        )}>
          <TrendIcon className="size-3" />
          <span className="text-[9px] font-bold uppercase tracking-widest">{trendLabel}</span>
        </div>
      </div>

      {/* Typography */}
      <div className="relative z-10 mt-auto">
        <h3 className="text-2xl font-black tracking-tight text-foreground mb-1 tabular-nums drop-">{value}</h3>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}