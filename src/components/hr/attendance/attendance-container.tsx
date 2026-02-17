import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getDailyAttendanceFn } from "@/server-functions/hr/attendance/get-daily-attendance-fn";
import { AttendanceSummaryCards } from "./attendance-summary-cards";
import { AttendanceListTable } from "./attendance-list-table";
import { format, addDays, startOfToday, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

export const AttendanceContainer = () => {
    const [selectedDate, setSelectedDate] = useState(format(startOfToday(), "yyyy-MM-dd"));

    const { data: employees } = useSuspenseQuery({
        queryKey: ["daily-attendance", selectedDate],
        queryFn: () => getDailyAttendanceFn({ data: { date: selectedDate } }),
    });

    const stats = {
        total: employees.length,
        present: employees.filter((e) => e.attendance[0]?.status === "present" || e.attendance[0]?.status === "half_day").length,
        absent: employees.filter((e) => e.attendance[0]?.status === "absent").length,
        late: employees.filter((e) => e.attendance[0]?.isLate).length,
        leave: employees.filter((e) => e.attendance[0]?.status === "leave").length,
    };

    const handleDateChange = (days: number) => {
        const nextDate = addDays(parseISO(selectedDate), days);
        setSelectedDate(format(nextDate, "yyyy-MM-dd"));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-xl border">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Daily Attendance</h2>
                    <p className="text-muted-foreground">Manage and track employee presence for {format(parseISO(selectedDate), "PPPP")}.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded-lg p-1 bg-muted/30">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => handleDateChange(-1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 px-3 text-xs font-semibold hover:bg-background"
                                >
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    {format(parseISO(selectedDate), "MMM dd, yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    mode="single"
                                    selected={parseISO(selectedDate)}
                                    onSelect={(date) => date && setSelectedDate(format(date, "yyyy-MM-dd"))}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => handleDateChange(1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 md:h-9 md:w-9"
                        onClick={() => setSelectedDate(format(startOfToday(), "yyyy-MM-dd"))}
                        title="Reset to Today"
                    >
                        <RotateCcw className="size-4" />
                    </Button>
                </div>
            </div>

            <AttendanceSummaryCards stats={stats} />

            <AttendanceListTable data={employees} date={selectedDate} />
        </div>
    );
};
