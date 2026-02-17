import { createFileRoute } from "@tanstack/react-router";
import { GenericLoader } from "@/components/custom/generic-loader";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { Suspense } from "react";
import { getDailyAttendanceFn } from "@/server-functions/hr/attendance/get-daily-attendance-fn";
import { format } from "date-fns";
import { AttendanceContainer } from "@/components/hr/attendance/attendance-container";

export const Route = createFileRoute("/_protected/hr/attendance/")({
    server: {
        middleware: [requireAdminMiddleware]
    },
    loader: async ({ context }) => {
        const today = format(new Date(), "yyyy-MM-dd");
        void context.queryClient.prefetchQuery({
            queryKey: ["daily-attendance", today],
            queryFn: () => getDailyAttendanceFn({ data: { date: today } }),
        });
    },
    component: AttendancePage,
});

function AttendancePage() {
    return (
        <div className="flex flex-col gap-4 p-8 pt-6">
            <Suspense fallback={<GenericLoader />}>
                <AttendanceContainer />
            </Suspense>
        </div>
    );
}
