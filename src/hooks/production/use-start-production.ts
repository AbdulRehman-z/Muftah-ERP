import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startProductionFn } from "@/server-functions/inventory/production/start-production-fn";

export const useStartProduction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startProductionFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-runs"] });
      queryClient.invalidateQueries({ queryKey: ["materials"] });
    },
  });
};
