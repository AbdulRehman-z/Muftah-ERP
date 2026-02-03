import { createServerFn } from "@tanstack/react-start";
import { db, materialStock, chemicals } from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addChemicalSchema } from "@/lib/validators/validators";

export const addRawMaterialFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(addChemicalSchema)
    .handler(async ({ data }) => {
        try {
            // Check for case-insensitive duplicates
            const existing = await db.query.chemicals.findFirst({
                where: (m, { sql }) => sql`LOWER(${m.name}) = LOWER(${data.name})`,
            });

            let finalMaterial;

            if (existing) {
                // Update existing material details (cost, min stock)
                const [updated] = await db
                    .update(chemicals)
                    .set({
                        costPerUnit: data.costPerUnit,
                        minimumStockLevel: data.minimumStockLevel,
                        updatedAt: new Date(),
                    })
                    .where(eq(chemicals.id, existing.id))
                    .returning();

                finalMaterial = updated;
            } else {
                // 1. Create the raw material
                const [newMaterial] = await db
                    .insert(chemicals)
                    .values({
                        name: data.name,
                        unit: data.unit,
                        costPerUnit: data.costPerUnit,
                        minimumStockLevel: data.minimumStockLevel,
                    })
                    .returning();
                finalMaterial = newMaterial;
            }

            const materialId = finalMaterial.id;

            // 2. Initialize or Update stock
            if (data.warehouseId && parseFloat(data.quantity || "0") >= 0) {
                // Check if stock record exists
                const existingStock = await db.query.materialStock.findFirst({
                    where: (ms, { and, eq }) => and(
                        eq(ms.warehouseId, data.warehouseId!),
                        eq(ms.chemicalId, materialId)
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
                    // Create new stock record
                    await db.insert(materialStock).values({
                        warehouseId: data.warehouseId,
                        chemicalId: materialId,
                        quantity: data.quantity,
                    });
                }
            }

            return finalMaterial;
        } catch (error) {
            console.error("DB Error:", error);
            throw new Error("Failed to process raw material record");
        }
    });
