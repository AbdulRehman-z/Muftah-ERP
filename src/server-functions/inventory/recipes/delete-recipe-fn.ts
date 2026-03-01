import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  recipes,
  recipeIngredients,
  recipePackaging,
  productionRuns,
  productionMaterialsUsed,
  finishedGoodsStock,
} from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";

const deleteRecipeSchema = z.object({
  id: z.string(),
  force: z.boolean().optional().default(false),
});

export const deleteRecipeFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(deleteRecipeSchema)
  .handler(async ({ data }) => {
    // Check for existing production runs
    const existingRuns = await db.query.productionRuns.findMany({
      where: (runs, { eq }) => eq(runs.recipeId, data.id),
    });

    if (existingRuns.length > 0 && !data.force) {
      throw new Error(
        `This recipe has ${existingRuns.length} associated production run(s). Use "Force Delete" to remove the recipe along with all related production data.`,
      );
    }

    return await db.transaction(async (tx) => {
      // If force-deleting, clean up all dependent data
      if (existingRuns.length > 0 && data.force) {
        // Delete production materials used for each run
        for (const run of existingRuns) {
          await tx
            .delete(productionMaterialsUsed)
            .where(eq(productionMaterialsUsed.productionRunId, run.id));
        }

        // Delete finished goods stock entries
        await tx
          .delete(finishedGoodsStock)
          .where(eq(finishedGoodsStock.recipeId, data.id));

        // Delete production runs
        await tx
          .delete(productionRuns)
          .where(eq(productionRuns.recipeId, data.id));
      }

      // Delete recipe packaging
      await tx
        .delete(recipePackaging)
        .where(eq(recipePackaging.recipeId, data.id));

      // Delete recipe ingredients
      await tx
        .delete(recipeIngredients)
        .where(eq(recipeIngredients.recipeId, data.id));

      // Delete the recipe itself
      await tx.delete(recipes).where(eq(recipes.id, data.id));

      return { success: true };
    });
  });
