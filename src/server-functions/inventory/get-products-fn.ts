import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getProductsFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const products = await db.query.products.findMany({
      with: {
        recipes: {
          with: {
            ingredients: {
              with: {
                chemical: true,
              },
            },
            packaging: {
              with: {
                packagingMaterial: true,
              },
            },
            containerPackaging: true,
            cartonPackaging: true,
          },
        },
      },
    });

    return products;
  });
