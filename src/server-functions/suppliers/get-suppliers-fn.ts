import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getSuppliersFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .handler(async () => {
        const suppliers = await db.query.suppliers.findMany({
            orderBy: (suppliers, { desc }) => [desc(suppliers.createdAt)],
        });
        return suppliers;
    });
