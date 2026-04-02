import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, Variants } from "framer-motion";
import { getWalletsListFn } from "@/server-functions/finance-fn";
import { useTransactions } from "@/hooks/finance/use-finance";
import { GenericEmpty } from "@/components/custom/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FinanceEmptyIllustration } from "@/components/illustrations/FinanceEmptyIllustration";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Building2, BanknoteIcon, ArrowDownIcon, ArrowUpIcon,
    TrendingUpIcon, TrendingDownIcon, ActivityIcon,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { GenericLoader } from "../custom/generic-loader";

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1, delayChildren: 0.05 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 300, damping: 30 },
    },
};

const LIMIT = 20;

export const LedgerContainer = () => {
    const [page, setPage] = useState(1);
    const [walletFilter, setWalletFilter] = useState<string>("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");

    // Server-side paginated fetch
    const { data, isFetching } = useTransactions({
        walletId: walletFilter === "all" ? undefined : walletFilter,
        source: sourceFilter === "all" ? undefined : sourceFilter,
        page,
        limit: LIMIT,
    });

    const { data: wallets } = useSuspenseQuery({
        queryKey: ["wallets"],
        queryFn: getWalletsListFn,
    });

    const transactions = data?.data ?? [];
    const total = data?.total ?? 0;
    const pageCount = data?.pageCount ?? 1;

    // KPIs: run against the current page only
    const totalCredits = transactions.filter(t => t.type === "credit").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
    const totalDebits = transactions.filter(t => t.type === "debit").reduce((s, t) => s + parseFloat(t.amount || "0"), 0);
    const netFlow = totalCredits - totalDebits;

    // Reset to page 1 when filters change
    const handleWalletFilter = (v: string) => { setWalletFilter(v); setPage(1); };
    const handleTypeFilter = (v: any) => { setTypeFilter(v); setPage(1); };
    const handleSourceFilter = (v: string) => { setSourceFilter(v); setPage(1); };

    type Txn = (typeof transactions)[number];

    const columns: ColumnDef<Txn>[] = useMemo(() => [
        {
            id: "type",
            header: "",
            cell: ({ row }) => {
                const isCredit = row.original.type === "credit";
                return (
                    <div className={cn(
                        "p-1.5 rounded-none border w-fit",
                        isCredit ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                    )}>
                        {isCredit ? <ArrowDownIcon className="size-3.5 text-emerald-600" /> : <ArrowUpIcon className="size-3.5 text-rose-500" />}
                    </div>
                );
            },
        },
        {
            accessorKey: "createdAt",
            header: "Date & Time",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="text-sm font-bold tabular-nums text-foreground">{format(new Date(row.original.createdAt), "dd MMM yyyy")}</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums uppercase tracking-widest font-semibold">{format(new Date(row.original.createdAt), "hh:mm a")}</span>
                </div>
            ),
        },
        {
            accessorKey: "source",
            header: "Source",
            cell: ({ row }) => <span className="font-bold text-sm text-foreground">{row.original.source}</span>,
        },
        {
            accessorKey: "wallet",
            header: "Account",
            cell: ({ row }) => (
                <div className="flex items-center gap-2">
                    {row.original.wallet?.type === "bank"
                        ? <Building2 className="size-3.5 text-blue-600 shrink-0" />
                        : <BanknoteIcon className="size-3.5 text-violet-600 shrink-0" />}
                    <span className="text-sm font-medium">{row.original.wallet?.name || "—"}</span>
                </div>
            ),
        },
        {
            accessorKey: "performer",
            header: "Performed By",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.performer?.name || "—"}</span>,
        },
        {
            accessorKey: "amount",
            header: () => <span className="text-right block">Amount</span>,
            cell: ({ row }) => {
                const isCredit = row.original.type === "credit";
                return (
                    <span className={cn("font-black text-sm tabular-nums text-right block", isCredit ? "text-emerald-600" : "text-rose-500")}>
                        {isCredit ? "+" : "−"} ₨ {parseFloat(row.original.amount || "0").toLocaleString()}
                    </span>
                );
            },
        },
    ], []);

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 font-sans antialiased">

            {/* ── Sharp KPI Cards ───────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SharpKPICard
                    title="Credits (this page)"
                    value={`+ ₨ ${Math.round(totalCredits).toLocaleString()}`}
                    subtext={`${transactions.filter(t => t.type === "credit").length} entries shown`}
                    icon={TrendingUpIcon}
                    theme="emerald"
                />
                <SharpKPICard
                    title="Debits (this page)"
                    value={`− ₨ ${Math.round(totalDebits).toLocaleString()}`}
                    subtext={`${transactions.filter(t => t.type === "debit").length} entries shown`}
                    icon={TrendingDownIcon}
                    theme="rose"
                />
                <SharpKPICard
                    title="Net Flow (this page)"
                    value={`${netFlow >= 0 ? "+" : "−"} ₨ ${Math.abs(Math.round(netFlow)).toLocaleString()}`}
                    subtext={netFlow >= 0 ? "Positive" : "Negative"}
                    icon={ActivityIcon}
                    theme={netFlow >= 0 ? "blue" : "amber"}
                />
            </motion.div>

            {/* ── Table & Filters ───────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="bg-card border border-border rounded-none shadow-none">
                <DataTable
                    columns={columns}
                    data={transactions}
                    showSearch={false}
                    showPagination={false}
                    actions={
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            {/* Wallet filter */}
                            <Select value={walletFilter} onValueChange={handleWalletFilter}>
                                <SelectTrigger className="w-full sm:w-[170px] h-10 text-[13px] border-border rounded-none shadow-none focus:ring-1 focus:ring-primary">
                                    <SelectValue placeholder="All accounts" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none shadow-none border-border">
                                    <SelectItem value="all" className="rounded-none">All Accounts</SelectItem>
                                    {wallets.map((w) => (
                                        <SelectItem key={w.id} value={w.id} className="rounded-none">
                                            <div className="flex items-center gap-2">
                                                {w.type === "bank" ? <Building2 className="size-3.5 text-blue-500" /> : <BanknoteIcon className="size-3.5 text-violet-500" />}
                                                <span className="font-semibold">{w.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Source filter */}
                            <Select value={sourceFilter} onValueChange={handleSourceFilter}>
                                <SelectTrigger className="w-full sm:w-[160px] h-10 text-[13px] border-border rounded-none shadow-none focus:ring-1 focus:ring-primary">
                                    <SelectValue placeholder="All sources" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none shadow-none border-border">
                                    <SelectItem value="all" className="rounded-none">All Sources</SelectItem>
                                    <SelectItem value="Sale" className="rounded-none">Sale</SelectItem>
                                    <SelectItem value="Payroll" className="rounded-none">Payroll</SelectItem>
                                    <SelectItem value="Expense" className="rounded-none">Expense</SelectItem>
                                    <SelectItem value="Opening Balance" className="rounded-none">Opening Balance</SelectItem>
                                    <SelectItem value="Manual Adjustment" className="rounded-none">Manual Adjustment</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Type filter */}
                            <Select value={typeFilter} onValueChange={handleTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[140px] h-10 text-[13px] border-border rounded-none shadow-none focus:ring-1 focus:ring-primary">
                                    <SelectValue placeholder="All types" />
                                </SelectTrigger>
                                <SelectContent className="rounded-none shadow-none border-border">
                                    <SelectItem value="all" className="rounded-none">All Types</SelectItem>
                                    <SelectItem value="credit" className="rounded-none">
                                        <span className="flex items-center gap-2 text-emerald-600 font-bold"><ArrowDownIcon className="size-3" /> Credits</span>
                                    </SelectItem>
                                    <SelectItem value="debit" className="rounded-none">
                                        <span className="flex items-center gap-2 text-rose-500 font-bold"><ArrowUpIcon className="size-3" /> Debits</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            <Badge variant="outline" className="h-10 px-3 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap rounded-none border-border">
                                {total} total
                            </Badge>
                        </div>
                    }
                    isLoading={isFetching}
                    loadingStateComponent={
                        <GenericLoader
                            title="Loading Transactions"
                            description="Please wait while we load the transactions."
                        />
                    }
                    emptyState={
                        <GenericEmpty
                            icon={FinanceEmptyIllustration}
                            title="No Transactions Found"
                            description="No transactions match your current filters."
                        />
                    }
                />
            </motion.div>

            {/* ── Pagination ────────────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-between px-1 gap-4">
                <span className="text-xs text-muted-foreground tabular-nums uppercase tracking-widest font-semibold">
                    Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{pageCount}</span> · {total} total
                </span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-10 px-4 rounded-none shadow-none border-border flex-1 sm:flex-none">
                        <ChevronLeft className="size-3.5 mr-1" /> Prev
                    </Button>
                    <Button variant="outline" disabled={page >= pageCount} onClick={() => setPage(p => p + 1)} className="h-10 px-4 rounded-none shadow-none border-border flex-1 sm:flex-none">
                        Next <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ── Sharp Pixel-Perfect KPI Component ───────────────────────────────────────

type KPITheme = "blue" | "rose" | "emerald" | "violet" | "amber";

const sharpThemeStyles = {
    blue: { border: "border-t-blue-500", iconBg: "bg-blue-500/10", iconText: "text-blue-500" },
    rose: { border: "border-t-rose-500", iconBg: "bg-rose-500/10", iconText: "text-rose-500" },
    emerald: { border: "border-t-emerald-500", iconBg: "bg-emerald-500/10", iconText: "text-emerald-500" },
    violet: { border: "border-t-violet-500", iconBg: "bg-violet-500/10", iconText: "text-violet-500" },
    amber: { border: "border-t-amber-500", iconBg: "bg-amber-500/10", iconText: "text-amber-500" },
};

function SharpKPICard({ title, value, subtext, icon: Icon, theme }: { title: string; value: string; subtext: string; icon: any; theme: KPITheme }) {
    const styles = sharpThemeStyles[theme];

    return (
        <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className={cn(
                "relative flex flex-col justify-between p-5 bg-card border border-border rounded-none shadow-none",
                "border-t-2",
                styles.border
            )}
        >
            {/* Technical Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
                style={{ backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`, backgroundSize: "8px 8px" }}
            />

            <div className="relative z-10 flex items-start justify-between mb-8">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
                <div className={cn("p-1.5 rounded-none", styles.iconBg)}>
                    <Icon className={cn("size-4", styles.iconText)} />
                </div>
            </div>

            <div className="relative z-10 space-y-1">
                <h3 className="text-3xl font-bold tracking-tight text-foreground tabular-nums">{value}</h3>
                <p className="text-xs font-medium text-muted-foreground/70">{subtext}</p>
            </div>
        </motion.div>
    );
}