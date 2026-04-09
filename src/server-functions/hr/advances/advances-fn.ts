import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { salaryAdvances } from "@/db/schemas/hr-schema";
import { wallets, transactions } from "@/db/schemas/finance-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * List all salary advances, with pagination
 */
export const listSalaryAdvancesFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ limit: z.number().optional().default(50) }))
  .handler(async ({ data }) => {
    return await db.query.salaryAdvances.findMany({
      with: {
        employee: {
          columns: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        approver: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (salaryAdvances, { desc }) => [desc(salaryAdvances.createdAt)],
      limit: data.limit,
    });
  });

/**
 * Request/Create a new salary advance
 */
export const createSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeId: z.string(),
      amount: z.number().positive(),
      date: z.string(), // YYYY-MM-DD
      reason: z.string(),
      installmentMonths: z.number().int().min(1).default(1), // 1, 3, 6, or 12
    }),
  )
  .handler(async ({ data }) => {
    const installmentMonths = data.installmentMonths || 1;
    const installmentAmount = +(data.amount / installmentMonths).toFixed(2);
    const [inserted] = await db
      .insert(salaryAdvances)
      .values({
        employeeId: data.employeeId,
        amount: data.amount.toString(),
        date: data.date,
        reason: data.reason,
        installmentMonths,
        installmentAmount: installmentAmount.toString(),
        installmentsPaid: 0,
      })
      .returning();
    return inserted;
  });


/**
 * Approve a salary advance and debit it from a finance wallet
 */
export const approveSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      advanceId: z.string(),
      walletId: z.string().min(1, "Please select a payment wallet"),
      performedById: z.string(),
    }),
  )
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // 1. Get the advance
      const advance = await tx.query.salaryAdvances.findFirst({
        where: eq(salaryAdvances.id, data.advanceId),
        with: {
          employee: true,
        },
      });

      if (!advance) throw new Error("Salary advance not found");
      if (advance.status !== "pending")
        throw new Error("Only pending advances can be approved");

      const advanceAmount = parseFloat(advance.amount);

      // 2. Look up the designated wallet & check balance
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, data.walletId));

      if (!wallet) throw new Error("Wallet not found");

      const currentBalance = parseFloat(wallet.balance || "0");
      if (currentBalance < advanceAmount) {
        throw new Error(
          `Insufficient balance in "${wallet.name}". Available: PKR ${currentBalance.toLocaleString()}, Required: PKR ${advanceAmount.toLocaleString()}`,
        );
      }

      // 3. Debit the money from the wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${advanceAmount}`,
        })
        .where(eq(wallets.id, data.walletId));

      // 4. Create a transaction journal entry
      const txnId = createId();
      await tx.insert(transactions).values({
        id: txnId,
        walletId: data.walletId,
        type: "debit",
        amount: advanceAmount.toString(),
        source: "Advance Payment",
        referenceId: data.advanceId,
        performedById: context.session.user.id,
      });

      // 5. Update the advance status
      const [updated] = await tx
        .update(salaryAdvances)
        .set({
          status: "approved",
          approvedBy: data.performedById,
          walletId: data.walletId,
          paidAt: new Date(),
        })
        .where(eq(salaryAdvances.id, data.advanceId))
        .returning();

      return updated;
    });
  });

/**
 * Reject a salary advance
 */
export const rejectSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ advanceId: z.string() }))
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(salaryAdvances)
      .set({ status: "rejected" })
      .where(eq(salaryAdvances.id, data.advanceId))
      .returning();
    return updated;
  });

/**
 * Update an existing salary advance (only if pending)
 */
export const updateSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      id: z.string(),
      amount: z.number().positive(),
      reason: z.string(),
      installmentMonths: z.number().int().min(1).default(1),
    }),
  )
  .handler(async ({ data }) => {
    const advance = await db.query.salaryAdvances.findFirst({
      where: eq(salaryAdvances.id, data.id),
    });

    if (!advance) throw new Error("Advance not found");
    if (advance.status !== "pending") {
      throw new Error("Only pending advances can be edited.");
    }

    const installmentMonths = data.installmentMonths || 1;
    const installmentAmount = +(data.amount / installmentMonths).toFixed(2);

    const [updated] = await db
      .update(salaryAdvances)
      .set({
        amount: data.amount.toString(),
        reason: data.reason,
        installmentMonths,
        installmentAmount: installmentAmount.toString(),
      })
      .where(eq(salaryAdvances.id, data.id))
      .returning();

    return updated;
  });

