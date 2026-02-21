import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeeAttendanceLogFn } from "@/server-functions/hr/attendance/get-employee-attendance-log-fn";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, User, Briefcase, Hash, CalendarClock } from "lucide-react";
import { formatDuration } from "@/lib/utils";
import { useParams } from "@tanstack/react-router";

type Props = {
    employeeId?: string;
    month?: string; // YYYY-MM
    startDate?: string; // YYYY-MM-DD
    endDate?: string;   // YYYY-MM-DD
}

export const EmployeeAttendanceLog = ({ employeeId: propId, month, startDate: propStartDate, endDate: propEndDate, showHeader = true }: Props & { showHeader?: boolean }) => {
    // Try to get employeeId from route, but don't crash if unrelated route
    const params = useParams({ strict: false });
    // @ts-ignore - we know employeeId might exist
    const routeEmployeeId = params.employeeId;

    const employeeId = propId || routeEmployeeId;

    if (!employeeId) return null;

    const today = new Date();
    const currentMonth = month || format(today, "yyyy-MM");

    // Use props if provided, otherwise default to current month
    const startDate = propStartDate || format(startOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");
    const endDate = propEndDate || format(endOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");

    const { data } = useSuspenseQuery({
        queryKey: ["employee-attendance-log", employeeId, startDate, endDate],
        queryFn: () => getEmployeeAttendanceLogFn({ data: { employeeId, startDate, endDate } }),
        gcTime: 0,
    });

    const { employee, records } = data;

    // Generate all days in the range to show "Absent" if no record exists
    const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
    });

    const stats = {
        totalDuty: records.reduce((acc, r) => acc + (parseFloat(r.dutyHours || "0") || 0), 0).toFixed(1),
        totalOvertime: records.reduce((acc, r) => acc + (parseFloat(r.overtimeHours || "0") || 0), 0).toFixed(1),
        totalUndertime: records.reduce((acc, r) => {
            const duty = parseFloat(r.dutyHours || "0");
            const standard = employee.standardDutyHours || 8;
            if (r.status === "present" && duty < standard) {
                return acc + (standard - duty);
            }
            return acc;
        }, 0).toFixed(1),
        daysPresent: records.filter(r => r.status === "present" || r.status === "half_day").length,
    };

    return (
        <div className="space-y-6">
            {/* Header / Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {showHeader && (
                    <div className="md:col-span-6 lg:col-span-5 relative group overflow-hidden rounded-2xl border bg-white  transition-all hover:">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150 rotate-12 transition-transform group-hover:scale-[1.7] group-hover:rotate-0">
                            <User size={120} />
                        </div>
                        <div className="relative p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5">
                            <div className="shrink-0 h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                                <User size={40} className="drop-" />
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-2">
                                <div>
                                    <h2 className="text-2xl font-extrabold tracking-tight text-foreground truncate">
                                        {employee.firstName} {employee.lastName}
                                    </h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-2 mt-1">
                                        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                            <Briefcase size={14} className="text-primary" /> {employee.designation}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs font-mono bg-muted/50 px-2 py-0.5 rounded-md text-muted-foreground border">
                                            <Hash size={12} /> {employee.employeeCode}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px] font-bold tracking-wider">
                                        FULL TIME
                                    </Badge>
                                    {employee.isOperator && (
                                        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-[10px] font-bold tracking-wider uppercase">
                                            Split-Shift Op
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`grid grid-cols-2 lg:grid-cols-3 gap-5 ${showHeader ? "md:col-span-6 lg:col-span-7" : "md:col-span-12"}`}>
                    <div className="relative overflow-hidden rounded-2xl border bg-emerald-50/30 p-5  transition-all hover: group">
                        <div className="absolute -bottom-6 -right-6 text-emerald-200/40 rotate-12 transition-transform group-hover:scale-110">
                            <Clock size={80} />
                        </div>
                        <div className="relative space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600/70">Total Duty</p>
                                <p className="text-3xl font-black text-emerald-700 tracking-tight">
                                    {stats.totalDuty}<span className="text-sm font-bold ml-1 opacity-60">hrs</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border bg-amber-50/30 p-5  transition-all hover: group">
                        <div className="absolute -bottom-6 -right-6 text-amber-200/40 rotate-12 transition-transform group-hover:scale-110">
                            <CalendarClock size={80} />
                        </div>
                        <div className="relative space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                                <CalendarClock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70">Overtime</p>
                                <p className="text-3xl font-black text-amber-700 tracking-tight">
                                    {stats.totalOvertime}<span className="text-sm font-bold ml-1 opacity-60">hrs</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border bg-rose-50/30 p-5  transition-all hover: group col-span-2 lg:col-span-1">
                        <div className="absolute -bottom-6 -right-6 text-rose-200/40 rotate-12 transition-transform group-hover:scale-110">
                            <Clock size={80} />
                        </div>
                        <div className="relative space-y-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600/70">Undertime</p>
                                <p className="text-3xl font-black text-rose-700 tracking-tight">
                                    {stats.totalUndertime}<span className="text-sm font-bold ml-1 opacity-60">hrs</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Table */}
            <Card className="border  overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>S.No</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Day</TableHead>
                            <TableHead>Shift 1</TableHead>
                            {employee.isOperator && <TableHead>Shift 2</TableHead>}
                            <TableHead>Duty (Hr)</TableHead>
                            <TableHead>Overtime (Hr)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Comment</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {days.map((day, idx) => {
                            const dateStr = format(day, "yyyy-MM-dd");
                            const record = records.find(r => r.date === dateStr);
                            const isWeekend = format(day, "E") === "Sun";

                            return (
                                <TableRow key={dateStr} className={isWeekend ? "bg-muted/20" : ""}>
                                    <TableCell className="text-muted-foreground font-mono text-xs">{idx + 1}</TableCell>
                                    <TableCell className="font-medium text-xs">{format(day, "dd-MMM-yy")}</TableCell>
                                    <TableCell className="text-xs">{format(day, "EEEE")}</TableCell>

                                    <TableCell className="text-xs">
                                        {record?.checkIn ? (
                                            <span className="flex items-center gap-1">
                                                <span className="text-emerald-600 font-semibold">{record.checkIn}</span>
                                                <span className="text-muted-foreground">-</span>
                                                <span className="text-rose-600 font-semibold">{record.checkOut}</span>
                                            </span>
                                        ) : "-"}
                                    </TableCell>

                                    {employee.isOperator && (
                                        <TableCell className="text-xs">
                                            {record?.checkIn2 ? (
                                                <span className="flex items-center gap-1">
                                                    <span className="text-emerald-600 font-semibold">{record.checkIn2}</span>
                                                    <span className="text-muted-foreground">-</span>
                                                    <span className="text-rose-600 font-semibold">{record.checkOut2}</span>
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                    )}

                                    <TableCell className="font-semibold text-xs">
                                        <div className="flex flex-col">
                                            <span>{record?.dutyHours || "0.00"}</span>
                                            {record?.dutyHours && parseFloat(record.dutyHours) < (employee.standardDutyHours || 8) && record.status === "present" && (
                                                <span className="text-[10px] text-rose-500 font-bold">
                                                    -{formatDuration((employee.standardDutyHours || 8) - parseFloat(record.dutyHours))}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell className="text-emerald-600 font-bold text-xs text-center">
                                        {parseFloat(record?.overtimeHours || "0") > 0 ? record?.overtimeHours : ""}
                                    </TableCell>

                                    <TableCell>
                                        {record ? (
                                            <Badge variant={
                                                record.status === "present" ? "default" :
                                                    record.status === "absent" ? "destructive" : "secondary"
                                            } className="text-[10px] px-1.5 py-0">
                                                {record.status.toUpperCase()}
                                            </Badge>
                                        ) : (
                                            isWeekend ? <span className="text-[10px] text-muted-foreground font-semibold uppercase">Weekend</span> :
                                                <Badge variant="outline" className="text-[10px] border-green-500 text-green-500 bg-green-50">PENDING</Badge>
                                        )}
                                    </TableCell>

                                    <TableCell className="text-xs italic text-muted-foreground">
                                        {record?.notes || ""}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};
