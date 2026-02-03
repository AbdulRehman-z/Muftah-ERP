import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeProductionFn } from "@/server-functions/inventory/production/complete-production-fn";

export const useCompleteProduction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: completeProductionFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["production-runs"] });
            queryClient.invalidateQueries({ queryKey: ["finished-goods"] });
        },
    });
};
