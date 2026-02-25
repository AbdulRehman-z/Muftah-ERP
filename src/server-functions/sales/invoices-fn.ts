import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { createId } from "@paralleldrive/cuid2";
import { invoices, invoiceItems, customers } from "@/db/schemas/sales-schema";
import { finishedGoodsStock } from "@/db/schemas/inventory-schema";
import { transactions, wallets } from "@/db/schemas/finance-schema";
import { requireAuthMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { count, sql, eq, and, gte, lte, SQL } from "drizzle-orm";
import { createInvoiceSchema } from "@/db/zod_schemas";
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isValid,
} from "date-fns";

export const getInvoicesFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator((input: any) =>
    z.object({
      page: z.number().int().positive().default(1),
      limit: z.number().int().positive().default(7),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      // BUG FIX: month=0 (January) is valid — use null instead of undefined
      // to distinguish "not set" from "January"
      month: z.number().min(0).max(11).nullable().optional(),
      year: z.number().optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;
    const conditions: SQL[] = [];

    // BUG FIX: previously skipped if only one of dateFrom/dateTo was set.
    // Now each bound is applied independently so partial ranges work.
    if (data.dateFrom) {
      const from = parseISO(data.dateFrom);
      if (isValid(from)) conditions.push(gte(invoices.date, from));
    }
    if (data.dateTo) {
      const to = parseISO(data.dateTo);
      if (isValid(to)) conditions.push(lte(invoices.date, to));
    }

    // BUG FIX: month=0 (January) is falsy — use !== null/undefined explicitly
    if (data.month != null && data.year !== undefined) {
      const targetDate = new Date(data.year, data.month, 1);
      conditions.push(gte(invoices.date, startOfMonth(targetDate)));
      conditions.push(lte(invoices.date, endOfMonth(targetDate)));
    } else if (data.year !== undefined) {
      const targetDate = new Date(data.year, 0, 1);
      conditions.push(gte(invoices.date, startOfYear(targetDate)));
      conditions.push(lte(invoices.date, endOfYear(targetDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ value: count() })
      .from(invoices)
      .where(whereClause);

    const dataQuery = await db.query.invoices.findMany({
      where: whereClause,
      with: { customer: true },
      limit: data.limit,
      offset,
      orderBy: (invoices, { desc }) => [desc(invoices.createdAt)],
    });

    return {
      data: dataQuery,
      total: totalResult.value,
      pageCount: Math.ceil(totalResult.value / data.limit),
    };
  });

export const createInvoiceFn = createServerFn()
  .middleware([requireAuthMiddleware])
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