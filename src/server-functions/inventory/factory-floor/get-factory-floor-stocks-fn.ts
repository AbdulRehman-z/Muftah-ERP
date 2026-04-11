import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { db, warehouses } from "@/db";
import { requireInventoryViewMiddleware } from "@/lib/middlewares";

export const getFactoryFloorStockFn = createServerFn()
  .middleware([requireInventoryViewMiddleware])
  .handler(async () => {
    // Get factory floor warehouse
    const factoryFloor = await db.query.warehouses.findFirst({
      where: eq(warehouses.type, "factory_floor"),
      with: {
        materialStock: {
          with: {
            chemical: {
              with: {
                lastSupplier: true,
              },
            },
            packagingMaterial: {
              with: {
                lastSupplier: true,
              },
            },
          },
        },
        finishedGoodsStock: {
          with: {
            recipe: {
              with: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!factoryFloor) {
      return null;
    }

    return factoryFloor;
  });
