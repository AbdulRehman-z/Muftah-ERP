import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { invoices, customers } from "@/db/schemas/sales-schema";
import { payments, slipRecords, salesmen } from "@/db/schemas/sales-erp-schema";
import {
  requireSalesViewMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";
import {
  eq,
  and,
  gte,
  lte,
  desc,
  asc,
  sql,
  sum,
  count,
} from "drizzle-orm";
import { parseISO, isValid } from "date-fns";

// ═══════════════════════════════════════════════════════════════════════════
// DISTRIBUTOR LEDGER
// Date-range query merging invoices + payments into running balance.
// Explicitly excludes TP/margin fields — distributors see net prices only.
// ═══════════════════════════════════════════════════════════════════════════
export const generateDistributorLedgerFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        customerId: z.string(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, data.customerId),
    });
    if (!customer) throw new Error("Customer not found");

    const conditions = [eq(invoices.customerId, data.customerId)];
    if (data.dateFrom) {
      const f = parseISO(data.dateFrom);
      if (isValid(f)) conditions.push(gte(invoices.date, f));
    }
    if (data.dateTo) {
      const t = parseISO(data.dateTo);
      if (isValid(t)) conditions.push(lte(invoices.date, t));
    }

    const invoiceRows = await db.query.invoices.findMany({
      where: and(...conditions),
      with: {
        items: {
          // Explicitly strip internal pricing columns
          columns: {
            pack: true,
            numberOfCartons: true,
            discountCartons: true,
            freeCartons: true,
            quantity: true,
            packsPerCarton: true,
            actualPackSize: true,
            perCartonPrice: true,
            amount: true,
            hsnCode: true,
            retailPrice: true,
            // tpPrice / marginPercent / priceAgreementId intentionally excluded
          },
        },
        warehouse: { columns: { name: true } },
      },
      orderBy: [asc(invoices.date)],
    });

    // Payments in same date range for this customer
    const paymentConditions = [eq(payments.customerId, data.customerId)];
    if (data.dateFrom) {
      const f = parseISO(data.dateFrom);
      if (isValid(f)) paymentConditions.push(gte(payments.paymentDate, f));
    }
    if (data.dateTo) {
      const t = parseISO(data.dateTo);
      if (isValid(t)) paymentConditions.push(lte(payments.paymentDate, t));
    }

    const paymentRows = await db.query.payments.findMany({
      where: and(...paymentConditions),
      orderBy: [asc(payments.paymentDate)],
      columns: {
        id: true,
        amount: true,
        method: true,
        reference: true,
        notes: true,
        paymentDate: true,
        invoiceId: true,
      },
    });

    // Merge into chronological ledger entries with running balance
    type LedgerEntry =
      | {
          type: "invoice";
          date: Date;
          slipNumber: string | null;
          warehouseName: string | null;
          totalPrice: number;
          cash: number;
          credit: number;
          status: string;
          runningBalance: number;
        }
      | {
          type: "payment";
          date: Date;
          reference: string | null;
          method: string;
          amount: number;
          notes: string | null;
          runningBalance: number;
        };

    const entries: LedgerEntry[] = [];

    // Build unified timeline
    const timeline: Array<{ date: Date; kind: "invoice" | "payment"; idx: number }> =
      [];
    invoiceRows.forEach((inv, i) =>
      timeline.push({ date: new Date(inv.date), kind: "invoice", idx: i }),
    );
    paymentRows.forEach((pay, i) =>
      timeline.push({ date: new Date(pay.paymentDate), kind: "payment", idx: i }),
    );
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;

    for (const t of timeline) {
      if (t.kind === "invoice") {
        const inv = invoiceRows[t.idx];
        const credit = Number(inv.credit);
        const cash = Number(inv.cash);
        const totalPrice = Number(inv.totalPrice);
        runningBalance += credit;
        entries.push({
          type: "invoice",
          date: new Date(inv.date),
          slipNumber: inv.slipNumber,
          warehouseName: inv.warehouse?.name ?? null,
          totalPrice,
          cash,
          credit,
          status: inv.status,
          runningBalance,
        });
      } else {
        const pay = paymentRows[t.idx];
        const amount = Number(pay.amount);
        runningBalance = Math.max(0, runningBalance - amount);
        entries.push({
          type: "payment",
          date: new Date(pay.paymentDate),
          reference: pay.reference,
          method: pay.method,
          amount,
          notes: pay.notes,
          runningBalance,
        });
      }
    }

    // Period aggregates
    const [agg] = await db
      .select({
        totalSales: sum(invoices.totalPrice),
        totalCash: sum(invoices.cash),
        totalCredit: sum(invoices.credit),
        invoiceCount: count(),
      })
      .from(invoices)
      .where(and(...conditions));

    const [payAgg] = await db
      .select({ totalPaid: sum(payments.amount) })
      .from(payments)
      .where(and(...paymentConditions));

    return {
      customer,
      entries,
      openingBalance: 0, // Could be computed from pre-period data if needed
      closingBalance: runningBalance,
      periodTotalSales: Number(agg.totalSales) || 0,
      periodTotalCash: Number(agg.totalCash) || 0,
      periodTotalCredit: Number(agg.totalCredit) || 0,
      periodPayments: Number(payAgg.totalPaid) || 0,
      invoiceCount: Number(agg.invoiceCount) || 0,
    };
  });

// ═══════════════════════════════════════════════════════════════════════════
// SHOPKEEPER LEDGER
// Same structure as distributor ledger but includes salesman + slip columns.
// ═══════════════════════════════════════════════════════════════════════════
export const getShopkeeperLedgerFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        customerId: z.string(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(20),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, data.customerId),
      with: {
        invoices: { columns: { id: true }, limit: 0 },
      },
    });
    if (!customer) throw new Error("Customer not found");

    const offset = (data.page - 1) * data.limit;
    const conditions = [eq(invoices.customerId, data.customerId)];
    if (data.dateFrom) {
      const f = parseISO(data.dateFrom);
      if (isValid(f)) conditions.push(gte(invoices.date, f));
    }
    if (data.dateTo) {
      const t = parseISO(data.dateTo);
      if (isValid(t)) conditions.push(lte(invoices.date, t));
    }

    const invoiceRows = await db.query.invoices.findMany({
      where: and(...conditions),
      with: {
        salesman: { columns: { name: true } },
        warehouse: { columns: { name: true } },
        items: {
          columns: {
            pack: true,
            numberOfCartons: true,
            discountCartons: true,
            freeCartons: true,
            quantity: true,
            perCartonPrice: true,
            amount: true,
            tpPrice: true,
            marginPercent: true,
            isPriceOverride: true,
            priceAgreementId: true,
          },
        },
      },
      orderBy: [desc(invoices.date)],
      limit: data.limit,
      offset,
    });

    const [totalRes] = await db
      .select({ count: count() })
      .from(invoices)
      .where(and(...conditions));

    // Slip status per invoice
    const slipMap = new Map<string, string>();
    const slipRows = await db.query.slipRecords.findMany({
      where: eq(slipRecords.customerId, data.customerId),
      columns: { invoiceId: true, status: true, amountDue: true, amountRecovered: true },
    });
    slipRows.forEach((s) => {
      if (s.invoiceId) slipMap.set(s.invoiceId, s.status);
    });

    const enrichedInvoices = invoiceRows.map((inv) => ({
      ...inv,
      slipStatus: slipMap.get(inv.id) ?? null,
    }));

    const [agg] = await db
      .select({
        totalSales: sum(invoices.totalPrice),
        totalCredit: sum(invoices.credit),
        totalCash: sum(invoices.cash),
      })
      .from(invoices)
      .where(and(...conditions));

    return {
      customer,
      invoices: enrichedInvoices,
      total: Number(totalRes.count),
      pageCount: Math.ceil(Number(totalRes.count) / data.limit),
      periodTotalSales: Number(agg.totalSales) || 0,
      periodTotalCredit: Number(agg.totalCredit) || 0,
      periodTotalCash: Number(agg.totalCash) || 0,
      outstandingBalance: Number(customer.credit),
    };
  });

// ═══════════════════════════════════════════════════════════════════════════
// SALESMAN SUMMARY
// Aggregate across all linked shopkeepers for a given salesman.
// ═══════════════════════════════════════════════════════════════════════════
export const getSalesmanSummaryFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        salesmanId: z.string(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const salesman = await db.query.salesmen.findFirst({
      where: eq(salesmen.id, data.salesmanId),
    });
    if (!salesman) throw new Error("Salesman not found");

    // All customers assigned to this salesman
    const linkedCustomers = await db.query.customers.findMany({
      where: eq(customers.salesmanId, data.salesmanId),
      columns: {
        id: true,
        name: true,
        city: true,
        credit: true,
        customerType: true,
        mobileNumber: true,
      },
    });
    const customerIds = linkedCustomers.map((c) => c.id);

    if (customerIds.length === 0) {
      return {
        salesman,
        customers: [],
        totalSales: 0,
        totalCredit: 0,
        totalCash: 0,
        outstandingBalance: 0,
        invoiceCount: 0,
      };
    }

    const conditions = [sql`${invoices.customerId} = ANY(${customerIds})`];
    if (data.dateFrom) {
      const f = parseISO(data.dateFrom);
      if (isValid(f)) conditions.push(gte(invoices.date, f));
    }
    if (data.dateTo) {
      const t = parseISO(data.dateTo);
      if (isValid(t)) conditions.push(lte(invoices.date, t));
    }

    const [agg] = await db
      .select({
        totalSales: sum(invoices.totalPrice),
        totalCredit: sum(invoices.credit),
        totalCash: sum(invoices.cash),
        invoiceCount: count(),
      })
      .from(invoices)
      .where(and(...conditions));

    // Per-customer outstanding balance
    const customersWithBalance = linkedCustomers.map((c) => ({
      ...c,
      outstandingBalance: Number(c.credit),
    }));

    const totalOutstanding = customersWithBalance.reduce(
      (acc, c) => acc + c.outstandingBalance,
      0,
    );

    return {
      salesman,
      customers: customersWithBalance,
      totalSales: Number(agg.totalSales) || 0,
      totalCredit: Number(agg.totalCredit) || 0,
      totalCash: Number(agg.totalCash) || 0,
      outstandingBalance: totalOutstanding,
      invoiceCount: Number(agg.invoiceCount) || 0,
    };
  });
