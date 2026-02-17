import { createFileRoute } from "@tanstack/react-router";
import { EmployeeAttendanceLog } from "@/components/hr/attendance/employee-attendance-log";
import { GenericLoader } from "@/components/custom/generic-loader";
import { Suspense } from "react";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { getEmployeeAttendanceLogFn } from "@/server-functions/hr/attendance/get-employee-attendance-log-fn";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const Route = createFileRoute("/_protected/hr/attendance/$employeeId")({
    server: {
        middleware: [requireAdminMiddleware]
    },
    loader: async ({ params, context }) => {
        const today = new Date();
        const startDate = format(startOfMonth(today), "yyyy-MM-dd");
        const endDate = format(endOfMonth(today), "yyyy-MM-dd");

        void context.queryClient.prefetchQuery({
            queryKey: ["employee-attendance-log", params.employeeId, startDate, endDate],
            queryFn: () => getEmployeeAttendanceLogFn({ data: { employeeId: params.employeeId, startDate, endDate } }),
        });
    },
    component: EmployeeLogPage,
});

function EmployeeLogPage() {
    const { employeeId } = Route.useParams();

    return (
        <div className="p-8 pt-6">
            <Suspense fallback={<GenericLoader title="Loading Attendance Log..." />}>
                <EmployeeAttendanceLog employeeId={employeeId} />
            </Suspense>
        </div>
    );
}
