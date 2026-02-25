import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { customers } from "@/db/schemas/sales-schema";
import { requireAuthMiddleware } from "@/lib/middlewares"; // Standard middleware
import { z } from "zod";
import { count, like, or, SQL, desc } from "drizzle-orm";

export const getCustomersFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .inputValidator((input: any) =>
    z
      .object({
        page: z.number().int().positive().default(1),
        limit: z.number().int().positive().default(7),
        search: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const offset = (data.page - 1) * data.limit;

    let whereClause: SQL | undefined = undefined;

    if (data.search) {
      whereClause = or(
        like(customers.name, `%${data.search}%`),
        like(customers.mobileNumber, `%${data.search}%`),
      );
    }

    const [total] = await db
      .select({ value: count() })
      .from(customers)
      .where(whereClause);

    const dataQuery = await db.query.customers.findMany({
      where: whereClause,
      limit: data.limit,
      offset: offset,
      orderBy: (customers, { desc }) => [desc(customers.createdAt)],
    });

    return {
      data: dataQuery,
      total: total.value,
      pageCount: Math.ceil(total.value / data.limit),
    };
  });

export const getAllCustomersFn = createServerFn()
  .middleware([requireAuthMiddleware])
  .handler(async () => {
    return await db.query.customers.findMany({
      orderBy: (customers, { asc }) => [asc(customers.name)],
    });
  });
