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
  Receipt,
  HandCoins,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatPKR(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}₨ ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₨ ${(abs / 1_000).toFixed(0)}K`;
  return `${sign}₨ ${abs.toLocaleString()}`;
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
  const profitNeutral = data.netProfit === 0;

  const profitMargin =
    data.totalRevenue > 0
      ? ((data.netProfit / data.totalRevenue) * 100).toFixed(1)
      : data.netProfit < 0
        ? "-100"
        : "0.0";

  return (
    <div className="space-y-4">
      {/* Row 1: Financial KPIs — highlighted */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Total Revenue"
          value={formatPKR(data.totalRevenue)}
          subtext={`${data.invoiceCount} paid invoice${data.invoiceCount !== 1 ? "s" : ""} this period`}
          trend={data.totalRevenue > 0 ? "up" : "neutral"}
          trendLabel={data.totalRevenue > 0 ? "Earning" : "No sales"}
          icon={DollarSign}
          accent="emerald"
        />
        <KpiCard
          title="Net Profit / Loss"
          value={formatPKR(data.netProfit)}
          subtext={
            profitNeutral
              ? "Break-even"
              : profitPositive
                ? `${profitMargin}% profit margin`
                : `Revenue doesn't cover expenses`
          }
          trend={profitPositive ? "up" : profitNeutral ? "neutral" : "down"}
          trendLabel={
            profitPositive
              ? `+${profitMargin}%`
              : profitNeutral
                ? "Break-even"
                : "Loss"
          }
          icon={ChartNoAxesColumnIncreasing}
          accent={profitPositive ? "emerald" : profitNeutral ? "amber" : "rose"}
          highlighted={!profitNeutral}
        />
        <KpiCard
          title="Expenses"
          value={formatPKR(data.totalExpenses)}
          subtext={`Non-payroll operational costs`}
          trend="neutral"
          trendLabel="Operational"
          icon={Receipt}
          accent="amber"
        />
        <KpiCard
          title="Payroll Cost"
          value={formatPKR(data.totalPayrollCost)}
          subtext={`${data.activeEmployees} active employee${data.activeEmployees !== 1 ? "s" : ""}`}
          trend="neutral"
          trendLabel={`₨ ${data.activeEmployees > 0 ? Math.round(data.totalPayrollCost / data.activeEmployees).toLocaleString() : 0}/head`}
          icon={HandCoins}
          accent="violet"
        />
      </div>

      {/* Row 2: Operational KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          title="Production Runs"
          value={data.activeProductionRuns.toString()}
          subtext={`${data.completedProductionRuns} completed this period`}
          trend={data.activeProductionRuns > 0 ? "up" : "neutral"}
          trendLabel={data.activeProductionRuns > 0 ? "In progress" : "Idle"}
          icon={Factory}
          accent="sky"
        />
        <KpiCard
          title="Cartons Produced"
          value={data.totalCartonsProduced.toLocaleString()}
          subtext="This period"
          trend={data.totalCartonsProduced > 0 ? "up" : "neutral"}
          trendLabel={data.totalCartonsProduced > 0 ? "On track" : "None yet"}
          icon={Package}
          accent="emerald"
        />
        <KpiCard
          title="Raw Stock Value"
          value={formatPKR(data.rawStockValue)}
          subtext="Chemicals + packaging"
          trend="neutral"
          trendLabel="Current"
          icon={Boxes}
          accent="amber"
        />
        <KpiCard
          title="Finished Goods"
          value={formatPKR(data.finishedStockValue)}
          subtext="Warehouse stock value"
          trend={data.finishedStockValue > 0 ? "up" : "neutral"}
          trendLabel={data.finishedStockValue > 0 ? "In stock" : "Empty"}
          icon={Warehouse}
          accent="sky"
        />
      </div>
    </div>
  );
}

type Accent = "emerald" | "rose" | "amber" | "sky" | "violet";

const accentStyles: Record<
  Accent,
  {
    icon: string;
    badge: string;
    badgeText: string;
    iconBg: string;
    gradient: string;
  }
> = {
  emerald: {
    icon: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100/80 dark:bg-emerald-950/50",
    badge:
      "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800",
    badgeText: "text-emerald-700 dark:text-emerald-400",
    gradient: "from-emerald-500/10 via-transparent to-transparent",
  },
  rose: {
    icon: "text-rose-600 dark:text-rose-400",
    iconBg: "bg-rose-100/80 dark:bg-rose-950/50",
    badge:
      "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800",
    badgeText: "text-rose-700 dark:text-rose-400",
    gradient: "from-rose-500/10 via-transparent to-transparent",
  },
  amber: {
    icon: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-100/80 dark:bg-amber-950/50",
    badge:
      "bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800",
    badgeText: "text-amber-700 dark:text-amber-400",
    gradient: "from-amber-500/10 via-transparent to-transparent",
  },
  sky: {
    icon: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-100/80 dark:bg-sky-950/50",
    badge: "bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800",
    badgeText: "text-sky-700 dark:text-sky-400",
    gradient: "from-sky-500/10 via-transparent to-transparent",
  },
  violet: {
    icon: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100/80 dark:bg-violet-950/50",
    badge:
      "bg-violet-50 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800",
    badgeText: "text-violet-700 dark:text-violet-400",
    gradient: "from-violet-500/10 via-transparent to-transparent",
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
  highlighted,
}: {
  title: string;
  value: string;
  subtext: string;
  trend: "up" | "down" | "neutral";
  trendLabel: string;
  icon: React.ElementType;
  accent: Accent;
  highlighted?: boolean;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  const colors = accentStyles[accent];

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-4 flex flex-col gap-3 group",
        "hover:shadow-md transition-all duration-300 ease-out",
        "overflow-hidden",
        highlighted
          ? "border-2 shadow-sm"
          : "border-border/60",
        highlighted && accent === "rose" && "border-rose-300 dark:border-rose-800",
        highlighted && accent === "emerald" && "border-emerald-300 dark:border-emerald-800",
      )}
    >
      {/* Gradient accent background */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none",
          colors.gradient,
        )}
      />

      {/* Top row: icon + trend badge */}
      <div className="relative flex items-center justify-between">
        <div className={cn("p-2.5 rounded-xl", colors.iconBg)}>
          <Icon className={cn("size-4.5", colors.icon)} />
        </div>

        <div
          className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border",
            colors.badge,
            colors.badgeText,
          )}
        >
          <TrendIcon className="size-2.5" />
          {trendLabel}
        </div>
      </div>

      {/* Value */}
      <div className="relative">
        <p className="text-2xl font-black tracking-tight tabular-nums leading-none mb-1">
          {value}
        </p>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          {title}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-border/40" />

      {/* Subtext */}
      <p className="relative text-xs text-muted-foreground leading-snug">{subtext}</p>
    </div>
  );
}
