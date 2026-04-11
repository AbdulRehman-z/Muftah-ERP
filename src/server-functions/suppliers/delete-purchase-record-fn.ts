import { createServerFn } from "@tanstack/react-start";
import { db, purchaseRecords, supplierPayments, materialStock } from "@/db";
import { eq, and, sql } from "drizzle-orm";
import { requireSuppliersManageMiddleware } from "@/lib/middlewares";
import { z } from "zod";

const deletePurchaseSchema = z.object({
  id: z.string(),
});

export const deletePurchaseRecordFn = createServerFn()
  .middleware([requireSuppliersManageMiddleware])
  .inputValidator(deletePurchaseSchema)
  .handler(async ({ data }) => {
    const purchase = await db.query.purchaseRecords.findFirst({
      where: eq(purchaseRecords.id, data.id),
    });

    if (!purchase) {
      throw new Error("Purchase record not found");
    }

    await db.transaction(async (tx) => {
      // 1. Delete associated payments
      await tx
        .delete(supplierPayments)
        .where(eq(supplierPayments.purchaseId, data.id));

      // 2. Revert stock
      if (purchase.materialType === "chemical" && purchase.chemicalId) {
        await tx
          .update(materialStock)
          .set({
            quantity: sql`${materialStock.quantity} - ${purchase.quantity}`,
          })
          .where(
            and(
              eq(materialStock.warehouseId, purchase.warehouseId),
              eq(materialStock.chemicalId, purchase.chemicalId),
            ),
          );
      } else if (
        purchase.materialType === "packaging" &&
        purchase.packagingMaterialId
      ) {
        await tx
          .update(materialStock)
          .set({
            quantity: sql`${materialStock.quantity} - ${purchase.quantity}`,
          })
          .where(
            and(
              eq(materialStock.warehouseId, purchase.warehouseId),
              eq(
                materialStock.packagingMaterialId,
                purchase.packagingMaterialId,
              ),
            ),
          );
      }

      // 3. Delete the purchase record
      await tx.delete(purchaseRecords).where(eq(purchaseRecords.id, data.id));
    });

    return { success: true };
  });
