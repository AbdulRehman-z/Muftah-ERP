import {
  useSuspenseQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getInvoicesFn,
  createInvoiceFn,
} from "@/server-functions/sales/invoices-fn";
import { CreateInvoiceInput } from "@/db/zod_schemas";
import { toast } from "sonner";

export const invoicesKeys = {
  all: ["invoices"] as const,
  list: (params: any) => [...invoicesKeys.all, "list", params] as const,
};

export const useGetInvoices = (params: {
  page: number;
  limit: number;
  dateFrom?: string;
  dateTo?: string;
  month?: number;
  year?: number;
}) => {
  return useSuspenseQuery({
    queryKey: invoicesKeys.list(params),
    queryFn: () => getInvoicesFn({ data: params }),
    gcTime: 0,
    staleTime: 0,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateInvoiceInput) => createInvoiceFn({ data }),
    onSuccess: () => {
      toast.success("Invoice created successfully");
      // Invalidate all inventory and sales queries
      queryClient.invalidateQueries({ queryKey: invoicesKeys.all });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create invoice");
    },
  });
};