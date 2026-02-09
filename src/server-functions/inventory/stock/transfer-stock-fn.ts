import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { db, inventoryAuditLog, materialStock, stockTransfers, warehouses } from "@/db";
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
			// Validate Destination Warehouse Type
			const toWarehouse = await tx.query.warehouses.findFirst({
				where: eq(warehouses.id, data.toWarehouseId)
			});

			if (!toWarehouse) throw new Error("Destination warehouse not found");

			if (data.materialType === "chemical" || data.materialType === "packaging") {
				if (toWarehouse.type !== "factory_floor") {
					throw new Error("Raw materials (chemicals/packaging) can only be transferred to a Factory Floor facility.");
				}
			}

			const qty = parseFloat(data.quantity) || 0;
			const loose = parseFloat(data.looseUnits || "0") || 0;

			if (data.materialType === "finished") {
				// Handle finished goods transfer
				const sourceStock = await tx.query.finishedGoodsStock.findFirst({
					where: and(
						eq(finishedGoodsStock.warehouseId, data.fromWarehouseId),
						eq(finishedGoodsStock.recipeId, data.materialId),
					),
				});

				if (!sourceStock) {
					throw new Error("Source stock not found");
				}

				if (sourceStock.quantityCartons < qty || sourceStock.quantityContainers < loose) {
					throw new Error(`Insufficient stock. Available: ${sourceStock.quantityCartons} cartons, ${sourceStock.quantityContainers} units.`);
				}

				// Deduct from source
				await tx
					.update(finishedGoodsStock)
					.set({
						quantityCartons: sourceStock.quantityCartons - qty,
						quantityContainers: sourceStock.quantityContainers - loose,
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
							quantityContainers: destStock.quantityContainers + loose,
							updatedAt: new Date(),
						})
						.where(eq(finishedGoodsStock.id, destStock.id));
				} else {
					await tx.insert(finishedGoodsStock).values({
						warehouseId: data.toWarehouseId,
						recipeId: data.materialId,
						quantityCartons: qty,
						quantityContainers: loose,
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
			const noteSuffix = loose > 0 ? ` (+ ${loose} loose units)` : "";
			const transferNotes = (data.notes || "") + noteSuffix;

			const [transfer] = await tx
				.insert(stockTransfers)
				.values({
					fromWarehouseId: data.fromWarehouseId,
					toWarehouseId: data.toWarehouseId,
					materialType: data.materialType,
					materialId: data.materialId,
					quantity: data.quantity, // Records Cartons (or main qty)
					performedById: context.session.user.id,
					notes: transferNotes.trim(),
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
					reason: "Transfer Out" + noteSuffix,
					performedById: context.session.user.id,
					referenceId: transfer.id,
				},
				{
					warehouseId: data.toWarehouseId,
					materialType: data.materialType,
					materialId: data.materialId,
					type: "credit",
					amount: data.quantity,
					reason: "Transfer In" + noteSuffix,
					performedById: context.session.user.id,
					referenceId: transfer.id,
				},
			]);

			return transfer;
		});
	});
