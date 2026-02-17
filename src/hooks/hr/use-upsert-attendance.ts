import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertAttendanceFn } from "@/server-functions/hr/attendance/upsert-attendance-fn";
import { toast } from "sonner";

export const useUpsertAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: upsertAttendanceFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["daily-attendance"] });
            toast.success("Attendance record saved successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save attendance record");
        },
    });
};
