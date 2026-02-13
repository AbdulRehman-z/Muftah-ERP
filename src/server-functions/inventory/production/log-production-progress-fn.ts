import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
    productionRuns,
    materialStock,
    productionMaterialsUsed,
    inventoryAuditLog,
    recipes,
    recipePackaging,
    packagingMaterials,
    warehouses,
    finishedGoodsStock,
} from "@/db/schemas/inventory-schema";
import { requireAuthMiddleware } from "@/lib/middlewares";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const logProgressSchema = z.object({
    productionRunId: z.string().min(1),
    unitsProduced: z.number().int().positive("Must be a positive number"),
});

export const logProductionProgressFn = createServerFn()
    .middleware([requireAuthMiddleware])
    .inputValidator(logProgressSchema)
    .handler(async ({ data, context }) => {
        return await db.transaction(async (tx) => {
            // 1. Get Production Run
            const [run] = await tx
                .select()
                .from(productionRuns)
                .where(eq(productionRuns.id, data.productionRunId));

            if (!run) throw new Error("Production run not found");
            if (run.status !== "in_progress") throw new Error("Run is not in progress");

            // 2. Get Recipe
            const [recipe] = await tx
                .select()
                .from(recipes)
                .where(eq(recipes.id, run.recipeId));

            if (!recipe) throw new Error("Recipe not found");

            // ===== GUARD: Prevent overproduction =====
            const currentCompleted = run.completedUnits || 0;
            const target = run.containersProduced;
            const remaining = target - currentCompleted;

            if (remaining <= 0) {
                throw new Error("Target already reached. Cannot log more units.");
            }

            if (data.unitsProduced > remaining) {
                throw new Error(
                    `Cannot produce ${data.unitsProduced} units. Only ${remaining} units remaining to reach target of ${target}.`
                );
            }

            // ===== GUARD: Enforce full cartons if recipe has carton packaging =====
            if (recipe.cartonPackagingId && recipe.containersPerCarton && recipe.containersPerCarton > 0) {
                if (data.unitsProduced % recipe.containersPerCarton !== 0) {
                    throw new Error(
                        `Units must be packed in full cartons. Each carton holds ${recipe.containersPerCarton} units. ` +
                        `You entered ${data.unitsProduced} which is not a multiple of ${recipe.containersPerCarton}.`
                    );
                }
            }

            // 3. Get Factory Floor Warehouse
            const factoryFloor = await tx.query.warehouses.findFirst({
                where: eq(warehouses.type, "factory_floor"),
            });

            if (!factoryFloor) throw new Error("Factory floor not found");

            // Prepare deductions
            const materialsToDeduct: Array<{
                type: "chemical" | "packaging";
                materialId: string;
                materialName: string;
                quantity: number;
                costPerUnit: number;
            }> = [];

            // Packaging (Primary)
            const containerPkg = await tx.query.packagingMaterials.findFirst({
                where: eq(packagingMaterials.id, recipe.containerPackagingId)
            });
            if (containerPkg) {
                materialsToDeduct.push({
                    type: "packaging",
                    materialId: containerPkg.id,
                    materialName: containerPkg.name,
                    quantity: data.unitsProduced, // 1 per unit
                    costPerUnit: parseFloat(containerPkg.costPerUnit?.toString() || "0")
                });
            }

            // Additional Packaging (Caps, labels, stickers)
            const addPkgs = await tx.query.recipePackaging.findMany({
                where: eq(recipePackaging.recipeId, recipe.id),
                with: { packagingMaterial: true }
            });

            for (const pkg of addPkgs) {
                let qtyNeeded = 0;

                // Logic: Sticker is for the CARTON, not the unit, if cartons are being used.
                if (pkg.packagingMaterial.type === 'sticker' && recipe.containersPerCarton && recipe.containersPerCarton > 0 && recipe.cartonPackagingId) {
                    // Calculate based on Cartons
                    // data.unitsProduced is guaranteed to be a multiple of containersPerCarton by previous validation
                    const cartonsLogged = data.unitsProduced / recipe.containersPerCarton;
                    qtyNeeded = parseFloat(pkg.quantityPerContainer.toString()) * cartonsLogged;
                } else {
                    // Standard logic (Caps, Labels on bottle) -> Based on Units
                    qtyNeeded = parseFloat(pkg.quantityPerContainer.toString()) * data.unitsProduced;
                }

                materialsToDeduct.push({
                    type: "packaging",
                    materialId: pkg.packagingMaterialId,
                    materialName: pkg.packagingMaterial.name,
                    quantity: qtyNeeded,
                    costPerUnit: parseFloat(pkg.packagingMaterial.costPerUnit?.toString() || "0")
                });
            }

            // Cartons (deduct whole cartons since we enforce full cartons above)
            if (recipe.cartonPackagingId && recipe.containersPerCarton && recipe.containersPerCarton > 0) {
                const cartonPkg = await tx.query.packagingMaterials.findFirst({
                    where: eq(packagingMaterials.id, recipe.cartonPackagingId)
                });
                if (cartonPkg) {
                    const cartonsNeeded = data.unitsProduced / recipe.containersPerCarton;
                    materialsToDeduct.push({
                        type: "packaging",
                        materialId: cartonPkg.id,
                        materialName: cartonPkg.name,
                        quantity: cartonsNeeded,
                        costPerUnit: parseFloat(cartonPkg.costPerUnit?.toString() || "0")
                    });
                }
            }

            // 5. Deduct and Log
            let incrementalChemCost = 0;
            let incrementalPkgCost = 0;

            for (const item of materialsToDeduct) {
                const totalCost = item.quantity * item.costPerUnit;
                if (item.type === "chemical") incrementalChemCost += totalCost;
                else incrementalPkgCost += totalCost;

                // Deduct Stock
                await tx
                    .update(materialStock)
                    .set({
                        quantity: sql`quantity - ${item.quantity}`,
                    })
                    .where(
                        and(
                            eq(materialStock.warehouseId, factoryFloor.id),
                            item.type === "chemical"
                                ? eq(materialStock.chemicalId, item.materialId)
                                : eq(materialStock.packagingMaterialId, item.materialId)
                        )
                    );

                // Track usage
                await tx.insert(productionMaterialsUsed).values({
                    productionRunId: run.id,
                    materialType: item.type,
                    materialId: item.materialId,
                    quantityUsed: item.quantity.toString(),
                    costPerUnit: item.costPerUnit.toString(),
                    totalCost: totalCost.toString(),
                });
            }

            // 6. Calculate new completed units
            const newCompletedUnits = currentCompleted + data.unitsProduced;
            const isNowComplete = newCompletedUnits >= target;

            // 7. Update Run Progress
            const updateData: Record<string, any> = {
                completedUnits: sql`COALESCE(${productionRuns.completedUnits}, 0) + ${data.unitsProduced}`,
                totalPackagingCost: sql`COALESCE(${productionRuns.totalPackagingCost}, 0) + ${incrementalPkgCost}`,
                totalProductionCost: sql`COALESCE(${productionRuns.totalProductionCost}, 0) + ${incrementalChemCost + incrementalPkgCost}`,
            };

            // ===== AUTO-COMPLETE when target is reached =====
            if (isNowComplete) {
                updateData.status = "completed";
                updateData.actualCompletionDate = new Date();

                // Calculate final cartons/loose for the run record
                const itemsPerCarton = recipe.containersPerCarton || 0;
                let finalCartons = 0;
                let finalLoose = newCompletedUnits;
                if (itemsPerCarton > 0 && recipe.cartonPackagingId) {
                    finalCartons = Math.floor(newCompletedUnits / itemsPerCarton);
                    finalLoose = newCompletedUnits % itemsPerCarton;
                }
                updateData.cartonsProduced = finalCartons;
                updateData.looseUnitsProduced = finalLoose;
            }

            await tx.update(productionRuns)
                .set(updateData)
                .where(eq(productionRuns.id, run.id));

            // 8. Update Finished Goods Stock (Factory Floor)
            const existingStock = await tx.query.finishedGoodsStock.findFirst({
                where: and(
                    eq(finishedGoodsStock.warehouseId, factoryFloor.id),
                    eq(finishedGoodsStock.recipeId, recipe.id)
                )
            });

            if (existingStock) {
                if (isNowComplete && recipe.containersPerCarton && recipe.containersPerCarton > 0 && recipe.cartonPackagingId) {
                    // On completion: convert all accumulated loose units to cartons + remaining loose
                    const totalLooseInStock = existingStock.quantityContainers + data.unitsProduced;
                    const cartonsFromLoose = Math.floor(totalLooseInStock / recipe.containersPerCarton);
                    const remainingLoose = totalLooseInStock % recipe.containersPerCarton;

                    await tx.update(finishedGoodsStock)
                        .set({
                            quantityCartons: sql`${finishedGoodsStock.quantityCartons} + ${cartonsFromLoose}`,
                            quantityContainers: remainingLoose,
                            updatedAt: new Date(),
                        })
                        .where(eq(finishedGoodsStock.id, existingStock.id));
                } else {
                    // Normal incremental: just add to loose containers
                    await tx.update(finishedGoodsStock)
                        .set({
                            quantityContainers: sql`${finishedGoodsStock.quantityContainers} + ${data.unitsProduced}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(finishedGoodsStock.id, existingStock.id));
                }
            } else {
                await tx.insert(finishedGoodsStock).values({
                    warehouseId: factoryFloor.id,
                    recipeId: recipe.id,
                    quantityContainers: data.unitsProduced,
                    quantityCartons: 0,
                });
            }

            // 9. Audit log on auto-completion
            if (isNowComplete) {
                const itemsPerCarton = recipe.containersPerCarton || 0;
                let finalCartons = 0;
                let finalLoose = newCompletedUnits;
                if (itemsPerCarton > 0 && recipe.cartonPackagingId) {
                    finalCartons = Math.floor(newCompletedUnits / itemsPerCarton);
                    finalLoose = newCompletedUnits % itemsPerCarton;
                }

                await tx.insert(inventoryAuditLog).values({
                    warehouseId: factoryFloor.id,
                    materialType: "finished",
                    materialId: recipe.id,
                    type: "credit",
                    amount: newCompletedUnits.toString(),
                    reason: `Production run ${run.batchId} auto-completed. ${finalCartons} Cartons, ${finalLoose} Loose.`,
                    performedById: context.session.user.id,
                    referenceId: run.id,
                });
            }

            return { success: true, autoCompleted: isNowComplete };
        });
    });
