import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  productionRuns,
  finishedGoodsStock,
  inventoryAuditLog,
  recipes,
  materialStock,
  productionMaterialsUsed,
  packagingMaterials,
} from "@/db/schemas/inventory-schema";
import { requireAuthMiddleware } from "@/lib/middlewares";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { hasPermission } from "@/lib/rbac";

const completeProductionSchema = z.object({
  productionRunId: z.string().min(1, "Production run ID is required"),
  shortfallReason: z.string().optional(),
});

export const completeProductionFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(completeProductionSchema)
  .handler(async ({ data, context }) => {
    const canCompleteRun =
      hasPermission(context.authContext.permissions, "operator.run.complete") ||
      hasPermission(context.authContext.permissions, "manufacturing.run.manage");

    if (!canCompleteRun) {
      throw new Error("You do not have permission to complete this production run.");
    }

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
          // Already completed
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
      let totalUnitsProduced = productionRun.completedUnits || 0;
      let shortfallUnits = 0;

      if (totalUnitsProduced < productionRun.containersProduced) {
        if (!data.shortfallReason) {
          throw new Error(
            `Production is short by ${productionRun.containersProduced - totalUnitsProduced} units. Please provide a reason for the shortfall to complete this run early.`,
          );
        }
        // Operator explicitly closed it early with a variance
        shortfallUnits = productionRun.containersProduced - totalUnitsProduced;
      } else if (totalUnitsProduced === 0 && productionRun.containersProduced > 0) {
        // Fallback for unexpected zero
        totalUnitsProduced = productionRun.containersProduced;
      }

      const itemsPerCarton = recipe.containersPerCarton || 0;

      let finalCartons = 0;
      let finalLoose = totalUnitsProduced;

      // Calculate carton split if applicable
      if (itemsPerCarton > 0 && recipe.cartonPackagingId) {
        finalCartons = Math.floor(totalUnitsProduced / itemsPerCarton);
        finalLoose = totalUnitsProduced % itemsPerCarton;
      }

      // 4. Packaging Deduction Logic (Factory Floor)
      let additionalPackagingCost = 0;

      if (totalUnitsProduced > 0) {
        const packagingToDeduct: Array<{
          packagingId: string;
          quantity: number;
          label: string;
        }> = [];

        // 4a. Container packaging (Primary)
        if (recipe.containerPackagingId) {
          packagingToDeduct.push({
            packagingId: recipe.containerPackagingId,
            quantity: totalUnitsProduced,
            label: "primary containers",
          });
        }

        // 4b. Carton packaging (Master)
        if (finalCartons > 0 && recipe.cartonPackagingId) {
          packagingToDeduct.push({
            packagingId: recipe.cartonPackagingId,
            quantity: finalCartons,
            label: "master cartons",
          });
        }

        // 4c. Verify stock availability before deductive transaction.
        for (const item of packagingToDeduct) {
          const [stock] = await tx
            .select()
            .from(materialStock)
            .where(
              and(
                eq(materialStock.warehouseId, productionRun.warehouseId),
                eq(materialStock.packagingMaterialId, item.packagingId),
              ),
            );

          if (!stock || parseFloat(stock.quantity?.toString() || "0") < item.quantity) {
             throw new Error(
              `Insufficient packaging stock on Factory Floor for ${item.label}. Available: ${stock ? parseFloat(stock.quantity.toString()).toFixed(0) : 0}, Required: ${item.quantity}`,
            );
          }
        }

        // 4d. Deduct stock, track costs, and commit audit log.
        for (const item of packagingToDeduct) {
          // Fetch packaging cost
          const [pkg] = await tx
            .select()
            .from(packagingMaterials)
            .where(eq(packagingMaterials.id, item.packagingId));

          const costPerUnit = parseFloat(pkg?.costPerUnit?.toString() || "0");
          const totalCost = costPerUnit * item.quantity;
          additionalPackagingCost += totalCost;

          // Update stock
          await tx
            .update(materialStock)
            .set({
              quantity: sql`quantity - ${item.quantity}`,
            })
            .where(
              and(
                eq(materialStock.warehouseId, productionRun.warehouseId),
                eq(materialStock.packagingMaterialId, item.packagingId),
              ),
            );

          // Log into production materials used for audit visibility
          await tx.insert(productionMaterialsUsed).values({
            productionRunId: productionRun.id,
            materialType: "packaging",
            materialId: item.packagingId,
            quantityUsed: item.quantity.toString(),
            costPerUnit: costPerUnit.toString(),
            totalCost: totalCost.toString(),
          });

          // Log standard audit
          await tx.insert(inventoryAuditLog).values({
            warehouseId: productionRun.warehouseId,
            materialType: "packaging",
            materialId: item.packagingId,
            type: "debit",
            amount: item.quantity.toString(),
            reason: `Production run ${productionRun.batchId} completion packaging output deduction`,
            performedById: context.session.user.id,
            referenceId: productionRun.id,
          });
        }
      }

      // 5. Stock Reconciliation (Cartonization)
      const [existingStock] = await tx
        .select()
        .from(finishedGoodsStock)
        .where(
          and(
            eq(finishedGoodsStock.warehouseId, productionRun.warehouseId),
            eq(finishedGoodsStock.recipeId, productionRun.recipeId),
          ),
        );

      if (itemsPerCarton > 0 && recipe.cartonPackagingId) {
        // Recipe has carton packaging — apply carton/loose split
        if (existingStock) {
          // If units were incrementally logged (completedUnits > 0), the loose units are already
          // in stock from prior progress logs. We need to convert accumulated loose into cartons.
          // If no incremental logging (completedUnits === 0), we add the full output directly.
          const unitsToDeductFromLoose = finalCartons * itemsPerCarton;
          const looseAdjustment =
            productionRun.completedUnits === 0
              ? finalLoose
              : -unitsToDeductFromLoose;

          await tx
            .update(finishedGoodsStock)
            .set({
              quantityCartons: sql`${finishedGoodsStock.quantityCartons} + ${finalCartons}`,
              quantityContainers: sql`${finishedGoodsStock.quantityContainers} + ${looseAdjustment}`,
              updatedAt: new Date(),
            })
            .where(eq(finishedGoodsStock.id, existingStock.id));
        } else {
          await tx.insert(finishedGoodsStock).values({
            warehouseId: productionRun.warehouseId,
            recipeId: productionRun.recipeId,
            quantityCartons: finalCartons,
            quantityContainers: finalLoose,
          });
        }
      } else {
        // Loose-only recipe — NEVER touch quantityCartons; all units go to quantityContainers.
        // Only add units if they were NOT already incrementally logged via progress updates.
        if (productionRun.completedUnits === 0 && totalUnitsProduced > 0) {
          if (existingStock) {
            await tx
              .update(finishedGoodsStock)
              .set({
                quantityContainers: sql`${finishedGoodsStock.quantityContainers} + ${totalUnitsProduced}`,
                updatedAt: new Date(),
              })
              .where(eq(finishedGoodsStock.id, existingStock.id));
          } else {
            await tx.insert(finishedGoodsStock).values({
              warehouseId: productionRun.warehouseId,
              recipeId: productionRun.recipeId,
              quantityCartons: 0,
              quantityContainers: totalUnitsProduced,
            });
          }
        }
        // If completedUnits > 0, units were already added to stock via log-production-progress-fn.
        // No further stock update needed here.
      }


      // 6. Create audit log for completion (status change only, materials already logged)
      await tx.insert(inventoryAuditLog).values({
        warehouseId: productionRun.warehouseId,
        materialType: "finished",
        materialId: productionRun.recipeId,
        type: "credit", 
        amount: totalUnitsProduced.toString(),
        reason: `Production run ${productionRun.batchId} completed. ${finalCartons} Cartons, ${finalLoose} Loose.`,
        performedById: context.session.user.id,
        referenceId: productionRun.id,
      });

      // 7. Update production run status with ACTUALS
      const finalPackagingCost = parseFloat(productionRun.totalPackagingCost || "0") + additionalPackagingCost;
      const finalProductionCost = parseFloat(productionRun.totalChemicalCost || "0") + finalPackagingCost;

      await tx
        .update(productionRuns)
        .set({
          status: "completed",
          actualCompletionDate: new Date(),
          cartonsProduced: finalCartons,
          looseUnitsProduced: finalLoose,
          completedUnits: totalUnitsProduced,
          totalPackagingCost: finalPackagingCost.toFixed(2),
          totalProductionCost: finalProductionCost.toFixed(2),
          shortfallUnits: shortfallUnits,
          shortfallReason: data.shortfallReason || null,
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
          completedUnits: totalUnitsProduced,
          totalPackagingCost: finalPackagingCost.toFixed(2),
          totalProductionCost: finalProductionCost.toFixed(2),
          shortfallUnits: shortfallUnits,
          shortfallReason: data.shortfallReason || null,
        },
      };
    });
  });
