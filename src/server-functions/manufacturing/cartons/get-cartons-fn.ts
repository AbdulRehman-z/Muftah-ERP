import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthMiddleware } from "@/lib/middlewares";
import * as repo from "@/lib/cartons/carton.repository";

export const getCartonByIdFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ cartonId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const carton = await repo.findCartonById(data.cartonId);
    if (!carton) {
      throw new Error("Carton not found");
    }
    return carton;
  });

export const getCartonsByBatchFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ productionRunId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { db } = await import("@/db");
    const { recipes } = await import("@/db/schemas/inventory-schema");
    const { eq } = await import("drizzle-orm");

    const cartonsData = await repo.findCartonsByProductionRunId(data.productionRunId);
    
    if (cartonsData.length === 0) return [];
    
    const recipeId = cartonsData[0].recipeId;
    const [recipe] = await db
      .select({ fillAmount: recipes.fillAmount, fillUnit: recipes.fillUnit })
      .from(recipes)
      .where(eq(recipes.id, recipeId));

    return cartonsData.map((c) => ({
      ...c,
      weightAmount: recipe?.fillAmount ? Number(recipe.fillAmount) * c.currentPacks : 0,
      weightUnit: recipe?.fillUnit || "g",
    }));
  });

export const getBatchKpisFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ productionRunId: z.string().min(1) }))
  .handler(async ({ data }) => {
    return repo.getBatchKpis(data.productionRunId);
  });

export const getCartonAuditLogFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({
    cartonId: z.string().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }))
  .handler(async ({ data }) => {
    const [logs, total] = await Promise.all([
      repo.findAdjustmentLogsByCartonId(data.cartonId, {
        limit: data.limit,
        offset: (data.page - 1) * data.limit,
      }),
      repo.countAdjustmentLogsByCartonId(data.cartonId),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(total / data.limit),
      },
    };
  });

export const getBatchAuditLogFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({
    productionRunId: z.string().min(1),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }))
  .handler(async ({ data }) => {
    const [logs, total] = await Promise.all([
      repo.findAdjustmentLogsByBatchId(data.productionRunId, {
        limit: data.limit,
        offset: (data.page - 1) * data.limit,
      }),
      repo.countAdjustmentLogsByBatchId(data.productionRunId),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: data.page,
        limit: data.limit,
        totalPages: Math.ceil(total / data.limit),
      },
    };
  });

export const getIntegrityAlertsFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({}))
  .handler(async () => {
    return repo.findOpenIntegrityAlerts();
  });

export const runIntegrityCheckFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({ batchId: z.string().optional() }))
  .handler(async ({ data, context }) => {
    const isAdmin = context.authContext.permissions.has("*");
    if (!isAdmin) {
      throw new Error("Only administrators can run integrity checks.");
    }

    const { runIntegrityCheck } = await import("@/lib/cartons/carton-extended.service");
    return runIntegrityCheck(data.batchId);
  });

export const updateIntegrityAlertFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(z.object({
    alertId: z.string().min(1),
    status: z.enum(["ACKNOWLEDGED", "RESOLVED"]),
    resolution: z.string().max(500).optional(),
  }))
  .handler(async ({ data, context }) => {
    return repo.updateIntegrityAlertById(data.alertId, {
      status: data.status,
      resolvedBy: data.status === "RESOLVED" ? context.session.user.id : undefined,
      resolvedAt: data.status === "RESOLVED" ? new Date() : undefined,
      resolution: data.resolution ?? null,
    });
  });