import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { orderBookerTrips } from "@/db/schemas/sales-erp-schema";
import { tadaRates } from "@/db/schemas/hr-schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { z } from "zod";
import {
  requireSalesPeopleViewMiddleware,
  requireSalesPeopleManageMiddleware,
} from "@/lib/middlewares";

// ═══════════════════════════════════════════════════════════════════════════
// ORDER BOOKER TRIPS
// ═══════════════════════════════════════════════════════════════════════════

export const getOrderBookerTripsFn = createServerFn()
  .middleware([requireSalesPeopleViewMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        orderBookerId: z.string(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const conditions: any[] = [eq(orderBookerTrips.orderBookerId, data.orderBookerId)];
    if (data.fromDate) {
      conditions.push(gte(orderBookerTrips.tripDate, new Date(data.fromDate)));
    }
    if (data.toDate) {
      conditions.push(lte(orderBookerTrips.tripDate, new Date(data.toDate)));
    }
    return await db.query.orderBookerTrips.findMany({
      where: and(...conditions),
      orderBy: [desc(orderBookerTrips.tripDate)],
    });
  });

export const createOrderBookerTripFn = createServerFn()
  .middleware([requireSalesPeopleManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        orderBookerId: z.string(),
        tripDate: z.string().or(z.date()),
        destination: z.string().min(1),
        distanceKm: z.number().nonnegative(),
        vehicleType: z.enum(["own_vehicle", "company_vehicle"]).default("own_vehicle"),
        fuelCost: z.number().nonnegative().default(0),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.authContext?.session?.user?.id;

    // Get active TADA rate
    const activeRate = await db.query.tadaRates.findFirst({
      where: eq(tadaRates.isActive, true),
      orderBy: [desc(tadaRates.effectiveFrom)],
    });

    const ratePerKm = activeRate ? parseFloat(activeRate.ratePerKm) : 0;
    const tadaAmount = data.distanceKm * ratePerKm;

    const [inserted] = await db
      .insert(orderBookerTrips)
      .values({
        orderBookerId: data.orderBookerId,
        tripDate: new Date(data.tripDate),
        destination: data.destination,
        distanceKm: data.distanceKm.toString(),
        vehicleType: data.vehicleType,
        fuelCost: data.vehicleType === "company_vehicle" ? "0" : data.fuelCost.toString(),
        tadaAmount: tadaAmount.toString(),
        notes: data.notes,
        recordedById: userId,
      })
      .returning();
    return inserted;
  });

export const updateOrderBookerTripFn = createServerFn()
  .middleware([requireSalesPeopleManageMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        id: z.string(),
        tripDate: z.string().or(z.date()).optional(),
        destination: z.string().min(1).optional(),
        distanceKm: z.number().nonnegative().optional(),
        vehicleType: z.enum(["own_vehicle", "company_vehicle"]).optional(),
        fuelCost: z.number().nonnegative().optional(),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { id, ...updates } = data;

    // Fetch existing to know current vehicle type for fuel guard
    const existing = await db.query.orderBookerTrips.findFirst({
      where: eq(orderBookerTrips.id, id),
    });
    if (!existing) throw new Error("Trip not found");

    const updateValues: any = {};

    if (updates.tripDate !== undefined) updateValues.tripDate = new Date(updates.tripDate);
    if (updates.destination !== undefined) updateValues.destination = updates.destination;
    if (updates.distanceKm !== undefined) {
      updateValues.distanceKm = updates.distanceKm.toString();
      // Recalculate TADA
      const activeRate = await db.query.tadaRates.findFirst({
        where: eq(tadaRates.isActive, true),
        orderBy: [desc(tadaRates.effectiveFrom)],
      });
      const ratePerKm = activeRate ? parseFloat(activeRate.ratePerKm) : 0;
      updateValues.tadaAmount = (updates.distanceKm * ratePerKm).toString();
    }
    if (updates.vehicleType !== undefined) {
      updateValues.vehicleType = updates.vehicleType;
      if (updates.vehicleType === "company_vehicle") updateValues.fuelCost = "0";
    }
    const effectiveVehicleType = updateValues.vehicleType || existing.vehicleType;
    if (updates.fuelCost !== undefined && effectiveVehicleType !== "company_vehicle") {
      updateValues.fuelCost = updates.fuelCost.toString();
    }
    if (updates.notes !== undefined) updateValues.notes = updates.notes;
    updateValues.updatedAt = new Date();

    const [updated] = await db
      .update(orderBookerTrips)
      .set(updateValues)
      .where(eq(orderBookerTrips.id, id))
      .returning();
    return updated;
  });

export const deleteOrderBookerTripFn = createServerFn()
  .middleware([requireSalesPeopleManageMiddleware])
  .inputValidator((input: any) => z.object({ id: z.string() }).parse(input))
  .handler(async ({ data }) => {
    await db.delete(orderBookerTrips).where(eq(orderBookerTrips.id, data.id));
    return { success: true };
  });

export const getTadaRateFn = createServerFn()
  .middleware([requireSalesPeopleViewMiddleware])
  .handler(async () => {
    const rate = await db.query.tadaRates.findFirst({
      where: eq(tadaRates.isActive, true),
      orderBy: [desc(tadaRates.effectiveFrom)],
    });
    return rate ?? null;
  });
