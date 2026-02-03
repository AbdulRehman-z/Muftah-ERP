import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recipes } from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getRecipesFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const results = await db.query.recipes.findMany({
			where: eq(recipes.isActive, true),
			with: {
				product: true,
				containerPackaging: true,
				cartonPackaging: true,
				ingredients: {
					with: {
						chemical: true,
					},
				},
				packaging: {
					with: {
						packagingMaterial: true,
					},
				},
			},
		});

		return results;
	});
