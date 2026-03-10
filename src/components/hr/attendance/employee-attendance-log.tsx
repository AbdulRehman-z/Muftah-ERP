import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeeAttendanceLogFn } from "@/server-functions/hr/attendance/get-employee-attendance-log-fn";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  User,
  Briefcase,
  Hash,
  CalendarClock,
  TrendingUp,
} from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useParams } from "@tanstack/react-router";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";

type Props = {
  employeeId?: string;
  month?: string; // YYYY-MM
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
};

type DayRow = {
  idx: number;
  dateStr: string;
  day: Date;
  isWeekend: boolean;
  record: any | undefined;
  standardDutyHours: number;
  hasShift2: boolean;
};

export const EmployeeAttendanceLog = ({
  employeeId: propId,
  month,
  startDate: propStartDate,
  endDate: propEndDate,
  showHeader = true,
}: Props & { showHeader?: boolean }) => {
  const params = useParams({ strict: false });
  // @ts-ignore - we know employeeId might exist
  const routeEmployeeId = params.employeeId;
  const employeeId = propId || routeEmployeeId;

  if (!employeeId) return null;

  const today = new Date();
  const currentMonth = month || format(today, "yyyy-MM");
  const startDate =
    propStartDate ||
    format(startOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");
  const endDate =
    propEndDate ||
    format(endOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");

  const { data } = useSuspenseQuery({
    queryKey: ["employee-attendance-log", employeeId, startDate, endDate],
    queryFn: () =>
      getEmployeeAttendanceLogFn({ data: { employeeId, startDate, endDate } }),
    gcTime: 0,
  });

  const { employee, records } = data;

  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  const hasShift2 = records.some((r: any) => r.checkIn2);

  const stats = {
    totalDuty: records
      .reduce((acc: number, r: any) => acc + (parseFloat(r.dutyHours || "0") || 0), 0)
      .toFixed(1),
    totalOvertime: records
      .reduce((acc: number, r: any) => {
        if (r.overtimeStatus === "approved") {
          return acc + (parseFloat(r.overtimeHours || "0") || 0);
        }
        return acc;
      }, 0)
      .toFixed(1),
    totalUndertime: records
      .reduce((acc: number, r: any) => {
        const duty = parseFloat(r.dutyHours || "0");
        const standard = employee.standardDutyHours || 8;
        if (r.status === "present" && duty < standard) {
          return acc + (standard - duty);
        }
        return acc;
      }, 0)
      .toFixed(1),
    daysPresent: records.filter(
      (r: any) => r.status === "present" || r.status === "half_day",
    ).length,
  };

  // Build row data for DataTable
  const tableRows: DayRow[] = days.map((day, idx) => ({
    idx,
    dateStr: format(day, "yyyy-MM-dd"),
    day,
    isWeekend: format(day, "E") === "Sun",
    record: records.find((r: any) => r.date === format(day, "yyyy-MM-dd")),
    standardDutyHours: employee.standardDutyHours || 8,
    hasShift2,
  }));

  const columns: ColumnDef<DayRow>[] = [
    {
      id: "no",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {row.original.idx + 1}
        </span>
      ),
    },
    {
      id: "date",
      header: "Date",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs">
            {format(row.original.day, "dd MMM yyyy")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(row.original.day, "EEEE")}
          </span>
        </div>
      ),
    },
    {
      id: "shift1",
      header: "Shift 1",
      cell: ({ row }) => {
        const record = row.original.record;
        return record?.checkIn ? (
          <span className="flex items-center gap-1 text-xs">
            <span className="text-emerald-600 font-semibold">{record.checkIn}</span>
            <span className="text-muted-foreground">–</span>
            <span className="text-rose-600 font-semibold">{record.checkOut}</span>
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        );
      },
    },
    ...(hasShift2
      ? [
        {
          id: "shift2",
          header: "Shift 2",
          cell: ({ row }: { row: any }) => {
            const record = row.original.record;
            return record?.checkIn2 ? (
              <span className="flex items-center gap-1 text-xs">
                <span className="text-emerald-600 font-semibold">{record.checkIn2}</span>
                <span className="text-muted-foreground">–</span>
                <span className="text-rose-600 font-semibold">{record.checkOut2}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-xs">—</span>
            );
          },
        } as ColumnDef<DayRow>,
      ]
      : []),
    {
      id: "duty",
      header: "Duty (h)",
      cell: ({ row }) => {
        const record = row.original.record;
        const duty = parseFloat(record?.dutyHours || "0");
        const standard = row.original.standardDutyHours;
        const isUnder = duty < standard && record?.status === "present";
        return (
          <div className="flex flex-col">
            <span className="font-semibold text-xs tabular-nums">
              {record?.dutyHours || "0.00"}
            </span>
            {isUnder && (
              <span className="text-[10px] text-rose-500 font-bold tabular-nums">
                −{formatDuration(standard - duty)}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "overtime",
      header: "OT (h)",
      cell: ({ row }) => {
        const record = row.original.record;
        if (!record) return <span className="text-muted-foreground text-xs">—</span>;

        const ot = parseFloat(record.overtimeHours || "0");
        if (ot <= 0) return <span className="text-muted-foreground text-xs">—</span>;

        if (record.overtimeStatus === "approved") {
          return (
            <div className="flex flex-col">
              <span className="text-emerald-600 font-bold text-xs tabular-nums">
                +{record.overtimeHours}
              </span>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">
                Approved
              </span>
            </div>
          );
        }

        if (record.overtimeStatus === "pending") {
          return (
            <div className="flex flex-col">
              <span className="text-amber-500 font-bold text-xs tabular-nums">
                +{record.overtimeHours}
              </span>
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-tighter">
                Pending Admin
              </span>
            </div>
          );
        }

        return (
          <div className="flex flex-col">
            <span className="text-rose-600 font-bold text-xs tabular-nums line-through opacity-70">
              +{record.overtimeHours}
            </span>
            <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">
              Rejected
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { record, isWeekend } = row.original;
        if (record) {
          const statusColors: Record<string, string> = {
            present: "bg-emerald-50 text-emerald-700 border-emerald-200",
            absent: "bg-rose-50 text-rose-700 border-rose-200",
            half_day: "bg-amber-50 text-amber-700 border-amber-200",
            leave: "bg-indigo-50 text-indigo-700 border-indigo-200",
          };
          return (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold uppercase px-2 py-0",
                statusColors[record.status] || "",
              )}
            >
              {record.status.replace("_", " ")}
            </Badge>
          );
        }
        if (isWeekend) {
          return (
            <span className="text-[10px] text-muted-foreground font-semibold uppercase">
              Weekend
            </span>
          );
        }
        return (
          <Badge
            variant="outline"
            className="text-[10px] border-slate-300 text-slate-500 font-bold uppercase px-2 py-0"
          >
            Pending
          </Badge>
        );
      },
    },
    {
      id: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-xs italic text-muted-foreground">
          {row.original.record?.notes || ""}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header / Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {showHeader && (
          <div className="md:col-span-6 lg:col-span-5 relative group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-[1.7] group-hover:rotate-0">
              <User size={120} />
            </div>
            <div className="relative p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="shrink-0 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                <User size={40} />
              </div>
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-foreground truncate">
                    {employee.firstName} {employee.lastName}
                  </h2>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-1">
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      <Briefcase size={14} className="text-primary" />{" "}
                      {employee.designation}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-mono bg-muted/50 px-2 py-0.5 rounded-md text-muted-foreground border">
                      <Hash size={12} /> {employee.employeeCode}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <Badge
                    variant="outline"
                    className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold tracking-wider uppercase"
                  >
                    {employee.employmentType?.replace("_", " ") || "FULL TIME"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "grid grid-cols-2 lg:grid-cols-4 gap-4",
            showHeader ? "md:col-span-6 lg:col-span-7" : "md:col-span-12",
          )}
        >
          <StatCard color="emerald" icon={Clock} label="Total Duty" value={stats.totalDuty} unit="hrs" />
          <StatCard color="amber" icon={CalendarClock} label="Overtime" value={stats.totalOvertime} unit="hrs" />
          <StatCard color="rose" icon={Clock} label="Undertime" value={stats.totalUndertime} unit="hrs" />
          <StatCard color="blue" icon={TrendingUp} label="Days Present" value={String(stats.daysPresent)} unit="days" />
        </div>
      </div>

      {/* ── Attendance DataTable ─────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={tableRows}
        showSearch={false}
        showViewOptions={false}
        pageSize={7}
      />
    </div>
  );
};

// ── Stat Card ──────────────────────────────────────────────────────────────

type StatColor = "emerald" | "amber" | "rose" | "blue";

const statColorMap: Record<StatColor, { bg: string; iconBg: string; icon: string; value: string; text: string }> = {
  emerald: { bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60", iconBg: "bg-emerald-100 dark:bg-emerald-900/40", icon: "text-emerald-600", value: "text-emerald-700 dark:text-emerald-400", text: "text-emerald-600/70" },
  amber: { bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60", iconBg: "bg-amber-100 dark:bg-amber-900/40", icon: "text-amber-600", value: "text-amber-700 dark:text-amber-400", text: "text-amber-600/70" },
  rose: { bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60", iconBg: "bg-rose-100 dark:bg-rose-900/40", icon: "text-rose-600", value: "text-rose-700 dark:text-rose-400", text: "text-rose-600/70" },
  blue: { bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60", iconBg: "bg-blue-100 dark:bg-blue-900/40", icon: "text-blue-600", value: "text-blue-700 dark:text-blue-400", text: "text-blue-600/70" },
};

function StatCard({
  color,
  icon: Icon,
  label,
  value,
  unit,
}: {
  color: StatColor;
  icon: any;
  label: string;
  value: string;
  unit: string;
}) {
  const c = statColorMap[color];
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-md", c.bg)}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", c.iconBg)}>
        <Icon size={18} className={c.icon} />
      </div>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", c.text)}>
        {label}
      </p>
      <p className={cn("text-2xl font-black tracking-tight leading-tight", c.value)}>
        {value}
        <span className="text-sm font-bold ml-1 opacity-60">{unit}</span>
      </p>
    </div>
  );
}
