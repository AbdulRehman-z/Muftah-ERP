import { createServerFn } from "@tanstack/react-start";
import { db, purchaseRecords, materialStock } from "@/db";
import { eq, sql, and } from "drizzle-orm";
import { requireSuppliersManageMiddleware } from "@/lib/middlewares";
import { z } from "zod";

import { chemicals, packagingMaterials } from "@/db/schemas/inventory-schema";

const updatePurchaseSchema = z.object({
  id: z.string(),
  quantity: z.string().optional(),
  cost: z.string().optional(),
  notes: z.string().optional(),
  transactionId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional().nullable(),
  // Payment fields
  paymentMethod: z.string().optional().nullable(),
  paidBy: z.string().optional().nullable(),
  // Material fields
  materialName: z.string().optional(),
  capacity: z.string().optional(),
  capacityUnit: z.string().optional(),
  minStock: z.string().optional(),
  unit: z.string().optional(),
});

export const updatePurchaseRecordFn = createServerFn()
  .middleware([requireSuppliersManageMiddleware])
  .inputValidator(updatePurchaseSchema)
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // 1. Get existing purchase record
      const existingRecord = await tx.query.purchaseRecords.findFirst({
        where: eq(purchaseRecords.id, data.id),
      });

      if (!existingRecord) {
        throw new Error("Purchase record not found");
      }

      let qtyDiff = 0;
      if (data.quantity) {
        const oldQty = parseFloat(existingRecord.quantity);
        const newQty = parseFloat(data.quantity);
        qtyDiff = newQty - oldQty;
      }

      // 2. Update Stock if quantity changed
      if (qtyDiff !== 0) {
        const materialField =
          existingRecord.materialType === "chemical"
            ? materialStock.chemicalId
            : materialStock.packagingMaterialId;

        const materialId =
          existingRecord.materialType === "chemical"
            ? existingRecord.chemicalId
            : existingRecord.packagingMaterialId;

        if (materialId) {
          const stockRecord = await tx.query.materialStock.findFirst({
            where: and(
              eq(materialStock.warehouseId, existingRecord.warehouseId),
              eq(materialField, materialId),
            ),
          });

          if (stockRecord) {
            await tx
              .update(materialStock)
              .set({
                quantity: sql`${materialStock.quantity} + ${qtyDiff.toString()}`,
                updatedAt: new Date(),
              })
              .where(eq(materialStock.id, stockRecord.id));
          } else {
            // If no stock record exists (weird, but possible if deleted manually), create one?
            // For now, ignore or throw. Stock should exist if purchase exists.
          }
        }
      }

      // 3. Update Material if applicable (Packaging only as per user request)
      if (
        existingRecord.materialType === "packaging" &&
        existingRecord.packagingMaterialId
      ) {
        await tx
          .update(packagingMaterials)
          .set({
            name: data.materialName || undefined,
            capacity: data.capacity || undefined,
            capacityUnit: data.capacityUnit || undefined,
            minimumStockLevel: data.minStock
              ? parseInt(data.minStock)
              : undefined,
            updatedAt: new Date(),
          })
          .where(eq(packagingMaterials.id, existingRecord.packagingMaterialId));
      }

      // 4. Update Purchase Record
      const updateData: any = {
        notes: data.notes || null,
        invoiceNumber: data.invoiceNumber || null,
        transactionId: data.transactionId || null,
        updatedAt: new Date(),
      };

      if (data.paymentMethod) {
        updateData.paymentMethod = data.paymentMethod;
      }
      if (data.paidBy !== undefined) {
        updateData.paidBy = data.paidBy || null;
      }

      if (data.quantity && data.cost) {
        updateData.quantity = data.quantity;
        updateData.cost = data.cost;
        updateData.unitCost = (
          parseFloat(data.cost) / parseFloat(data.quantity)
        ).toFixed(4);
      }

      await tx
        .update(purchaseRecords)
        .set(updateData)
        .where(eq(purchaseRecords.id, data.id));

      return { success: true };
    });
  });
