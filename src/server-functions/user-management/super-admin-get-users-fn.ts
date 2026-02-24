import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";
import {
  requireAuthMiddleware,
  requireSuperAdminMiddleware,
} from "@/lib/middlewares";

export const adminGetUsersFn = createServerFn()
  .middleware([requireAuthMiddleware, requireSuperAdminMiddleware])
  .handler(async ({ context }) => {
    const currentUserId = context.session.user.id;
    const users = await auth.api.listUsers({
      headers: getRequestHeaders(),
      query: {
        limit: 100,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    });

    return { users, currentUserId };
  });
