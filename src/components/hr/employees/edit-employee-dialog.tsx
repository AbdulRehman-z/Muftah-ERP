import { EditEmployeeForm } from "./edit-employee-form";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";

type Employee = Awaited<ReturnType<typeof getEmployeesFn>>[0];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee;
};

export const EditEmployeeDialog = ({ open, onOpenChange, employee }: Props) => {
    return (
        <ResponsiveSheet
            title="Edit Employee"
            description="Update employee details, role, and compensation structure."
            open={open}
            onOpenChange={onOpenChange}
            className="sm:max-w-xl"
        >
            <EditEmployeeForm
                employee={employee}
                onSuccess={() => onOpenChange(false)}
            />
        </ResponsiveSheet>
    );
};
