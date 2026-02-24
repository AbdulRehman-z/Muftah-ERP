import { createServerFn } from "@tanstack/react-start";
import { db, suppliers } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const deleteSupplierFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    try {
      await db.delete(suppliers).where(eq(suppliers.id, data.id));
      return { success: true };
    } catch (error) {
      console.error("Failed to delete supplier:", error);
      throw new Error("Failed to delete supplier");
    }
  });
