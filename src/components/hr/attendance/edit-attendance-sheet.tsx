import { EditAttendanceForm } from "./edit-attendance-form";
import { format, parseISO } from "date-fns";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { UserCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: { id: string; firstName: string; lastName: string };
  attendance?: {
    checkIn?: string | null;
    checkOut?: string | null;
    checkIn2?: string | null;
    checkOut2?: string | null;
    dutyHours?: string | null;
    overtimeHours?: string | null;
    status: "present" | "absent" | "leave" | "half_day" | "holiday";
    isLate?: boolean | null;
    isNightShift?: boolean | null;
    isApprovedLeave?: boolean | null;
    overtimeStatus?: string | null;
    overtimeRemarks?: string | null;
    entrySource?: string | null;
    notes?: string | null;
  } | null;
  date: string;
}

export const EditAttendanceSheet = ({
  open,
  onOpenChange,
  employee,
  attendance,
  date,
}: Props) => {
  const formattedDate = format(parseISO(date), "PPP");

  return (
    <ResponsiveSheet
      title="Attendance Management"
      description={`Log or update work records for ${employee.firstName} ${employee.lastName} on ${formattedDate}.`}
      open={open}
      onOpenChange={onOpenChange}
      icon={UserCheck}
    >
      <EditAttendanceForm
        employee={employee}
        attendance={attendance}
        date={date}
        onSuccess={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
};
