"use client";

import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { getMonthlyPayrollTableFn } from "@/server-functions/hr/payroll/dashboard-fn";
import {
  format,
  startOfMonth,
  addDays,
  parseISO,
  isAfter,
  isBefore,
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
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  AlertTriangle,
  AlertCircle,
  ClockAlert,
  CalendarX2,
  TriangleAlert,
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
import { HREmptyIllustration } from "@/components/illustrations/HREmptyIllustration";
import { cn } from "@/lib/utils";
import { getPendingApprovalCountsFn } from "@/server-functions/hr/get-pending-approval-counts-fn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Types ──────────────────────────────────────────────────────────────────

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
  unmarkedDays: number;
  hasPendingOvertimeApprovals: boolean;
  hasPendingLeaveApprovals: boolean;
};

// ── Cycle helpers ──────────────────────────────────────────────────────────

function getPayrollCycleDates(monthStr: string) {
  const payrollMonthDate = parseISO(`${monthStr}-01`);
  const cycleEnd = addDays(startOfMonth(payrollMonthDate), 14);
  const cycleStart = addDays(startOfMonth(addDays(payrollMonthDate, -1)), 15);
  return { cycleStart, cycleEnd };
}

type Warning = { label: string; detail: string };

function getEmployeeReadiness(
  employee: EmployeePayrollRow & { missedLastMonth: boolean },
  cycleEnd: Date,
  cycleStart: Date,
  now: Date,
): {
  isCycleOpen: boolean;
  joinedMidCycle: boolean;
  daysUntilEligible: number;
  cycleCloseDate: string;
  warnings: Warning[];
  isReadyToProcess: boolean;
} {
  const isCycleOpen = isAfter(now, cycleEnd);
  const joiningDate = parseISO(employee.joiningDate);
  const joinedMidCycle =
    isAfter(joiningDate, cycleStart) && isBefore(joiningDate, cycleEnd);
  const daysUntilEligible = isCycleOpen ? 0 : differenceInDays(cycleEnd, now) + 1;
  const cycleCloseDate = format(cycleEnd, "dd MMM yyyy");

  const warnings: Warning[] = [];

  if (employee.unmarkedDays > 0) {
    warnings.push({
      label: `${employee.unmarkedDays} Unmarked Day${employee.unmarkedDays !== 1 ? "s" : ""}`,
      detail: `${employee.unmarkedDays} working day${employee.unmarkedDays !== 1 ? "s have" : " has"} no attendance entry. These will count as absent and trigger a full-day salary deduction. Go to Attendance and mark each missing day before processing.`,
    });
  }
  if (employee.hasPendingOvertimeApprovals) {
    warnings.push({
      label: "Overtime Awaiting Approval",
      detail:
        "One or more overtime entries in this cycle are still pending admin sign-off. Unapproved overtime is excluded from the payslip. Approve or reject in the Attendance module first.",
    });
  }
  if (employee.hasPendingLeaveApprovals) {
    warnings.push({
      label: "Leave Request Not Yet Approved",
      detail:
        "A leave request in this cycle is still pending. Until approved, it is treated as unpaid leave, which triggers a conveyance deduction. Resolve it in Attendance → Approvals before generating the slip.",
    });
  }

  return {
    isCycleOpen,
    joinedMidCycle,
    daysUntilEligible,
    cycleCloseDate,
    warnings,
    isReadyToProcess: isCycleOpen && employee.isEligible,
  };
}

// ── Warning tooltip body (reused in two places) ────────────────────────────

function WarningTooltipBody({ warnings, footer }: { warnings: Warning[]; footer?: string }) {
  return (
    <div className="space-y-3 max-w-[280px]">
      {warnings.map((w, i) => (
        <div key={i} className="space-y-0.5">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertCircle className="size-3 shrink-0" /> {w.label}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed pl-4">
            {w.detail}
          </p>
        </div>
      ))}
      {footer && (
        <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-2 leading-relaxed">
          {footer}
        </p>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

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
      getMonthlyPayrollTableFn({ data: { month, limit, offset: pageIndex * limit } }),
  });

  const employees = data.employees as (EmployeePayrollRow & { missedLastMonth: boolean })[];
  const { cycleStart, cycleEnd } = getPayrollCycleDates(month);
  const now = new Date();
  const completionPct = Math.round(
    (data.payslipsGeneratedCount / Math.max(1, data.activeCount)) * 100,
  );
  const totalPages = Math.ceil(data.totalEmployees / limit);

  if (employees.length === 0 && pageIndex === 0 && !globalFilter) {
    return (
      <GenericEmpty
        icon={HREmptyIllustration}
        title="No Employees Found"
        description="There are no active employees to process payroll for this month."
        ctaText="Go to Employees"
        onAddChange={() => router.navigate({ to: "/hr/employees" })}
      />
    );
  }

  const columns: ColumnDef<EmployeePayrollRow & { missedLastMonth: boolean }>[] = useMemo(
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
                {row.original.firstName[0]}{row.original.lastName[0]}
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
              PKR {Math.round(parseFloat(row.original.standardSalary || "0")).toLocaleString()}
            </span>
            <span className="text-[10px] text-muted-foreground">Basic</span>
          </div>
        ),
      },
      // ── New dedicated Cycle Status column ─────────────────────────────
      {
        id: "cycle_status",
        header: "Cycle Status",
        cell: ({ row }) => {
          const { isCycleOpen, daysUntilEligible, cycleCloseDate, warnings, joinedMidCycle } =
            getEmployeeReadiness(row.original, cycleEnd, cycleStart, now);

          if (!row.original.isEligible) {
            return (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
                  Not Eligible
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Joined after cycle end
                </span>
              </div>
            );
          }

          if (!isCycleOpen) {
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <ClockAlert className="size-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    {daysUntilEligible} day{daysUntilEligible !== 1 ? "s" : ""} remaining
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  Cycle closes {cycleCloseDate}
                </span>
              </div>
            );
          }

          if (warnings.length === 0) {
            return (
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="size-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    Ready to process
                  </span>
                </div>
                {joinedMidCycle && (
                  <span className="text-[10px] text-blue-600 font-medium">
                    Mid-cycle joiner
                  </span>
                )}
              </div>
            );
          }

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col gap-0.5 cursor-help w-fit">
                    <div className="flex items-center gap-1">
                      <TriangleAlert className="size-3 text-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                        {warnings.length} issue{warnings.length !== 1 ? "s" : ""} — processable
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      Hover for details
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="p-3 bg-background text-foreground border border-border shadow-lg">
                  <p className="text-xs font-bold text-foreground mb-2">
                    Cycle open — but needs attention:
                  </p>
                  <WarningTooltipBody
                    warnings={warnings}
                    footer="Processing now will use current data. These issues may affect net salary accuracy."
                  />
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Payslip",
        cell: ({ row }) => {
          if (row.original.hasPayslip) {
            return (
              <div className="flex flex-col gap-0.5">
                <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider w-fit">
                  Generated
                </Badge>
                <span className="text-[10px] font-bold text-emerald-600">
                  PKR {Math.round(parseFloat(row.original.netSalary)).toLocaleString()}
                </span>
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-1">
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider w-fit"
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
          const { isReadyToProcess, daysUntilEligible, cycleCloseDate, warnings } =
            getEmployeeReadiness(emp, cycleEnd, cycleStart, now);

          return (
            <div className="flex items-center gap-2 justify-end">
              {emp.isEligible && (
                <>
                  {emp.hasPayslip ? (
                    // Revise — always unlocked
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-3"
                            onClick={() => { setSelectedEmployeeId(emp.id); setIsCalculatorOpen(true); }}
                          >
                            <Edit className="size-3" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Revise</span>
                          </Button>
                        </TooltipTrigger>
                        {warnings.length > 0 && (
                          <TooltipContent side="left" className="p-3 bg-background text-foreground border border-border shadow-lg">

                            <p className="text-xs font-bold text-amber-600 mb-2">
                              Revising with open issues:
                            </p>
                            <WarningTooltipBody
                              warnings={warnings}
                              footer="The revised slip will reflect current attendance data."
                            />
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ) : isReadyToProcess ? (
                    // Cycle open — process
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="default"
                            className={cn(
                              "h-8 gap-1.5 px-3",
                              warnings.length > 0 &&
                              "border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400",
                            )}
                            onClick={() => { setSelectedEmployeeId(emp.id); setIsCalculatorOpen(true); }}
                          >
                            {warnings.length > 0
                              ? <AlertCircle className="size-3 text-amber-500" />
                              : <Calculator className="size-3" />}
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              Process
                            </span>
                          </Button>
                        </TooltipTrigger>
                        {warnings.length > 0 && (
                          <TooltipContent side="left" className="p-3 max-w-[230px] bg-background text-foreground border border-border shadow-lg">
                            <p className="text-xs font-bold text-foreground mb-2">
                              Cycle is open — {warnings.length} item{warnings.length !== 1 ? "s need" : " needs"} attention:
                            </p>
                            <WarningTooltipBody
                              warnings={warnings}
                              footer="You can still generate the slip. Unresolved items may cause incorrect deductions or missing overtime pay."
                            />
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    // Locked — cycle not yet closed
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1.5 px-3 opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <ClockAlert className="size-3" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">
                              {daysUntilEligible}d left
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="p-3 max-w-[230px]">
                          <div className="flex items-start gap-2">
                            <CalendarX2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold">Pay cycle still in progress</p>
                              <p className="text-[11px] text-muted-foreground leading-relaxed">
                                This employee's payslip cannot be generated until the cycle closes on{" "}
                                <strong className="text-foreground">{cycleCloseDate}</strong>.{" "}
                                Come back in{" "}
                                <strong className="text-foreground">
                                  {daysUntilEligible} day{daysUntilEligible !== 1 ? "s" : ""}
                                </strong>
                                .
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
                asChild
                title="View Payroll History"
              >
                <Link to="/hr/payroll/employee/$employeeId" params={{ employeeId: emp.id }}>
                  <Eye className="size-4" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [cycleEnd, cycleStart, now],
  );

  const table = useReactTable({
    data: employees,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="space-y-6">
      {/* ── Pending Approvals Warning ─────────────────────────────────── */}
      <PendingApprovalsWarning />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search employee or code..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-11 bg-card shadow-xs border-muted-foreground/20 rounded-xl"
          />
        </div>
        <DatePicker
          date={selectedDate}
          onChange={(date) => { if (date) { setSelectedDate(date); setPageIndex(0); } }}
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
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/40">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 py-4 h-12 first:pl-6 last:pr-6"
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3.5 text-sm first:pl-6 last:pr-6">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-64">
                    <GenericEmpty
                      icon={HREmptyIllustration}
                      title="No results found"
                      description="Try adjusting your search or filters."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border/40 bg-muted/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Page {pageIndex + 1} of {Math.max(1, totalPages)}
            <span className="mx-2 opacity-40">•</span>
            {data.totalEmployees} Total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
              className="h-8 px-4 rounded-lg text-[10px] uppercase font-black tracking-widest"
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setPageIndex((p) => p + 1)}
              disabled={pageIndex >= totalPages - 1}
              className="h-8 px-4 rounded-lg text-[10px] uppercase font-black tracking-widest"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <SalaryCalculatorSheet
        isOpen={isCalculatorOpen}
        onClose={() => { setIsCalculatorOpen(false); setSelectedEmployeeId(null); }}
        employeeId={selectedEmployeeId}
        month={month}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────

type KPIColor = "blue" | "emerald" | "amber" | "violet" | "rose";

const kpiColorMap: Record<KPIColor, { bg: string; iconBg: string; icon: string; value: string; bar: string }> = {
  blue: { bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20", iconBg: "bg-blue-100 dark:bg-blue-500/20", icon: "text-blue-600 dark:text-blue-400", value: "text-blue-700 dark:text-blue-400", bar: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20", iconBg: "bg-emerald-100 dark:bg-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-400", value: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  amber: { bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20", iconBg: "bg-amber-100 dark:bg-amber-500/20", icon: "text-amber-600 dark:text-amber-400", value: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  violet: { bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-500/20", iconBg: "bg-violet-100 dark:bg-violet-500/20", icon: "text-violet-600 dark:text-violet-400", value: "text-violet-700 dark:text-violet-400", bar: "bg-violet-500" },
  rose: { bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-200/60 dark:border-rose-500/20", iconBg: "bg-rose-100 dark:bg-rose-500/20", icon: "text-rose-600 dark:text-rose-400", value: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500" },
};

function KPICard({ title, value, subtext, icon: Icon, color = "blue", progress }: {
  title: string; value: string; subtext: string; icon: any; color?: KPIColor; progress?: number;
}) {
  const c = kpiColorMap[color];
  return (
    <div className={cn("rounded-2xl border p-4 transition-all hover:shadow-md", c.bg)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("p-2 rounded-xl", c.iconBg)}>
          <Icon className={cn("size-4", c.icon)} />
        </div>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
      <p className={cn("text-xl font-black tracking-tight leading-tight mb-1", c.value)}>{value}</p>
      <p className="text-[10px] font-medium text-muted-foreground/70">{subtext}</p>
      {progress !== undefined && (
        <div className="mt-2.5 h-1 bg-black/10 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </div>
  );
}

function PendingApprovalsWarning() {
  const { data: counts } = useQuery({
    queryKey: ["pending-approval-counts"],
    queryFn: () => getPendingApprovalCountsFn(),
    staleTime: 30_000,
  });

  if (!counts || counts.total === 0) return null;

  const parts: string[] = [];
  if (counts.leave > 0) parts.push(`${counts.leave} leave request${counts.leave !== 1 ? "s" : ""}`);
  if (counts.overtime > 0) parts.push(`${counts.overtime} overtime request${counts.overtime !== 1 ? "s" : ""}`);
  if (counts.advances > 0) parts.push(`${counts.advances} salary advance${counts.advances !== 1 ? "s" : ""}`);

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800/30 animate-in fade-in duration-300">
      <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/40">
        <AlertTriangle className="size-4 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Pending Approvals Detected</p>
        <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
          {parts.join(", ")} awaiting admin decision. Resolve these before generating payslips to ensure accurate deductions and Bradford Factor calculations.
        </p>
      </div>
      <Link to="/hr/approvals">
        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase tracking-wider border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/40 shrink-0">
          Review Approvals
        </Button>
      </Link>
    </div>
  );
}