import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db, warehouses } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getFactoryFloorStockFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		// Get factory floor warehouse
		const factoryFloor = await db.query.warehouses.findFirst({
			where: eq(warehouses.type, "factory_floor"),
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

		if (!factoryFloor) {
			return null;
		}

		return factoryFloor;
	});
