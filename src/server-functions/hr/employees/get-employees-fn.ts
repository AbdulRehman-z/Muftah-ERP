import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { employees } from "@/db/schemas/hr-schema";
import { desc } from "drizzle-orm";
import { requireAuthMiddleware } from "@/lib/middlewares";

export const getEmployeesFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    const result = await db
      .select()
      .from(employees)
      .orderBy(desc(employees.createdAt));

    return result;
  });
