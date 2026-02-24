import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getMaterialsFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    const [chemicals, packagings] = await Promise.all([
      db.query.chemicals.findMany({
        with: {
          stock: true,
        },
      }),
      db.query.packagingMaterials.findMany({
        with: {
          stock: true,
        },
      }),
    ]);

    return { chemicals, packagings };
  });
