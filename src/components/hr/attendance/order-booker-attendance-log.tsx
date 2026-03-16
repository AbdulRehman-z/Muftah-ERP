import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeeAttendanceLogFn } from "@/server-functions/hr/attendance/get-employee-attendance-log-fn";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User, Briefcase, Hash, TrendingUp, HandCoins, Receipt, MapPin, Zap, MoonStar } from "lucide-react";
import { useParams } from "@tanstack/react-router";
import { DataTable } from "@/components/custom/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cpu } from "@hugeicons/core-free-icons";

// ── Types ──────────────────────────────────────────────────────────────────

type Props = {
  employeeId?: string;
  month?: string;
  startDate?: string;
  endDate?: string;
  showHeader?: boolean;
};

type DayRow = {
  idx: number;
  dateStr: string;
  day: Date;
  isRestDay: boolean;
  record: any | undefined;
};

// ── Helper ─────────────────────────────────────────────────────────────────

function checkIsRestDay(dateStr: string, restDays: number[]): boolean {
  if (!restDays.length) return false;
  return restDays.includes(parseISO(dateStr).getDay());
}

// ── Component ──────────────────────────────────────────────────────────────

export const OrderBookerAttendanceLog = ({
  employeeId: propId,
  month,
  startDate: propStartDate,
  endDate: propEndDate,
  showHeader = true,
}: Props) => {
  const params = useParams({ strict: false });
  // @ts-ignore
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

  const restDays: number[] = (employee as any).restDays ?? [0];

  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  // Stats exclude rest days
  const workingRecords = records.filter(
    (r: any) => !checkIsRestDay(r.date, restDays),
  );

  const stats = {
    totalSales: workingRecords.reduce(
      (acc: number, r: any) => acc + (parseFloat(r.saleAmount || "0") || 0),
      0,
    ),
    totalRecovery: workingRecords.reduce(
      (acc: number, r: any) => acc + (parseFloat(r.recoveryAmount || "0") || 0),
      0,
    ),
    totalPetrol: workingRecords.reduce(
      (acc: number, r: any) => acc + (parseFloat(r.petrolAmount || "0") || 0),
      0,
    ),
    totalDynamicTA: workingRecords.reduce((acc: number, r: any) => {
      if (r.isCompanyVehicle) return acc;
      if (r.paymentMode === "per_km") {
        return (
          acc +
          (parseFloat(r.distanceKm || "0") * parseFloat(r.perKmRate || "0") ||
            0)
        );
      }
      return acc;
    }, 0),
    daysPresent: workingRecords.filter((r: any) => r.status === "present")
      .length,
  };

  const tableRows: DayRow[] = days.map((day, idx) => {
    const dateStr = format(day, "yyyy-MM-dd");
    return {
      idx,
      dateStr,
      day,
      isRestDay: checkIsRestDay(dateStr, restDays),
      record: records.find((r: any) => r.date === dateStr),
    };
  });

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
          <span className={cn("font-semibold text-xs", row.original.isRestDay && "text-muted-foreground/60")}>
            {format(row.original.day, "dd MMM yyyy")}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {format(row.original.day, "EEEE")}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const { record, isRestDay } = row.original;

        if (isRestDay) {
          return (
            <div className="flex items-center gap-1.5">
              <MoonStar className="size-3 text-slate-400" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">
                Rest Day
              </span>
            </div>
          );
        }

        if (record) {
          const statusColors: Record<string, string> = {
            present: "bg-emerald-50 text-emerald-700 border-emerald-200",
            absent: "bg-rose-50 text-rose-700 border-rose-200",
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
      id: "area",
      header: "Area Visited",
      cell: ({ row }) => {
        if (row.original.isRestDay)
          return <span className="text-muted-foreground/40 text-xs">—</span>;
        return (
          <span className="font-semibold text-xs text-foreground/80">
            {row.original.record?.areaVisited || "—"}
          </span>
        );
      },
    },
    {
      id: "vehicle",
      header: "Vehicle",
      cell: ({ row }) => {
        if (row.original.isRestDay)
          return <span className="text-muted-foreground/40 text-xs">—</span>;
        const r = row.original.record;
        if (!r) return <span className="text-muted-foreground text-xs">—</span>;
        return r.isCompanyVehicle ? (
          <Badge
            variant="outline"
            className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 text-[9px] font-black uppercase"
          >
            <HugeiconsIcon icon={Cpu} className="size-4" />
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-slate-50 text-slate-600 border-slate-200 gap-1 text-[9px] font-black uppercase"
          >
            <User size={10} /> Personal
          </Badge>
        );
      },
    },
    {
      id: "ta_petrol",
      header: "TA / Petrol",
      cell: ({ row }) => {
        if (row.original.isRestDay)
          return <span className="text-muted-foreground/40 text-xs">—</span>;
        const r = row.original.record;
        if (!r)
          return <span className="text-muted-foreground text-xs">—</span>;

        if (r.isCompanyVehicle) {
          const petrol = parseFloat(r.petrolAmount || "0");
          return (
            <div className="flex flex-col">
              <span className="text-indigo-700 font-black text-xs tabular-nums">
                PKR {petrol.toLocaleString()}
              </span>
              <span className="text-[9px] text-muted-foreground uppercase font-bold">
                Fuel Reimbursement
              </span>
            </div>
          );
        }

        const amount = (
          parseFloat(r.distanceKm || "0") * parseFloat(r.perKmRate || "0")
        ).toFixed(0);
        return (
          <div className="flex flex-col">
            <span className="text-emerald-700 font-bold text-xs tabular-nums">
              PKR {amount}
            </span>
            <span className="text-[9px] text-muted-foreground uppercase">
              {r.distanceKm}km @ {r.perKmRate}/km
            </span>
          </div>
        );
      },
    },
    {
      id: "sale",
      header: "Sale",
      cell: ({ row }) => {
        if (row.original.isRestDay)
          return <span className="text-muted-foreground/40 text-xs">—</span>;
        const sale = parseFloat(row.original.record?.saleAmount || "0");
        if (sale === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-emerald-700 font-bold text-xs tabular-nums">
            Rs {sale.toLocaleString()}
          </span>
        );
      },
    },
    {
      id: "recovery",
      header: "Recovery",
      cell: ({ row }) => {
        if (row.original.isRestDay)
          return <span className="text-muted-foreground/40 text-xs">—</span>;
        const rec = parseFloat(row.original.record?.recoveryAmount || "0");
        if (rec === 0)
          return <span className="text-muted-foreground text-xs">—</span>;
        return (
          <span className="text-indigo-700 font-bold text-xs tabular-nums">
            Rs {rec.toLocaleString()}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {showHeader && (
          <div className="md:col-span-6 lg:col-span-4 relative group overflow-hidden rounded-2xl border bg-card transition-all hover:shadow-md">
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
                {/* Rest days badge */}
                {restDays.length > 0 && (
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className="bg-slate-500/10 text-slate-600 border-slate-400/20 text-[10px] font-bold tracking-wider uppercase dark:text-slate-400"
                    >
                      <MoonStar className="size-2.5 mr-1" />
                      Off:{" "}
                      {restDays
                        .map(
                          (d) =>
                            ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d],
                        )
                        .join(", ")}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div
          className={cn(
            "grid grid-cols-2 lg:grid-cols-5 gap-4",
            showHeader ? "md:col-span-6 lg:col-span-8" : "md:col-span-12",
          )}
        >
          <StatCard
            color="emerald"
            icon={HandCoins}
            label="Total Sale"
            value={stats.totalSales.toLocaleString()}
            prefix="Rs"
          />
          <StatCard
            color="blue"
            icon={Receipt}
            label="Total Recovery"
            value={stats.totalRecovery.toLocaleString()}
            prefix="Rs"
          />
          <StatCard
            color="amber"
            icon={MapPin}
            label="Personal TA"
            value={stats.totalDynamicTA.toLocaleString()}
            prefix="PKR"
          />
          <StatCard
            color="indigo"
            icon={Zap}
            label="Petrol Reimb."
            value={stats.totalPetrol.toLocaleString()}
            prefix="PKR"
          />
          <StatCard
            color="emerald"
            icon={TrendingUp}
            label="Attendance"
            value={String(stats.daysPresent)}
            suffix="days"
          />
        </div>
      </div>

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

type StatColor = "emerald" | "amber" | "rose" | "blue" | "indigo";

const statColorMap: Record<StatColor, any> = {
  emerald: {
    bg: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/60",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    icon: "text-emerald-600",
    value: "text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-600/70",
  },
  amber: {
    bg: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/60",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    icon: "text-amber-600",
    value: "text-amber-700 dark:text-amber-400",
    text: "text-amber-600/70",
  },
  rose: {
    bg: "bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/60",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
    icon: "text-rose-600",
    value: "text-rose-700 dark:text-rose-400",
    text: "text-rose-600/70",
  },
  blue: {
    bg: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200/60",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    icon: "text-blue-600",
    value: "text-blue-700 dark:text-blue-400",
    text: "text-blue-600/70",
  },
  indigo: {
    bg: "bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/60",
    iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
    icon: "text-indigo-600",
    value: "text-indigo-700 dark:text-indigo-400",
    text: "text-indigo-600/70",
  },
};

function StatCard({ color, icon: Icon, label, value, prefix, suffix }: any) {
  const c = statColorMap[color as StatColor];
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border p-4 transition-all hover:shadow-md",
        c.bg,
      )}
    >
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
          c.iconBg,
        )}
      >
        <Icon size={18} className={c.icon} />
      </div>
      <p
        className={cn(
          "text-[10px] font-bold uppercase tracking-widest mb-1",
          c.text,
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "text-2xl font-black tracking-tight leading-tight",
          c.value,
        )}
      >
        {prefix && (
          <span className="text-sm font-bold mr-1 opacity-60">{prefix}</span>
        )}
        {value}
        {suffix && (
          <span className="text-sm font-bold ml-1 opacity-60">{suffix}</span>
        )}
      </p>
    </div>
  );
}