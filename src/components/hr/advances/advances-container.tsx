import { useSuspenseQuery } from "@tanstack/react-query";
import { listSalaryAdvancesFn } from "@/server-functions/hr/advances/advances-fn";
import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApproveAdvanceDialog } from "./approve-advance-dialog";
import { useRejectSalaryAdvance } from "@/hooks/hr/use-salary-advances";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GenericEmpty } from "@/components/custom/empty";
import { HREmptyIllustration } from "@/components/illustrations/HREmptyIllustration";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { DataTable } from "@/components/custom/data-table";

// ── Status config ─────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/30" },
  approved: { label: "Approved", className: "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/30" },
  deducted: { label: "Deducted", className: "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/30" },
  rejected: { label: "Rejected", className: "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/30" },
};

export function AdvancesContainer() {
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approveAmount, setApproveAmount] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const rejectMutate = useRejectSalaryAdvance();

  const { data: advances } = useSuspenseQuery({
    queryKey: ["salary-advances"],
    queryFn: () => listSalaryAdvancesFn({ data: { limit: 200 } }),
  });

  // ── KPI stats ─────────────────────────────────────────────────────────────
  const pendingCount = advances.filter((a) => a.status === "pending").length;
  const pendingSum = advances
    .filter((a) => a.status === "pending")
    .reduce((s, a) => s + parseFloat(a.amount), 0);
  const approvedSum = advances
    .filter((a) => a.status === "approved" || a.status === "deducted")
    .reduce((s, a) => s + parseFloat(a.amount), 0);
  const totalSum = advances.reduce((s, a) => s + parseFloat(a.amount), 0);

  // ── Client-side search filter ─────────────────────────────────────────────
  const filteredAdvances = useMemo(() => {
    if (!searchQuery.trim()) return advances;
    const q = searchQuery.toLowerCase();
    return advances.filter((a) => {
      const emp = a.employee;
      return (
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(q) ||
        emp.employeeCode.toLowerCase().includes(q) ||
        a.reason?.toLowerCase().includes(q)
      );
    });
  }, [advances, searchQuery]);

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns: ColumnDef<(typeof advances)[number]>[] = useMemo(
    () => [
      {
        id: "employee",
        header: "Employee",
        cell: ({ row }) => {
          const emp = row.original.employee;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 border border-border shadow-sm">
                <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                  {emp.firstName[0]}{emp.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-tight">
                  {emp.firstName} {emp.lastName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {emp.employeeCode}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "date",
        header: "Request Date",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-sm">
              {format(parseISO(row.original.date), "dd MMM yyyy")}
            </span>
            <span className="text-[10px] text-muted-foreground line-clamp-1 max-w-[160px]">
              {row.original.reason}
            </span>
          </div>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        cell: ({ row }) => (
          <span className="font-black text-sm tabular-nums">
            PKR {parseFloat(row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const s = row.original.status as string;
          const cfg = statusConfig[s] ?? { label: s, className: "" };
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase px-2 py-0.5 h-5",
                cfg.className,
              )}
            >
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          if (row.original.status !== "pending") return null;
          return (
            <div className="flex items-center gap-2 justify-end">
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  setApproveAmount(row.original.amount);
                  setApproveId(row.original.id);
                }}
              >
                <CheckCircle2 className="size-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Approve
                </span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 gap-1.5 px-3"
                disabled={rejectMutate.isPending}
                onClick={() =>
                  rejectMutate.mutate({ data: { advanceId: row.original.id } })
                }
              >
                <XCircle className="size-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">
                  Reject
                </span>
              </Button>
            </div>
          );
        },
      },
    ],
    [rejectMutate],
  );

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Requests"
          value={advances.length.toString()}
          subtext="Advances in history"
          icon={Receipt}
          color="blue"
        />
        <KPICard
          title="Pending Approval"
          value={`PKR ${Math.round(pendingSum).toLocaleString()}`}
          subtext={`${pendingCount} request${pendingCount !== 1 ? "s" : ""} waiting`}
          icon={Clock}
          color="amber"
        />
        <KPICard
          title="Total Paid Out"
          value={`PKR ${Math.round(approvedSum).toLocaleString()}`}
          subtext="Approved & Deducted"
          icon={CheckCircle2}
          color="emerald"
        />
        <KPICard
          title="Grand Total"
          value={`PKR ${Math.round(totalSum).toLocaleString()}`}
          subtext="All time advance value"
          icon={TrendingUp}
          color="violet"
        />
      </div>

      {/* ── DataTable ─────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filteredAdvances}
        showSearch
        searchPlaceholder="Search employee or code..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        showViewOptions={false}
        pageSize={7}
        emptyState={
          <GenericEmpty
            icon={HREmptyIllustration}
            title="No results found"
            description="No salary advances matching your search."
          />
        }
      />

      <ApproveAdvanceDialog
        open={!!approveId}
        onOpenChange={(open) => !open && setApproveId(null)}
        advanceId={approveId}
        amount={approveAmount}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

type KPIColor = "blue" | "emerald" | "amber" | "violet" | "rose";

const kpiColorMap: Record<KPIColor, { bg: string; iconBg: string; icon: string; value: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30", iconBg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600", value: "text-blue-700 dark:text-blue-400" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600", value: "text-emerald-700 dark:text-emerald-400" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600", value: "text-amber-700 dark:text-amber-400" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/30", iconBg: "bg-violet-100 dark:bg-violet-900/40", icon: "text-violet-600", value: "text-violet-700 dark:text-violet-400" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600", value: "text-rose-700 dark:text-rose-400" },
};

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
      <p className={cn("text-xl font-black tracking-tight leading-tight mb-1", c.value)}>
        {value}
      </p>
      <p className="text-[10px] font-medium text-muted-foreground/70">{subtext}</p>
    </div>
  );
}
