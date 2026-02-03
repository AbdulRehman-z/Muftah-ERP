import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getWarehousesFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .handler(async () => {
        const results = await db.query.warehouses.findMany({
            orderBy: (w, { asc }) => [asc(w.name)],
        });

        return results;
    });
