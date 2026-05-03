import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { createId } from "@paralleldrive/cuid2";
import { invoices, invoiceItems, customers } from "@/db/schemas/sales-schema";
import { customerPriceAgreements, payments, slipRecords, promotionalRules, customerDiscountRules, priceChangeLog } from "@/db/schemas/sales-erp-schema";
import { finishedGoodsStock } from "@/db/schemas/inventory-schema";
import { transactions, wallets } from "@/db/schemas/finance-schema";
import { resolvePrice, type PriceAgreement } from "@/lib/sales/price-engine";
import type { CustomerDiscountRule } from "@/lib/sales/discount-engine";
import { evaluateCustomerDiscount } from "@/lib/sales/discount-engine";
import {
  requireSalesManageMiddleware,
  requireSalesViewMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";
import { count, sql, eq, and, gte, lte, like, SQL, desc as drizzleDesc, asc as drizzleAsc, sum, gt, or, isNull } from "drizzle-orm";
import { createInvoiceSchema, updateInvoiceSchema } from "@/db/zod_schemas";
import {
  startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, isValid, endOfDay,
} from "date-fns";

/**
 * Returns the effective containers-per-carton for a line item.
 * packsPerCarton = 0 means "use recipe default".
 * Falls back to 1 if both are zero/falsy.
 */
export function effectiveCPP(packsPerCarton: number, recipeContainersPerCarton: number): number {
  return (packsPerCarton > 0 ? packsPerCarton : recipeContainersPerCarton) || 1;
}

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
      search: z.string().optional(),
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
      if (isValid(to)) conditions.push(lte(invoices.date, endOfDay(to)));
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

    // Slip number search filter
    if (data.search) {
      conditions.push(like(invoices.slipNumber, `%${data.search}%`));
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
            salesmanId: data.salesmanId || null,
          })
          .returning();
        customerId = newCustomer.id;
      }

      if (!customerId) {
        throw new Error("Customer is required to create an invoice.");
      }

      // Fetch pricing agreements + active promo rules + customer discount rules in one go
      const [agreements, activePromos, activeCustomerDiscountRules] = await Promise.all([
        tx.query.customerPriceAgreements.findMany({
          where: eq(customerPriceAgreements.customerId, customerId),
        }).then((rows) => rows as PriceAgreement[]),
        tx.query.promotionalRules.findMany({
          where: and(
            lte(promotionalRules.activeFrom, new Date()),
            sql`(${promotionalRules.activeTo} IS NULL OR ${promotionalRules.activeTo} > NOW())`,
          ),
        }),
        tx.query.customerDiscountRules.findMany({
          where: and(
            eq(customerDiscountRules.customerId, customerId),
            lte(customerDiscountRules.effectiveFrom, new Date()),
            or(
              isNull(customerDiscountRules.effectiveTo),
              gte(customerDiscountRules.effectiveTo, new Date())
            )
          ),
        }).then((rows) => rows as CustomerDiscountRule[]),
      ]);

      // Fetch current customer type for promo eligibility check
      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
        columns: { customerType: true },
      });
      const customerType = customer?.customerType ?? data.customerType ?? "retailer";

      // Cache discount rules by productId for performance (Requirement 15.4)
      const discountRulesByProduct = new Map<string, CustomerDiscountRule[]>();
      for (const rule of activeCustomerDiscountRules) {
        if (!discountRulesByProduct.has(rule.productId)) {
          discountRulesByProduct.set(rule.productId, []);
        }
        discountRulesByProduct.get(rule.productId)!.push(rule);
      }

      // ── Single-pass: validate stock + resolve prices + compute totals ─────
      type LineResolution = {
        item: (typeof data.items)[0];
        stock: NonNullable<Awaited<ReturnType<typeof tx.query.finishedGoodsStock.findFirst>>>;
        containersPerCarton: number;
        requestedUnits: number;
        discountUnits: number;
        promoFreeCartons: number;
        totalDispatchedUnits: number;
        finalPerCartonPrice: number;
        tpPrice: number | null;
        marginPercent: number | null;
        agreementId: string | null;
        promoRuleId: string | null;
        customerDiscountRuleId: string | null;
        customerDiscountAmount: number;
        lineAmount: number;
        lineWeightKg: number;
        fillGrams: number;
        productId: string | null;
      };

      const lineResolutions: LineResolution[] = [];
      let totalAmount = 0;
      let totalWeightKg = 0;

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

        const containersPerCarton = effectiveCPP(
          item.packsPerCarton ?? 0,
          stock.recipe.containersPerCarton ?? 0,
        );
        const totalAvailableUnits =
          (stock.quantityCartons ?? 0) * containersPerCarton +
          (stock.quantityContainers ?? 0);

        const requestedUnits =
          item.unitType === "carton"
            ? item.numberOfCartons * containersPerCarton
            : item.numberOfUnits;

        // Manual discount cartons (UI-entered)
        const manualDiscountUnits =
          item.unitType === "carton"
            ? (item.discountCartons ?? 0) * containersPerCarton
            : 0;

        // ── Promo rule evaluation ────────────────────────────────────────
        // Find matching active promo for this product
        let promoFreeCartons = 0;
        let matchedPromoRuleId: string | null = null;

        if (item.unitType === "carton" && stock.recipe.productId) {
          const matchingPromo = activePromos.find(
            (p) =>
              p.productId === stock.recipe.productId &&
              (p.eligibleCustomerType === "all" ||
                p.eligibleCustomerType === customerType),
          );
          if (matchingPromo && item.numberOfCartons >= matchingPromo.buyQty) {
            // Floor division: buy 3 get 1 → 6 cartons = 2 free
            promoFreeCartons =
              Math.floor(item.numberOfCartons / matchingPromo.buyQty) *
              matchingPromo.freeQty;
            matchedPromoRuleId = matchingPromo.id;
          }
        }

        const promoFreeUnits = promoFreeCartons * containersPerCarton;
        const totalDiscountUnits = manualDiscountUnits + promoFreeUnits;
        const totalDispatchedUnits = requestedUnits + totalDiscountUnits;

        if (totalDispatchedUnits > totalAvailableUnits) {
          throw new Error(
            `Not enough stock for "${item.pack}". ` +
              `Available: ${Math.floor(totalAvailableUnits / containersPerCarton)} cartons & ` +
              `${totalAvailableUnits % containersPerCarton} units.`,
          );
        }

        // ── Price resolution ─────────────────────────────────────────────
        let finalPerCartonPrice = item.perCartonPrice;
        let tpPrice: number | null = null;
        let marginPct: number | null = null;
        let agreementId: string | null = null;

        if (!item.isPriceOverride && stock.recipe.productId) {
          const resolution = resolvePrice(
            customerId,
            stock.recipe.productId,
            containersPerCarton,
            stock.recipe.containersPerCarton ?? 1,
            item.perCartonPrice,
            agreements,
          );
          finalPerCartonPrice = resolution.cartonPrice;
          tpPrice = resolution.tpBaseline;
          marginPct = resolution.marginPercent;
          agreementId = resolution.agreementId;
        }

        // Line amount: billed qty only (discount/promo cartons are free)
        // Formula from Requirement 1.1: (numberOfCartons × perCartonPrice) + (quantity × perCartonPrice ÷ packsPerCarton)
        // Support both cartons and loose packs on the same line item
        const numberOfCartonsToCharge = item.unitType === "carton" ? item.numberOfCartons : 0;
        const numberOfUnitsToCharge = item.unitType === "units" ? item.numberOfUnits : 0;
        
        const cartonsAmount = numberOfCartonsToCharge * finalPerCartonPrice;
        const loosePacksAmount = numberOfUnitsToCharge * (finalPerCartonPrice / containersPerCarton);
        
        // Base amount before customer discount
        const baseAmount = cartonsAmount + loosePacksAmount;
        
        // Apply promotional discount (freeCartons)
        const promoDiscount = promoFreeCartons * finalPerCartonPrice;
        const amountAfterPromo = baseAmount - promoDiscount;
        
        // ── Customer Discount Evaluation (Task 8.2) ──────────────────────
        // Evaluate customer discount AFTER promotional rules but BEFORE final amount
        // Skip if isPriceOverride is true (Requirement 7.1)
        let customerDiscountAmount = 0;
        let customerDiscountRuleId: string | null = null;
        
        if (!item.isPriceOverride && stock.recipe.productId) {
          const productDiscountRules = discountRulesByProduct.get(stock.recipe.productId) || [];
          const discountResolution = evaluateCustomerDiscount(
            customerId,
            stock.recipe.productId,
            item.numberOfCartons,
            finalPerCartonPrice,
            customerType,
            productDiscountRules
          );
          
          customerDiscountAmount = discountResolution.discountAmount;
          customerDiscountRuleId = discountResolution.ruleId;
        }
        
        // Final line amount: base - promo - customer discount, clamped to zero (Requirement 5.5)
        const lineAmount = Math.max(0, amountAfterPromo - customerDiscountAmount);

        totalAmount += lineAmount;

        const fillGrams =
          stock.recipe.fillAmount &&
          (stock.recipe.fillUnit === "ml" || stock.recipe.fillUnit === "g")
            ? Number(stock.recipe.fillAmount)
            : 0;
        const lineWeightKg = totalDispatchedUnits * (fillGrams / 1000);
        totalWeightKg += lineWeightKg;

        lineResolutions.push({
          item,
          stock,
          containersPerCarton,
          requestedUnits,
          discountUnits: totalDiscountUnits,
          promoFreeCartons,
          totalDispatchedUnits,
          finalPerCartonPrice,
          tpPrice,
          marginPercent: marginPct,
          agreementId,
          promoRuleId: matchedPromoRuleId,
          customerDiscountRuleId,
          customerDiscountAmount,
          lineAmount,
          lineWeightKg,
          fillGrams,
          productId: stock.recipe.productId,
        });
      }

      const totalPayable = totalAmount + (data.expenses ?? 0);

      // cash must not exceed total payable
      if (data.cash > totalPayable) {
        throw new Error(
          `Cash received (${data.cash}) cannot exceed total payable (${totalPayable.toFixed(2)})`,
        );
      }

      const computedCredit = Math.max(0, totalPayable - data.cash);
      if (computedCredit > 0 && !data.creditReturnDate) {
        throw new Error(
          "A credit return date is required when credit balance remains.",
        );
      }

      // Derive invoice status from payment amounts
      const invoiceStatus =
        computedCredit === 0
          ? "paid"
          : data.cash > 0
            ? "partially_paid"
            : "saved";

      // ── Create invoice ────────────────────────────────────────────────────
      const [invoice] = await tx
        .insert(invoices)
        .values({
          customerId,
          account: data.account,
          cash: data.cash.toString(),
          credit: computedCredit.toString(),
          creditReturnDate: data.creditReturnDate || null,
          expenses: (data.expenses ?? 0).toString(),
          expensesDescription: data.expensesDescription,
          amount: totalAmount.toString(),
          totalPrice: totalPayable.toString(),
          remarks: data.remarks,
          warehouseId: data.warehouseId,
          performedById: userId,
          salesmanId: data.salesmanId || null,
          status: invoiceStatus,
          date: new Date(),
        })
        .returning();

      const slipNumber = `INV-${invoice.sNo}`;

      // Set slip number
      await tx
        .update(invoices)
        .set({ slipNumber })
        .where(eq(invoices.id, invoice.id));

      // ── Create slip record ────────────────────────────────────────────────
      await tx.insert(slipRecords).values({
        id: createId(),
        slipNumber,
        invoiceId: invoice.id,
        customerId,
        salesmanId: data.salesmanId || null,
        amountDue: computedCredit.toString(),
        amountRecovered: data.cash.toString(),
        status: computedCredit === 0 ? "closed" : "open",
        issuedAt: new Date(),
      });

      // ── Wallet credit ─────────────────────────────────────────────────────
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

        await tx.insert(payments).values({
          id: createId(),
          customerId,
          invoiceId: invoice.id,
          amount: data.cash.toString(),
          method: "cash",
          reference: slipNumber,
          recordedById: userId,
          paymentDate: new Date(),
          notes: "Initial payment on invoice creation",
        });
      }

      // ── Insert line items + deduct stock (single loop, uses cached resolutions) ──
      for (const r of lineResolutions) {
        if (!r.item.recipeId) continue;

        const totalAvailableUnits =
          r.stock.quantityCartons * r.containersPerCarton +
          r.stock.quantityContainers;
        const remainingUnits = totalAvailableUnits - r.totalDispatchedUnits;

        const hasCartons =
          (r.stock as any).recipe?.cartonPackagingId != null &&
          (r.stock as any).recipe?.containersPerCarton != null &&
          (r.stock as any).recipe?.containersPerCarton > 0;

        const finalQuantityCartons = hasCartons
          ? Math.floor(remainingUnits / r.containersPerCarton)
          : 0;
        const finalQuantityContainers = hasCartons
          ? remainingUnits % r.containersPerCarton
          : remainingUnits;

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityCartons: finalQuantityCartons,
            quantityContainers: finalQuantityContainers,
          })
          .where(
            and(
              eq(finishedGoodsStock.warehouseId, data.warehouseId),
              eq(finishedGoodsStock.recipeId, r.item.recipeId),
            ),
          );

        const perUnitCost = r.finalPerCartonPrice / r.containersPerCarton;
        const unitMargin = r.item.retailPrice - perUnitCost;
        const manualDiscountCartons =
          r.item.unitType === "carton" ? (r.item.discountCartons ?? 0) : 0;

        await tx.insert(invoiceItems).values({
          id: createId(),
          invoiceId: invoice.id,
          recipeId: r.item.recipeId,
          pack: r.item.pack,
          numberOfCartons:
            r.item.unitType === "carton" ? r.item.numberOfCartons : 0,
          discountCartons: manualDiscountCartons,
          freeCartons: r.promoFreeCartons,
          quantity: r.item.unitType === "units" ? r.item.numberOfUnits : 0,
          packsPerCarton: r.item.packsPerCarton ?? 0,
          actualPackSize: r.containersPerCarton,
          perCartonPrice: r.finalPerCartonPrice.toString(),
          amount: r.lineAmount.toString(),
          hsnCode: r.item.hsnCode,
          retailPrice: r.item.retailPrice.toString(),
          margin: unitMargin.toString(),
          totalWeight: r.lineWeightKg.toFixed(3),
          tpPrice: r.tpPrice !== null ? r.tpPrice.toString() : null,
          marginPercent:
            r.marginPercent !== null ? r.marginPercent.toString() : null,
          isPriceOverride: r.item.isPriceOverride,
          priceAgreementId: r.agreementId,
          promoRuleId: r.promoRuleId,
          customerDiscountRuleId: r.customerDiscountRuleId,
          customerDiscountAmount: r.customerDiscountAmount !== undefined 
            ? r.customerDiscountAmount.toString() 
            : "0",
        });

        // ── Log pricing decision to audit trail (Task 8.3) ────────────────
        // Log the pricing decision for this invoice item
        // Requirement 8.5: Create price_change_log entry with source "invoice_calculation"
        if (r.productId) {
          await tx.insert(priceChangeLog).values({
            id: createId(),
            productId: r.productId,
            customerId: customerId,
            oldPrice: r.item.perCartonPrice.toString(), // Original price before resolution
            newPrice: r.finalPerCartonPrice.toString(), // Final resolved price
            changedById: userId,
            source: "invoice_calculation",
            invoiceId: invoice.id,
            metadata: {
              priceAgreementId: r.agreementId,
              promoRuleId: r.promoRuleId,
              customerDiscountRuleId: r.customerDiscountRuleId,
              customerDiscountAmount: r.customerDiscountAmount,
              isPriceOverride: r.item.isPriceOverride,
            },
          });
        }
      }

      // ── Update customer ledger ────────────────────────────────────────────
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

      return { ...invoice, slipNumber };
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
// GET INVOICE STATS (KPI aggregates, accepts same filters as list)
// ═══════════════════════════════════════════════════════════════════════════
export const getInvoiceStatsFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      status: z.enum(["paid", "credit", "partial"]).optional(),
      customerType: z.enum(["distributor", "retailer"]).optional(),
      warehouseId: z.string().optional(),
      amountMin: z.number().min(0).optional(),
      amountMax: z.number().min(0).optional(),
    }).passthrough().parse(input),
  )
  .handler(async ({ data }) => {
    const conditions: SQL[] = [];

    if (data.dateFrom) {
      const from = parseISO(data.dateFrom);
      if (isValid(from)) conditions.push(gte(invoices.date, from));
    }
    if (data.dateTo) {
      const to = parseISO(data.dateTo);
      if (isValid(to)) conditions.push(lte(invoices.date, endOfDay(to)));
    }

    const statusCondition = buildStatusCondition(data.status ?? "");
    if (statusCondition) conditions.push(statusCondition);

    if (data.customerType) {
      conditions.push(eq(customers.customerType, data.customerType));
    }

    if (data.warehouseId) {
      conditions.push(eq(invoices.warehouseId, data.warehouseId));
    }

    if (data.amountMin !== undefined) {
      conditions.push(gte(invoices.totalPrice, data.amountMin.toString()));
    }
    if (data.amountMax !== undefined) {
      conditions.push(lte(invoices.totalPrice, data.amountMax.toString()));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Total invoices count
    const [countResult] = await db
      .select({ value: count() })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause);

    // Total revenue
    const [revenueResult] = await db
      .select({ value: sum(invoices.totalPrice) })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(whereClause);

    // Total outstanding credit
    const outstandingConditions = [...conditions, gt(invoices.credit, "0")];
    const outstandingWhere = outstandingConditions.length > 0 ? and(...outstandingConditions) : undefined;

    const [outstandingResult] = await db
      .select({ value: sum(invoices.credit) })
      .from(invoices)
      .leftJoin(customers, eq(invoices.customerId, customers.id))
      .where(outstandingWhere);

    // Average invoice value
    const avgValue = countResult.value > 0
      ? Number(revenueResult.value ?? 0) / Number(countResult.value)
      : 0;

    return {
      totalInvoices: Number(countResult.value) || 0,
      totalRevenue: Number(revenueResult.value) || 0,
      totalOutstanding: Number(outstandingResult.value) || 0,
      monthRevenue: Number(revenueResult.value) || 0, // same as totalRevenue when filtered
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

        const containersPerCarton = effectiveCPP(item.packsPerCarton ?? 0, stock.recipe.containersPerCarton ?? 0);
        const totalUnitsToRestore =
          item.numberOfCartons * containersPerCarton +
          (item.discountCartons ?? 0) * containersPerCarton +
          item.quantity;
        const currentUnits =
          stock.quantityCartons * containersPerCarton + stock.quantityContainers;
        const newUnits = currentUnits + totalUnitsToRestore;

        const hasCartons = stock.recipe.cartonPackagingId != null && stock.recipe.containersPerCarton != null && stock.recipe.containersPerCarton > 0;
        const finalQuantityCartons = hasCartons ? Math.floor(newUnits / containersPerCarton) : 0;
        const finalQuantityContainers = hasCartons ? (newUnits % containersPerCarton) : newUnits;

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityCartons: finalQuantityCartons,
            quantityContainers: finalQuantityContainers,
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
// ═══════════════════════════════════════════════════════════════════════════
// UPDATE INVOICE
// ═══════════════════════════════════════════════════════════════════════════
export const updateInvoiceFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) => updateInvoiceSchema.parse(input))
  .handler(async ({ data, context }) => {
    const userId = context.session.user.id;

    return await db.transaction(async (tx) => {
      // 1. Fetch existing invoice
      const existing = await tx.query.invoices.findFirst({
        where: eq(invoices.id, data.id),
        with: { items: true },
      });

      if (!existing) throw new Error("Invoice not found");

      const customerId = existing.customerId;

      // 2. Reverse OLD changes
      
      // Reverse Stock
      for (const oldItem of existing.items) {
        if (!oldItem.recipeId) continue;
        
        const cpp = oldItem.actualPackSize ?? 1;
        const oldUnits = oldItem.numberOfCartons > 0 
          ? (Number(oldItem.numberOfCartons) + Number(oldItem.discountCartons) + Number(oldItem.freeCartons)) * cpp
          : Number(oldItem.quantity);

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityContainers: sql`${finishedGoodsStock.quantityContainers} + ${oldUnits}`,
          })
          .where(
            and(
              eq(finishedGoodsStock.warehouseId, existing.warehouseId),
              eq(finishedGoodsStock.recipeId, oldItem.recipeId),
            )
          );
          
        // Note: We'll re-normalize cartons/containers in the next step when we deduct new stock
      }

      // Reverse Ledger/Customer Stats
      const oldTotalWeight = existing.items.reduce((acc, it) => acc + Number(it.totalWeight), 0);
      await tx
        .update(customers)
        .set({
          totalSale: sql`${customers.totalSale} - ${Number(existing.amount)}`,
          payment: sql`${customers.payment} - ${Number(existing.cash)}`,
          credit: sql`${customers.credit} - ${Number(existing.credit)}`,
          weightSaleKg: sql`${customers.weightSaleKg} - ${oldTotalWeight}`,
          expenses: sql`${customers.expenses} - ${Number(existing.expenses)}`,
        })
        .where(eq(customers.id, customerId));

      // Reverse Wallet/Transaction if cash was paid
      if (Number(existing.cash) > 0 && existing.account) {
          await tx
            .update(wallets)
            .set({ balance: sql`${wallets.balance} - ${existing.cash}` })
            .where(eq(wallets.id, existing.account));
            
          await tx.delete(transactions).where(and(eq(transactions.referenceId, existing.id), eq(transactions.source, "Sale")));
          await tx.delete(payments).where(and(eq(payments.invoiceId, existing.id), eq(payments.notes, "Initial payment on invoice creation")));
      }

      // Delete OLD items
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, existing.id));

      // 3. Apply NEW changes (Re-use logic from createInvoiceFn)
      
      // Fetch pricing agreements + active promo rules + customer discount rules
      const [agreements, activePromos, activeCustomerDiscountRules] = await Promise.all([
        tx.query.customerPriceAgreements.findMany({
          where: eq(customerPriceAgreements.customerId, customerId),
        }).then((rows) => rows as PriceAgreement[]),
        tx.query.promotionalRules.findMany({
          where: and(
            lte(promotionalRules.activeFrom, new Date()),
            sql`(${promotionalRules.activeTo} IS NULL OR ${promotionalRules.activeTo} > NOW())`,
          ),
        }),
        tx.query.customerDiscountRules.findMany({
          where: and(
            eq(customerDiscountRules.customerId, customerId),
            lte(customerDiscountRules.effectiveFrom, new Date()),
            or(
              isNull(customerDiscountRules.effectiveTo),
              gte(customerDiscountRules.effectiveTo, new Date())
            )
          ),
        }).then((rows) => rows as CustomerDiscountRule[]),
      ]);

      const customer = await tx.query.customers.findFirst({
        where: eq(customers.id, customerId),
        columns: { customerType: true },
      });
      const customerType = customer?.customerType ?? "retailer";

      // Cache discount rules by productId for performance (Requirement 15.4)
      const discountRulesByProduct = new Map<string, CustomerDiscountRule[]>();
      for (const rule of activeCustomerDiscountRules) {
        if (!discountRulesByProduct.has(rule.productId)) {
          discountRulesByProduct.set(rule.productId, []);
        }
        discountRulesByProduct.get(rule.productId)!.push(rule);
      }

      const lineResolutions: any[] = [];
      let totalAmount = 0;
      let totalWeightKg = 0;

      for (const item of data.items) {
        const stock = await tx.query.finishedGoodsStock.findFirst({
          where: and(
            eq(finishedGoodsStock.warehouseId, data.warehouseId),
            eq(finishedGoodsStock.recipeId, item.recipeId),
          ),
          with: { recipe: true },
        });

        if (!stock) throw new Error(`Stock record not found for "${item.pack}"`);

        const containersPerCarton = effectiveCPP(
          item.packsPerCarton ?? 0,
          stock.recipe.containersPerCarton ?? 0,
        );
        const totalAvailableUnits =
          (stock.quantityCartons ?? 0) * containersPerCarton +
          (stock.quantityContainers ?? 0);

        const requestedUnits =
          item.unitType === "carton"
            ? item.numberOfCartons * containersPerCarton
            : item.numberOfUnits;

        const manualDiscountUnits =
          item.unitType === "carton"
            ? (item.discountCartons ?? 0) * containersPerCarton
            : 0;

        let promoFreeCartons = 0;
        let matchedPromoRuleId: string | null = null;

        if (item.unitType === "carton" && stock.recipe.productId) {
          const matchingPromo = activePromos.find(
            (p) =>
              p.productId === stock.recipe.productId &&
              (p.eligibleCustomerType === "all" ||
                p.eligibleCustomerType === customerType),
          );
          if (matchingPromo && item.numberOfCartons >= matchingPromo.buyQty) {
            promoFreeCartons =
              Math.floor(item.numberOfCartons / matchingPromo.buyQty) *
              matchingPromo.freeQty;
            matchedPromoRuleId = matchingPromo.id;
          }
        }

        const promoFreeUnits = promoFreeCartons * containersPerCarton;
        const totalDiscountUnits = manualDiscountUnits + promoFreeUnits;
        const totalDispatchedUnits = requestedUnits + totalDiscountUnits;

        if (totalDispatchedUnits > totalAvailableUnits) {
          throw new Error(
            `Not enough stock for "${item.pack}". Available: ${Math.floor(totalAvailableUnits / containersPerCarton)} cartons & ${totalAvailableUnits % containersPerCarton} units.`,
          );
        }

        let finalPerCartonPrice = item.perCartonPrice;
        let tpPrice: number | null = null;
        let marginPct: number | null = null;
        let agreementId: string | null = null;

        if (!item.isPriceOverride && stock.recipe.productId) {
          const resolution = resolvePrice(
            customerId,
            stock.recipe.productId,
            containersPerCarton,
            stock.recipe.containersPerCarton ?? 1,
            item.perCartonPrice,
            agreements,
          );
          finalPerCartonPrice = resolution.cartonPrice;
          tpPrice = resolution.tpBaseline;
          marginPct = resolution.marginPercent;
          agreementId = resolution.agreementId;
        }

        // Formula from Requirement 1.1: (numberOfCartons × perCartonPrice) + (quantity × perCartonPrice ÷ packsPerCarton)
        // Support both cartons and loose packs on the same line item
        const numberOfCartonsToCharge = item.unitType === "carton" ? item.numberOfCartons : 0;
        const numberOfUnitsToCharge = item.unitType === "units" ? item.numberOfUnits : 0;
        
        const cartonsAmount = numberOfCartonsToCharge * finalPerCartonPrice;
        const loosePacksAmount = numberOfUnitsToCharge * (finalPerCartonPrice / containersPerCarton);
        
        // Base amount before customer discount
        const baseAmount = cartonsAmount + loosePacksAmount;
        
        // Apply promotional discount (freeCartons)
        const promoDiscount = promoFreeCartons * finalPerCartonPrice;
        const amountAfterPromo = baseAmount - promoDiscount;
        
        // ── Customer Discount Evaluation (Task 8.2) ──────────────────────
        // Evaluate customer discount AFTER promotional rules but BEFORE final amount
        // Skip if isPriceOverride is true (Requirement 7.1)
        let customerDiscountAmount = 0;
        let customerDiscountRuleId: string | null = null;
        
        if (!item.isPriceOverride && stock.recipe.productId) {
          const productDiscountRules = discountRulesByProduct.get(stock.recipe.productId) || [];
          const discountResolution = evaluateCustomerDiscount(
            customerId,
            stock.recipe.productId,
            item.numberOfCartons,
            finalPerCartonPrice,
            customerType,
            productDiscountRules
          );
          
          customerDiscountAmount = discountResolution.discountAmount;
          customerDiscountRuleId = discountResolution.ruleId;
        }
        
        // Final line amount: base - promo - customer discount, clamped to zero (Requirement 5.5)
        const lineAmount = Math.max(0, amountAfterPromo - customerDiscountAmount);

        totalAmount += lineAmount;

        const fillGrams =
          stock.recipe.fillAmount &&
          (stock.recipe.fillUnit === "ml" || stock.recipe.fillUnit === "g")
            ? Number(stock.recipe.fillAmount)
            : 0;
        const lineWeightKg = totalDispatchedUnits * (fillGrams / 1000);
        totalWeightKg += lineWeightKg;

        lineResolutions.push({
          item,
          stock,
          containersPerCarton,
          requestedUnits: requestedUnits,
          discountUnits: totalDiscountUnits,
          totalDispatchedUnits,
          finalPerCartonPrice,
          tpPrice,
          marginPercent: marginPct,
          agreementId,
          promoRuleId: matchedPromoRuleId,
          customerDiscountRuleId,
          customerDiscountAmount,
          lineAmount,
          lineWeightKg,
          promoFreeCartons,
          fillGrams,
          productId: stock.recipe.productId,
        });
      }

      const totalPayable = totalAmount + (data.expenses ?? 0);
      const computedCredit = Math.max(0, totalPayable - data.cash);

      if (computedCredit > 0 && !data.creditReturnDate) {
        throw new Error("A credit return date is required when credit balance remains.");
      }

      const invoiceStatus =
        computedCredit === 0
          ? "paid"
          : data.cash > 0
            ? "partially_paid"
            : "saved";

      // ── Update invoice ────────────────────────────────────────────────────
      await tx
        .update(invoices)
        .set({
          account: data.account,
          cash: data.cash.toString(),
          credit: computedCredit.toString(),
          creditReturnDate: data.creditReturnDate || null,
          expenses: (data.expenses ?? 0).toString(),
          expensesDescription: data.expensesDescription,
          amount: totalAmount.toString(),
          totalPrice: totalPayable.toString(),
          remarks: data.remarks,
          status: invoiceStatus,
          performedById: userId, // Record who edited it
        })
        .where(eq(invoices.id, data.id));

      // ── Update wallet credit if cash is paid ──────────────────────────────
      if (data.cash > 0 && data.account) {
        await tx
          .update(wallets)
          .set({ balance: sql`${wallets.balance} + ${data.cash}` })
          .where(eq(wallets.id, data.account));

        await tx.insert(transactions).values({
          id: createId(),
          walletId: data.account,
          type: "credit",
          amount: data.cash.toString(),
          referenceId: data.id,
          source: "Sale",
          performedById: userId,
        });

        await tx.insert(payments).values({
          id: createId(),
          customerId,
          invoiceId: data.id,
          amount: data.cash.toString(),
          method: "cash",
          reference: existing.slipNumber,
          recordedById: userId,
          paymentDate: new Date(),
          notes: "Initial payment on invoice creation",
        });
      }

      // ── Insert NEW line items + deduct stock ──────────────────────────────
      for (const r of lineResolutions) {
        const totalAvailableUnits =
          r.stock.quantityCartons * r.containersPerCarton +
          r.stock.quantityContainers;
        const remainingUnits = totalAvailableUnits - r.totalDispatchedUnits;

        const hasCartons =
          r.stock.recipe?.cartonPackagingId != null &&
          r.stock.recipe?.containersPerCarton != null &&
          r.stock.recipe?.containersPerCarton > 0;

        const finalQuantityCartons = hasCartons
          ? Math.floor(remainingUnits / r.containersPerCarton)
          : 0;
        const finalQuantityContainers = hasCartons
          ? remainingUnits % r.containersPerCarton
          : remainingUnits;

        await tx
          .update(finishedGoodsStock)
          .set({
            quantityCartons: finalQuantityCartons,
            quantityContainers: finalQuantityContainers,
          })
          .where(
            and(
              eq(finishedGoodsStock.warehouseId, data.warehouseId),
              eq(finishedGoodsStock.recipeId, r.item.recipeId),
            ),
          );

        const perUnitCost = r.finalPerCartonPrice / r.containersPerCarton;
        const unitMargin = r.item.retailPrice - perUnitCost;
        const manualDiscountCartons =
          r.item.unitType === "carton" ? (r.item.discountCartons ?? 0) : 0;

        await tx.insert(invoiceItems).values({
          id: createId(),
          invoiceId: data.id,
          recipeId: r.item.recipeId,
          pack: r.item.pack,
          numberOfCartons:
            r.item.unitType === "carton" ? r.item.numberOfCartons : 0,
          discountCartons: manualDiscountCartons,
          freeCartons: r.promoFreeCartons,
          quantity: r.item.unitType === "units" ? r.item.numberOfUnits : 0,
          packsPerCarton: r.item.packsPerCarton ?? 0,
          actualPackSize: r.containersPerCarton,
          perCartonPrice: r.finalPerCartonPrice.toString(),
          amount: r.lineAmount.toString(),
          hsnCode: r.item.hsnCode,
          retailPrice: r.item.retailPrice.toString(),
          margin: unitMargin.toString(),
          totalWeight: r.lineWeightKg.toFixed(3),
          tpPrice: r.tpPrice !== null ? r.tpPrice.toString() : null,
          marginPercent:
            r.marginPercent !== null ? r.marginPercent.toString() : null,
          isPriceOverride: r.item.isPriceOverride,
          priceAgreementId: r.agreementId,
          promoRuleId: r.promoRuleId,
          customerDiscountRuleId: r.customerDiscountRuleId,
          customerDiscountAmount: r.customerDiscountAmount !== undefined 
            ? r.customerDiscountAmount.toString() 
            : "0",
        });

        // ── Log pricing decision to audit trail (Task 8.3) ────────────────
        // Log the pricing decision for this invoice item
        // Requirement 8.5: Create price_change_log entry with source "invoice_calculation"
        if (r.productId) {
          await tx.insert(priceChangeLog).values({
            id: createId(),
            productId: r.productId,
            customerId: customerId,
            oldPrice: r.item.perCartonPrice.toString(), // Original price before resolution
            newPrice: r.finalPerCartonPrice.toString(), // Final resolved price
            changedById: userId,
            source: "invoice_calculation",
            invoiceId: data.id,
            metadata: {
              priceAgreementId: r.agreementId,
              promoRuleId: r.promoRuleId,
              customerDiscountRuleId: r.customerDiscountRuleId,
              customerDiscountAmount: r.customerDiscountAmount,
              isPriceOverride: r.item.isPriceOverride,
            },
          });
        }
      }

      // ── Update customer ledger ────────────────────────────────────────────
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

      return { id: data.id };
    });
  });
