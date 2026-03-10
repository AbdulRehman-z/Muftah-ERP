import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
    getTransactionsFn,
    getWalletsListFn,
} from "@/server-functions/finance-fn";
import { GenericEmpty } from "@/components/custom/empty";
import { Badge } from "@/components/ui/badge";
import { FinanceEmptyIllustration } from "@/components/illustrations/FinanceEmptyIllustration";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Building2,
    BanknoteIcon,
    ArrowDownIcon,
    ArrowUpIcon,
    TrendingUpIcon,
    TrendingDownIcon,
    ActivityIcon,
} from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

type KPIColor = "emerald" | "rose" | "blue" | "amber" | "violet";

const kpiColorMap: Record<KPIColor, { bg: string; iconBg: string; icon: string; value: string }> = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600", value: "text-emerald-700 dark:text-emerald-400" },
    rose: { bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600", value: "text-rose-700 dark:text-rose-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30", iconBg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600", value: "text-blue-700 dark:text-blue-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600", value: "text-amber-700 dark:text-amber-400" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/30", iconBg: "bg-violet-100 dark:bg-violet-900/40", icon: "text-violet-600", value: "text-violet-700 dark:text-violet-400" },
};

export const LedgerContainer = () => {
    const { data: transactions } = useSuspenseQuery({
        queryKey: ["transactions"],
        queryFn: () => getTransactionsFn({ data: { limit: 500 } }),
    });

    const { data: wallets } = useSuspenseQuery({
        queryKey: ["wallets"],
        queryFn: getWalletsListFn,
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [walletFilter, setWalletFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState<"all" | "credit" | "debit">("all");

    const filteredTransactions = useMemo(() => {
        return transactions.filter((txn) => {
            const matchesSearch =
                !searchQuery ||
                txn.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                txn.wallet?.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesWallet =
                walletFilter === "all" || txn.walletId === walletFilter;
            const matchesType = typeFilter === "all" || txn.type === typeFilter;
            return matchesSearch && matchesWallet && matchesType;
        });
    }, [transactions, searchQuery, walletFilter, typeFilter]);

    const totalCredits = transactions
        .filter((t) => t.type === "credit")
        .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    const totalDebits = transactions
        .filter((t) => t.type === "debit")
        .reduce((sum, t) => sum + parseFloat(t.amount || "0"), 0);
    const netFlow = totalCredits - totalDebits;

    // ── Columns ──────────────────────────────────────────────────────────────
    type Txn = (typeof transactions)[number];

    const columns: ColumnDef<Txn>[] = useMemo(
        () => [
            {
                id: "type",
                header: "",
                cell: ({ row }) => {
                    const isCredit = row.original.type === "credit";
                    return (
                        <div
                            className={cn(
                                "p-1.5 rounded-lg w-fit",
                                isCredit
                                    ? "bg-emerald-50 dark:bg-emerald-950/30"
                                    : "bg-rose-50 dark:bg-rose-950/30",
                            )}
                        >
                            {isCredit ? (
                                <ArrowDownIcon className="size-3.5 text-emerald-600" />
                            ) : (
                                <ArrowUpIcon className="size-3.5 text-rose-500" />
                            )}
                        </div>
                    );
                },
            },
            {
                accessorKey: "createdAt",
                header: "Date & Time",
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="text-sm font-medium tabular-nums">
                            {format(new Date(row.original.createdAt), "dd MMM yyyy")}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                            {format(new Date(row.original.createdAt), "hh:mm a")}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "source",
                header: "Source",
                cell: ({ row }) => (
                    <span className="font-bold text-sm">{row.original.source}</span>
                ),
            },
            {
                accessorKey: "wallet",
                header: "Account",
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        {row.original.wallet?.type === "bank" ? (
                            <Building2 className="size-3.5 text-blue-600 shrink-0" />
                        ) : (
                            <BanknoteIcon className="size-3.5 text-violet-600 shrink-0" />
                        )}
                        <span className="text-sm font-medium">
                            {row.original.wallet?.name || "—"}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "performer",
                header: "Performed By",
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {row.original.performer?.name || "—"}
                    </span>
                ),
            },
            {
                accessorKey: "amount",
                header: () => <span className="text-right block">Amount</span>,
                cell: ({ row }) => {
                    const isCredit = row.original.type === "credit";
                    const amount = parseFloat(row.original.amount || "0");
                    return (
                        <span
                            className={cn(
                                "font-black text-sm tabular-nums text-right block",
                                isCredit ? "text-emerald-600" : "text-rose-500",
                            )}
                        >
                            {isCredit ? "+" : "−"} ₨ {amount.toLocaleString()}
                        </span>
                    );
                },
            },
        ],
        [],
    );

    return (
        <div className="space-y-6">
            {/* ── Summary KPI Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard
                    title="Total Credits"
                    value={`+ ₨ ${Math.round(totalCredits).toLocaleString()}`}
                    subtext={`${transactions.filter((t) => t.type === "credit").length} credit entries`}
                    icon={TrendingUpIcon}
                    color="emerald"
                />
                <KPICard
                    title="Total Debits"
                    value={`− ₨ ${Math.round(totalDebits).toLocaleString()}`}
                    subtext={`${transactions.filter((t) => t.type === "debit").length} debit entries`}
                    icon={TrendingDownIcon}
                    color="rose"
                />
                <KPICard
                    title="Net Flow"
                    value={`${netFlow >= 0 ? "+" : "−"} ₨ ${Math.abs(Math.round(netFlow)).toLocaleString()}`}
                    subtext={netFlow >= 0 ? "Positive balance" : "Negative balance"}
                    icon={ActivityIcon}
                    color={netFlow >= 0 ? "blue" : "amber"}
                />
            </div>

            {/* ── DataTable ────────────────────────────────────────────────── */}
            <DataTable
                columns={columns}
                data={filteredTransactions}
                showSearch
                searchPlaceholder="Search source or account..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                showViewOptions={false}
                pageSize={7}
                actions={
                    <div className="flex items-center gap-2">
                        <Select value={walletFilter} onValueChange={setWalletFilter}>
                            <SelectTrigger className="w-[170px] h-8 text-xs border-border/40 rounded-lg">
                                <SelectValue placeholder="All accounts" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Accounts</SelectItem>
                                {wallets.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>
                                        <div className="flex items-center gap-2">
                                            {w.type === "bank" ? (
                                                <Building2 className="size-3.5 text-blue-600" />
                                            ) : (
                                                <BanknoteIcon className="size-3.5 text-violet-600" />
                                            )}
                                            {w.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select
                            value={typeFilter}
                            onValueChange={(v) => setTypeFilter(v as "all" | "credit" | "debit")}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs border-border/40 rounded-lg">
                                <SelectValue placeholder="All types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="credit">
                                    <span className="flex items-center gap-2 text-emerald-600 font-semibold">
                                        <ArrowDownIcon className="size-3" /> Credits
                                    </span>
                                </SelectItem>
                                <SelectItem value="debit">
                                    <span className="flex items-center gap-2 text-rose-500 font-semibold">
                                        <ArrowUpIcon className="size-3" /> Debits
                                    </span>
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        <Badge
                            variant="secondary"
                            className="h-8 px-3 text-xs font-bold whitespace-nowrap"
                        >
                            {filteredTransactions.length} txns
                        </Badge>
                    </div>
                }
                emptyState={
                    <GenericEmpty
                        icon={FinanceEmptyIllustration}
                        title="No Transactions Found"
                        description={
                            searchQuery || walletFilter !== "all" || typeFilter !== "all"
                                ? "No transactions match your current filters."
                                : "No transactions have been recorded yet."
                        }
                    />
                }
            />
        </div>
    );
};

// ── KPI Card ──────────────────────────────────────────────────────────────

function KPICard({
    title,
    value,
    subtext,
    icon: Icon,
    color = "blue",
}: {
    title: string;
    value: string;
    subtext: string;
    icon: any;
    color?: KPIColor;
}) {
    const c = kpiColorMap[color];
    return (
        <div className={cn("rounded-2xl border p-4 transition-all hover:shadow-md", c.bg)}>
            <div className={cn("p-2 rounded-xl w-fit mb-3", c.iconBg)}>
                <Icon className={cn("size-4", c.icon)} />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                {title}
            </p>
            <p className={cn("text-xl font-black tracking-tight leading-tight mb-1 tabular-nums", c.value)}>
                {value}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground/70">{subtext}</p>
        </div>
    );
}
