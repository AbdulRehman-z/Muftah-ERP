import { createServerFn } from "@tanstack/react-start";
import {
  db,
  materialStock,
  packagingMaterials,
  warehouses,
  purchaseRecords,
  supplierPayments,
} from "@/db";
import { eq, sql } from "drizzle-orm";
import { requireInventoryManageMiddleware } from "@/lib/middlewares";
import { addPackagingMaterialSchema } from "@/lib/validators/validators";

export const addPackagingMaterialFn = createServerFn()
  .middleware([requireInventoryManageMiddleware])
  .inputValidator(addPackagingMaterialSchema)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // Validate Warehouse
      const warehouse = await tx.query.warehouses.findFirst({
        where: eq(warehouses.id, data.warehouseId),
      });

      if (!warehouse) throw new Error("Warehouse not found");
      if (warehouse.type !== "factory_floor") {
        throw new Error(
          "Packaging materials must be added to a Factory Floor facility.",
        );
      }

      const targetWarehouseId = warehouse.id;

      // Check for case-insensitive duplicates
      const existing = await tx.query.packagingMaterials.findFirst({
        where: (m, { sql }) => sql`LOWER(${m.name}) = LOWER(${data.name})`,
      });

      let finalMaterial;

      if (existing) {
        // Check if price matches
        const existingPrice = parseFloat(existing.costPerUnit || "0");
        const newPrice = parseFloat(data.costPerUnit);

        // If price matches (allow small tolerance) -> Merge
        if (Math.abs(existingPrice - newPrice) < 0.01) {
          const [updated] = await tx
            .update(packagingMaterials)
            .set({
              minimumStockLevel: data.minimumStockLevel,
              updatedAt: new Date(),
              type: data.type,
              capacity: data.capacity === "" ? null : data.capacity,
              capacityUnit: data.capacityUnit === "" ? null : data.capacityUnit,
              lastSupplierId: data.supplierId,
            })
            .where(eq(packagingMaterials.id, existing.id))
            .returning();
          finalMaterial = updated;
        } else {
          // Price differs -> Create new material with suffix
          const similar = await tx.query.packagingMaterials.findMany({
            where: (m, { sql }) =>
              sql`LOWER(${m.name}) LIKE LOWER(${data.name || ""} || '%')`,
          });

          const suffix = similar.length;
          const newName = `${data.name}-${suffix}`;

          const [newMaterial] = await tx
            .insert(packagingMaterials)
            .values({
              name: newName,
              costPerUnit: data.costPerUnit,
              minimumStockLevel: data.minimumStockLevel,
              type: data.type,
              capacity: data.capacity === "" ? null : data.capacity,
              capacityUnit: data.capacityUnit === "" ? null : data.capacityUnit,
              weightPerPack: data.weightPerPack
                ? data.weightPerPack.toString()
                : null,
              pricePerKg: data.pricePerKg ? data.pricePerKg.toString() : null,
              associatedStickerId: data.associatedStickerId || null,
              stickerCost: data.stickerCost ? data.stickerCost.toString() : "0",
              lastSupplierId: data.supplierId,
            })
            .returning();
          finalMaterial = newMaterial;
        }
      } else {
        // 1. Create the packaging material
        const [newMaterial] = await tx
          .insert(packagingMaterials)
          .values({
            name: data.name,
            costPerUnit: data.costPerUnit,
            minimumStockLevel: data.minimumStockLevel,
            type: data.type,
            capacity: data.capacity === "" ? null : data.capacity,
            capacityUnit: data.capacityUnit === "" ? null : data.capacityUnit,
            weightPerPack: data.weightPerPack
              ? data.weightPerPack.toString()
              : null,
            pricePerKg: data.pricePerKg ? data.pricePerKg.toString() : null,
            associatedStickerId: data.associatedStickerId || null,
            stickerCost: data.stickerCost ? data.stickerCost.toString() : "0",
            lastSupplierId: data.supplierId,
          })
          .returning();
        finalMaterial = newMaterial;
      }

      const materialId = finalMaterial.id;

      // 2. Initialize stock on Factory Floor
      if (parseFloat(data.quantity || "0") > 0) {
        // Check if stock record exists
        const existingStock = await tx.query.materialStock.findFirst({
          where: (ms, { and, eq }) =>
            and(
              eq(ms.warehouseId, targetWarehouseId),
              eq(ms.packagingMaterialId, materialId),
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
          await tx.insert(materialStock).values({
            warehouseId: targetWarehouseId,
            packagingMaterialId: materialId,
            quantity: data.quantity,
          });
        }

        // 3. Create Purchase Record
        const totalCost = (
          parseFloat(data.costPerUnit) * parseFloat(data.quantity)
        ).toFixed(2);

        // Auto-calculate payment amount based on payment status
        let amountToRecord = 0;
        if (data.paymentStatus === "paid_full") {
          amountToRecord = parseFloat(totalCost);
        } else if (data.paymentStatus === "credit" && data.amountPaid) {
          amountToRecord = parseFloat(data.amountPaid);
        }

        const [purchase] = await tx
          .insert(purchaseRecords)
          .values({
            supplierId: data.supplierId,
            warehouseId: targetWarehouseId,
            materialType: "packaging",
            packagingMaterialId: materialId,
            quantity: data.quantity,
            cost: totalCost,
            paidAmount: amountToRecord.toString(),
            unitCost: data.costPerUnit,
            notes: data.notes || "Initial Stock",
            paymentMethod: data.paymentMethod,
            bankName: data.bankName,
            transactionId: data.transactionId || null,
            paidBy: data.paidBy,
          })
          .returning();

        if (amountToRecord > 0) {
          await tx.insert(supplierPayments).values({
            supplierId: data.supplierId,
            purchaseId: purchase.id,
            amount: amountToRecord.toString(),
            method: data.paymentMethod,
            bankName: data.bankName,
            reference: data.transactionId || undefined,
            paidBy: data.paidBy,
            notes:
              data.paymentStatus === "credit"
                ? "Partial payment for stock purchase"
                : "Full payment for stock purchase",
          });
        }
      }

      return finalMaterial;
    });
  });
