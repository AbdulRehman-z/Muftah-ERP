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
  CalendarRange,
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
import { BulkAttendanceSheet } from "./bulk-attendance-sheet";

export const AttendanceContainer = () => {
  const [bulkOpen, setBulkOpen] = useState(false);
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
    undertimeCount: employees.filter((e) => {
      const a = e.attendance[0];
      if (!a || a.status !== "present") return false;
      const duty = parseFloat(a.dutyHours || "0");
      const standard = (e as any).standardDutyHours || 8;
      return duty < standard;
    }).length,
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

  const rateColorClass = attendanceRate >= 80
    ? "text-emerald-600"
    : attendanceRate >= 60
      ? "text-amber-600"
      : "text-rose-600";

  const rateBarColorClass = attendanceRate >= 80
    ? "bg-emerald-500"
    : attendanceRate >= 60
      ? "bg-amber-500"
      : "bg-rose-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border rounded-lg bg-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <Clock4 className="size-5 text-muted-foreground" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold">Daily Attendance</h2>
                {isTodaySelected && (
                  <Badge variant="secondary" className="text-xs font-medium">
                    Today
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {format(parsedDate, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Date navigator */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-none rounded-l-md"
                onClick={() => handleDateChange(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 px-3 rounded-none text-xs font-medium gap-1.5"
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
                className="h-8 w-8 rounded-none rounded-r-md"
                onClick={() => handleDateChange(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-8 w-8 rounded-md",
                isTodaySelected && "opacity-50 pointer-events-none"
              )}
              onClick={() => setSelectedDate(format(startOfToday(), "yyyy-MM-dd"))}
              title="Jump to Today"
            >
              <RotateCcw className="size-3.5" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <CalendarRange className="size-3.5 mr-2" />
              Bulk Mark
            </Button>

            <Button
              variant={activeRate ? "default" : "outline"}
              className="h-8 px-3 rounded-md text-xs font-medium gap-2 ml-2"
              onClick={() => setIsSetRateOpen(true)}
            >
              <Settings2 className="size-3.5" />
              <span className="hidden sm:inline">
                {activeRate ? `PKR ${activeRate.ratePerKm}/km` : "Set TA/DA Rate"}
              </span>
            </Button>
          </div>
        </div>

        {/* Attendance rate bar */}
        <div className="px-5 pb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Attendance Rate
            </span>
            <div className="flex items-center gap-3">
              {undertimeLabel && stats.undertimeCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-rose-600">
                  <TimerOff className="size-3" />
                  −{undertimeLabel} · {stats.undertimeCount} emp
                </span>
              )}
              <span className={cn("text-xs font-semibold tabular-nums", rateColorClass)}>
                {attendanceRate}%
              </span>
            </div>
          </div>

          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", rateBarColorClass)}
              style={{ width: `${attendanceRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <AttendanceSummaryCards stats={stats} />

      {/* Table */}
      <AttendanceListTable data={employees} date={selectedDate} />

      {/* Bulk Attendance Sheet */}
      <BulkAttendanceSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        employees={employees}  // pass your employee list from getDailyAttendanceFn
      />
      {/* TA/DA Global Rate Dialog */}
      <SetRateDialog
        open={isSetRateOpen}
        onOpenChange={setIsSetRateOpen}
      />
    </div>
  );
};