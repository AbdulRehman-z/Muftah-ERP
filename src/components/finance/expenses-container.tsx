import { useState, useMemo } from "react";
import { useExpenses } from "@/hooks/finance/use-finance";
import { listExpenseCategoriesFn } from "@/server-functions/finance/expense-categories-fn";
import { useQuery } from "@tanstack/react-query";
import { GenericEmpty } from "@/components/custom/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  TrendingDown,
  Tag,
  Hash,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { GenericLoader } from "../custom/generic-loader";
import { ExpenseCategoriesManager } from "./expense-categories-manager";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { motion, Variants } from "framer-motion";

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

export const ExpensesContainer = () => {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["expense-categories", "active"],
    queryFn: () => listExpenseCategoriesFn(),
  });

  const today = new Date();
  const dateFrom = startOfMonth(today).toISOString();
  const dateTo = endOfMonth(today).toISOString();

  const { data, isFetching } = useExpenses({
    page,
    limit: LIMIT,
    category: categoryFilter === "all" ? undefined : categoryFilter,
    dateFrom,
    dateTo,
  });

  const expenses = data?.data ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 1;

  const handleCategoryFilter = (v: string) => {
    setCategoryFilter(v);
    setPage(1);
  };

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
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="rounded-none text-[10px] font-bold tracking-wider border-border"
          >
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
              <Building2 className="size-3.5 text-blue-500 shrink-0" />
            ) : (
              <BanknoteIcon className="size-3.5 text-violet-500 shrink-0" />
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
          <span className="font-black text-sm text-rose-500 tabular-nums text-right block">
            ₨ {parseFloat(row.original.amount || "0").toLocaleString()}
          </span>
        ),
      },
    ],
    [],
  );

  const pageTotal = expenses.reduce(
    (s, e) => s + parseFloat(e.amount || "0"),
    0,
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 font-sans antialiased"
    >
      {/* ── Summary KPIs ──────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <SharpKPICard
          title="Total Records"
          value={total.toString()}
          subtext={
            categoryFilter !== "all"
              ? `Filtered by ${categoryFilter}`
              : "All categories"
          }
          icon={Hash}
          theme="blue"
        />
        <SharpKPICard
          title="Page Total"
          value={`₨ ${Math.round(pageTotal).toLocaleString()}`}
          subtext={`${expenses.length} records on this page`}
          icon={TrendingDown}
          theme="amber"
        />
        <SharpKPICard
          title="Categories"
          value={isLoadingCategories ? "..." : categories.length.toString()}
          subtext="Available expense categories"
          icon={Tag}
          theme="rose"
        />
      </motion.div>

      {/* ── Data Table Area ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className=" rounded-none shadow-none">
        <DataTable
          columns={columns}
          data={expenses}
          showSearch={false}
          showPagination={false}
          isLoading={isFetching}
          actions={
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Dialog
                open={isManageCategoriesOpen}
                onOpenChange={setIsManageCategoriesOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 rounded-none shadow-none border-border hover:bg-muted transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5 mr-2" />
                    Manage Categories
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-full rounded-none border border-border shadow-none">
                  <ExpenseCategoriesManager />
                </DialogContent>
              </Dialog>
              <Select
                value={categoryFilter}
                onValueChange={handleCategoryFilter}
              >
                <SelectTrigger className="w-full sm:w-[220px] h-10 text-[13px] border-border rounded-none shadow-none focus:ring-1 focus:ring-primary">
                  <SelectValue
                    placeholder={
                      isLoadingCategories ? "Loading..." : "All categories"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="rounded-none shadow-none border border-border">
                  <SelectItem value="all" className="rounded-none">
                    All Categories
                  </SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem
                      key={cat.id}
                      value={cat.name}
                      className="rounded-none"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
          loadingStateComponent={
            <GenericLoader
              title="Loading Expenses"
              description="Please wait while we load the expenses."
            />
          }
          emptyState={
            <GenericEmpty
              icon={FinanceEmptyIllustration}
              title="No Expenses Found"
              description={
                categoryFilter !== "all"
                  ? `No expenses in "${categoryFilter}".`
                  : "No expenses recorded yet."
              }
            />
          }
        />
      </motion.div>

      {/* ── Pagination ────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col sm:flex-row items-center justify-between px-1 gap-4"
      >
        <span className="text-xs text-muted-foreground tabular-nums uppercase tracking-widest font-semibold">
          Page <span className="text-foreground">{page}</span> of{" "}
          <span className="text-foreground">{pageCount}</span> · {total} total
          records
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-10 px-4 rounded-none shadow-none border-border flex-1 sm:flex-none"
          >
            <ChevronLeft className="size-3.5 mr-1" /> Prev
          </Button>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            className="h-10 px-4 rounded-none shadow-none border-border flex-1 sm:flex-none"
          >
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
  blue: {
    border: "border-t-blue-500",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-500",
  },
  rose: {
    border: "border-t-rose-500",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-500",
  },
  emerald: {
    border: "border-t-emerald-500",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-500",
  },
  violet: {
    border: "border-t-violet-500",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-500",
  },
  amber: {
    border: "border-t-amber-500",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
  },
};

function SharpKPICard({
  title,
  value,
  subtext,
  icon: Icon,
  theme,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  theme: KPITheme;
}) {
  const styles = sharpThemeStyles[theme];

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "relative flex flex-col justify-between p-5 bg-card border border-border rounded-none shadow-none",
        "border-t-2",
        styles.border,
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
          backgroundSize: "8px 8px",
        }}
      />
      <div className="relative z-10 flex items-start justify-between mb-8">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </p>
        <div className={cn("p-1.5 rounded-none", styles.iconBg)}>
          <Icon className={cn("size-4", styles.iconText)} />
        </div>
      </div>
      <div className="relative z-10 space-y-1">
        <h3 className="text-3xl font-bold tracking-tight text-foreground">
          {value}
        </h3>
        <p className="text-xs font-medium text-muted-foreground/70">
          {subtext}
        </p>
      </div>
    </motion.div>
  );
}
