import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { productionMaterialsUsed } from "@/db/schemas/inventory-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { desc } from "drizzle-orm";

export const getConsumptionHistoryFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .handler(async () => {
        const history = await db.query.productionMaterialsUsed.findMany({
            orderBy: [desc(productionMaterialsUsed.createdAt)],
            with: {
                chemical: true,
                packagingMaterial: true,
                productionRun: {
                    with: {
                        recipe: true,
                    }
                }
            },
            limit: 50, // Limit to recent 50 records for performance
        });
        return history;
    });
