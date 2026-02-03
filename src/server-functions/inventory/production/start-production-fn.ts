import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
    productionRuns,
    materialStock,
    productionMaterialsUsed,
    inventoryAuditLog,
    recipes,
    recipeIngredients,
    recipePackaging,
    chemicals,
    packagingMaterials,
} from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const startProductionSchema = z.object({
    productionRunId: z.string().min(1, "Production run ID is required"),
});

export const startProductionFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(startProductionSchema)
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

            if (productionRun.status !== "scheduled") {
                throw new Error("Production run must be in scheduled status to start");
            }

            // 2. Get the recipe with all ingredients and packaging
            const [recipe] = await tx
                .select()
                .from(recipes)
                .where(eq(recipes.id, productionRun.recipeId));

            if (!recipe) {
                throw new Error("Recipe not found");
            }

            const ingredients = await tx
                .select({
                    ingredient: recipeIngredients,
                    material: chemicals,
                })
                .from(recipeIngredients)
                .leftJoin(chemicals, eq(recipeIngredients.chemicalId, chemicals.id))
                .where(eq(recipeIngredients.recipeId, recipe.id));

            const packaging = await tx
                .select({
                    packaging: recipePackaging,
                    material: packagingMaterials,
                })
                .from(recipePackaging)
                .leftJoin(packagingMaterials, eq(recipePackaging.packagingMaterialId, packagingMaterials.id))
                .where(eq(recipePackaging.recipeId, recipe.id));

            // 3. Get container and carton packaging
            const [containerPkg] = await tx
                .select()
                .from(packagingMaterials)
                .where(eq(packagingMaterials.id, recipe.containerPackagingId));

            let cartonPkg = null;
            if (recipe.cartonPackagingId) {
                [cartonPkg] = await tx
                    .select()
                    .from(packagingMaterials)
                    .where(eq(packagingMaterials.id, recipe.cartonPackagingId));
            }

            // 4. Calculate total materials needed (based on batches produced)
            const batchesProduced = productionRun.batchesProduced;
            const materialsToDeduct: Array<{
                type: "chemical" | "packaging";
                materialId: string;
                materialName: string;
                quantity: number;
                costPerUnit: number;
            }> = [];

            // Add Chemicals
            for (const { ingredient, material } of ingredients) {
                if (!material) continue;
                const quantityNeeded = parseFloat(ingredient.quantityPerBatch) * batchesProduced;
                materialsToDeduct.push({
                    type: "chemical",
                    materialId: material.id,
                    materialName: material.name,
                    quantity: quantityNeeded,
                    costPerUnit: parseFloat(material.costPerUnit?.toString() || "0"),
                });
            }

            // Add containers
            const containersNeeded = productionRun.containersProduced;
            materialsToDeduct.push({
                type: "packaging",
                materialId: containerPkg.id,
                materialName: containerPkg.name,
                quantity: containersNeeded,
                costPerUnit: parseFloat(containerPkg.costPerUnit?.toString() || "0"),
            });

            // Add cartons
            if (cartonPkg && (productionRun.cartonsProduced || 0) > 0) {
                materialsToDeduct.push({
                    type: "packaging",
                    materialId: cartonPkg.id,
                    materialName: cartonPkg.name,
                    quantity: productionRun.cartonsProduced || 0,
                    costPerUnit: parseFloat(cartonPkg.costPerUnit?.toString() || "0"),
                });
            }

            // Add additional packaging (caps, stickers, etc.)
            for (const { packaging: pkg, material } of packaging) {
                if (!material) continue;
                const quantityNeeded = parseFloat(pkg.quantityPerContainer.toString()) * containersNeeded;
                materialsToDeduct.push({
                    type: "packaging",
                    materialId: material.id,
                    materialName: material.name,
                    quantity: quantityNeeded,
                    costPerUnit: parseFloat(material.costPerUnit?.toString() || "0"),
                });
            }

            // 5. Validate stock availability
            for (const item of materialsToDeduct) {
                const [stock] = await tx
                    .select()
                    .from(materialStock)
                    .where(
                        and(
                            eq(materialStock.warehouseId, productionRun.warehouseId),
                            item.type === "chemical"
                                ? eq(materialStock.chemicalId, item.materialId)
                                : eq(materialStock.packagingMaterialId, item.materialId)
                        )
                    );

                if (!stock || parseFloat(stock.quantity.toString()) < item.quantity) {
                    throw new Error(
                        `Insufficient stock for "${item.materialName}". Available: ${stock ? parseFloat(stock.quantity.toString()).toFixed(0) : 0}, Required: ${item.quantity}`
                    );
                }
            }

            // 6. Deduct materials from warehouse
            let totalChemicalCost = 0;
            let totalPackagingCost = 0;

            for (const item of materialsToDeduct) {
                const totalCost = item.quantity * item.costPerUnit;

                if (item.type === "chemical") {
                    totalChemicalCost += totalCost;
                } else {
                    totalPackagingCost += totalCost;
                }

                // Update stock
                await tx
                    .update(materialStock)
                    .set({
                        quantity: sql`quantity - ${item.quantity}`,
                    })
                    .where(
                        and(
                            eq(materialStock.warehouseId, productionRun.warehouseId),
                            item.type === "chemical"
                                ? eq(materialStock.chemicalId, item.materialId)
                                : eq(materialStock.packagingMaterialId, item.materialId)
                        )
                    );

                // Create production materials used record
                await tx.insert(productionMaterialsUsed).values({
                    productionRunId: productionRun.id,
                    materialType: item.type,
                    materialId: item.materialId,
                    quantityUsed: item.quantity.toString(),
                    costPerUnit: item.costPerUnit.toString(),
                    totalCost: totalCost.toString(),
                });

                // Create audit log
                await tx.insert(inventoryAuditLog).values({
                    warehouseId: productionRun.warehouseId,
                    materialType: item.type,
                    materialId: item.materialId,
                    type: "debit",
                    amount: item.quantity.toString(),
                    reason: `Production run ${productionRun.batchId} started`,
                    performedById: context.session.user.id,
                    referenceId: productionRun.id,
                });
            }

            // 7. Update production run status
            const totalProductionCost = totalChemicalCost + totalPackagingCost;
            const costPerContainer =
                productionRun.containersProduced > 0
                    ? totalProductionCost / productionRun.containersProduced
                    : 0;

            await tx
                .update(productionRuns)
                .set({
                    status: "in_progress",
                    actualStartDate: new Date(),
                    totalChemicalCost: totalChemicalCost.toFixed(2),
                    totalPackagingCost: totalPackagingCost.toFixed(2),
                    totalProductionCost: totalProductionCost.toFixed(2),
                    costPerContainer: costPerContainer.toFixed(4),
                })
                .where(eq(productionRuns.id, productionRun.id));

            return {
                success: true,
                productionRun: {
                    ...productionRun,
                    status: "in_progress" as const,
                    actualStartDate: new Date(),
                },
            };
        });
    });
