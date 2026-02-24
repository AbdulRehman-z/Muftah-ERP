import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import {
  db,
  inventoryAuditLog,
  materialStock,
  warehouses,
  purchaseRecords,
  supplierPayments,
  chemicals,
  packagingMaterials,
} from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addStockSchema } from "@/lib/validators/validators";

export const addStockFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(addStockSchema)
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // Validate Warehouse Type
      const warehouse = await tx.query.warehouses.findFirst({
        where: eq(warehouses.id, data.warehouseId),
      });

      if (!warehouse) throw new Error("Warehouse not found");

      // STRICT ENFORCEMENT: Raw materials only in Factory Floor
      if (warehouse.type !== "factory_floor") {
        throw new Error(
          "Raw materials (Chemicals/Packaging) must be added to a Factory Floor facility, not Storage.",
        );
      }

      const targetWarehouseId = warehouse.id;

      // Check if stock already exists
      const existingStock = await tx.query.materialStock.findFirst({
        where: and(
          eq(materialStock.warehouseId, targetWarehouseId),
          data.materialType === "chemical"
            ? eq(materialStock.chemicalId, data.materialId)
            : eq(materialStock.packagingMaterialId, data.materialId),
        ),
      });

      type Result = {
        createdAt: Date;
        updatedAt: Date;
        id: string;
        warehouseId: string;
        chemicalId: string | null;
        packagingMaterialId: string | null;
        quantity: string;
      };

      let result: Result;

      if (existingStock) {
        // Update existing stock
        const newQuantity = (
          parseFloat(existingStock.quantity) + parseFloat(data.quantity)
        ).toString();

        [result] = await tx
          .update(materialStock)
          .set({ quantity: newQuantity, updatedAt: new Date() })
          .where(eq(materialStock.id, existingStock.id))
          .returning();
      } else {
        // Create new stock entry
        [result] = await tx
          .insert(materialStock)
          .values({
            warehouseId: targetWarehouseId,
            [data.materialType === "chemical"
              ? "chemicalId"
              : "packagingMaterialId"]: data.materialId,
            quantity: data.quantity,
          })
          .returning();
      }

      // Auto-calculate payment amount based on payment status
      let amountToRecord = 0;
      if (data.paymentStatus === "paid_full") {
        amountToRecord = parseFloat(data.cost);
      } else if (data.paymentStatus === "credit" && data.amountPaid) {
        amountToRecord = parseFloat(data.amountPaid);
      }

      // Create Purchase Record (Supplier History)
      const [purchase] = await tx
        .insert(purchaseRecords)
        .values({
          supplierId: data.supplierId,
          warehouseId: targetWarehouseId,
          materialType: data.materialType,
          chemicalId: data.materialType === "chemical" ? data.materialId : null,
          packagingMaterialId:
            data.materialType === "packaging" ? data.materialId : null,
          quantity: data.quantity,
          cost: data.cost,
          paidAmount: amountToRecord.toString(),
          unitCost: (parseFloat(data.cost) / parseFloat(data.quantity)).toFixed(
            4,
          ),
          notes: data.notes,
          paymentMethod: data.paymentMethod,
          bankName: data.bankName,
          transactionId: data.transactionId,
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

      // Update the material's last supplier ID
      if (data.materialType === "chemical") {
        await tx
          .update(chemicals)
          .set({ lastSupplierId: data.supplierId, updatedAt: new Date() })
          .where(eq(chemicals.id, data.materialId));
      } else {
        await tx
          .update(packagingMaterials)
          .set({ lastSupplierId: data.supplierId, updatedAt: new Date() })
          .where(eq(packagingMaterials.id, data.materialId));
      }

      // Audit log
      await tx.insert(inventoryAuditLog).values({
        warehouseId: targetWarehouseId,
        materialType: data.materialType,
        materialId: data.materialId,
        type: "credit",
        amount: data.quantity,
        reason: `Purchase from Supplier (ID: ${data.supplierId})`,
        performedById: context.session.user.id,
      });

      return result;
    });
  });
