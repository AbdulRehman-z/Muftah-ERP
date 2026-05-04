import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCustomerPriceAgreementsFn,
  createCustomerPriceAgreementFn,
  deleteCustomerPriceAgreementFn,
  getPromotionalRulesFn,
  createPromotionalRuleFn,
  deletePromotionalRuleFn,
} from "@/server-functions/sales/sales-config-fn";

export const configKeys = {
  all: ["sales-config"] as const,
  priceAgreements: (filters?: { customerId?: string; productId?: string }) =>
    [...configKeys.all, "price-agreements", filters] as const,
  promotionalRules: (filters?: { productId?: string }) =>
    [...configKeys.all, "promotional-rules", filters] as const,
};

export function useGetCustomerPriceAgreements(filters?: { customerId?: string; productId?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: configKeys.priceAgreements(filters),
    queryFn: () => getCustomerPriceAgreementsFn({ data: filters || {} }),
  });
}

export function useCreateCustomerPriceAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCustomerPriceAgreementFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.priceAgreements() });
    },
  });
}

export function useDeleteCustomerPriceAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCustomerPriceAgreementFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.priceAgreements() });
    },
  });
}

export function useGetPromotionalRules(filters?: { productId?: string; includeInactive?: boolean }) {
  return useQuery({
    queryKey: configKeys.promotionalRules(filters),
    queryFn: () => getPromotionalRulesFn({ data: filters || {} }),
  });
}

export function useCreatePromotionalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createPromotionalRuleFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.promotionalRules() });
    },
  });
}

export function useDeletePromotionalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePromotionalRuleFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: configKeys.promotionalRules() });
    },
  });
}
