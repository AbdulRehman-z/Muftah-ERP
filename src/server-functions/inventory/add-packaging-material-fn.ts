import { createServerFn } from "@tanstack/react-start";
import { db, materialStock, packagingMaterials } from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addPackagingMaterialSchema } from "@/lib/validators/validators";

export const addPackagingMaterialFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(addPackagingMaterialSchema)
    .handler(async ({ data }) => {
        try {
            // Check for case-insensitive duplicates
            const existing = await db.query.packagingMaterials.findFirst({
                where: (m, { sql }) => sql`LOWER(${m.name}) = LOWER(${data.name})`,
            });

            let finalMaterial;

            if (existing) {
                // Update existing material details
                const [updated] = await db
                    .update(packagingMaterials)
                    .set({
                        costPerUnit: data.costPerUnit,
                        minimumStockLevel: data.minimumStockLevel,
                        updatedAt: new Date(),
                        type: data.type,
                        capacity: data.capacity === "" ? null : data.capacity,
                        capacityUnit: data.capacityUnit === "" ? null : data.capacityUnit,
                    })
                    .where(eq(packagingMaterials.id, existing.id))
                    .returning();

                finalMaterial = updated;
            } else {
                // 1. Create the packaging material
                const [newMaterial] = await db
                    .insert(packagingMaterials)
                    .values({

                        name: data.name,
                        costPerUnit: data.costPerUnit,
                        minimumStockLevel: data.minimumStockLevel,
                        type: data.type,
                        capacity: data.capacity === "" ? null : data.capacity,
                        capacityUnit: data.capacityUnit === "" ? null : data.capacityUnit,
                    })
                    .returning();
                finalMaterial = newMaterial;
            }

            const materialId = finalMaterial.id;

            // 2. Initialize stock
            if (data.warehouseId && parseFloat(data.quantity || "0") >= 0) {
                // Check if stock record exists
                const existingStock = await db.query.materialStock.findFirst({
                    where: (ms, { and, eq }) => and(
                        eq(ms.warehouseId, data.warehouseId!),
                        eq(ms.packagingMaterialId, materialId)
                    ),
                });

                if (existingStock) {
                    // Update existing stock (Increment)
                    await db
                        .update(materialStock)
                        .set({
                            quantity: sql`${materialStock.quantity} + ${data.quantity}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(materialStock.id, existingStock.id));
                } else {
                    await db.insert(materialStock).values({
                        warehouseId: data.warehouseId,
                        packagingMaterialId: materialId,
                        quantity: data.quantity,
                    });
                }
            }

            return finalMaterial;
        } catch (error) {
            console.error("DB Error:", error);
            throw new Error("Failed to process packaging material record");
        }
    });
