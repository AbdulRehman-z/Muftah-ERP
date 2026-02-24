import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelProductionFn } from "@/server-functions/inventory/production/cancel-production-fn";

export const useCancelProduction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelProductionFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-runs"] });
    },
  });
};
