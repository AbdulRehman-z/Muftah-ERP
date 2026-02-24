import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const getWalletsListFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .handler(async () => {
    return await db.query.wallets.findMany({
      orderBy: (wallets, { asc }) => [asc(wallets.createdAt)],
    });
  });
