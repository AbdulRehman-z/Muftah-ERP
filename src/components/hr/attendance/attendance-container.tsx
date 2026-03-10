import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDailyAttendanceFn } from "@/server-functions/hr/attendance/get-daily-attendance-fn";
import { AttendanceSummaryCards } from "./attendance-summary-cards";
import { AttendanceListTable } from "./attendance-list-table";
import { format, addDays, startOfToday, parseISO, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  RotateCcw,
  Clock4,
  TimerOff,
  Settings2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SetRateDialog } from "@/components/hr/tada/set-rate-dialog";
import { useActiveTadaRate } from "@/hooks/hr/use-tada";

export const AttendanceContainer = () => {
  const [selectedDate, setSelectedDate] = useState(
    format(startOfToday(), "yyyy-MM-dd"),
  );
  const [isSetRateOpen, setIsSetRateOpen] = useState(false);

  const { data: activeRate } = useActiveTadaRate();

  const { data: employees } = useSuspenseQuery({
    queryKey: ["daily-attendance", selectedDate],
    queryFn: () => getDailyAttendanceFn({ data: { date: selectedDate } }),
    select: (data) =>
      data.map((e) => ({
        ...e,
        attendance: e.attendance.map((a) => ({
          ...a,
          overtimeStatus: a.overtimeStatus as
            | "pending"
            | "approved"
            | "rejected"
            | null,
          entrySource: a.entrySource as "biometric" | "manual" | null,
        })),
      })),
  });

  const stats = {
    total: employees.length,
    present: employees.filter(
      (e) => e.attendance[0]?.status === "present",
    ).length,
    absent: employees.filter((e) => e.attendance[0]?.status === "absent").length,
    late: employees.filter((e) => e.attendance[0]?.isLate).length,
    leave: employees.filter((e) => e.attendance[0]?.status === "leave").length,
    // Employees who clocked less than their standard duty hours
    undertimeCount: employees.filter((e) => {
      const a = e.attendance[0];
      if (!a || a.status !== "present") return false;
      const duty = parseFloat(a.dutyHours || "0");
      const standard = (e as any).standardDutyHours || 8;
      return duty < standard;
    }).length,
    // Total undertime in minutes across all present employees
    undertimeMins: employees.reduce((acc, e) => {
      const a = e.attendance[0];
      if (!a || a.status !== "present") return acc;
      const duty = parseFloat(a.dutyHours || "0");
      const standard = (e as any).standardDutyHours || 8;
      return duty < standard ? acc + Math.round((standard - duty) * 60) : acc;
    }, 0),
  };

  const handleDateChange = (days: number) => {
    const nextDate = addDays(parseISO(selectedDate), days);
    setSelectedDate(format(nextDate, "yyyy-MM-dd"));
  };

  const parsedDate = parseISO(selectedDate);
  const isTodaySelected = isToday(parsedDate);

  const attendanceRate = stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  const formatUndertimeMins = (mins: number): string | null => {
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const undertimeLabel = formatUndertimeMins(stats.undertimeMins);

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <Clock4 className="size-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Daily Attendance</h2>
                {isTodaySelected && (
                  <Badge className="text-[10px] font-black uppercase tracking-wider h-5 px-2 bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800">
                    Today
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {format(parsedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl border bg-muted/30 p-1 gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 rounded-lg text-xs font-bold hover:bg-background gap-1.5"
                  >
                    <CalendarDays className="size-3.5 text-muted-foreground" />
                    {format(parsedDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={parsedDate}
                    onSelect={(date) =>
                      date && setSelectedDate(format(date, "yyyy-MM-dd"))
                    }
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-background"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-9 md:w-9 rounded-xl transition-all",
                isTodaySelected && "opacity-40 pointer-events-none"
              )}
              onClick={() => setSelectedDate(format(startOfToday(), "yyyy-MM-dd"))}
              title="Jump to Today"
            >
              <RotateCcw className="size-3.5" />
            </Button>

            <Button
              variant="outline"
              className={cn(
                "h-10 md:h-11 px-4 rounded-2xl font-black uppercase tracking-wider text-[10px] ml-2 transition-all hover:bg-indigo-600 hover:text-white group",
                activeRate ? "border-indigo-200 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-400" : "border-dashed border-muted-foreground/30"
              )}
              onClick={() => setIsSetRateOpen(true)}
            >
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-white/50 dark:bg-black/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Settings2 className="size-3.5" />
                </div>
                <div className="flex flex-col items-start leading-none gap-0.5">
                  <span>Manage TA/DA Rate</span>
                  <span className="text-[9px] opacity-70 font-bold">
                    {activeRate ? `Current: PKR ${activeRate.ratePerKm}/km` : "No Active Rate Set"}
                  </span>
                </div>
              </div>
            </Button>
          </div>
        </div>

        {/* Attendance rate bar + undertime pill */}
        <div className="px-6 pb-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              Attendance Rate
            </span>
            <div className="flex items-center gap-2">
              {/* Undertime pill — only visible when there's actual undertime */}
              {undertimeLabel && stats.undertimeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-full px-2 py-0.5">
                  <TimerOff className="size-2.5" />
                  −{undertimeLabel} · {stats.undertimeCount}{" "}
                  {stats.undertimeCount === 1 ? "employee" : "employees"}
                </span>
              )}
              <span className={cn(
                "text-[11px] font-black tabular-nums",
                attendanceRate >= 80 ? "text-emerald-600 dark:text-emerald-400"
                  : attendanceRate >= 60 ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
              )}>
                {attendanceRate}%
              </span>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                attendanceRate >= 80 ? "bg-emerald-500"
                  : attendanceRate >= 60 ? "bg-amber-500"
                    : "bg-rose-500"
              )}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────── */}
      <AttendanceSummaryCards stats={stats} />

      {/* ── Table ────────────────────────────────────────────────────── */}
      <AttendanceListTable data={employees} date={selectedDate} />

      {/* TA/DA Global Rate Dialog */}
      <SetRateDialog
        open={isSetRateOpen}
        onOpenChange={setIsSetRateOpen}
      />
    </div>
  );
};