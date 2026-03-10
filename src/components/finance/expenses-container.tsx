import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getExpensesFn, EXPENSE_CATEGORIES } from "@/server-functions/finance-fn";
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
    ReceiptIcon,
    Building2,
    BanknoteIcon,
    FilterIcon,
    TrendingDown,
    Tag,
    Hash,
} from "lucide-react";
import { format } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

// ── KPI color map ──────────────────────────────────────────────────────────

type KPIColor = "rose" | "amber" | "blue" | "violet" | "emerald";

const kpiColorMap: Record<KPIColor, { bg: string; iconBg: string; icon: string; value: string }> = {
    rose: { bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600", value: "text-rose-700 dark:text-rose-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600", value: "text-amber-700 dark:text-amber-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30", iconBg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600", value: "text-blue-700 dark:text-blue-400" },
    violet: { bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/30", iconBg: "bg-violet-100 dark:bg-violet-900/40", icon: "text-violet-600", value: "text-violet-700 dark:text-violet-400" },
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600", value: "text-emerald-700 dark:text-emerald-400" },
};

const CATEGORY_COLORS: KPIColor[] = ["rose", "amber", "blue", "violet", "emerald", "rose"];

export const ExpensesContainer = () => {
    const { data: expenses } = useSuspenseQuery({
        queryKey: ["expenses"],
        queryFn: () => getExpensesFn({ data: {} }),
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    const filteredExpenses = useMemo(() => {
        return expenses.filter((e) => {
            const matchesSearch =
                !searchQuery ||
                e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.category.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory =
                categoryFilter === "all" || e.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });
    }, [expenses, searchQuery, categoryFilter]);

    const totalExpenses = filteredExpenses.reduce(
        (sum, e) => sum + parseFloat(e.amount || "0"),
        0,
    );

    // Category breakdown for top KPIs
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, { total: number; count: number }> = {};
        expenses.forEach((e) => {
            if (!map[e.category]) map[e.category] = { total: 0, count: 0 };
            map[e.category].total += parseFloat(e.amount || "0");
            map[e.category].count += 1;
        });
        return Object.entries(map)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 6);
    }, [expenses]);

    // ── Columns ──────────────────────────────────────────────────────────────
    type Expense = (typeof expenses)[number];

    const columns: ColumnDef<Expense>[] = useMemo(
        () => [
            {
                accessorKey: "createdAt",
                header: "Date",
                cell: ({ row }) => (
                    <span className="text-sm font-medium text-muted-foreground tabular-nums">
                        {format(new Date(row.original.createdAt), "dd MMM yyyy")}
                    </span>
                ),
            },
            {
                accessorKey: "description",
                header: "Description",
                cell: ({ row }) => (
                    <span className="font-bold text-sm">{row.original.description}</span>
                ),
            },
            {
                accessorKey: "category",
                header: "Category",
                filterFn: (row, _, filterValue) =>
                    filterValue === "all" || row.original.category === filterValue,
                cell: ({ row }) => (
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wider">
                        {row.original.category}
                    </Badge>
                ),
            },
            {
                accessorKey: "wallet",
                header: "Paid From",
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
                header: "Recorded By",
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">
                        {row.original.performer?.name || "—"}
                    </span>
                ),
            },
            {
                accessorKey: "amount",
                header: () => <span className="text-right block">Amount</span>,
                cell: ({ row }) => (
                    <span className="font-black text-sm text-rose-600 tabular-nums text-right block">
                        ₨ {parseFloat(row.original.amount || "0").toLocaleString()}
                    </span>
                ),
            },
        ],
        [],
    );

    return (
        <div className="space-y-6">
            {/* ── Category KPI Cards ──────────────────────────────────────────── */}
            {categoryBreakdown.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {categoryBreakdown.map(([cat, { total, count }], i) => {
                        const c = kpiColorMap[CATEGORY_COLORS[i % CATEGORY_COLORS.length]];
                        const isActive = categoryFilter === cat;
                        return (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setCategoryFilter(isActive ? "all" : cat)}
                                className={cn(
                                    "rounded-2xl border p-3 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30",
                                    c.bg,
                                    isActive && "ring-2 ring-primary shadow-md",
                                )}
                            >
                                <div className={cn("p-1.5 rounded-lg w-fit mb-2", c.iconBg)}>
                                    <Tag className={cn("size-3", c.icon)} />
                                </div>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest truncate mb-0.5">
                                    {cat}
                                </p>
                                <p className={cn("text-base font-black tabular-nums leading-tight", c.value)}>
                                    ₨ {Math.round(total).toLocaleString()}
                                </p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">
                                    {count} entr{count !== 1 ? "ies" : "y"}
                                </p>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── Summary KPI row ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard
                    title="Total Expenses"
                    value={`₨ ${Math.round(expenses.reduce((s, e) => s + parseFloat(e.amount || "0"), 0)).toLocaleString()}`}
                    subtext={`${expenses.length} records`}
                    icon={ReceiptIcon}
                    color="rose"
                />
                <KPICard
                    title="Filtered Total"
                    value={`₨ ${Math.round(totalExpenses).toLocaleString()}`}
                    subtext={`${filteredExpenses.length} matching records`}
                    icon={TrendingDown}
                    color="amber"
                />
                <KPICard
                    title="Categories"
                    value={categoryBreakdown.length.toString()}
                    subtext="Distinct expense categories"
                    icon={Hash}
                    color="blue"
                />
            </div>

            {/* ── Table toolbar (filter controls) as DataTable actions prop ───── */}
            <DataTable
                columns={columns}
                data={filteredExpenses}
                showSearch
                searchPlaceholder="Search description or category..."
                searchValue={searchQuery}
                onSearchChange={setSearchQuery}
                showViewOptions={false}
                pageSize={7}
                actions={
                    <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); }}>
                        <SelectTrigger className="w-[190px] h-8 text-xs border-border/40 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <FilterIcon className="size-3 text-muted-foreground" />
                                <SelectValue placeholder="All categories" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {EXPENSE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat}>
                                    {cat}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
                emptyState={
                    <GenericEmpty
                        icon={FinanceEmptyIllustration}
                        title="No Expenses Found"
                        description={
                            searchQuery || categoryFilter !== "all"
                                ? "No expenses match your current filters."
                                : "No expenses have been recorded yet."
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
    color = "rose",
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
            <p className={cn("text-xl font-black tracking-tight leading-tight mb-1", c.value)}>
                {value}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground/70">{subtext}</p>
        </div>
    );
}
