import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    Calendar,
    DollarSign,
    Layers,
    Loader2,
    Package,
    TrendingUp,
    Users,
} from "lucide-react";
import { InventoryPieChart } from "@/components/charts/inventory-chart";
import { ProductionChart } from "@/components/charts/production-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
// import { getAnalyticsFn } from "@/server-functions/get-analytics-fn";

export const Route = createFileRoute("/_protected/dashboard/")({
    loader: async ({ context }) => {
        void context.queryClient.prefetchQuery({
            queryKey: ["admin-analytics"],
            // queryFn: getAnalyticsFn,
        })
    },
    component: AdminDashboard,
});

function AdminDashboard() {
    // const { data, isLoading, error } = useQuery({
    // 	queryKey: ["global-analytics"],
    // 	queryFn: async () => {
    // 		const res = await fetch(`${BACKEND_URL}/analytics/global-metrics`);
    // 		if (!res.ok) throw new Error("Failed to fetch analytics");
    // 		return res.json();
    // 	},
    // 	refetchInterval: 30000, // Auto-refresh every 30s
    // });

    // if (isLoading)
    // 	return (
    // 		<div className="flex h-screen items-center justify-center">
    // 			<Loader2 className="animate-spin size-10 text-primary" />
    // 		</div>
    // 	);
    // if (error)
    // 	return (
    // 		<div className="p-10 text-center text-destructive bg-destructive/10 rounded-xl m-10">
    // 			Error loading dashboard. Please check backend connection.
    // 		</div>
    // 	);

    // const { valuation, finance, alerts, recentRuns, charts } = data;

    return (
        // <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500">
        // 	{/* Header Section */}
        // 	<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        // 		<div>
        // 			<h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
        // 				Titan Enterprise
        // 			</h1>
        // 			<p className="text-muted-foreground font-medium mt-1">
        // 				Global Command Center & Analytics
        // 			</p>
        // 		</div>
        // 		<div className="flex items-center gap-3">
        // 			<div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
        // 				<span className="relative flex h-2.5 w-2.5">
        // 					<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        // 					<span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        // 				</span>
        // 				<span className="text-xs font-bold tracking-widest text-slate-600 dark:text-slate-300">
        // 					SYSTEM ONLINE
        // 				</span>
        // 			</div>
        // 			<Button
        // 				size="icon"
        // 				variant="outline"
        // 				className="rounded-full shadow-sm"
        // 			>
        // 				<Calendar className="size-4" />
        // 			</Button>
        // 			<Button
        // 				size="icon"
        // 				variant="outline"
        // 				className="rounded-full shadow-sm"
        // 			>
        // 				<Users className="size-4" />
        // 			</Button>
        // 		</div>
        // 	</div>
        // 	{/* KPI Grid */}
        // 	<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        // 		<KpiCard
        // 			title="Total Revenue"
        // 					value={`PKR ${Number(finance.revenue).toLocaleString()}`}
        // 			icon={<DollarSign className="size-5" />}
        // 			trend="+12.5%"
        // 			trendUp={true}
        // 			color="emerald"
        // 			description="Total invoiced income"
        // 		/>
        // 		<KpiCard
        // 			title="Net Profit"
        // 					value={`PKR ${Number(finance.netProfit).toLocaleString()}`}
        // 			icon={<TrendingUp className="size-5" />}
        // 			trend="+4.3%"
        // 			trendUp={true}
        // 			color="blue"
        // 			description="Revenue - Expenses"
        // 		/>
        // 		<KpiCard
        // 			title="Inventory Value"
        // 					value={`PKR ${Number(valuation.inventoryValue).toLocaleString()}`}
        // 			icon={<Layers className="size-5" />}
        // 			trend="+1.2%"
        // 			trendUp={true}
        // 			color="violet"
        // 			description="Current stock assets"
        // 		/>
        // 		<KpiCard
        // 			title="Stock Alerts"
        // 			value={alerts.lowStockCount.toString()}
        // 			icon={<AlertCircle className="size-5" />}
        // 			trend={alerts.lowStockCount > 0 ? "Action Needed" : "Optimal"}
        // 			trendUp={alerts.lowStockCount === 0}
        // 			color={alerts.lowStockCount > 0 ? "rose" : "emerald"}
        // 			description="Items below threshold"
        // 		/>
        // 	</div>
        // 	{/* Charts Section */}
        // 	<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        // 		<RevenueChart data={charts?.revenue} />
        // 		<InventoryPieChart data={charts?.inventory} />
        // 	</div>
        // 	<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        // 		{/* Recent Production Feed */}
        // 		<Card className="col-span-1 lg:col-span-8 shadow-sm border-slate-200 dark:border-slate-800">
        // 			<CardHeader className="flex flex-row items-center justify-between">
        // 				<div>
        // 					<CardTitle className="flex items-center gap-2">
        // 						<Activity className="size-5 text-indigo-500" /> Live Production
        // 						Tracker
        // 					</CardTitle>
        // 					<CardDescription>Real-time manufacturing updates</CardDescription>
        // 				</div>
        // 				<Button variant="ghost" size="sm" className="text-xs">
        // 					View All
        // 				</Button>
        // 			</CardHeader>
        // 			<CardContent>
        // 				<div className="space-y-4">
        // 					{recentRuns &&
        // 						recentRuns.map((run: any) => (
        // 							<div
        // 								key={run.id}
        // 								className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors group"
        // 							>
        // 								<div className="flex items-center gap-4">
        // 									<div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg shadow-sm group-hover:scale-105 transition-transform">
        // 										<Package className="size-5 text-indigo-500" />
        // 									</div>
        // 									<div>
        // 										<div className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100">
        // 											{run.variant.name}
        // 										</div>
        // 										<div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
        // 											<span className="uppercase">
        // 												{run.warehouse.name}
        // 											</span>
        // 											<span className="size-1 rounded-full bg-slate-300"></span>
        // 											<span>Batch: {run.batchId}</span>
        // 										</div>
        // 									</div>
        // 								</div>
        // 								<div className="text-right">
        // 									<div className="text-sm font-black text-slate-900 dark:text-white">
        // 										{run.cartonsProduced}{" "}
        // 										<span className="text-xs text-muted-foreground font-normal">
        // 											CTNS
        // 										</span>
        // 									</div>
        // 									<Badge
        // 										variant="secondary"
        // 										className="mt-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 hover:bg-emerald-100 border-none"
        // 									>
        // 										COMPLETED
        // 									</Badge>
        // 								</div>
        // 							</div>
        // 						))}
        // 					{(!recentRuns || recentRuns.length === 0) && (
        // 						<div className="text-center py-12 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
        // 							<Package className="size-10 text-slate-300 mx-auto mb-2" />
        // 							<p className="text-muted-foreground">
        // 								No active production runs
        // 							</p>
        // 						</div>
        // 					)}
        // 				</div>
        // 			</CardContent>
        // 		</Card>
        // 		{/* Production Volume Chart */}
        // 		<ProductionChart data={charts?.production} />
        // 	</div>
        // </div>
        <div>Admin Dashboard</div>
    )
}

function KpiCard({
    title,
    value,
    icon,
    trend,
    trendUp,
    color,
    description,
}: any) {
    const colorStyles: any = {
        emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
        orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    }

    // Fallback if color not found
    const activeColorClass = colorStyles[color] || colorStyles.blue;

    return (
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 group">
            <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div
                        className={cn(
                            "p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110",
                            activeColorClass,
                        )}
                    >
                        {icon}
                    </div>
                    <div
                        className={cn(
                            "text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1",
                            trendUp
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
                        )}
                    >
                        {trendUp ? (
                            <ArrowUpRight className="size-3" />
                        ) : (
                            <TrendingUp className="size-3 rotate-180" />
                        )}
                        {trend}
                    </div>
                </div>
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">
                        {title}
                    </h3>
                    <div className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                        {value}
                    </div>
                    {description && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-slate-100 dark:border-slate-800 pt-2">
                            {description}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
