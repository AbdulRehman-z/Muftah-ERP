import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, ExternalLink, Clock } from "lucide-react";
import { EditAttendanceSheet } from "./edit-attendance-sheet";
import { Link } from "@tanstack/react-router";
import { formatDuration } from "@/lib/utils";

interface AttendanceRecord {
  id: string;
  checkIn: string | null;
  checkOut: string | null;
  checkIn2: string | null;
  checkOut2: string | null;
  status: "present" | "absent" | "leave" | "half_day" | "holiday";
  dutyHours: string | null;
  overtimeHours: string | null;
  isLate: boolean | null;
  isNightShift: boolean | null;
  isApprovedLeave: boolean | null;
  overtimeStatus: string | null;
  overtimeRemarks: string | null;
  entrySource: string | null;
  notes: string | null;
}

interface EmployeeWithAttendance {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  standardDutyHours: number | null;
  attendance: AttendanceRecord[];
}

interface Props {
  data: EmployeeWithAttendance[];
  date: string;
}

export const AttendanceListTable = ({ data, date }: Props) => {
  const [selectedEmployee, setSelectedEmployee] =
    useState<EmployeeWithAttendance | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const columns: ColumnDef<EmployeeWithAttendance>[] = [
    {
      accessorKey: "employeeCode",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.employeeCode}</span>
      ),
    },
    {
      header: "Employee",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium">{`${row.original.firstName} ${row.original.lastName}`}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.designation}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (!record)
          return (
            <Badge variant="secondary" className="opacity-50">
              Not Set
            </Badge>
          );

        const statusMap = {
          present: {
            label: "Present",
            variant: "default" as const,
            class: "bg-emerald-500 hover:bg-emerald-600",
          },
          absent: {
            label: "Absent",
            variant: "destructive" as const,
            class: "",
          },
          leave: {
            label: "Leave",
            variant: "secondary" as const,
            class: "bg-indigo-500 text-white hover:bg-indigo-600",
          },
          half_day: {
            label: "Half Day",
            variant: "outline" as const,
            class: "border-amber-500 text-amber-500 hover:bg-amber-50",
          },
          holiday: {
            label: "Holiday",
            variant: "outline" as const,
            class: "border-blue-500 text-blue-500 hover:bg-blue-50",
          },
        };

        const config = statusMap[record.status];
        return (
          <div className="flex items-center gap-2">
            <Badge variant={config.variant} className={config.class}>
              {config.label}
            </Badge>
            {record.isLate && (
              <Badge
                variant="outline"
                className="border-rose-500 text-rose-500 bg-rose-50 border-dashed animate-pulse"
              >
                Late
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: "Timings",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (
          !record ||
          record.status === "absent" ||
          record.status === "holiday"
        )
          return "-";

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="w-4 text-muted-foreground text-[10px] uppercase">
                S1
              </span>
              <span className="text-emerald-600 font-bold">
                {record.checkIn || "??:??"}
              </span>
              <span className="text-muted-foreground opacity-50">→</span>
              <span className="text-rose-600 font-bold">
                {record.checkOut || "??:??"}
              </span>
            </div>
            {(record.checkIn2 || record.checkOut2) && (
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="w-4 text-muted-foreground text-[10px] uppercase">
                  S2
                </span>
                <span className="text-emerald-600 font-bold">
                  {record.checkIn2 || "??:??"}
                </span>
                <span className="text-muted-foreground opacity-50">→</span>
                <span className="text-rose-600 font-bold">
                  {record.checkOut2 || "??:??"}
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      header: "Duty Stats",
      cell: ({ row }) => {
        const record = row.original.attendance[0];
        if (
          !record ||
          ["absent", "leave", "holiday"].includes(record.status) ||
          !record.dutyHours ||
          record.dutyHours === "NaN"
        ) {
          return <span className="text-muted-foreground">-</span>;
        }

        const duty = parseFloat(record.dutyHours || "0");
        const standard = row.original.standardDutyHours || 8;
        const shortfall = Math.max(0, standard - duty);
        const overtime = parseFloat(record.overtimeHours || "0");

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-xs">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="font-semibold">{record.dutyHours} hr</span>
            </div>
            {overtime > 0 && (
              <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">
                + {record.overtimeHours} Overtime
              </div>
            )}
            {shortfall > 0.1 && (
              <div className="text-[10px] text-rose-600 font-bold uppercase tracking-tight flex items-center gap-1">
                <span>⚠ Short: {formatDuration(shortfall)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
            onClick={() => {
              setSelectedEmployee(row.original);
              setIsDialogOpen(true);
            }}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
          >
            <Link
              to="/hr/attendance/$employeeId"
              params={{ employeeId: row.original.id }}
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={data}
        className="border-none"
        pageSize={50}
      />

      {selectedEmployee && (
        <EditAttendanceSheet
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          employee={selectedEmployee}
          attendance={selectedEmployee.attendance[0]}
          date={date}
        />
      )}
    </div>
  );
};
