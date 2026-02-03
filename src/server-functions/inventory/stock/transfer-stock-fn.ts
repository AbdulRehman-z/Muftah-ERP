import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { db, inventoryAuditLog, materialStock, stockTransfers } from "@/db";
import { finishedGoodsStock } from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { transferStockSchema } from "@/lib/validators/validators";

export const transferStockFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.inputValidator(transferStockSchema)
	.handler(async ({ data, context }) => {
		if (data.fromWarehouseId === data.toWarehouseId) {
			throw new Error("Source and destination warehouses must be different");
		}

		return await db.transaction(async (tx) => {
			const qty = parseFloat(data.quantity);

			if (data.materialType === "finished") {
				// Handle finished goods transfer
				const sourceStock = await tx.query.finishedGoodsStock.findFirst({
					where: and(
						eq(finishedGoodsStock.warehouseId, data.fromWarehouseId),
						eq(finishedGoodsStock.recipeId, data.materialId),
					),
				});

				if (!sourceStock || sourceStock.quantityCartons < qty) {
					throw new Error("Insufficient finished goods stock");
				}

				// Deduct from source
				await tx
					.update(finishedGoodsStock)
					.set({
						quantityCartons: sourceStock.quantityCartons - qty,
						updatedAt: new Date(),
					})
					.where(eq(finishedGoodsStock.id, sourceStock.id));

				// Add to destination
				const destStock = await tx.query.finishedGoodsStock.findFirst({
					where: and(
						eq(finishedGoodsStock.warehouseId, data.toWarehouseId),
						eq(finishedGoodsStock.recipeId, data.materialId),
					),
				});

				if (destStock) {
					await tx
						.update(finishedGoodsStock)
						.set({
							quantityCartons: destStock.quantityCartons + qty,
							updatedAt: new Date(),
						})
						.where(eq(finishedGoodsStock.id, destStock.id));
				} else {
					await tx.insert(finishedGoodsStock).values({
						warehouseId: data.toWarehouseId,
						recipeId: data.materialId,
						quantityCartons: qty,
					});
				}
			} else {
				// Handle raw/packaging material transfer
				const sourceStock = await tx.query.materialStock.findFirst({
					where: and(
						eq(materialStock.warehouseId, data.fromWarehouseId),
						data.materialType === "chemical"
							? eq(materialStock.chemicalId, data.materialId)
							: eq(materialStock.packagingMaterialId, data.materialId),
					),
				});

				if (!sourceStock || parseFloat(sourceStock.quantity) < qty) {
					throw new Error("Insufficient stock for transfer");
				}

				// Deduct from source
				await tx
					.update(materialStock)
					.set({
						quantity: (parseFloat(sourceStock.quantity) - qty).toString(),
						updatedAt: new Date(),
					})
					.where(eq(materialStock.id, sourceStock.id));

				// Add to destination
				const destStock = await tx.query.materialStock.findFirst({
					where: and(
						eq(materialStock.warehouseId, data.toWarehouseId),
						data.materialType === "chemical"
							? eq(materialStock.chemicalId, data.materialId)
							: eq(materialStock.packagingMaterialId, data.materialId),
					),
				});

				if (destStock) {
					await tx
						.update(materialStock)
						.set({
							quantity: (parseFloat(destStock.quantity) + qty).toString(),
							updatedAt: new Date(),
						})
						.where(eq(materialStock.id, destStock.id));
				} else {
					await tx.insert(materialStock).values({
						warehouseId: data.toWarehouseId,
						[data.materialType === "chemical"
							? "chemicalId"
							: "packagingMaterialId"]: data.materialId,
						quantity: data.quantity,
					});
				}
			}

			// Record transfer
			const [transfer] = await tx
				.insert(stockTransfers)
				.values({
					fromWarehouseId: data.fromWarehouseId,
					toWarehouseId: data.toWarehouseId,
					materialType: data.materialType,
					materialId: data.materialId,
					quantity: data.quantity,
					performedById: context.session.user.id,
					notes: data.notes,
					status: "completed",
				})
				.returning();

			// Audit logs
			await tx.insert(inventoryAuditLog).values([
				{
					warehouseId: data.fromWarehouseId,
					materialType: data.materialType,
					materialId: data.materialId,
					type: "debit",
					amount: data.quantity,
					reason: "Transfer Out",
					performedById: context.session.user.id,
					referenceId: transfer.id,
				},
				{
					warehouseId: data.toWarehouseId,
					materialType: data.materialType,
					materialId: data.materialId,
					type: "credit",
					amount: data.quantity,
					reason: "Transfer In",
					performedById: context.session.user.id,
					referenceId: transfer.id,
				},
			]);

			return transfer;
		});
	});
