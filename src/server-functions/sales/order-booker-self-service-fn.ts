import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { orders, orderItems, orderBookerTrips, commissionRecords } from "@/db/schemas/sales-erp-schema";
import { orderBookers } from "@/db/schemas/sales-erp-schema";
import { tadaRates } from "@/db/schemas/hr-schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";
import {
  requireAuthMiddleware,
  requireOrderBookerViewMiddleware,
  requireOrderBookerOrdersManageMiddleware,
  requireOrderBookerTripsManageMiddleware,
} from "@/lib/middlewares";
import { createOrderSchema } from "@/db/zod_schemas";

// ═══════════════════════════════════════════════════════════════════════════
// ORDER BOOKER SELF-SERVICE
// All functions look up the order booker by session.user.id via userId link.
// ═══════════════════════════════════════════════════════════════════════════

async function getOrderBookerFromSession(session: any) {
  if (!session?.user?.id) throw new Error("Not authenticated");
  const ob = await db.query.orderBookers.findFirst({
    where: eq(orderBookers.userId, session.user.id),
  });
  if (!ob) throw new Error("Order booker profile not linked to this account");
  if (ob.status !== "active") throw new Error("Order booker account is inactive");
  return ob;
}

export const getMyProfileFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const ob = await getOrderBookerFromSession(context.session);
    return ob;
  });

export const getMyOrdersFn = createServerFn()
  .middleware([requireOrderBookerViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        status: z.enum(["pending", "confirmed", "delivered", "returned"]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ob = await getOrderBookerFromSession(context.session);
    const conditions: any[] = [eq(orders.orderBookerId, ob.id)];
    if (data.status) conditions.push(eq(orders.status, data.status));
    if (data.fromDate) conditions.push(gte(orders.createdAt, new Date(data.fromDate)));
    if (data.toDate) conditions.push(lte(orders.createdAt, new Date(data.toDate)));

    return await db.query.orders.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(orders.createdAt)],
      with: {
        items: { with: { product: true } },
      },
    });
  });

export const createMyOrderFn = createServerFn()
  .middleware([requireOrderBookerOrdersManageMiddleware])
  .inputValidator((input: any) => createOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ob = await getOrderBookerFromSession(context.session);
    const { items, ...rest } = data;

    const [order] = await db
      .insert(orders)
      .values({
        ...rest,
        orderBookerId: ob.id,
        status: "pending",
      })
      .returning();

    if (items?.length) {
      await db.insert(orderItems).values(
        items.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          unitType: item.unitType,
          quantity: item.quantity,
          rate: String(item.rate),
          amount: String(item.quantity * item.rate),
        })),
      );
    }

    return order;
  });

export const getMyTripsFn = createServerFn()
  .middleware([requireOrderBookerViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ob = await getOrderBookerFromSession(context.session);
    const conditions: any[] = [eq(orderBookerTrips.orderBookerId, ob.id)];
    if (data.fromDate) conditions.push(gte(orderBookerTrips.tripDate, new Date(data.fromDate)));
    if (data.toDate) conditions.push(lte(orderBookerTrips.tripDate, new Date(data.toDate)));

    return await db.query.orderBookerTrips.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(orderBookerTrips.tripDate)],
    });
  });

export const createMyTripFn = createServerFn()
  .middleware([requireOrderBookerTripsManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        date: z.string().min(1),
        areaVisited: z.string().min(1),
        distanceKm: z.number().nonnegative(),
        vehicleType: z.enum(["own_vehicle", "company_vehicle"]),
        fuelCost: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ob = await getOrderBookerFromSession(context.session);

    const activeRate = await db.query.tadaRates.findFirst({
      where: eq(tadaRates.isActive, true),
      orderBy: [desc(tadaRates.effectiveFrom)],
    });

    const tadaAmount = activeRate ? data.distanceKm * Number(activeRate.ratePerKm) : 0;

    const [trip] = await db
      .insert(orderBookerTrips)
      .values({
        orderBookerId: ob.id,
        tripDate: new Date(data.date),
        destination: data.areaVisited,
        distanceKm: data.distanceKm,
        vehicleType: data.vehicleType,
        fuelCost: data.vehicleType === "own_vehicle" ? String(data.fuelCost || 0) : "0",
        tadaAmount: String(tadaAmount),
        notes: data.notes,
      })
      .returning();

    return trip;
  });

export const getMyCommissionFn = createServerFn()
  .middleware([requireOrderBookerViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        status: z.enum(["accrued", "paid", "reversed"]).optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const ob = await getOrderBookerFromSession(context.session);
    const conditions: any[] = [eq(commissionRecords.orderBookerId, ob.id)];
    if (data.status) conditions.push(eq(commissionRecords.status, data.status));
    if (data.fromDate) conditions.push(gte(commissionRecords.createdAt, new Date(data.fromDate)));
    if (data.toDate) conditions.push(lte(commissionRecords.createdAt, new Date(data.toDate)));

    const records = await db.query.commissionRecords.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      orderBy: [desc(commissionRecords.createdAt)],
      with: {
        order: { columns: { billNumber: true, shopkeeperName: true } },
      },
    });

    const summary = {
      totalAccrued: records
        .filter((r) => r.status === "accrued")
        .reduce((s, r) => s + Number(r.commissionAmount), 0),
      totalPaid: records
        .filter((r) => r.status === "paid")
        .reduce((s, r) => s + Number(r.commissionAmount), 0),
      totalReversed: records
        .filter((r) => r.status === "reversed")
        .reduce((s, r) => s + Number(r.commissionAmount), 0),
    };

    return { records, summary };
  });
