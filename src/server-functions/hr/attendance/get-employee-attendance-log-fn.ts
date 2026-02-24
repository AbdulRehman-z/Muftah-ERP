import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { and, eq, between, asc } from "drizzle-orm";

export const getEmployeeAttendanceLogFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeId: z.string(),
      startDate: z.string(), // YYYY-MM-DD
      endDate: z.string(), // YYYY-MM-DD
    }),
  )
  .handler(async ({ data }) => {
    const { employeeId, startDate, endDate } = data;

    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) throw new Error("Employee not found");

    const records = await db.query.attendance.findMany({
      where: (table, { and, eq, between }) =>
        and(
          eq(table.employeeId, employeeId),
          between(table.date, startDate, endDate),
        ),
      orderBy: asc(attendance.date),
    });

    return {
      employee,
      records,
    };
  });
