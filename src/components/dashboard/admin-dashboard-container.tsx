// import { useSuspenseQuery } from "@tanstack/react-query";
// import { useState } from "react";
// import { getDashboardStatsFn } from "@/server-functions/dashboard/get-dashboard-fn";
// import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
// import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";
// import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
// import { Button } from "@/components/ui/button";
// import { Badge } from "@/components/ui/badge";
// import { format, getYear } from "date-fns";
// import {
//     RefreshCw,
//     CalendarDays,
//     TrendingUp,
//     TrendingDown,
//     Clock,
// } from "lucide-react";
// import { useQueryClient } from "@tanstack/react-query";
// import { DatePicker } from "@/components/custom/date-picker";
// import { useDashboardSync } from "@/hooks/dashboard/use-dashboard-sync";
// import { motion, Variants } from "framer-motion";

// // ── Animation Variants ─────────────────────────────────────────────────────

// const containerVariants: Variants = {
//     hidden: { opacity: 0 },
//     show: {
//         opacity: 1,
//         transition: { staggerChildren: 0.1, delayChildren: 0.05 },
//     },
// };

// const itemVariants: Variants = {
//     hidden: { opacity: 0, y: 15 },
//     show: {
//         opacity: 1,
//         y: 0,
//         transition: { type: "spring", stiffness: 300, damping: 30 },
//     },
// };

// export function AdminDashboard() {
//     const [selectedDate, setSelectedDate] = useState<Date>(new Date());
//     const queryClient = useQueryClient();

//     const year = getYear(selectedDate);
//     const month = format(selectedDate, "yyyy-MM");

//     const { data, isFetching } = useSuspenseQuery({
//         queryKey: ["admin-dashboard", year, month],
//         queryFn: () => getDashboardStatsFn({ data: { year, month } }),
//     });

//     useDashboardSync();

//     const handleRefresh = () => {
//         queryClient.invalidateQueries({
//             queryKey: ["admin-dashboard", year, month],
//         });
//     };

//     const handleDateChange = (date?: Date) => {
//         if (date) setSelectedDate(date);
//     };

//     const netProfitPositive = data.netProfit >= 0;

//     return (
//         <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

//             {/* ── Technical Toolbar ───────────────────────────────────────── */}
//             <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border p-4">
//                 <div className="flex items-center gap-4 flex-wrap">
//                     <div className="flex items-center gap-3 pr-4 border-r border-border">
//                         <CalendarDays className="size-4 text-muted-foreground" />
//                         <div>
//                             <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">
//                                 Data Window
//                             </p>
//                             <p className="text-sm font-black uppercase tracking-widest leading-none text-foreground">
//                                 {format(selectedDate, "MMMM yyyy")}
//                             </p>
//                         </div>
//                     </div>

//                     <div
//                         className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border ${netProfitPositive
//                             ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
//                             : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
//                             }`}
//                     >
//                         {netProfitPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
//                         {netProfitPositive ? "Profitable" : "Net Loss"}
//                     </div>

//                     <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
//                         <Clock className="size-3" />
//                         T-Sync: {format(new Date(), "HH:mm:ss")}
//                     </div>
//                 </div>

//                 <div className="flex items-center gap-3 w-full sm:w-auto">
//                     <DatePicker
//                         date={selectedDate}
//                         onChange={handleDateChange}
//                         placeholder="Select window"
//                         className="h-9 w-full sm:w-[180px] rounded-none border-border focus:ring-1 focus:ring-primary shadow-none text-[11px] font-bold uppercase tracking-widest"
//                         formatStr="MMMM yyyy"
//                         monthOnly
//                     />
//                     <Button
//                         variant="outline"
//                         size="icon"
//                         onClick={handleRefresh}
//                         disabled={isFetching}
//                         className="h-9 w-9 rounded-none border-border shadow-none hover:bg-muted"
//                         title="Force Sync"
//                     >
//                         <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
//                     </Button>
//                 </div>
//             </motion.div>

//             {/* ── SVG Sparkline KPI Cards ─────────────────────────────────── */}
//             <motion.div variants={itemVariants}>
//                 <DashboardKpiCards data={data} />
//             </motion.div>

//             {/* ── Core Charts Row ─────────────────────────────────────────── */}
//             <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
//                 <RevenueExpenseChart
//                     data={data.revenueExpenseChart}
//                     className="lg:col-span-8"
//                 />
//                 <RecentActivityFeed
//                     data={data.recentActivity}
//                     className="lg:col-span-4"
//                 />
//             </motion.div>
//         </motion.div>
//     );
// }


import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getDashboardStatsFn } from "@/server-functions/dashboard/get-dashboard-fn";
import { DashboardKpiCards } from "@/components/dashboard/dashboard-kpi-cards";
import { RevenueExpenseChart } from "@/components/dashboard/revenue-expense-chart";
import { CapitalAllocationChart } from "@/components/dashboard/capital-allocation-chart";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { Button } from "@/components/ui/button";
import { format, getYear } from "date-fns";
import { RefreshCw, CalendarDays, TrendingUp, TrendingDown, Clock, HardDrive } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DatePicker } from "@/components/custom/date-picker";
import { useDashboardSync } from "@/hooks/dashboard/use-dashboard-sync";
import { motion, Variants } from "framer-motion";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export function AdminDashboard() {
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
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard", year, month] });
    };

    const netProfitPositive = data.netProfit >= 0;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

            {/* ── Technical Toolbar ───────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-none shadow-none">
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3 pr-4 border-r border-border">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">
                                Temporal Window
                            </p>
                            <p className="text-sm font-black uppercase tracking-widest leading-none text-foreground">
                                {format(selectedDate, "MMMM yyyy")}
                            </p>
                        </div>
                    </div>

                    <div
                        className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border rounded-none ${netProfitPositive
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-500"
                            : "bg-rose-500/5 border-rose-500/20 text-rose-600 dark:text-rose-500"
                            }`}
                    >
                        {netProfitPositive ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                        {netProfitPositive ? "Profitable Cycle" : "Deficit Cycle"}
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        <HardDrive className="size-3" />
                        SYS_SYNC: {format(new Date(), "HH:mm:ss")}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DatePicker
                        date={selectedDate}
                        onChange={(d) => d && setSelectedDate(d)}
                        placeholder="Select window"
                        className="h-9 w-full sm:w-[180px] rounded-none border-border focus:ring-1 focus:ring-primary shadow-none text-[10px] font-bold uppercase tracking-widest"
                        formatStr="MMMM yyyy"
                        monthOnly
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="h-9 w-9 rounded-none border-border shadow-none hover:bg-muted"
                    >
                        <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                    </Button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <DashboardKpiCards data={data} />
            </motion.div>

            {/* ── Advanced Analytics Row ──────────────────────────────────── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <RevenueExpenseChart
                    data={data.revenueExpenseChart}
                    className="lg:col-span-8"
                />
                {/* NEW CHART: Synthesized from existing raw data */}
                <CapitalAllocationChart
                    rawStock={data.rawStockValue}
                    finishedStock={data.finishedStockValue}
                    payroll={data.totalPayrollCost}
                    expenses={data.totalExpenses}
                    className="lg:col-span-4"
                />
            </motion.div>

            <motion.div variants={itemVariants}>
                <RecentActivityFeed data={data.recentActivity} />
            </motion.div>
        </motion.div>
    );
}