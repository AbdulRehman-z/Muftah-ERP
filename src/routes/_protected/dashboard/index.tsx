import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { getDashboardStatsFn } from "@/server-functions/dashboard/get-dashboard-fn";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { GenericLoader } from "@/components/custom/generic-loader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, getYear } from "date-fns";
import {
  LayoutDashboard,
  RefreshCw,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/components/custom/date-picker";
import { useDashboardSync } from "@/hooks/dashboard/use-dashboard-sync";

const currentYear = new Date().getFullYear();
const currentMonth = format(new Date(), "yyyy-MM");

export const Route = createFileRoute("/_protected/dashboard/")({
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["admin-dashboard", currentYear, currentMonth],
      queryFn: () =>
        getDashboardStatsFn({
          data: { year: currentYear, month: currentMonth },
        }),
    });
  },
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 shadow-sm">
              <LayoutDashboard className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black tracking-tight">
                  Command Center
                </h2>
                <Badge
                  variant="outline"
                  className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 gap-1 animate-pulse"
                >
                  <Zap className="size-2.5" />
                  Live
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time overview of operations, finances, and production.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Separator className="opacity-50" />

      <Suspense
        fallback={
          <GenericLoader
            title="Loading Dashboard"
            description="Aggregating data..."
          />
        }
      >
        <AdminDashboard />
      </Suspense>
    </div>
  );
}

function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const queryClient = useQueryClient();

  const year = getYear(selectedDate);
  const month = format(selectedDate, "yyyy-MM");

  const { data, isFetching } = useSuspenseQuery({
    queryKey: ["admin-dashboard", year, month],
    queryFn: () => getDashboardStatsFn({ data: { year, month } }),
  });

  useDashboardSync();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ["admin-dashboard", year, month],
    });
  };

  const handleDateChange = (date?: Date) => {
    if (date) setSelectedDate(date);
  };

  const netProfitPositive = data.netProfit >= 0;

  return (
    <div className="space-y-5">
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 rounded-xl border border-border/40 p-3 px-4">
        {/* Left */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 rounded-lg bg-background border border-border/60 shadow-sm">
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none mb-0.5">
              Showing data for
            </p>
            <p className="text-sm font-bold leading-tight">
              {format(selectedDate, "MMMM yyyy")}
            </p>
          </div>

          {/* Profit indicator pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-full border shadow-sm ${netProfitPositive
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-400"
                : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400"
              }`}
          >
            {netProfitPositive ? (
              <TrendingUp className="size-3" />
            ) : (
              <TrendingDown className="size-3" />
            )}
            {netProfitPositive ? "Profitable" : "Net Loss"}
          </div>

          {isFetching && (
            <Badge
              variant="outline"
              className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800 animate-pulse gap-1"
            >
              <RefreshCw className="size-2.5 animate-spin" />
              Refreshing
            </Badge>
          )}

          <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-muted-foreground/60 font-medium">
            <Clock className="size-3" />
            Last updated: {format(new Date(), "h:mm a")}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <DatePicker
            date={selectedDate}
            onChange={handleDateChange}
            placeholder="Select month"
            className="h-9 w-[180px] text-xs"
            formatStr="MMMM yyyy"
            monthOnly
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="h-9 gap-2 text-[10px] font-black uppercase tracking-widest shadow-sm"
          >
            <RefreshCw
              className={`size-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <DashboardKpiCards data={data} />

      {/* ── Charts Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <RevenueExpenseChart
          data={data.revenueExpenseChart}
          className="lg:col-span-8"
        />
        <RecentActivityFeed
          data={data.recentActivity}
          className="lg:col-span-4"
        />
      </div>
    </div>
  );
}
