import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { EditAttendanceForm } from "./edit-attendance-form";
import { format, parseISO } from "date-fns";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: { id: string; firstName: string; lastName: string; isOperator: boolean };
    attendance?: {
        checkIn?: string | null;
        checkOut?: string | null;
        checkIn2?: string | null;
        checkOut2?: string | null;
        status: "present" | "absent" | "leave" | "half_day" | "holiday";
        isLate?: boolean | null;
        notes?: string | null;
    } | null;
    date: string;
}

export const EditAttendanceDialog = ({ open, onOpenChange, employee, attendance, date }: Props) => {
    const formattedDate = format(parseISO(date), "PPP");

    return (
        <ResponsiveDialog
            title="Attendance Management"
            description={`Log or update work records for ${employee.firstName} ${employee.lastName} on ${formattedDate}.`}
            open={open}
            onOpenChange={onOpenChange}
        >
            <div className="px-1 overflow-y-auto max-h-[85vh]">
                <EditAttendanceForm
                    employee={employee}
                    attendance={attendance}
                    date={date}
                    onSuccess={() => onOpenChange(false)}
                />
            </div>
        </ResponsiveDialog>
    );
};
