import { createServerFn } from "@tanstack/react-start";
import { db, materialStock, chemicals, warehouses, purchaseRecords, supplierPayments } from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addChemicalSchema } from "@/lib/validators/validators";

export const addRawMaterialFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(addChemicalSchema)
    .handler(async ({ data }) => {
        return await db.transaction(async (tx) => {
            // Validate Warehouse
            const warehouse = await tx.query.warehouses.findFirst({
                where: eq(warehouses.id, data.warehouseId),
            });

            if (!warehouse) throw new Error("Warehouse not found");
            if (warehouse.type !== "factory_floor") {
                throw new Error("Raw materials must be added to a Factory Floor facility.");
            }

            const targetWarehouseId = warehouse.id;

            // Check for case-insensitive duplicates
            const existing = await tx.query.chemicals.findFirst({
                where: (m, { sql }) => sql`LOWER(${m.name}) = LOWER(${data.name})`,
            });

            let finalMaterial;

            if (existing) {
                // Check if price matches (allow small tolerance for float comparison)
                const existingPrice = parseFloat(existing.costPerUnit || "0");
                const newPrice = parseFloat(data.costPerUnit);

                // If price matches (same material, same cost) -> Merge
                if (Math.abs(existingPrice - newPrice) < 0.01) {
                    const [updated] = await tx
                        .update(chemicals)
                        .set({
                            minimumStockLevel: data.minimumStockLevel,
                            lastSupplierId: data.supplierId,
                            updatedAt: new Date(),
                        })
                        .where(eq(chemicals.id, existing.id))
                        .returning();
                    finalMaterial = updated;
                } else {
                    // Price differs -> Create new material with suffix name
                    // Check how many variations exist to append correct suffix
                    const similar = await tx.query.chemicals.findMany({
                        where: (m, { sql }) => sql`LOWER(${m.name}) LIKE LOWER(${data.name || ""} || '%')`,
                    });

                    // Simple logic: append "-new" or count. 
                    // Better: "Zinc (PKR 150)" or "Zinc-1"
                    // User suggested "Zinc-1".
                    const suffix = similar.length;
                    const newName = `${data.name}-${suffix}`;

                    const [newMaterial] = await tx
                        .insert(chemicals)
                        .values({
                            name: newName,
                            unit: data.unit,
                            costPerUnit: data.costPerUnit,
                            minimumStockLevel: data.minimumStockLevel,
                            packagingType: data.packagingType,
                            packagingSize: data.packagingSize,
                            lastSupplierId: data.supplierId,
                        })
                        .returning();
                    finalMaterial = newMaterial;
                }
            } else {
                // 1. Create the raw material
                const [newMaterial] = await tx
                    .insert(chemicals)
                    .values({
                        name: data.name,
                        unit: data.unit,
                        costPerUnit: data.costPerUnit,
                        minimumStockLevel: data.minimumStockLevel,
                        packagingType: data.packagingType,
                        packagingSize: data.packagingSize,
                        lastSupplierId: data.supplierId,
                    })
                    .returning();
                finalMaterial = newMaterial;
            }

            const materialId = finalMaterial.id;

            // 2. Initialize or Update stock
            if (parseFloat(data.quantity || "0") > 0) {
                // Check if stock record exists
                const existingStock = await tx.query.materialStock.findFirst({
                    where: (ms, { and, eq }) => and(
                        eq(ms.warehouseId, targetWarehouseId),
                        eq(ms.chemicalId, materialId)
                    ),
                });

                if (existingStock) {
                    // Update existing stock (Increment)
                    await tx
                        .update(materialStock)
                        .set({
                            quantity: sql`${materialStock.quantity} + ${data.quantity}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(materialStock.id, existingStock.id));
                } else {
                    // Create new stock record
                    await tx.insert(materialStock).values({
                        warehouseId: targetWarehouseId,
                        chemicalId: materialId,
                        quantity: data.quantity,
                    });
                }

                // 3. Create Purchase Record
                const totalCost = (parseFloat(data.costPerUnit) * parseFloat(data.quantity)).toFixed(2);

                // Auto-calculate payment amount based on payment status
                let amountToRecord = 0;
                if (data.paymentStatus === "paid_full") {
                    amountToRecord = parseFloat(totalCost);
                } else if (data.paymentStatus === "credit" && data.amountPaid) {
                    amountToRecord = parseFloat(data.amountPaid);
                }

                const [purchase] = await tx.insert(purchaseRecords).values({
                    supplierId: data.supplierId,
                    warehouseId: targetWarehouseId,
                    materialType: "chemical",
                    chemicalId: materialId,
                    quantity: data.quantity,
                    cost: totalCost,
                    paidAmount: amountToRecord.toString(),
                    unitCost: data.costPerUnit,
                    notes: data.notes || "Initial Stock",
                    paymentMethod: data.paymentMethod,
                    bankName: data.bankName,
                    transactionId: data.transactionId || null,
                    paidBy: data.paidBy,
                }).returning();

                if (amountToRecord > 0) {
                    await tx.insert(supplierPayments).values({
                        supplierId: data.supplierId,
                        purchaseId: purchase.id,
                        amount: amountToRecord.toString(),
                        method: data.paymentMethod,
                        bankName: data.bankName,
                        reference: data.transactionId || undefined,
                        paidBy: data.paidBy,
                        notes: data.paymentStatus === "credit" ? "Partial payment for stock purchase" : "Full payment for stock purchase",
                    });
                }
            }

            return finalMaterial;
        });
    });
