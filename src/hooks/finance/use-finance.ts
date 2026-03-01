import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    getWalletsListFn,
    createWalletFn,
    updateWalletFn,
    depositToWalletFn,
    createExpenseFn,
    getExpensesFn,
    getTransactionsFn,
    debitWalletFn,
} from "@/server-functions/finance-fn";
import { toast } from "sonner";

// ── Wallets ────────────────────────────────────────────────

export const useWallets = () => {
    return useQuery({
        queryKey: ["wallets"],
        queryFn: () => getWalletsListFn(),
    });
};

export const useCreateWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createWalletFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            toast.success("Wallet created successfully");
        },
        onError: (err) => {
            toast.error("Failed to create wallet", { description: err.message });
        },
    });
};

export const useUpdateWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateWalletFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            toast.success("Wallet updated");
        },
        onError: (err) => {
            toast.error("Failed to update wallet", { description: err.message });
        },
    });
};

// ── Deposits ───────────────────────────────────────────────

export const useDepositToWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: depositToWalletFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            toast.success("Deposit recorded successfully");
        },
        onError: (err) => {
            toast.error("Failed to record deposit", { description: err.message });
        },
    });
};

// ── Expenses ───────────────────────────────────────────────

export const useCreateExpense = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createExpenseFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["expenses"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            toast.success("Expense recorded");
        },
        onError: (err) => {
            toast.error("Failed to record expense", { description: err.message });
        },
    });
};

export const useExpenses = () => {
    return useQuery({
        queryKey: ["expenses"],
        queryFn: () => getExpensesFn({ data: {} }),
    });
};

// ── Transactions ───────────────────────────────────────────

export const useTransactions = (walletId?: string) => {
    return useQuery({
        queryKey: ["transactions", walletId],
        queryFn: () => getTransactionsFn({ data: { walletId } }),
    });
};

// ── Generic Debit ──────────────────────────────────────────

export const useDebitWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: debitWalletFn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["wallets"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
        },
        onError: (err) => {
            toast.error("Payment failed", { description: err.message });
        },
    });
};
