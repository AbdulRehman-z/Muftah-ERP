import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatPKR(value: number): string {
    if (value >= 1_000_000) return `PKR ${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `PKR ${(value / 1_000).toFixed(0)}K`;
    return `PKR ${value.toLocaleString()}`;
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
    const profitPositive = data.netProfit >= 0;
    const profitMargin = data.totalRevenue > 0
        ? Math.abs((data.netProfit / data.totalRevenue) * 100).toFixed(1)
        : "0.0";

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
                title="Total Revenue"
                value={formatPKR(data.totalRevenue)}
                description="Trending up this month"
                subtext={`${data.invoiceCount} invoices this period`}
                trend="up"
                trendLabel="+12.5%"
            />
            <KpiCard
                title="Net Profit"
                value={formatPKR(Math.abs(data.netProfit))}
                description={profitPositive ? "Revenue surplus" : "Operating at loss"}
                subtext={`${profitMargin}% profit margin`}
                trend={profitPositive ? "up" : "down"}
                trendLabel={profitPositive ? `+${profitMargin}%` : `-${profitMargin}%`}
                prefix={data.netProfit < 0 ? "-" : ""}
            />
            <KpiCard
                title="Total Expenses"
                value={formatPKR(data.totalCost)}
                description="Operational costs"
                subtext={`${formatPKR(data.totalPayrollCost)} in payroll`}
                trend="neutral"
                trendLabel="Stable"
            />
            <KpiCard
                title="Active Staff"
                value={data.activeEmployees.toString()}
                description="Strong team retention"
                subtext="Active employees on payroll"
                trend="up"
                trendLabel="+4.5%"
            />
            <KpiCard
                title="Production Runs"
                value={data.activeProductionRuns.toString()}
                description="Currently in progress"
                subtext={`${data.completedProductionRuns} completed this period`}
                trend="up"
                trendLabel="Active"
            />
            <KpiCard
                title="Cartons Produced"
                value={data.totalCartonsProduced.toLocaleString()}
                description="Steady production output"
                subtext="Meets production targets"
                trend="up"
                trendLabel="On track"
            />
            <KpiCard
                title="Raw Stock Value"
                value={formatPKR(data.rawStockValue)}
                description="Chemicals + Packaging"
                subtext="Current inventory valuation"
                trend="neutral"
                trendLabel="Stable"
            />
            <KpiCard
                title="Finished Goods"
                value={formatPKR(data.finishedStockValue)}
                description="Warehouse stock value"
                subtext="Ready for distribution"
                trend="up"
                trendLabel="Growing"
            />
        </div>
    );
}

function KpiCard({
    title,
    value,
    description,
    subtext,
    trend,
    trendLabel,
    prefix = "",
}: {
    title: string;
    value: string;
    description: string;
    subtext: string;
    trend: "up" | "down" | "neutral";
    trendLabel: string;
    prefix?: string;
}) {
    const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

    return (
        <Card className="border border-border/60 rounded-xl transition-all duration-200 hover:shadow-md hover:border-border">
            <CardContent className="p-6">
                {/* Top row: title + trend badge */}
                <div className="flex items-center justify-between mb-3">
                    <p className="text-sm text-muted-foreground font-medium">{title}</p>
                    <div className={cn(
                        "flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full",
                        trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        trend === "down" && "bg-rose-500/10 text-rose-600 dark:text-rose-400",
                        trend === "neutral" && "bg-muted text-muted-foreground",
                    )}>
                        <TrendIcon className="size-3" />
                        {trendLabel}
                    </div>
                </div>

                {/* Large value */}
                <p className="text-3xl font-bold tracking-tight mb-3">
                    {prefix}{value}
                </p>

                {/* Description line with trend icon */}
                <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-sm font-semibold">{description}</p>
                    <TrendIcon className={cn(
                        "size-3.5 shrink-0",
                        trend === "up" && "text-emerald-600 dark:text-emerald-400",
                        trend === "down" && "text-rose-600 dark:text-rose-400",
                        trend === "neutral" && "text-muted-foreground",
                    )} />
                </div>

                {/* Subtext */}
                <p className="text-xs text-muted-foreground">{subtext}</p>
            </CardContent>
        </Card>
    );
}
