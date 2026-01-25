import { createServerFn } from "@tanstack/react-start";
import { db, warehouses } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getInventoryFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const inventory = await db.query.warehouses.findMany({
			with: {
				stock: true,
				productionRuns: true,
			},
		});

		return inventory;
	});
