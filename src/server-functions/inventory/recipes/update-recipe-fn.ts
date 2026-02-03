import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { recipes, recipeIngredients, recipePackaging, chemicals, packagingMaterials } from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { updateRecipeSchema } from "@/lib/validators/validators";
import { eq, inArray } from "drizzle-orm";

export const updateRecipeFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(updateRecipeSchema)
    .handler(async ({ data }) => {
        return await db.transaction(async (tx) => {
            // 1. Get packaging materials to calculate costs
            const containerPackaging = await tx
                .select()
                .from(packagingMaterials)
                .where(eq(packagingMaterials.id, data.containerPackagingId))
                .then((res) => res[0]);

            let cartonPackaging = null;
            if (data.cartonPackagingId && data.cartonPackagingId !== "_none") {
                cartonPackaging = await tx
                    .select()
                    .from(packagingMaterials)
                    .where(eq(packagingMaterials.id, data.cartonPackagingId))
                    .then((res) => res[0]);
            }

            // 2. Get Chemicals used in ingredients to calculate costs
            const chemicalIds = data.ingredients.map((ing) => ing.chemicalId);
            const chemicalsData = chemicalIds.length > 0
                ? await tx
                    .select()
                    .from(chemicals)
                    .where(inArray(chemicals.id, chemicalIds))
                : [];

            // 3. Calculate costs
            const batchSize = parseFloat(data.batchSize);

            // Calculate containers produced
            const containerSize = `${containerPackaging.capacity}${containerPackaging.capacityUnit || ""}`;
            const sizeMatch = containerSize.match(/(\d+\.?\d*)/);
            const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : 1;
            const sizeUnit = containerSize.replace(sizeValue.toString(), "").toLowerCase();

            let containerSizeInBatchUnit = sizeValue;
            if (data.batchUnit === "liters") {
                if (sizeUnit.includes("ml")) {
                    containerSizeInBatchUnit = sizeValue / 1000;
                }
            } else if (data.batchUnit === "kg") {
                if (sizeUnit.includes("g") && !sizeUnit.includes("kg")) {
                    containerSizeInBatchUnit = sizeValue / 1000;
                }
            }

            const containersProduced = Math.floor(batchSize / containerSizeInBatchUnit);

            // Calculate ingredients cost
            const ingredientsCost = data.ingredients.reduce((total, ing) => {
                const material = chemicalsData.find((m) => m.id === ing.chemicalId);
                if (!material) return total;
                const costPerUnit = parseFloat(material.costPerUnit?.toString() || "0");
                const quantity = parseFloat(ing.quantityPerBatch || "0");
                return total + costPerUnit * quantity;
            }, 0);

            // Calculate packaging cost (containers)
            const containerCost = parseFloat(containerPackaging.costPerUnit?.toString() || "0");
            const containersCost = containersProduced * containerCost;

            // Calculate cartons cost
            let cartonsCost = 0;
            if (cartonPackaging && data.containersPerCarton > 0) {
                const cartonsNeeded = Math.ceil(containersProduced / data.containersPerCarton);
                const cartonCost = parseFloat(cartonPackaging.costPerUnit?.toString() || "0");
                cartonsCost = cartonsNeeded * cartonCost;
            }

            // Calculate additional packaging cost (caps, stickers, etc.)
            let additionalPackagingCost = 0;
            if (data.additionalPackaging && data.additionalPackaging.length > 0) {
                const additionalPackagingIds = data.additionalPackaging.map((pkg) => pkg.packagingMaterialId);
                const additionalPackagingData = await tx
                    .select()
                    .from(packagingMaterials)
                    .where(inArray(packagingMaterials.id, additionalPackagingIds));

                additionalPackagingCost = data.additionalPackaging.reduce((total, pkg) => {
                    const material = additionalPackagingData.find((m) => m.id === pkg.packagingMaterialId);
                    if (!material) return total;
                    const costPerUnit = parseFloat(material.costPerUnit?.toString() || "0");
                    // Multiply by containers produced since it's per container
                    return total + costPerUnit * pkg.quantityPerContainer * containersProduced;
                }, 0);
            }

            const totalPackagingCost = containersCost + cartonsCost + additionalPackagingCost;
            const totalBatchCost = ingredientsCost + totalPackagingCost;
            const costPerContainer = containersProduced > 0 ? totalBatchCost / containersProduced : 0;

            // 4. Update the recipe
            const [recipe] = await tx
                .update(recipes)
                .set({
                    productId: data.productId,
                    name: data.name,
                    batchSize: data.batchSize,
                    batchUnit: data.batchUnit,
                    containerType: data.containerType,
                    containerPackagingId: data.containerPackagingId,
                    containersPerCarton: data.containersPerCarton || 0,
                    cartonPackagingId: data.cartonPackagingId && data.cartonPackagingId !== "_none" ? data.cartonPackagingId : null,
                    estimatedIngredientsCost: ingredientsCost.toFixed(2),
                    estimatedPackagingCost: totalPackagingCost.toFixed(2),
                    estimatedCostPerBatch: totalBatchCost.toFixed(2),
                    estimatedCostPerContainer: costPerContainer.toFixed(4),
                })
                .where(eq(recipes.id, data.id))
                .returning();

            // 5. Update recipe ingredients (Delete and recreate)
            await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, data.id));
            if (data.ingredients.length > 0) {
                await tx.insert(recipeIngredients).values(
                    data.ingredients.map((ing) => ({
                        recipeId: data.id,
                        chemicalId: ing.chemicalId,
                        quantityPerBatch: ing.quantityPerBatch,
                    })),
                );
            }

            // 6. Update additional packaging (Delete and recreate)
            await tx.delete(recipePackaging).where(eq(recipePackaging.recipeId, data.id));
            if (data.additionalPackaging && data.additionalPackaging.length > 0) {
                await tx.insert(recipePackaging).values(
                    data.additionalPackaging.map((pkg) => ({
                        recipeId: data.id,
                        packagingMaterialId: pkg.packagingMaterialId,
                        quantityPerContainer: pkg.quantityPerContainer.toString(),
                    })),
                );
            }

            return recipe;
        });
    });
