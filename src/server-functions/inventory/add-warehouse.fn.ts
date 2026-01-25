import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import { db, warehouses } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { addWarehouseSchema } from "@/lib/validators";

export const addWarehouseFn = createServerFn()
	.middleware([requireAdminMiddleware])
	.inputValidator(addWarehouseSchema) // Cleaned up validator call
	.handler(async ({ data }) => {
		try {
			const [result] = await db
				.insert(warehouses)
				.values({
					name: data.name,
					address: data.address, // Your 'address' field
					latitude: data.latitude.toString(), // Store as string for PG Decimal
					longitude: data.longitude.toString(),
				})
				.returning();

			return result;
		} catch (error) {
			console.error("DB Error:", error);
			throw new Error("Failed to create warehouse record");
		}
	});
