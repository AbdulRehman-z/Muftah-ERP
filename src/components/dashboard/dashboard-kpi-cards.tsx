import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ChartNoAxesColumnIncreasing,
  Wallet,
  Users,
  Factory,
  Package,
  Boxes,
  Warehouse,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatPKR(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}PKR ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}PKR ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}PKR ${abs.toLocaleString()}`;
}

interface KpiData {
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

interface DashboardKpiCardsProps {
  data: KpiData;
}

export function DashboardKpiCards({ data }: DashboardKpiCardsProps) {
  const profitPositive = data.netProfit > 0;
  const profitNegative = data.netProfit < 0;

  const profitMargin =
    data.totalRevenue > 0
      ? Math.abs((data.netProfit / data.totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard
        title="Total Revenue"
        value={formatPKR(data.totalRevenue)}
        subtext={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? "s" : ""}`}
        trend={data.totalRevenue > 0 ? "up" : "neutral"}
        trendLabel={data.totalRevenue > 0 ? "Earning" : "No sales"}
        icon={DollarSign}
        accent="emerald"
      />
      <KpiCard
        title="Net Profit"
        value={`${profitNegative ? "-" : ""}${formatPKR(Math.abs(data.netProfit))}`}
        subtext={`${profitMargin}% profit margin`}
        trend={profitPositive ? "up" : profitNegative ? "down" : "neutral"}
        trendLabel={
          profitPositive || profitNegative
            ? `${profitMargin}% margin`
            : "Break-even"
        }
        icon={ChartNoAxesColumnIncreasing}
        accent={profitPositive ? "emerald" : profitNegative ? "rose" : "amber"}
      />
      <KpiCard
        title="Total Expenses"
        value={formatPKR(data.totalCost)}
        subtext={`${formatPKR(data.totalPayrollCost)} payroll`}
        trend="neutral"
        trendLabel="Operational"
        icon={Wallet}
        accent="amber"
      />
      <KpiCard
        title="Active Staff"
        value={data.activeEmployees.toString()}
        subtext="Employees on payroll"
        trend={data.activeEmployees > 0 ? "up" : "neutral"}
        trendLabel={data.activeEmployees > 0 ? "Active" : "None"}
        icon={Users}
        accent="sky"
      />
      <KpiCard
        title="Production Runs"
        value={data.activeProductionRuns.toString()}
        subtext={`${data.completedProductionRuns} completed`}
        trend={data.activeProductionRuns > 0 ? "up" : "neutral"}
        trendLabel={data.activeProductionRuns > 0 ? "In progress" : "Idle"}
        icon={Factory}
        accent="violet"
      />
      <KpiCard
        title="Cartons Produced"
        value={data.totalCartonsProduced.toLocaleString()}
        subtext="This period"
        trend={data.totalCartonsProduced > 0 ? "up" : "neutral"}
        trendLabel={data.totalCartonsProduced > 0 ? "On track" : "None"}
        icon={Package}
        accent="emerald"
      />
      <KpiCard
        title="Raw Stock Value"
        value={formatPKR(data.rawStockValue)}
        subtext="Chemicals + packaging"
        trend="neutral"
        trendLabel="Stable"
        icon={Boxes}
        accent="amber"
      />
      <KpiCard
        title="Finished Goods"
        value={formatPKR(data.finishedStockValue)}
        subtext="Warehouse stock"
        trend={data.finishedStockValue > 0 ? "up" : "neutral"}
        trendLabel={data.finishedStockValue > 0 ? "Growing" : "Empty"}
        icon={Warehouse}
        accent="sky"
      />
    </div>
  );
}

type Accent = "emerald" | "rose" | "amber" | "sky" | "violet";

const accentStyles: Record<
  Accent,
  { icon: string; badge: string; badgeText: string; iconBg: string }
> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    badge:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
    badgeText: "text-emerald-700 dark:text-emerald-400",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-50 dark:bg-rose-950/40",
    badge:
      "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800",
    badgeText: "text-rose-700 dark:text-rose-400",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-950/40",
    badge:
      "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
    badgeText: "text-amber-700 dark:text-amber-400",
  },
  sky: {
    icon: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-50 dark:bg-sky-950/40",
    badge: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800",
    badgeText: "text-sky-700 dark:text-sky-400",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-950/40",
    badge:
      "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800",
    badgeText: "text-violet-700 dark:text-violet-400",
  },
};

function KpiCard({
  title,
  value,
  subtext,
  trend,
  trendLabel,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  subtext: string;
  trend: "up" | "down" | "neutral";
  trendLabel: string;
  icon: React.ElementType;
  accent: Accent;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const colors = accentStyles[accent];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3",
        "hover:border-border hover: transition-all duration-200",
        "overflow-hidden",
      )}
    >
      {/* Subtle background accent blob */}
      <div
        className={cn(
          "absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07] blur-xl pointer-events-none",
          colors.iconBg,
        )}
      />

      {/* Top row: icon + trend badge */}
      <div className="flex items-center justify-between">
        <div className={cn("p-2 rounded-lg", colors.iconBg)}>
          <Icon className={cn("size-4", colors.icon)} />
        </div>

        <div
          className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border",
            colors.badge,
            colors.badgeText,
          )}
        >
          <TrendIcon className="size-2.5" />
          {trendLabel}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-black tracking-tight tabular-nums leading-none mb-1.5">
          {value}
        </p>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
          {title}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/50" />

      {/* Subtext */}
      <p className="text-xs text-muted-foreground leading-snug">{subtext}</p>
    </div>
  );
}
