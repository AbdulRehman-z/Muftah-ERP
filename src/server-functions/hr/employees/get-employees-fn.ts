import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { employees } from "@/db/schemas/hr-schema";
import { desc, eq } from "drizzle-orm";
import { requireAuthMiddleware } from "@/lib/middlewares";
import { z } from "zod";

export const getEmployeesFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator(
    z
      .object({
        status: z
          .enum(["active", "on_leave", "terminated", "resigned"])
          .optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const statusFilter = data?.status;
    const result = await db
      .select()
      .from(employees)
      .where(statusFilter ? eq(employees.status, statusFilter) : undefined)
      .orderBy(desc(employees.createdAt));

    return result;
  });
