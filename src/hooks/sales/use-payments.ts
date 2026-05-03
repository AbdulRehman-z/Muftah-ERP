import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createPaymentFn, getPaymentsFn } from "@/server-functions/sales/payments-fn";
import type { CreatePaymentInput } from "@/db/zod_schemas";

export const paymentsKeys = {
  all: ["payments"] as const,
  list: (filters: any) => ["payments", "list", filters] as const,
};

export function useGetPayments(filters: {
  customerId?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: paymentsKeys.list(filters),
    queryFn: () => getPaymentsFn({ data: filters }),
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentInput) => {
      return await createPaymentFn({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.all });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}
