import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

/**
 * Middleware that requires authentication.
 * Redirects unauthenticated users to login page.
 */
export const requireAuthMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.session) {
      throw redirect({ to: "/login" });
    }

    return await next({ context: { session } });
  },
);

/**
 * Middleware that requires user to be admin or super-admin.
 */
export const requireAdminMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.session) {
      throw redirect({ to: "/login" });
    }

    const role = session.user.role;
    if (role !== "admin" && role !== "super-admin") {
      throw redirect({ to: "/login" });
    }

    return await next({ context: { session } });
  },
);

/**
 * Middleware that requires user to be strictly super-admin.
 */
export const requireSuperAdminMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (!session?.session || session.user.role !== "super-admin") {
      throw redirect({ to: "/login" });
    }

    return await next({ context: { session } });
  },
);

/**
 * Middleware that only allows unauthenticated users.
 * Redirects authenticated users.
 */
export const requireNoAuthMiddleware = createMiddleware().server(
  async ({ next }) => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });

    if (session) {
      const role = session.user.role;
      if (role === "operator") {
        throw redirect({ to: "/operator" });
      }
      if (role === "finance-manager") {
        throw redirect({ to: "/sales/customers" });
      }
      throw redirect({ to: "/dashboard" });
    }

    return await next();
  },
);
