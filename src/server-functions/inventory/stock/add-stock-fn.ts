import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { db, inventoryAuditLog, materialStock } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addStockSchema } from "@/lib/validators/validators";

export const addStockFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.inputValidator(addStockSchema)
	.handler(async ({ data, context }) => {
		return await db.transaction(async (tx) => {
			// Check if stock already exists
			const existingStock = await tx.query.materialStock.findFirst({
				where: and(
					eq(materialStock.warehouseId, data.warehouseId),
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
						warehouseId: data.warehouseId,
						[data.materialType === "chemical"
							? "chemicalId"
							: "packagingMaterialId"]: data.materialId,
						quantity: data.quantity,
					})
					.returning();
			}

			// Audit log
			await tx.insert(inventoryAuditLog).values({
				warehouseId: data.warehouseId,
				materialType: data.materialType,
				materialId: data.materialId,
				type: "credit",
				amount: data.quantity,
				reason: "Manual Addition",
				performedById: context.session.user.id,
			});

			return result;
		});
	});
