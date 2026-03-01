import { useSuspenseQuery } from "@tanstack/react-query";
import { getMonthlyPayrollTableFn } from "@/server-functions/hr/payroll/dashboard-fn";
import {
  format,
  startOfMonth,
  addDays,
  parseISO,
  isAfter,
  differenceInDays,
} from "date-fns";
import { useState, useMemo } from "react";
import { DatePicker } from "@/components/custom/date-picker";
import {
  ColumnDef,
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SalaryCalculatorSheet } from "@/components/hr/payroll/salary-calculator-sheet";
import {
  Calculator,
  Search,
  Eye,
  Edit,
  UserIcon,
  CheckCircle2,
  Clock,
  CalendarCheck,
  DollarSign,
  Users,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link, useRouter } from "@tanstack/react-router";
import { GenericEmpty } from "../../custom/empty";
import { cn } from "@/lib/utils";

export type EmployeePayrollRow = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string | null;
  joiningDate: string;
  basicSalary: string;
  standardSalary: string | null;
  hasPayslip: boolean;
  payslipId: string;
  netSalary: string;
  status: string;
  isEligible: boolean;
};

// ── Salary cycle helpers ─────────────────────────────────────────────────
// Each payroll month runs from the 16th of the previous month to the 15th of
// the selected month. Payslips can only be generated AFTER the 15th.
function getPayrollCycleDates(monthStr: string) {
  const payrollMonthDate = parseISO(`${monthStr}-01`);
  const cycleEnd = addDays(startOfMonth(payrollMonthDate), 14); // 15th
  const cycleStart = addDays(startOfMonth(addDays(payrollMonthDate, -1)), 15); // 16th of prev month
  return { cycleStart, cycleEnd };
}

export function PayrollContainer() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const month = format(selectedDate, "yyyy-MM");
  const [pageIndex, setPageIndex] = useState(0);

  const limit = 7;
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState("");

  const { data } = useSuspenseQuery({
    queryKey: ["payroll-dashboard", month, pageIndex],
    queryFn: () =>
      getMonthlyPayrollTableFn({
        data: { month, limit, offset: pageIndex * limit },
      }),
  });

  const employees = data.employees as (EmployeePayrollRow & {
    missedLastMonth: boolean;
  })[];

  const { cycleStart, cycleEnd } = getPayrollCycleDates(month);
  const now = new Date();
  const isCycleOpen = isAfter(now, cycleEnd); // 15th has passed → processing allowed
  const daysUntilEligible = isCycleOpen ? 0 : differenceInDays(cycleEnd, now) + 1;
  const nextEligibleDate = format(cycleEnd, "dd MMM yyyy");

  if (employees.length === 0 && pageIndex === 0 && !globalFilter) {
    return (
      <GenericEmpty
        icon={UserIcon}
        title="No Employees Found"
        description="There are no active employees to process payroll for this month. Ensure employees are added and active in the system."
        ctaText="Go to Employees"
        onAddChange={() => {
          router.navigate({ to: "/hr/employees" });
        }}
      />
    );
  }

  const columns: ColumnDef<
    EmployeePayrollRow & { missedLastMonth: boolean }
  >[] = useMemo(
    () => [
      {
        accessorKey: "employeeCode",
        header: "Code",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {row.original.employeeCode}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        header: "Employee",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm">
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {row.original.firstName[0]}
                {row.original.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">
                {row.original.firstName} {row.original.lastName}
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-medium">
                {row.original.designation}
              </span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "standardSalary",
        header: "Std. Salary",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-bold text-sm">
              PKR{" "}
              {Math.round(
                parseFloat(row.original.standardSalary || "0"),
              ).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">Basic</span>
          </div>
        ),
      },
      {
        accessorKey: "isEligible",
        header: "Eligible",
        cell: ({ row }) =>
          row.original.isEligible ? (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 h-5 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
            >
              ✓ Yes
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-[10px] px-2 py-0.5 h-5 bg-rose-50 text-rose-700 border-rose-200 font-bold"
            >
              ✗ No
            </Badge>
          ),
      },
      {
        accessorKey: "status",
        header: "Payslip Status",
        cell: ({ row }) => {
          if (row.original.hasPayslip) {
            return (
              <div className="flex flex-col gap-1">
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider w-fit">
                  Generated
                </Badge>
                <span className="text-[10px] font-bold text-emerald-600">
                  PKR{" "}
                  {Math.round(
                    parseFloat(row.original.netSalary),
                  ).toLocaleString()}
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground hover:bg-muted border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider w-fit"
              >
                Pending
              </Badge>
              {row.original.missedLastMonth && (
                <Badge
                  variant="outline"
                  className="text-[9px] px-1 h-4 bg-amber-50 text-amber-700 border-amber-200 border-dashed animate-pulse w-fit"
                >
                  Arrears Potential
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const emp = row.original;
          return (
            <div className="flex items-center gap-2 justify-end">
              {emp.isEligible && (
                <Button
                  size="sm"
                  variant={emp.hasPayslip ? "outline" : "default"}
                  className="h-8 gap-1.5 px-3"
                  disabled={!isCycleOpen && !emp.hasPayslip}
                  title={
                    !isCycleOpen && !emp.hasPayslip
                      ? `Cycle ends on ${nextEligibleDate}`
                      : ""
                  }
                  onClick={() => {
                    setSelectedEmployeeId(emp.id);
                    setIsCalculatorOpen(true);
                  }}
                >
                  {emp.hasPayslip ? (
                    <>
                      <Edit className="size-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        Revise
                      </span>
                    </>
                  ) : (
                    <>
                      <Calculator className="size-3" />
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        Process
                      </span>
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
                asChild
                title="View History"
              >
                <Link
                  to={`/hr/payroll/employee/$employeeId`}
                  params={{ employeeId: emp.id }}
                >
                  <Eye className="size-4" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [isCycleOpen, nextEligibleDate],
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  const totalPages = Math.ceil(data.totalEmployees / limit);
  const completionPct = Math.round(
    (data.payslipsGeneratedCount / Math.max(1, data.activeCount)) * 100,
  );

  return (
    <div className="space-y-6">
      {/* ── Cycle Status Banner ─────────────────────────────────────────── */}
      {!isCycleOpen ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800/30">
          <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40">
            <Clock className="size-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
              Payroll Processing Locked — Cycle Not Complete
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              The current pay period closes on{" "}
              <strong>{nextEligibleDate}</strong>. Payslips for{" "}
              <strong>{format(selectedDate, "MMMM yyyy")}</strong> can be
              generated after that date.{" "}
              <span className="font-bold">{daysUntilEligible} day{daysUntilEligible !== 1 ? "s" : ""} remaining.</span>
            </p>
          </div>
          <CalendarCheck className="size-5 text-amber-500 shrink-0" />
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800/30">
          <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              Payroll Cycle Open for{" "}
              <strong>{format(selectedDate, "MMMM yyyy")}</strong>
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Pay period:{" "}
              <strong>
                {format(cycleStart, "dd MMM")} – {format(cycleEnd, "dd MMM yyyy")}
              </strong>
              . Process payslips for all eligible employees.
            </p>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px] font-bold uppercase shrink-0">
            {completionPct}% Done
          </Badge>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search employee or code..."
            value={globalFilter ?? ""}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-10 h-11 bg-card shadow-xs border-muted-foreground/20 rounded-xl"
          />
        </div>
        <DatePicker
          date={selectedDate}
          onChange={(date) => {
            if (date) {
              setSelectedDate(date);
              setPageIndex(0);
            }
          }}
          placeholder="Select month"
          className="w-[180px]"
          formatStr="MMMM yyyy"
        />
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Base Payroll"
          value={`PKR ${Math.round(parseFloat(data.totalSalaryBudget)).toLocaleString()}`}
          subtext="Sum of all standard salaries"
          icon={DollarSign}
          color="blue"
        />
        <KPICard
          title="Net Paid & Generated"
          value={`PKR ${Math.round(parseFloat(data.totalNetProcessed)).toLocaleString()}`}
          subtext={`${data.payslipsGeneratedCount} slip${data.payslipsGeneratedCount !== 1 ? "s" : ""} finalized`}
          icon={CheckCircle2}
          color="emerald"
        />
        <KPICard
          title="Pending Base Salaries"
          value={`PKR ${Math.round(parseFloat(data.totalPendingGross)).toLocaleString()}`}
          subtext={`${data.activeCount - data.payslipsGeneratedCount} remaining`}
          icon={Clock}
          color="amber"
        />
        <KPICard
          title="Staff Progress"
          value={`${completionPct}%`}
          subtext={`${data.payslipsGeneratedCount} of ${data.activeCount} staff done`}
          icon={Users}
          color="violet"
          progress={completionPct}
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="border border-border/60 rounded-2xl bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="hover:bg-transparent border-b border-border/40"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 py-4 h-12 first:pl-6 last:pr-6"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="py-3.5 text-sm first:pl-6 last:pr-6"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-64">
                    <GenericEmpty
                      icon={Search}
                      title="No results found"
                      description="Try adjusting your search or filters."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/40 bg-muted/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Page {pageIndex + 1} of {Math.max(1, totalPages)}
            <span className="mx-2 opacity-40">•</span>
            {data.totalEmployees} Total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="h-8 px-4 rounded-lg text-[10px] uppercase font-black tracking-widest"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={pageIndex >= totalPages - 1}
              className="h-8 px-4 rounded-lg text-[10px] uppercase font-black tracking-widest"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Slide-over Calculator */}
      <SalaryCalculatorSheet
        isOpen={isCalculatorOpen}
        onClose={() => {
          setIsCalculatorOpen(false);
          setSelectedEmployeeId(null);
        }}
        employeeId={selectedEmployeeId}
        month={month}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

type KPIColor = "blue" | "emerald" | "amber" | "violet" | "rose";

const kpiColorMap: Record<KPIColor, { bg: string; iconBg: string; icon: string; value: string; bar: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/30", iconBg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600", value: "text-blue-700 dark:text-blue-400", bar: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600", value: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30", iconBg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600", value: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-950/20 border-violet-200/60 dark:border-violet-800/30", iconBg: "bg-violet-100 dark:bg-violet-900/40", icon: "text-violet-600", value: "text-violet-700 dark:text-violet-400", bar: "bg-violet-500" },
  rose: { bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-800/30", iconBg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600", value: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500" },
};

function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  color = "blue",
  progress,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  color?: KPIColor;
  progress?: number;
}) {
  const c = kpiColorMap[color];
  return (
    <div className={cn("rounded-2xl border p-4 transition-all hover:shadow-md", c.bg)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl", c.iconBg)}>
          <Icon className={cn("size-4", c.icon)} />
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
        {title}
      </p>
      <p className={cn("text-xl font-black tracking-tight leading-tight mb-1", c.value)}>
        {value}
      </p>
      <p className="text-[10px] font-medium text-muted-foreground/70">{subtext}</p>
      {progress !== undefined && (
        <div className="mt-2.5 h-1 bg-black/10 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", c.bar)}
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      )}
    </div>
  );
}
