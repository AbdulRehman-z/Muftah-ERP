import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeeAttendanceLogFn } from "@/server-functions/hr/attendance/get-employee-attendance-log-fn";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar as CalendarIcon, User, Briefcase, Hash } from "lucide-react";
import { formatDuration } from "@/lib/utils";

interface Props {
    employeeId: string;
    month?: string; // YYYY-MM
}

export const EmployeeAttendanceLog = ({ employeeId, month, showHeader = true }: Props & { showHeader?: boolean }) => {
    const today = new Date();
    const currentMonth = month || format(today, "yyyy-MM");

    // For the log, we'll show the current month by default
    const startDate = format(startOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");
    const endDate = format(endOfMonth(parseISO(`${currentMonth}-01`)), "yyyy-MM-dd");

    const { data } = useSuspenseQuery({
        queryKey: ["employee-attendance-log", employeeId, startDate, endDate],
        queryFn: () => getEmployeeAttendanceLogFn({ data: { employeeId, startDate, endDate } }),
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
        daysPresent: records.filter(r => r.status === "present" || r.status === "half_day").length,
    };

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {showHeader && (
                    <Card className="md:col-span-2 overflow-hidden border-none shadow-sm bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={32} />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-bold">{employee.firstName} {employee.lastName}</h2>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                                        <span className="flex items-center gap-1"><Briefcase size={14} /> {employee.designation}</span>
                                        <span className="flex items-center gap-1"><Hash size={14} /> {employee.employeeCode}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card className="border-none shadow-sm bg-emerald-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Total Duty</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-700">{stats.totalDuty} hrs</div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-amber-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase text-amber-600 tracking-wider">Total Overtime</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-700">{stats.totalOvertime} hrs</div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Table */}
            <Card className="border shadow-sm overflow-hidden">
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
