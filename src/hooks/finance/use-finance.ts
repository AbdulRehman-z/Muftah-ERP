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
        onError: (err) => toast.error("Failed to create wallet", { description: err.message }),
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
        onError: (err) => toast.error("Failed to update wallet", { description: err.message }),
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
        onError: (err) => toast.error("Failed to record deposit", { description: err.message }),
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
        onError: (err) => toast.error("Failed to record expense", { description: err.message }),
    });
};

export const useExpenses = (params: {
    page?: number;
    limit?: number;
    category?: string;
} = {}) => {
    const { page = 1, limit = 20, category } = params;
    return useQuery({
        queryKey: ["expenses", { page, limit, category }],
        queryFn: () => getExpensesFn({ data: { page, limit, category } }),
        placeholderData: (prev) => prev, // keep previous page visible while fetching next
    });
};

// ── Transactions ───────────────────────────────────────────

export const useTransactions = (params: {
    walletId?: string;
    source?: string;
    page?: number;
    limit?: number;
} = {}) => {
    const { walletId, source, page = 1, limit = 20 } = params;
    return useQuery({
        queryKey: ["transactions", { walletId, source, page, limit }],
        queryFn: () => getTransactionsFn({ data: { walletId, source, page, limit } }),
        placeholderData: (prev) => prev,
    });
};

// Keep a separate hook for the finance dashboard "recent activity" strip
// so it stays a lightweight fixed-limit fetch and doesn't share cache with
// the paginated ledger page.
export const useRecentTransactions = (limit = 10) => {
    return useQuery({
        queryKey: ["transactions-recent", limit],
        queryFn: () => getTransactionsFn({ data: { page: 1, limit } }),
        staleTime: 30_000,
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
        onError: (err) => toast.error("Payment failed", { description: err.message }),
    });
};