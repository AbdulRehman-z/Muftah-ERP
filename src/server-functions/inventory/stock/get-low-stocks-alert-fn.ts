import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import { db, materialStock, packagingMaterials, chemicals, warehouses } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getLowStockAlertsFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.handler(async () => {
		// Chemicals low stock
		const rawAlerts = await db
			.select({
				id: materialStock.id,
				warehouseId: materialStock.warehouseId,
				warehouseName: warehouses.name,
				materialId: chemicals.id,
				materialName: chemicals.name,
				materialType: sql<string>`'raw'`,
				currentStock: materialStock.quantity,
				minLevel: chemicals.minimumStockLevel,
				unit: chemicals.unit,
			})
			.from(materialStock)
			.innerJoin(chemicals, eq(materialStock.chemicalId, chemicals.id))
			.innerJoin(warehouses, eq(materialStock.warehouseId, warehouses.id))
			.where(
				sql`${materialStock.quantity}::numeric < ${chemicals.minimumStockLevel}::numeric`,
			);

		// Packaging materials low stock
		const packagingAlerts = await db
			.select({
				id: materialStock.id,
				warehouseId: materialStock.warehouseId,
				warehouseName: warehouses.name,
				materialId: packagingMaterials.id,
				materialName: packagingMaterials.name,
				materialType: sql<string>`'packaging'`,
				currentStock: materialStock.quantity,
				minLevel: sql<string>`${packagingMaterials.minimumStockLevel}::text`,
				unit: packagingMaterials.capacityUnit,
			})
			.from(materialStock)
			.innerJoin(
				packagingMaterials,
				eq(materialStock.packagingMaterialId, packagingMaterials.id),
			)
			.innerJoin(warehouses, eq(materialStock.warehouseId, warehouses.id))
			.where(
				sql`${materialStock.quantity}::numeric < ${packagingMaterials.minimumStockLevel}::numeric`,
			);

		return [...rawAlerts, ...packagingAlerts];
	});
