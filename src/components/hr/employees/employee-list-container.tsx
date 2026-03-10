import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  TrendingUp,
  Wallet,
  UserCheck,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { EmployeesTable } from "./employees-table";
import { AddEmployeeSheet } from "./add-employee-sheet";
import { cn } from "@/lib/utils";

// ── Stat card ──────────────────────────────────────────────────────────────

const StatCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  sub: string;
  accent: "blue" | "emerald" | "violet";
}) => {
  const accents = {
    blue: {
      wrap: "border-blue-100 dark:border-blue-900/40",
      iconWrap: "bg-blue-100 dark:bg-blue-950/60",
      icon: "text-blue-600 dark:text-blue-400",
      strip: "bg-blue-500",
    },
    emerald: {
      wrap: "border-emerald-100 dark:border-emerald-900/40",
      iconWrap: "bg-emerald-100 dark:bg-emerald-950/60",
      icon: "text-emerald-600 dark:text-emerald-400",
      strip: "bg-emerald-500",
    },
    violet: {
      wrap: "border-violet-100 dark:border-violet-900/40",
      iconWrap: "bg-violet-100 dark:bg-violet-950/60",
      icon: "text-violet-600 dark:text-violet-400",
      strip: "bg-violet-500",
    },
  };
  const a = accents[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md",
        a.wrap
      )}
    >
      {/* Top accent strip */}
      <div className={cn("absolute top-0 left-5 right-5 h-[2px] rounded-b-full opacity-60", a.strip)} />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-3xl font-black tracking-tight text-foreground">
            {value}
          </p>
          <p className="text-xs text-muted-foreground">{sub}</p>
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0", a.iconWrap)}>
          <Icon className={cn("size-5", a.icon)} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
};

// ── Container ──────────────────────────────────────────────────────────────

export const EmployeeListContainer = () => {
  const [openAddSheet, setOpenAddSheet] = useState(false);

  const { data: employees } = useSuspenseQuery({
    queryKey: ["employees"],
    queryFn: getEmployeesFn,
  });

  const activeCount = employees.filter((e) => e.status === "active").length;
  const inactiveCount = employees.length - activeCount;

  const newHires = employees.filter(
    (e) =>
      new Date(e.joiningDate).getMonth() === new Date().getMonth() &&
      new Date(e.joiningDate).getFullYear() === new Date().getFullYear()
  ).length;

  const totalPayroll = employees
    .filter((e) => e.status === "active")
    .reduce((acc, curr) => acc + parseFloat(curr.standardSalary || "0"), 0);

  return (
    <div className="space-y-6">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-card px-6 py-5">
        <div className="space-y-0.5">
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2.5">
            <Users className="size-5 text-primary" />
            Employee Directory
          </h1>
          <p className="text-xs text-muted-foreground font-medium">
            {employees.length} employees &middot; {activeCount} active
            {inactiveCount > 0 && (
              <span className="text-rose-500 dark:text-rose-400">
                {" "}&middot; {inactiveCount} inactive
              </span>
            )}
          </p>
        </div>

        <Button
          onClick={() => setOpenAddSheet(true)}
          className="sm:w-auto gap-2 h-9 font-bold text-sm"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Add Employee
        </Button>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={UserCheck}
          accent="blue"
          label="Total Employees"
          value={employees.length}
          sub={`${activeCount} active · ${inactiveCount} inactive`}
        />
        <StatCard
          icon={UserPlus}
          accent="emerald"
          label="New Hires This Month"
          value={newHires}
          sub={newHires === 0 ? "No new hires yet" : "Recently onboarded"}
        />
        <StatCard
          icon={Wallet}
          accent="violet"
          label="Est. Monthly Payroll"
          value={
            <span className="text-2xl">
              <span className="text-base font-bold text-muted-foreground mr-1">PKR</span>
              {totalPayroll.toLocaleString()}
            </span>
          }
          sub="Active employees only"
        />
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
          <div>
            <p className="text-sm font-bold">All Employees</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage roles, compensation, and team details.
            </p>
          </div>
          <TrendingUp className="size-4 text-muted-foreground/40" />
        </div>
        <div className="p-4">
          <EmployeesTable data={employees} />
        </div>
      </div>

      <AddEmployeeSheet open={openAddSheet} onOpenChange={setOpenAddSheet} />
    </div>
  );
};