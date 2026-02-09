import { createServerFn } from "@tanstack/react-start";
import { db, warehouses } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq } from "drizzle-orm";

export const getInventoryFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const result = await db.query.warehouses.findMany({
			with: {
				materialStock: {
					with: {
						chemical: {
							with: {
								lastSupplier: true,
							},
						},
						packagingMaterial: {
							with: {
								lastSupplier: true,
							},
						},
					},
				},
				finishedGoodsStock: {
					with: {
						recipe: {
							with: {
								product: true,
							},
						},
					},
				},
			},
		});

		return result;
	});
