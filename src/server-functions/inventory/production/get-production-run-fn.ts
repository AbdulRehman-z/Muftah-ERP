import { createServerFn } from "@tanstack/react-start";
import { desc } from "drizzle-orm";
import { db, productionRuns } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getProductionRunsFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const runs = await db.query.productionRuns.findMany({
			orderBy: [desc(productionRuns.createdAt)],
			with: {
				recipe: {
					with: {
						product: true,
					},
				},
				warehouse: true,
				operator: true,
				materialsUsed: true,
			},
			limit: 100,
		});

		return runs;
	});
