import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
    productionRuns,
    finishedGoodsStock,
    inventoryAuditLog,
    recipes,
} from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const completeProductionSchema = z.object({
    productionRunId: z.string().min(1, "Production run ID is required"),
});

export const completeProductionFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(completeProductionSchema)
    .handler(async ({ data, context }) => {
        return await db.transaction(async (tx) => {
            // 1. Get the production run
            const [productionRun] = await tx
                .select()
                .from(productionRuns)
                .where(eq(productionRuns.id, data.productionRunId));

            if (!productionRun) {
                throw new Error("Production run not found");
            }

            if (productionRun.status !== "in_progress") {
                throw new Error("Production run must be in progress to complete");
            }

            // 2. Get the recipe
            const [recipe] = await tx
                .select()
                .from(recipes)
                .where(eq(recipes.id, productionRun.recipeId));

            if (!recipe) {
                throw new Error("Recipe not found");
            }

            // 3. Create or update finished goods stock in warehouse
            // Check if there's already a finished goods entry for this recipe in this warehouse
            const [existingStock] = await tx
                .select()
                .from(finishedGoodsStock)
                .where(
                    and(
                        eq(finishedGoodsStock.warehouseId, productionRun.warehouseId),
                        eq(finishedGoodsStock.recipeId, productionRun.recipeId)
                    )
                );

            if (existingStock) {
                // Update existing stock
                await tx
                    .update(finishedGoodsStock)
                    .set({
                        quantityCartons: sql`${finishedGoodsStock.quantityCartons} + ${productionRun.cartonsProduced || 0}`,
                        quantityContainers: sql`${finishedGoodsStock.quantityContainers} + ${productionRun.looseUnitsProduced || 0}`,
                    })
                    .where(eq(finishedGoodsStock.id, existingStock.id));
            } else {
                // Create new stock entry
                await tx.insert(finishedGoodsStock).values({
                    warehouseId: productionRun.warehouseId,
                    recipeId: productionRun.recipeId,
                    quantityCartons: productionRun.cartonsProduced || 0,
                    quantityContainers: productionRun.looseUnitsProduced || 0,
                });
            }

            // 4. Create audit log for finished goods
            await tx.insert(inventoryAuditLog).values({
                warehouseId: productionRun.warehouseId,
                materialType: "finished",
                materialId: productionRun.recipeId,
                type: "credit",
                amount: productionRun.containersProduced.toString(),
                reason: `Production run ${productionRun.batchId} completed`,
                performedById: context.session.user.id,
                referenceId: productionRun.id,
            });

            // 5. Update production run status
            await tx
                .update(productionRuns)
                .set({
                    status: "completed",
                    actualCompletionDate: new Date(),
                })
                .where(eq(productionRuns.id, productionRun.id));

            return {
                success: true,
                productionRun: {
                    ...productionRun,
                    status: "completed" as const,
                    actualCompletionDate: new Date(),
                },
            };
        });
    });
