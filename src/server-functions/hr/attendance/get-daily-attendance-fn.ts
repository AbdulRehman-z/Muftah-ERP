import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";

export const getDailyAttendanceFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ date: z.string() }))
    .handler(async ({ data }) => {
        const { date } = data;

        const allEmployees = await db.query.employees.findMany({
            with: {
                attendance: {
                    where: (table, { eq }) => eq(table.date, date),
                },
            },
            orderBy: (table, { asc }) => [asc(table.firstName), asc(table.lastName)],
        });

        return allEmployees;
    });
