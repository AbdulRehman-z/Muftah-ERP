import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";

const deleteRecipeSchema = z.object({
    id: z.string(),
});

export const deleteRecipeFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(deleteRecipeSchema)
    .handler(async ({ data }) => {
        // Check for existing production runs
        const existingRuns = await db.query.productionRuns.findFirst({
            where: (runs, { eq }) => eq(runs.recipeId, data.id),
        });

        if (existingRuns) {
            throw new Error("Cannot delete recipe with associated production history. Archive it instead.");
        }

        try {
            await db.delete(recipes).where(eq(recipes.id, data.id));
            return { success: true };
        } catch (error) {
            console.error("Delete Recipe Error:", error);
            throw new Error("Failed to delete recipe due to dependencies.");
        }
    });
