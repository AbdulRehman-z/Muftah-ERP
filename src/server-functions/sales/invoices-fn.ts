import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { createId } from "@paralleldrive/cuid2";
import { invoices, invoiceItems, customers } from "@/db/schemas/sales-schema";
import { finishedGoodsStock } from "@/db/schemas/inventory-schema";
import { transactions, wallets } from "@/db/schemas/finance-schema";
import {
  requireSalesManageMiddleware,
  requireSalesViewMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";
import { count, sql, eq, and, gte, lte, SQL, desc as drizzleDesc, asc as drizzleAsc, sum, gt } from "drizzle-orm";
import { createInvoiceSchema } from "@/db/zod_schemas";
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isValid,
} from "date-fns";

// ── Shared sort config ─────────────────────────────────────────────────────
const sortFields = {
  date: invoices.date,
  totalPrice: invoices.totalPrice,
  credit: invoices.credit,
  createdAt: invoices.createdAt,
} as const;

// ── Helper: build invoice status conditions ────────────────────────────────
const buildStatusCondition = (status: string): SQL | undefined => {
  if (status === "paid") return and(eq(invoices.credit, "0"), gt(invoices.cash, "0"));
  if (status === "credit") return and(eq(invoices.cash, "0"), gt(invoices.credit, "0"));
  if (status === "partial") return and(gt(invoices.cash, "0"), gt(invoices.credit, "0"));
  return undefined;
};

// ═══════════════════════════════════════════════════════════════════════════
// GET INVOICES (extended with advanced filters)
// ═══════════════════════════════════════════════════════════════════════════
export const getInvoicesFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().default(10),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      month: z.number().min(0).max(11).nullable().optional(),
      year: z.number().optional(),
      status: z.enum(["paid", "credit", "partial"]).optional(),
      customerType: z.enum(["distributor", "retailer"]).optional(),
      warehouseId: z.string().optional(),
      amountMin: z.number().min(0).optional(),
      amountMax: z.number().min(0).optional(),
      sortBy: z.enum(["date", "totalPrice", "credit", "createdAt"]).default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;
    const conditions: SQL[] = [];

    // Date range filters
    if (data.dateFrom) {
      const from = parseISO(data.dateFrom);
      if (isValid(from)) conditions.push(gte(invoices.date, from));
    }
    if (data.dateTo) {
      const to = parseISO(data.dateTo);
      if (isValid(to)) conditions.push(lte(invoices.date, to));
    }

    // Month/year filters
    if (data.month != null && data.year !== undefined) {
      const targetDate = new Date(data.year, data.month, 1);
      conditions.push(gte(invoices.date, startOfMonth(targetDate)));
      conditions.push(lte(invoices.date, endOfMonth(targetDate)));
    } else if (data.year !== undefined) {
      const targetDate = new Date(data.year, 0, 1);
      conditions.push(gte(invoices.date, startOfYear(targetDate)));
      conditions.push(lte(invoices.date, endOfYear(targetDate)));
    }

    // Status filter
    const statusCondition = buildStatusCondition(data.status ?? "");
    if (statusCondition) conditions.push(statusCondition);

    // Customer type filter (requires join)
    if (data.customerType) {
      conditions.push(eq(customers.customerType, data.customerType));
    }

    // Warehouse filter
    if (data.warehouseId) {
      conditions.push(eq(invoices.warehouseId, data.warehouseId));
    }

    // Amount range filters
    if (data.amountMin !== undefined) {
      conditions.push(gte(invoices.totalPrice, data.amountMin.toString()));
    }
    if (data.amountMax !== undefined) {
      conditions.push(lte(invoices.totalPrice, data.amountMax.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ value: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause);

    const sortColumn = sortFields[data.sortBy] ?? invoices.createdAt;

    const dataQuery = await db.query.invoices.findMany({
      where: whereClause,
      with: { customer: true, warehouse: true },
      limit: data.limit,
      offset,
      orderBy: data.sortOrder === "asc"
        ? [drizzleAsc(sortColumn)]
        : [drizzleDesc(sortColumn)],
    });

    return {
      data: dataQuery,
      total: Number(totalResult.value),
      pageCount: Math.ceil(Number(totalResult.value) / data.limit),
    };
  });

export const createInvoiceFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) => createInvoiceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      let totalAmount = 0;
      let totalWeightKg = 0;

      // ── Pre-flight stock validation ──────────────────────────────────────
      for (const item of data.items) {
        const stock = await tx.query.finishedGoodsStock.findFirst({
          where: and(
            eq(finishedGoodsStock.warehouseId, data.warehouseId),
            item.recipeId
              ? eq(finishedGoodsStock.recipeId, item.recipeId)
              : undefined,
          ),
          with: { recipe: true },
        });

        if (!stock) {
          throw new Error(`Stock record not found for "${item.pack}"`);
        }

        const containersPerCarton = stock.recipe.containersPerCarton || 1;
        const totalAvailableUnits =
          (stock.quantityCartons ?? 0) * containersPerCarton +
          (stock.quantityContainers ?? 0);

        const requestedUnits =
          item.unitType === "carton"
            ? item.numberOfCartons * containersPerCarton
            : item.numberOfUnits;

        if (requestedUnits > totalAvailableUnits) {
          throw new Error(
            `Not enough stock for "${item.pack}". ` +
            `Available: ${Math.floor(totalAvailableUnits / containersPerCarton)} cartons & ` +
            `${totalAvailableUnits % containersPerCarton} units.`,
          );
        }

        const lineAmount =
          item.unitType === "carton"
            ? item.numberOfCartons * item.perCartonPrice
            : item.numberOfUnits * (item.perCartonPrice / containersPerCarton);

        totalAmount += lineAmount;

        // Derive weight from fillAmount+fillUnit (ml ≈ g for detergents, g direct)
        // No weightPerContainer field exists on recipes schema — use fillAmount instead.
        if (stock.recipe.fillAmount && stock.recipe.fillUnit) {
          const fillGrams =
            stock.recipe.fillUnit === "ml" || stock.recipe.fillUnit === "g"
              ? Number(stock.recipe.fillAmount)
              : 0; // unsupported unit — skip
          totalWeightKg += requestedUnits * (fillGrams / 1000);
        }
      }

      const totalPayable = totalAmount + (data.expenses ?? 0);

      // BUG FIX: cash must not exceed total payable — prevents wallet inflation
      if (data.cash > totalPayable) {
        throw new Error(
          `Cash received (${data.cash}) cannot exceed total payable (${totalPayable.toFixed(2)})`,
        );
      }

      // BUG FIX: if credit > 0 but no creditReturnDate provided, reject early
      const computedCredit = Math.max(0, totalPayable - data.cash);
      if (computedCredit > 0 && !data.creditReturnDate) {
        throw new Error("A credit return date is required when credit balance remains.");
      }

      // ── Inline customer creation ─────────────────────────────────────────
      let customerId = data.customerId;
      if (!customerId && data.customerName) {
        const [newCustomer] = await tx
          .insert(customers)
          .values({
            name: data.customerName,
            mobileNumber: data.customerMobile,
            cnic: data.customerCnic,
            city: data.customerCity,
            state: data.customerState,
            bankAccount: data.customerBankAccount,
            customerType: data.customerType || "retailer",
          })
          .returning();
        customerId = newCustomer.id;
      }

      if (!customerId) {
        throw new Error("Customer is required to create an invoice.");
      }

      // ── Create invoice ───────────────────────────────────────────────────
      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerId,
          account: data.account,
          cash: data.cash.toString(),
          // Use server-computed credit, not whatever the client sent
          credit: computedCredit.toString(),
          creditReturnDate: data.creditReturnDate || null,
          expenses: (data.expenses ?? 0).toString(),
          expensesDescription: data.expensesDescription,
          amount: totalAmount.toString(),
          totalPrice: totalPayable.toString(),
          remarks: data.remarks,
          warehouseId: data.warehouseId,
          performedById: userId,
          date: new Date(),
        })
        .returning();

      // ── Wallet credit ────────────────────────────────────────────────────
      if (data.cash > 0 && data.account) {
        const wallet = await tx.query.wallets.findFirst({
          where: eq(wallets.id, data.account),
        });
        if (!wallet) throw new Error("Wallet not found");

        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.cash}` })
          .where(eq(wallets.id, data.account));

        await tx.insert(transactions).values({
          id: createId(),
          walletId: data.account,
          type: "credit",
          amount: data.cash.toString(),
          referenceId: invoice.id,
          source: "Sale",
          performedById: userId,
        });
      }

      // ── Add items & deduct stock ─────────────────────────────────────────
      for (const item of data.items) {
        if (!item.recipeId) continue;

        const stock = await tx.query.finishedGoodsStock.findFirst({
          where: and(
            eq(finishedGoodsStock.warehouseId, data.warehouseId),
            eq(finishedGoodsStock.recipeId, item.recipeId),
          ),
          with: { recipe: true },
        });

        if (!stock) continue;

        const containersPerCarton = stock.recipe.containersPerCarton || 1;
        const totalAvailableUnits =
          stock.quantityCartons * containersPerCarton + stock.quantityContainers;

        const requestedUnits =
          item.unitType === "carton"
            ? item.numberOfCartons * containersPerCarton
            : item.numberOfUnits;

        const remainingUnits = totalAvailableUnits - requestedUnits;

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityCartons: Math.floor(remainingUnits / containersPerCarton),
            quantityContainers: remainingUnits % containersPerCarton,
          })
          .where(
            and(
              eq(finishedGoodsStock.warehouseId, data.warehouseId),
              eq(finishedGoodsStock.recipeId, item.recipeId),
            ),
          );

        const lineAmount =
          item.unitType === "carton"
            ? item.numberOfCartons * item.perCartonPrice
            : item.numberOfUnits * (item.perCartonPrice / containersPerCarton);

        // Weight derived from fillAmount (no weightPerContainer on recipes schema)
        const fillGrams =
          stock.recipe.fillAmount &&
            (stock.recipe.fillUnit === "ml" || stock.recipe.fillUnit === "g")
            ? Number(stock.recipe.fillAmount)
            : 0;
        const lineWeightKg = requestedUnits * (fillGrams / 1000);

        // BUG FIX: margin was retailPrice - perCartonPrice (apples vs oranges).
        // Correct: compare per-unit selling price vs per-unit cost.
        const perUnitCost = item.perCartonPrice / containersPerCarton;
        const perUnitRetail = item.retailPrice;  // retailPrice is already per-unit MRP
        const unitMargin = perUnitRetail - perUnitCost;

        await tx.insert(invoiceItems).values({
          id: createId(),
          invoiceId: invoice.id,
          recipeId: item.recipeId,
          pack: item.pack,
          numberOfCartons: item.unitType === "carton" ? item.numberOfCartons : 0,
          quantity: item.unitType === "units" ? item.numberOfUnits : 0,
          perCartonPrice: item.perCartonPrice.toString(),
          amount: lineAmount.toString(),
          hsnCode: item.hsnCode,
          retailPrice: item.retailPrice.toString(),
          margin: unitMargin.toString(),
          totalWeight: lineWeightKg.toFixed(3),
        });
      }

      // ── Update customer ledger ───────────────────────────────────────────
      await tx
        .update(customers)
        .set({
          totalSale: sql`${customers.totalSale} + ${totalAmount}`,
          payment: sql`${customers.payment} + ${data.cash}`,
          credit: sql`${customers.credit} + ${computedCredit}`,
          weightSaleKg: sql`${customers.weightSaleKg} + ${totalWeightKg}`,
          expenses: sql`${customers.expenses} + ${data.expenses ?? 0}`,
        })
        .where(eq(customers.id, customerId));

      return invoice;
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// GET INVOICE DETAIL (single invoice with items, customer, warehouse)
// ═══════════════════════════════════════════════════════════════════════════
export const getInvoiceDetailFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z.object({ id: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, data.id),
      with: {
        customer: true,
        warehouse: true,
        items: true,
        performer: { columns: { id: true, name: true, email: true } },
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    return invoice;
  });

// ═══════════════════════════════════════════════════════════════════════════
// GET INVOICE STATS (KPI aggregates)
// ═══════════════════════════════════════════════════════════════════════════
export const getInvoiceStatsFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .handler(async () => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Total invoices count
    const [countResult] = await db
      .select({ value: count() })
      .from(invoices);

    // Total revenue (all time)
    const [revenueResult] = await db
      .select({ value: sum(invoices.totalPrice) })
      .from(invoices);

    // Total outstanding credit (all time)
    const [outstandingResult] = await db
      .select({ value: sum(invoices.credit) })
      .from(invoices)
      .where(gt(invoices.credit, "0"));

    // This month's revenue
    const [monthRevenueResult] = await db
      .select({ value: sum(invoices.totalPrice) })
      .from(invoices)
      .where(and(gte(invoices.date, monthStart), lte(invoices.date, monthEnd)));

    // Average invoice value
    const avgValue = countResult.value > 0
      ? Number(revenueResult.value ?? 0) / Number(countResult.value)
      : 0;

    return {
      totalInvoices: Number(countResult.value) || 0,
      totalRevenue: Number(revenueResult.value) || 0,
      totalOutstanding: Number(outstandingResult.value) || 0,
      monthRevenue: Number(monthRevenueResult.value) || 0,
      averageInvoiceValue: avgValue,
    };
  });

// ═══════════════════════════════════════════════════════════════════════════
// DELETE INVOICE (with ledger + stock rollback)
// ═══════════════════════════════════════════════════════════════════════════
export const deleteInvoiceFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) =>
    z.object({ id: z.string() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, data.id),
        with: { items: true, customer: true },
      });

      if (!invoice) {
        throw new Error("Invoice not found");
      }

      // Reverse customer ledger
      await tx
        .update(customers)
        .set({
          totalSale: sql`${customers.totalSale} - ${invoice.amount}`,
          payment: sql`${customers.payment} - ${invoice.cash}`,
          credit: sql`${customers.credit} - ${invoice.credit}`,
          weightSaleKg: sql`${customers.weightSaleKg} - ${invoice.items.reduce((acc, item) => acc + Number(item.totalWeight), 0)}`,
          expenses: sql`${customers.expenses} - ${invoice.expenses}`,
        })
        .where(eq(customers.id, invoice.customerId));

      // Reverse wallet transaction (if cash was received)
      const cashAmount = Number(invoice.cash);
      if (cashAmount > 0 && invoice.account) {
        const wallet = await tx.query.wallets.findFirst({
          where: eq(wallets.id, invoice.account),
        });
        if (wallet) {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${cashAmount}` })
            .where(eq(wallets.id, invoice.account));

          // Record reversal transaction
          await tx.insert(transactions).values({
            id: createId(),
            walletId: invoice.account,
            type: "debit",
            amount: cashAmount.toString(),
            referenceId: data.id,
            source: "Sale Reversal",
            performedById: userId,
          });
        }
      }

      // Restore stock
      for (const item of invoice.items) {
        if (!item.recipeId) continue;

        const stock = await tx.query.finishedGoodsStock.findFirst({
          where: and(
            eq(finishedGoodsStock.warehouseId, invoice.warehouseId),
            eq(finishedGoodsStock.recipeId, item.recipeId),
          ),
          with: { recipe: true },
        });

        if (!stock) continue;

        const containersPerCarton = stock.recipe.containersPerCarton || 1;
        const totalUnitsToRestore =
          item.numberOfCartons * containersPerCarton + item.quantity;
        const currentUnits =
          stock.quantityCartons * containersPerCarton + stock.quantityContainers;
        const newUnits = currentUnits + totalUnitsToRestore;

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityCartons: Math.floor(newUnits / containersPerCarton),
            quantityContainers: newUnits % containersPerCarton,
          })
          .where(
            and(
              eq(finishedGoodsStock.warehouseId, invoice.warehouseId),
              eq(finishedGoodsStock.recipeId, item.recipeId),
            ),
          );
      }

      // Delete invoice (cascade deletes items)
      await tx.delete(invoices).where(eq(invoices.id, data.id));

      return { success: true, id: data.id };
    });
  });
