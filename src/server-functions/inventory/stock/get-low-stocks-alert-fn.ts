import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import {
  db,
  materialStock,
  packagingMaterials,
  chemicals,
  warehouses,
  finishedGoodsStock,
  recipes,
} from "@/db";
import { requireInventoryViewMiddleware } from "@/lib/middlewares";

export const getLowStockAlertsFn = createServerFn()
  .middleware([requireInventoryViewMiddleware])
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

    // Finished Goods low stock (Hardcoded threshold: 10 Cartons)
    const finishedGoodsAlerts = await db
      .select({
        id: finishedGoodsStock.id,
        warehouseId: finishedGoodsStock.warehouseId,
        warehouseName: warehouses.name,
        materialId: recipes.id,
        materialName: recipes.name,
        materialType: sql<string>`'finished'`,
        currentStock: sql<string>`${finishedGoodsStock.quantityCartons}::text`,
        minLevel: sql<string>`'10'`,
        unit: sql<string>`'Cartons'`,
      })
      .from(finishedGoodsStock)
      .innerJoin(recipes, eq(finishedGoodsStock.recipeId, recipes.id))
      .innerJoin(warehouses, eq(finishedGoodsStock.warehouseId, warehouses.id))
      .where(sql`${finishedGoodsStock.quantityCartons} < 10`);

    return [...rawAlerts, ...packagingAlerts, ...finishedGoodsAlerts];
  });
