import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
    productionRuns,
    finishedGoodsStock,
    inventoryAuditLog,
    recipes,
} from "@/db/schemas/inventory-schema";
import { requireAuthMiddleware } from "@/lib/middlewares";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const completeProductionSchema = z.object({
    productionRunId: z.string().min(1, "Production run ID is required"),
});

export const completeProductionFn = createServerFn()
    .middleware([requireAuthMiddleware])
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
                if (productionRun.status === "completed") {
                    // Already completed (possibly auto-completed by logProgress)
                    return {
                        success: true,
                        productionRun: {
                            ...productionRun,
                            status: "completed" as const,
                        },
                    };
                }
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

            // 3. Calculate Final Output (Cartons vs Loose) based on ACTUAL production
            const totalUnitsProduced = productionRun.completedUnits || 0;
            const itemsPerCarton = recipe.containersPerCarton || 0;

            let finalCartons = 0;
            let finalLoose = totalUnitsProduced;

            // Calculate carton split if applicable
            if (itemsPerCarton > 0 && recipe.cartonPackagingId) {
                finalCartons = Math.floor(totalUnitsProduced / itemsPerCarton);
                finalLoose = totalUnitsProduced % itemsPerCarton;
            }

            // 4. Stock Reconciliation (Cartonization)
            // Since logProductionProgressFn adds purely to 'quantityContainers' (loose units),
            // we now need to 'convert' the appropriate amount of loose units into cartons in the stock.
            // We do NOT add new stock here, as it was added incrementally. We just transform it.

            if (finalCartons > 0) {
                const unitsToDeductFromLoose = finalCartons * itemsPerCarton;

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
                    await tx
                        .update(finishedGoodsStock)
                        .set({
                            quantityCartons: sql`${finishedGoodsStock.quantityCartons} + ${finalCartons}`,
                            quantityContainers: sql`${finishedGoodsStock.quantityContainers} - ${unitsToDeductFromLoose}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(finishedGoodsStock.id, existingStock.id));
                } else {
                    // This is an edge case: Logged progress but no stock record found? 
                    // Should be impossible if log fn works, but safe fallback:
                    await tx.insert(finishedGoodsStock).values({
                        warehouseId: productionRun.warehouseId,
                        recipeId: productionRun.recipeId,
                        quantityCartons: finalCartons,
                        quantityContainers: finalLoose, // We set the final state directly
                    });
                }
            }

            // 5. Create audit log for completion (status change only, materials already logged)
            await tx.insert(inventoryAuditLog).values({
                warehouseId: productionRun.warehouseId,
                materialType: "finished",
                materialId: productionRun.recipeId,
                type: "credit", // Techinically just a transformation/finalization
                amount: totalUnitsProduced.toString(),
                reason: `Production run ${productionRun.batchId} completed. ${finalCartons} Cartons, ${finalLoose} Loose.`,
                performedById: context.session.user.id,
                referenceId: productionRun.id,
            });

            // 6. Update production run status with ACTUALS
            await tx
                .update(productionRuns)
                .set({
                    status: "completed",
                    actualCompletionDate: new Date(),
                    cartonsProduced: finalCartons,
                    looseUnitsProduced: finalLoose,
                    // Note: containersProduced remains as the TARGET
                })
                .where(eq(productionRuns.id, productionRun.id));

            return {
                success: true,
                productionRun: {
                    ...productionRun,
                    status: "completed" as const,
                    actualCompletionDate: new Date(),
                    cartonsProduced: finalCartons,
                    looseUnitsProduced: finalLoose,
                },
            };
        });
    });
