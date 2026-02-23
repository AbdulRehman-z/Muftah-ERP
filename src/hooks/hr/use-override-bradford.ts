import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { overrideBradfordFactorFn } from "@/server-functions/hr/payroll/override-bradford-fn";

export function useOverrideBradford() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { payslipId: string; overrideScore: string | null }) => {
            return await overrideBradfordFactorFn({ data });
        },
        onSuccess: () => {
            toast.success("Bradford Factor updated successfully.");
            // Invalidate payroll and payslip queries
            queryClient.invalidateQueries({ queryKey: ["payslips"] });
            queryClient.invalidateQueries({ queryKey: ["employee-payslips"] });
        },
        onError: (err: any) => {
            toast.error(err.message || "Failed to update Bradford Factor");
        },
    });
}
