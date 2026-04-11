import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
  type AuthContext,
  getAuthContext,
  requirePermission,
} from "./authz.server";
import type { PermissionKey } from "./rbac";

const getRequestHref = () => getRequest()?.url ?? undefined;

export const authContextMiddleware = createMiddleware().server(
  async ({ next }) => {
    const authContext = await getAuthContext();

    return await next({
      context: authContext
        ? {
            authContext,
            session: authContext.session,
          }
        : {
            authContext: null,
            session: null,
          },
    });
  },
);

export const requireAuthMiddleware = createMiddleware()
  .middleware([authContextMiddleware])
  .server(async ({ next, context }) => {
    if (!context.authContext?.session) {
      throw redirect({
        to: "/login",
        search: getRequestHref()
          ? {
              redirect: getRequestHref(),
            }
          : undefined,
      });
    }

    return await next({
      context: {
        authContext: context.authContext,
        session: context.authContext.session,
      },
    });
  });

export const createPermissionMiddleware = (permission: PermissionKey) =>
  createMiddleware()
    .middleware([requireAuthMiddleware])
    .server(async ({ next, context }) => {
      requirePermission(context.authContext as AuthContext, permission);

      return await next({
        context: {
          authContext: context.authContext,
          session: context.session,
        },
      });
    });

export const requireAdminMiddleware = createMiddleware()
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    const roleSlug = context.authContext?.role.slug;

    if (roleSlug !== "admin" && roleSlug !== "super-admin") {
      throw redirect({
        to: context.authContext?.defaultLandingPath ?? "/dashboard",
      });
    }

    return await next({
      context: {
        authContext: context.authContext,
        session: context.session,
      },
    });
  });

export const requireSuperAdminMiddleware = createMiddleware()
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    if (context.authContext?.role.slug !== "super-admin") {
      throw redirect({
        to: context.authContext?.defaultLandingPath ?? "/dashboard",
      });
    }

    return await next({
      context: {
        authContext: context.authContext,
        session: context.session,
      },
    });
  });

export const requireDashboardViewMiddleware = createPermissionMiddleware(
  "dashboard.view",
);
export const requireManufacturingViewMiddleware = createPermissionMiddleware(
  "manufacturing.view",
);
export const requireManufacturingManageMiddleware = createPermissionMiddleware(
  "manufacturing.manage",
);
export const requireManufacturingRunReadMiddleware = createPermissionMiddleware(
  "manufacturing.run.read",
);
export const requireManufacturingRunManageMiddleware =
  createPermissionMiddleware("manufacturing.run.manage");
export const requireInventoryViewMiddleware = createPermissionMiddleware(
  "inventory.view",
);
export const requireInventoryManageMiddleware = createPermissionMiddleware(
  "inventory.manage",
);
export const requireSuppliersViewMiddleware = createPermissionMiddleware(
  "suppliers.view",
);
export const requireSuppliersManageMiddleware = createPermissionMiddleware(
  "suppliers.manage",
);
export const requireSalesViewMiddleware = createPermissionMiddleware("sales.view");
export const requireSalesManageMiddleware = createPermissionMiddleware(
  "sales.manage",
);
export const requireFinanceViewMiddleware = createPermissionMiddleware(
  "finance.view",
);
export const requireFinanceManageMiddleware = createPermissionMiddleware(
  "finance.manage",
);
export const requireHrViewMiddleware = createPermissionMiddleware("hr.view");
export const requireHrManageMiddleware = createPermissionMiddleware("hr.manage");
export const requireOperatorViewMiddleware = createPermissionMiddleware(
  "operator.view",
);
export const requireOperatorRunReadMiddleware = createPermissionMiddleware(
  "operator.run.read",
);
export const requireOperatorRunLogMiddleware = createPermissionMiddleware(
  "operator.run.log",
);
export const requireOperatorRunCompleteMiddleware = createPermissionMiddleware(
  "operator.run.complete",
);
export const requireOperatorRunFailMiddleware = createPermissionMiddleware(
  "operator.run.fail",
);
export const requireUserManagementViewMiddleware = createPermissionMiddleware(
  "user-management.view",
);
export const requireUserManagementUsersManageMiddleware =
  createPermissionMiddleware("user-management.users.manage");
export const requireUserManagementRolesManageMiddleware =
  createPermissionMiddleware("user-management.roles.manage");

export const requireNoAuthMiddleware = createMiddleware()
  .middleware([authContextMiddleware])
  .server(async ({ next, context }) => {
    if (context.authContext?.session) {
      throw redirect({
        to: context.authContext.defaultLandingPath,
      });
    }

    return await next();
  });
