import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { wallets, expenses, transactions } from "@/db/schemas/finance-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { createId } from "@paralleldrive/cuid2";

// ─────────────────────────────────────────────────────────
// 1. WALLETS — CRUD + Balance
// ─────────────────────────────────────────────────────────

/**
 * List all wallets with their current balance
 */
export const getWalletsListFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return await db.query.wallets.findMany({
      orderBy: (wallets, { asc }) => [asc(wallets.createdAt)],
    });
  });

/**
 * Create a new wallet (cash box or bank account)
 */
export const createWalletFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      name: z.string().min(1, "Wallet name is required"),
      type: z.enum(["cash", "bank"]),
      initialBalance: z.number().min(0).default(0),
    }),
  )
  .handler(async ({ data, context }) => {
    const id = createId();
    const [wallet] = await db
      .insert(wallets)
      .values({
        id,
        name: data.name,
        type: data.type,
        balance: data.initialBalance.toString(),
      })
      .returning();

    // If initial balance > 0, create an opening balance transaction
    if (data.initialBalance > 0) {
      await db.insert(transactions).values({
        id: createId(),
        walletId: id,
        type: "credit",
        amount: data.initialBalance.toString(),
        source: "Opening Balance",
        performedById: context.session.user.id,
      });
    }

    return wallet;
  });

/**
 * Update wallet name
 */
export const updateWalletFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      walletId: z.string().min(1),
      name: z.string().min(1, "Wallet name is required"),
    }),
  )
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(wallets)
      .set({ name: data.name })
      .where(eq(wallets.id, data.walletId))
      .returning();
    return updated;
  });

// ─────────────────────────────────────────────────────────
// 2. DEPOSITS — Add money to a wallet
// ─────────────────────────────────────────────────────────

/**
 * Deposit money into a wallet (credit)
 */
export const depositToWalletFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      walletId: z.string().min(1),
      amount: z.number().positive("Amount must be greater than 0"),
      description: z.string().optional().default("Manual Deposit"),
      source: z.string().optional().default("Manual Adjustment"),
    }),
  )
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // Update wallet balance
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${data.amount}`,
        })
        .where(eq(wallets.id, data.walletId));

      // Create transaction record
      const [txn] = await tx
        .insert(transactions)
        .values({
          id: createId(),
          walletId: data.walletId,
          type: "credit",
          amount: data.amount.toString(),
          source: data.source,
          performedById: context.session.user.id,
        })
        .returning();

      return txn;
    });
  });

// ─────────────────────────────────────────────────────────
// 3. EXPENSES — Record and debit from wallet
// ─────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  "Electricity Bill",
  "Internet Bill",
  "Gas Bill",
  "Water Bill",
  "Rent",
  "Fuel",
  "Maintenance",
  "Office Supplies",
  "Transportation",
  "Miscellaneous",
] as const;

/**
 * Record an expense — validates wallet has enough balance
 */
export const createExpenseFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      description: z.string().min(1, "Description is required"),
      category: z.string().min(1, "Category is required"),
      amount: z.number().positive("Amount must be greater than 0"),
      walletId: z.string().min(1, "Please select a payment source"),
    }),
  )
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // 1. Check wallet balance FIRST
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, data.walletId));

      if (!wallet) throw new Error("Wallet not found");

      const currentBalance = parseFloat(wallet.balance || "0");
      if (currentBalance < data.amount) {
        throw new Error(
          `Insufficient balance in "${wallet.name}". Available: PKR ${currentBalance.toLocaleString()}, Required: PKR ${data.amount.toLocaleString()}`,
        );
      }

      // 2. Debit the wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${data.amount}`,
        })
        .where(eq(wallets.id, data.walletId));

      // 3. Create the expense record
      const expenseId = createId();
      const [expense] = await tx
        .insert(expenses)
        .values({
          id: expenseId,
          description: data.description,
          category: data.category,
          amount: data.amount.toString(),
          walletId: data.walletId,
          performedById: context.session.user.id,
        })
        .returning();

      // 4. Create transaction journal entry
      await tx.insert(transactions).values({
        id: createId(),
        walletId: data.walletId,
        type: "debit",
        amount: data.amount.toString(),
        source: "Expense",
        referenceId: expenseId,
        performedById: context.session.user.id,
      });

      return expense;
    });
  });

/**
 * List all expenses with wallet info
 */
export const getExpensesFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      limit: z.number().optional(),
      category: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    return await db.query.expenses.findMany({
      with: {
        wallet: {
          columns: {
            id: true,
            name: true,
            type: true,
          },
        },
        performer: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
      limit: data.limit ?? 50,
    });
  });

// ─────────────────────────────────────────────────────────
// 4. TRANSACTIONS — Ledger / Journal
// ─────────────────────────────────────────────────────────

/**
 * Get transaction ledger for a specific wallet or all wallets
 */
export const getTransactionsFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      walletId: z.string().optional(),
      limit: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const whereClause = data.walletId
      ? eq(transactions.walletId, data.walletId)
      : undefined;

    return await db.query.transactions.findMany({
      where: whereClause,
      with: {
        wallet: {
          columns: {
            id: true,
            name: true,
            type: true,
          },
        },
        performer: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
      limit: data.limit ?? 100,
    });
  });

// ─────────────────────────────────────────────────────────
// 5. WALLET PAYMENT — Generic debit function with validation
//    Used by payroll, advances, etc.
// ─────────────────────────────────────────────────────────

/**
 * Debit a wallet with balance validation.
 * Used as a shared utility by payroll, advance approval, etc.
 */
export const debitWalletFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      walletId: z.string().min(1, "Please select a payment source"),
      amount: z.number().positive("Amount must be greater than 0"),
      source: z.string().min(1), // "Payroll", "Advance Payment", "Expense"
      referenceId: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // 1. Validate wallet balance
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, data.walletId));

      if (!wallet) throw new Error("Wallet not found");

      const currentBalance = parseFloat(wallet.balance || "0");
      if (currentBalance < data.amount) {
        throw new Error(
          `Insufficient balance in "${wallet.name}". Available: PKR ${currentBalance.toLocaleString()}, Required: PKR ${data.amount.toLocaleString()}`,
        );
      }

      // 2. Debit the wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${data.amount}`,
        })
        .where(eq(wallets.id, data.walletId));

      // 3. Create transaction
      const [txn] = await tx
        .insert(transactions)
        .values({
          id: createId(),
          walletId: data.walletId,
          type: "debit",
          amount: data.amount.toString(),
          source: data.source,
          referenceId: data.referenceId,
          performedById: context.session.user.id,
        })
        .returning();

      return {
        transaction: txn,
        walletName: wallet.name,
        remainingBalance: currentBalance - data.amount,
      };
    });
  });
