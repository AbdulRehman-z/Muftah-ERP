import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getInventoryFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		const warehouses = await db.query.warehouses.findMany({
			with: {
				materialStock: {
					with: {
						chemical: true,
						packagingMaterial: true,
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

		return warehouses;
	});
