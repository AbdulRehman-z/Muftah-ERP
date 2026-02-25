import { useSuspenseQuery } from "@tanstack/react-query";
import {
  getCustomersFn,
  getAllCustomersFn,
} from "@/server-functions/sales/customers-fn";

export const customersKeys = {
  all: ["customers"] as const,
  list: (params: { page: number; limit: number; search?: string }) =>
    [...customersKeys.all, "list", params] as const,
  select: () => [...customersKeys.all, "select"] as const,
};

export const useGetCustomers = (params: {
  page: number;
  limit: number;
  search?: string;
}) => {
  return useSuspenseQuery({
    queryKey: customersKeys.list(params),
    queryFn: () => getCustomersFn({ data: params }),
    gcTime: 0,
    staleTime: 0,
  });
};

export const useGetAllCustomers = () => {
  return useSuspenseQuery({
    queryKey: customersKeys.select(),
    queryFn: () => getAllCustomersFn(),
    gcTime: 0,
    staleTime: 0,
  });
};
