import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireHrViewMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { employees } from "@/db/schemas/hr-schema";

export const getDailyAttendanceFn = createServerFn()
  .middleware([requireHrViewMiddleware])
  .inputValidator(z.object({ date: z.string() }))
  .handler(async ({ data }) => {
    const { date } = data;

    const allEmployees = await db.query.employees.findMany({
      where: and(
        eq(employees.isOrderBooker, false),
        eq(employees.isSalesman, false),
      ),
      with: {
        attendance: {
          where: (table, { eq }) => eq(table.date, date),
        },
      },
      orderBy: (table, { asc }) => [asc(table.firstName), asc(table.lastName)],
    });

    return allEmployees;
  });
