import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const bulkMarkAttendanceFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        employeeIds: z.array(z.string()),
        date: z.string(),
        status: z.enum(["present", "absent", "leave", "half_day", "holiday"]),
    }))
    .handler(async ({ data }) => {
        const { employeeIds, date, status } = data;

        // Fetch existing records for checking
        const existingRecords = await db.query.attendance.findMany({
            where: (table, { and, eq, inArray }) => and(
                eq(table.date, date),
                inArray(table.employeeId, employeeIds)
            ),
        });

        const existingEmployeeIds = existingRecords.map(r => r.employeeId);
        const newEmployeeIds = employeeIds.filter(id => !existingEmployeeIds.includes(id));

        // Update existing
        if (existingRecords.length > 0) {
            await db.update(attendance)
                .set({ status, updatedAt: new Date() })
                .where(and(
                    eq(attendance.date, date),
                    inArray(attendance.employeeId, existingEmployeeIds)
                ));
        }

        // Insert new
        if (newEmployeeIds.length > 0) {
            const newRecords = newEmployeeIds.map(id => ({
                id: createId(),
                employeeId: id,
                date,
                status,
                dutyHours: "0.00",
                overtimeHours: "0.00",
            }));
            await db.insert(attendance).values(newRecords);
        }

        return { success: true, updated: existingRecords.length, inserted: newEmployeeIds.length };
    });
