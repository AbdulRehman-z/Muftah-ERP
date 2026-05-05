import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  customerPriceAgreements,
  promotionalRules,
  salesmen,
  orderBookers,
} from "@/db/schemas/sales-erp-schema";
import { customers, invoices, invoiceItems } from "@/db/schemas/sales-schema";
import {
  requireSalesViewMiddleware,
  requireSalesManageMiddleware,
  requireSalesConfigViewMiddleware,
  requireSalesConfigManageMiddleware,
} from "@/lib/middlewares";
import {
  createOrderBookerSchema,
  updateOrderBookerSchema,
} from "@/db/zod_schemas";
import { z } from "zod";
import {
  eq,
  desc,
  and,
  gte,
  lte,
  or,
  isNull,
  inArray,
  sum,
  count,
} from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER PRICE AGREEMENTS (surfaces existing table)
// ═══════════════════════════════════════════════════════════════════════════

export const getCustomerPriceAgreementsFn = createServerFn()
  .middleware([requireSalesConfigViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        customerId: z.string().optional(),
        productId: z.string().optional(),
        includeInactive: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const conditions: any[] = [];

    if (data.customerId) {
      conditions.push(eq(customerPriceAgreements.customerId, data.customerId));
    }
    if (data.productId) {
      conditions.push(eq(customerPriceAgreements.productId, data.productId));
    }
    if (!data.includeInactive) {
      const now = new Date();
      conditions.push(
        and(
          lte(customerPriceAgreements.effectiveFrom, now),
          or(
            isNull(customerPriceAgreements.effectiveTo),
            gte(customerPriceAgreements.effectiveTo, now),
          ),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.query.customerPriceAgreements.findMany({
      where: whereClause,
      with: {
        customer: { columns: { id: true, name: true, customerType: true } },
        product: { columns: { id: true, name: true } },
      },
      orderBy: [desc(customerPriceAgreements.effectiveFrom)],
    });
  });

export const createCustomerPriceAgreementFn = createServerFn()
  .middleware([requireSalesConfigManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        customerId: z.string().min(1),
        productId: z.string().min(1),
        pricingType: z.enum(["fixed", "margin_off_tp", "flat_discount"]),
        agreedValue: z.number().nonnegative(),
        tpBaseline: z.number().optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(customerPriceAgreements)
      .values({
        customerId: data.customerId,
        productId: data.productId,
        pricingType: data.pricingType,
        agreedValue: data.agreedValue.toString(),
        tpBaseline: data.tpBaseline?.toString() ?? null,
        effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
        effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
      })
      .returning();
    return inserted;
  });

export const deleteCustomerPriceAgreementFn = createServerFn()
  .middleware([requireSalesConfigManageMiddleware])
  .inputValidator((input: any) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await db
      .delete(customerPriceAgreements)
      .where(eq(customerPriceAgreements.id, data.id));
    return { success: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// PROMOTIONAL RULES (surfaces existing table)
// ═══════════════════════════════════════════════════════════════════════════

export const getPromotionalRulesFn = createServerFn()
  .middleware([requireSalesConfigViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        productId: z.string().optional(),
        includeInactive: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const conditions: any[] = [];

    if (data.productId) {
      conditions.push(eq(promotionalRules.productId, data.productId));
    }
    if (!data.includeInactive) {
      const now = new Date();
      conditions.push(
        and(
          lte(promotionalRules.activeFrom, now),
          or(
            isNull(promotionalRules.activeTo),
            gte(promotionalRules.activeTo, now),
          ),
        ),
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await db.query.promotionalRules.findMany({
      where: whereClause,
      with: {
        product: { columns: { id: true, name: true } },
      },
      orderBy: [desc(promotionalRules.activeFrom)],
    });
  });

export const createPromotionalRuleFn = createServerFn()
  .middleware([requireSalesConfigManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        productId: z.string().min(1),
        buyQty: z.number().int().positive(),
        freeQty: z.number().int().nonnegative(),
        eligibleCustomerType: z
          .enum(["shopkeeper", "distributor", "retailer", "wholesaler", "all"])
          .default("all"),
        activeFrom: z.string().optional(),
        activeTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(promotionalRules)
      .values({
        productId: data.productId,
        buyQty: data.buyQty,
        freeQty: data.freeQty,
        eligibleCustomerType: data.eligibleCustomerType,
        activeFrom: data.activeFrom ? new Date(data.activeFrom) : new Date(),
        activeTo: data.activeTo ? new Date(data.activeTo) : null,
      })
      .returning();
    return inserted;
  });

export const deletePromotionalRuleFn = createServerFn()
  .middleware([requireSalesConfigManageMiddleware])
  .inputValidator((input: any) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await db.delete(promotionalRules).where(eq(promotionalRules.id, data.id));
    return { success: true };
  });

// ═══════════════════════════════════════════════════════════════════════════
// SALESMEN (extended fields)
// ═══════════════════════════════════════════════════════════════════════════

export const getSalesmenFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .handler(async () => {
    return await db.query.salesmen.findMany({
      orderBy: [desc(salesmen.createdAt)],
    });
  });

export const createSalesmanFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        name: z.string().min(1),
        phone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(salesmen)
      .values({
        name: data.name,
        phone: data.phone,
      })
      .returning();
    return inserted;
  });

export const updateSalesmanFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        id: z.string().min(1),
        name: z.string().min(1).optional(),
        phone: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { id, ...updates } = data;
    const updateValues: any = {};
    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.phone !== undefined) updateValues.phone = updates.phone;
    if (updates.status !== undefined) updateValues.status = updates.status;

    const [updated] = await db
      .update(salesmen)
      .set(updateValues)
      .where(eq(salesmen.id, id))
      .returning();
    return updated;
  });

// ═══════════════════════════════════════════════════════════════════════════
// ORDER BOOKERS
// ═══════════════════════════════════════════════════════════════════════════

export const getOrderBookersFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .handler(async () => {
    return await db.query.orderBookers.findMany({
      orderBy: [desc(orderBookers.createdAt)],
    });
  });

export const getOrderBookerDetailFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const orderBooker = await db.query.orderBookers.findFirst({
      where: eq(orderBookers.id, data.id),
    });
    if (!orderBooker) throw new Error("Order booker not found");
    return orderBooker;
  });

export const createOrderBookerFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) => createOrderBookerSchema.parse(input))
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(orderBookers)
      .values({
        name: data.name,
        phone: data.phone,
        address: data.address,
        assignedArea: data.assignedArea,
        commissionRate: data.commissionRate,
        employeeId: data.employeeId,
      })
      .returning();
    return inserted;
  });

export const linkOrderBookerToUserFn = createServerFn()
  .middleware([requireSalesPeopleManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        orderBookerId: z.string().min(1),
        userId: z.string().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const ob = await db.query.orderBookers.findFirst({
      where: eq(orderBookers.id, data.orderBookerId),
    });
    if (!ob) throw new Error("Order booker not found");

    await db
      .update(orderBookers)
      .set({ userId: data.userId })
      .where(eq(orderBookers.id, data.orderBookerId));

    return { success: true };
  });

export const getOrderBookerEligibleUsersFn = createServerFn()
  .middleware([requireSalesPeopleManageMiddleware])
  .handler(async () => {
    const { userRoleAssignments, appRoles, user: userTable } = await import("@/db");

    const obRole = await db.query.appRoles.findFirst({
      where: eq(appRoles.slug, "order-booker"),
    });
    if (!obRole) return [];

    const assignments = await db.query.userRoleAssignments.findMany({
      where: eq(userRoleAssignments.roleId, obRole.id),
      with: { user: true },
    });

    return assignments.map((a) => ({
      id: a.userId,
      name: a.user?.name || "—",
      email: a.user?.email || "—",
    }));
  });

export const updateOrderBookerFn = createServerFn()
  .middleware([requireSalesManageMiddleware])
  .inputValidator((input: any) => updateOrderBookerSchema.parse(input))
  .handler(async ({ data }) => {
    const { id, ...updates } = data;
    const updateValues: any = {};
    if (updates.name !== undefined) updateValues.name = updates.name;
    if (updates.phone !== undefined) updateValues.phone = updates.phone;
    if (updates.address !== undefined) updateValues.address = updates.address;
    if (updates.assignedArea !== undefined) updateValues.assignedArea = updates.assignedArea;
    if (updates.commissionRate !== undefined) updateValues.commissionRate = updates.commissionRate;
    if (updates.employeeId !== undefined) updateValues.employeeId = updates.employeeId;
    if (updates.status !== undefined) updateValues.status = updates.status;

    const [updated] = await db
      .update(orderBookers)
      .set(updateValues)
      .where(eq(orderBookers.id, id))
      .returning();
    return updated;
  });

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCTS (for dropdowns)
// ═══════════════════════════════════════════════════════════════════════════

export const getProductsFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .handler(async () => {
    return await db.query.products.findMany({
      orderBy: (products, { asc }) => [asc(products.name)],
    });
  });

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export const getCustomerProfileFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const customer = await db.query.customers.findFirst({
      where: eq(customers.id, data.id),
    });
    if (!customer) throw new Error("Customer not found");
    return customer;
  });

// ═══════════════════════════════════════════════════════════════════════════
// SALES OVERVIEW
// ═══════════════════════════════════════════════════════════════════════════

export const getSalesOverviewFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const conditions: any[] = [
      inArray(invoices.status, ["saved", "paid", "partially_paid"]),
    ];
    if (data.dateFrom) {
      conditions.push(gte(invoices.date, new Date(data.dateFrom)));
    }
    if (data.dateTo) {
      conditions.push(lte(invoices.date, new Date(data.dateTo)));
    }

    const whereClause = and(...conditions);

    const items = await db
      .select({
        pack: invoiceItems.pack,
        numberOfCartons: invoiceItems.numberOfCartons,
        quantity: invoiceItems.quantity,
        amount: invoiceItems.amount,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(whereClause);

    const productMap = new Map<string, {
      name: string;
      totalCartons: number;
      totalUnits: number;
      revenue: number;
      invoiceCount: number;
    }>();

    for (const item of items) {
      const name = item.pack || "Unknown";
      const existing = productMap.get(name);
      if (existing) {
        existing.totalCartons += Number(item.numberOfCartons) || 0;
        existing.totalUnits += Number(item.quantity) || 0;
        existing.revenue += Number(item.amount) || 0;
        existing.invoiceCount += 1;
      } else {
        productMap.set(name, {
          name,
          totalCartons: Number(item.numberOfCartons) || 0,
          totalUnits: Number(item.quantity) || 0,
          revenue: Number(item.amount) || 0,
          invoiceCount: 1,
        });
      }
    }

    const [totalRes] = await db
      .select({ total: sum(invoices.totalPrice) })
      .from(invoices)
      .where(whereClause);

    const [countRes] = await db
      .select({ value: count() })
      .from(invoices)
      .where(whereClause);

    return {
      products: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
      totalRevenue: Number(totalRes.total) || 0,
      totalInvoices: Number(countRes.value) || 0,
    };
  });

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOMERS WITH TYPE FILTER
// ═══════════════════════════════════════════════════════════════════════════

export const getCustomersByTypeFn = createServerFn()
  .middleware([requireSalesViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        customerType: z
          .enum(["distributor", "retailer", "shopkeeper", "wholesaler"])
          .optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(20),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;
    const conditions: any[] = [];

    if (data.customerType) {
      conditions.push(eq(customers.customerType, data.customerType));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [total] = await db
      .select({ value: count() })
      .from(customers)
      .where(whereClause);

    const rows = await db.query.customers.findMany({
      where: whereClause,
      limit: data.limit,
      offset,
      orderBy: [desc(customers.createdAt)],
    });

    return {
      data: rows,
      total: Number(total.value),
      pageCount: Math.ceil(Number(total.value) / data.limit),
    };
  });
