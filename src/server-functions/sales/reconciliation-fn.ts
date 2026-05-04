import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { createId } from "@paralleldrive/cuid2";
import { invoices, customers } from "@/db/schemas/sales-schema";
import { payments, slipRecords } from "@/db/schemas/sales-erp-schema";
import { transactions, wallets } from "@/db/schemas/finance-schema";
import {
  requireSalesManageMiddleware,
  requireSalesViewMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";
import {
  eq,
  and,
  sql,
  gte,
  lte,
  asc,
  gt,
  ne,
  ilike,
} from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════
// LOOKUP SLIP
// Instant search by slip number — returns full context for reconciliation.
// ═══════════════════════════════════════════════════════════════════════════
export const lookupSlipFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z.object({ slipNumber: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data }) => {
    const slip = await db.query.slipRecords.findFirst({
      where: ilike(slipRecords.slipNumber, data.slipNumber.trim()),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            city: true,
            mobileNumber: true,
            customerType: true,
            credit: true,
          },
        },
        salesman: { columns: { id: true, name: true } },
        invoice: {
          columns: {
            id: true,
            date: true,
            totalPrice: true,
            cash: true,
            credit: true,
            status: true,
            slipNumber: true,
            creditReturnDate: true,
          },
          with: {
            items: {
              columns: {
                pack: true,
                numberOfCartons: true,
                discountCartons: true,
                freeCartons: true,
                quantity: true,
                perCartonPrice: true,
                amount: true,
              },
            },
            warehouse: { columns: { name: true } },
          },
        },
      },
    });

    if (!slip) throw new Error(`Slip "${data.slipNumber}" not found`);

    return slip;
  });

// ═══════════════════════════════════════════════════════════════════════════
// RECONCILE SLIP
// Records partial or full payment against an open slip.
// Auto-closes slip when amountDue is fully recovered.
// Updates invoice status to 'paid' or 'partially_paid'.
// ═══════════════════════════════════════════════════════════════════════════
export const reconcileSlipFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        slipId: z.string().min(1),
        amount: z.number().positive("Amount must be positive"),
        method: z.enum(["cash", "bank_transfer", "expense_offset"]).default("cash"),
        walletId: z.string().optional(),
        reference: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      const slip = await tx.query.slipRecords.findFirst({
        where: eq(slipRecords.id, data.slipId),
        with: { invoice: true },
      });

      if (!slip) throw new Error("Slip not found");
      if (slip.status === "closed") throw new Error("Slip is already closed");

      const currentDue = Number(slip.amountDue);
      const currentRecovered = Number(slip.amountRecovered);

      if (data.amount > currentDue) {
        throw new Error(
          `Amount (${data.amount}) exceeds outstanding balance (${currentDue.toFixed(2)})`,
        );
      }

      const newDue = Math.max(0, currentDue - data.amount);
      const newRecovered = currentRecovered + data.amount;
      const isClosed = newDue === 0;

      // 1. Update slip record
      await tx
        .update(slipRecords)
        .set({
          amountDue: newDue.toString(),
          amountRecovered: newRecovered.toString(),
          status: isClosed ? "closed" : "partially_recovered",
          reconciledAt: isClosed ? new Date() : null,
          recoveryStatus: isClosed ? null : (slip.recoveryStatus ?? "partially_paid"),
          recoveryAssignedToId: isClosed ? null : undefined,
          nextFollowUpDate: isClosed ? null : undefined,
          lastFollowUpDate: isClosed ? null : undefined,
          escalationLevel: isClosed ? 0 : undefined,
          updatedAt: new Date(),
        })
        .where(eq(slipRecords.id, data.slipId));

      // 2. Update invoice status
      if (slip.invoice) {
        const newInvoiceStatus = isClosed ? "paid" : "partially_paid";
        await tx
          .update(invoices)
          .set({
            credit: newDue.toString(),
            cash: sql`${invoices.cash} + ${data.amount}`,
            status: newInvoiceStatus,
          })
          .where(eq(invoices.id, slip.invoice.id));
      }

      // 3. Payment record
      const [payment] = await tx
        .insert(payments)
        .values({
          id: createId(),
          customerId: slip.customerId,
          invoiceId: slip.invoiceId,
          amount: data.amount.toString(),
          method: data.method,
          reference: data.reference ?? slip.slipNumber,
          notes: data.notes,
          recordedById: userId,
          paymentDate: new Date(),
        })
        .returning();

      // 4. Update customer ledger
      await tx
        .update(customers)
        .set({
          payment: sql`${customers.payment} + ${data.amount}`,
          credit: sql`GREATEST(${customers.credit} - ${data.amount}, 0)`,
        })
        .where(eq(customers.id, slip.customerId));

      // 5. Wallet credit (if applicable)
      if (
        data.walletId &&
        (data.method === "cash" || data.method === "bank_transfer")
      ) {
        const wallet = await tx.query.wallets.findFirst({
          where: eq(wallets.id, data.walletId),
        });
        if (!wallet) throw new Error("Wallet not found");

        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.amount}` })
          .where(eq(wallets.id, data.walletId));

        await tx.insert(transactions).values({
          id: createId(),
          walletId: data.walletId,
          type: "credit",
          amount: data.amount.toString(),
          referenceId: payment.id,
          source: "Slip Recovery",
          performedById: userId,
        });
      }

      return {
        payment,
        slipClosed: isClosed,
        remainingDue: newDue,
      };
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// BULK RECONCILE
// Batch mode: reconcile multiple slips in a single transaction.
// Each slip gets a separate payment record but one wallet debit entry.
// ═══════════════════════════════════════════════════════════════════════════
export const bulkReconcileFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        entries: z.array(
          z.object({
            slipId: z.string().min(1),
            amount: z.number().positive(),
          }),
        ),
        method: z.enum(["cash", "bank_transfer"]).default("cash"),
        walletId: z.string().min(1),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.id, data.walletId),
      });
      if (!wallet) throw new Error("Wallet not found");

      let totalAmount = 0;
      const results: Array<{
        slipId: string;
        slipNumber: string;
        amount: number;
        slipClosed: boolean;
        remainingDue: number;
      }> = [];

      for (const entry of data.entries) {
        const slip = await tx.query.slipRecords.findFirst({
          where: eq(slipRecords.id, entry.slipId),
          with: { invoice: true },
        });

        if (!slip) throw new Error(`Slip ${entry.slipId} not found`);
        if (slip.status === "closed") continue; // skip already-closed

        const currentDue = Number(slip.amountDue);
        const amount = Math.min(entry.amount, currentDue);
        const newDue = Math.max(0, currentDue - amount);
        const newRecovered = Number(slip.amountRecovered) + amount;
        const isClosed = newDue === 0;

        await tx
          .update(slipRecords)
          .set({
            amountDue: newDue.toString(),
            amountRecovered: newRecovered.toString(),
            status: isClosed ? "closed" : "partially_recovered",
            reconciledAt: isClosed ? new Date() : null,
            recoveryStatus: isClosed ? null : (slip.recoveryStatus ?? "partially_paid"),
            recoveryAssignedToId: isClosed ? null : undefined,
            nextFollowUpDate: isClosed ? null : undefined,
            lastFollowUpDate: isClosed ? null : undefined,
            escalationLevel: isClosed ? 0 : undefined,
            updatedAt: new Date(),
          })
          .where(eq(slipRecords.id, entry.slipId));

        if (slip.invoice) {
          await tx
            .update(invoices)
            .set({
              credit: newDue.toString(),
              cash: sql`${invoices.cash} + ${amount}`,
              status: isClosed ? "paid" : "partially_paid",
            })
            .where(eq(invoices.id, slip.invoice.id));
        }

        await tx.insert(payments).values({
          id: createId(),
          customerId: slip.customerId,
          invoiceId: slip.invoiceId,
          amount: amount.toString(),
          method: data.method,
          reference: slip.slipNumber,
          notes: data.notes,
          recordedById: userId,
          paymentDate: new Date(),
        });

        await tx
          .update(customers)
          .set({
            payment: sql`${customers.payment} + ${amount}`,
            credit: sql`GREATEST(${customers.credit} - ${amount}, 0)`,
          })
          .where(eq(customers.id, slip.customerId));

        totalAmount += amount;
        results.push({
          slipId: entry.slipId,
          slipNumber: slip.slipNumber,
          amount,
          slipClosed: isClosed,
          remainingDue: newDue,
        });
      }

      // Single wallet debit for the whole batch
      if (totalAmount > 0) {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${totalAmount}` })
          .where(eq(wallets.id, data.walletId));

        await tx.insert(transactions).values({
          id: createId(),
          walletId: data.walletId,
          type: "credit",
          amount: totalAmount.toString(),
          referenceId: null,
          source: "Bulk Slip Recovery",
          performedById: userId,
        });
      }

      return { results, totalAmount };
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// GET OVERDUE SLIPS
// Configurable age threshold, grouped by salesman.
// ═══════════════════════════════════════════════════════════════════════════
export const getOverdueSlipsFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        daysOverdue: z.number().int().positive().default(7),
        salesmanId: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(50),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - data.daysOverdue);

    const conditions = [
      ne(slipRecords.status, "closed"),
      lte(slipRecords.issuedAt, cutoffDate),
      gt(slipRecords.amountDue, "0"),
    ];

    if (data.salesmanId) {
      conditions.push(eq(slipRecords.salesmanId, data.salesmanId));
    }

    const offset = (data.page - 1) * data.limit;

    const results = await db.query.slipRecords.findMany({
      where: and(...conditions),
      with: {
        customer: {
          columns: {
            id: true,
            name: true,
            city: true,
            mobileNumber: true,
            customerType: true,
          },
        },
        salesman: { columns: { id: true, name: true } },
        recoveryAssignedTo: { columns: { id: true, name: true } },
        invoice: {
          columns: {
            date: true,
            totalPrice: true,
            creditReturnDate: true,
          },
        },
      },
      orderBy: [asc(slipRecords.issuedAt)], // oldest first
      limit: data.limit,
      offset,
    });

    const [totalRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(slipRecords)
      .where(and(...conditions));

    // Group by salesman for summary
    const bySalesman = new Map<
      string,
      { salesmanName: string; count: number; totalDue: number }
    >();
    results.forEach((s) => {
      const key = s.salesmanId ?? "__unassigned__";
      const name = s.salesman?.name ?? "Unassigned";
      const entry = bySalesman.get(key) ?? { salesmanName: name, count: 0, totalDue: 0 };
      entry.count += 1;
      entry.totalDue += Number(s.amountDue);
      bySalesman.set(key, entry);
    });

    return {
      slips: results,
      total: Number(totalRes.count),
      pageCount: Math.ceil(Number(totalRes.count) / data.limit),
      groupedBySalesman: Object.fromEntries(bySalesman),
    };
  });

// ═══════════════════════════════════════════════════════════════════════════
// DAILY CLOSING SUMMARY
// All slips reconciled today, total recovered, open balance.
// ═══════════════════════════════════════════════════════════════════════════
export const getDailyClosingSummaryFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z.object({ date: z.string().optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const targetDate = data.date ? new Date(data.date) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Payments collected today
    const todayPayments = await db.query.payments.findMany({
      where: and(
        gte(payments.paymentDate, dayStart),
        lte(payments.paymentDate, dayEnd),
      ),
      with: {
        customer: { columns: { name: true, customerType: true } },
      },
    });

    const totalCash = todayPayments
      .filter((p) => p.method === "cash")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalBankTransfer = todayPayments
      .filter((p) => p.method === "bank_transfer")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalExpenseOffset = todayPayments
      .filter((p) => p.method === "expense_offset")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Slips issued today
    const todaySlips = await db.query.slipRecords.findMany({
      where: and(
        gte(slipRecords.issuedAt, dayStart),
        lte(slipRecords.issuedAt, dayEnd),
      ),
      columns: { status: true, amountDue: true, amountRecovered: true },
    });

    // Slips closed today
    const closedToday = await db.query.slipRecords.findMany({
      where: and(
        gte(slipRecords.reconciledAt, dayStart),
        lte(slipRecords.reconciledAt, dayEnd),
        eq(slipRecords.status, "closed"),
      ),
      columns: { slipNumber: true, amountRecovered: true, customerId: true },
    });

    return {
      date: targetDate.toISOString().split("T")[0],
      payments: todayPayments,
      totalCollected: totalCash + totalBankTransfer + totalExpenseOffset,
      totalCash,
      totalBankTransfer,
      totalExpenseOffset,
      slipsIssuedToday: todaySlips.length,
      slipsClosedToday: closedToday.length,
      closedSlips: closedToday,
    };
  });
