import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { upsertAttendanceSchema } from "@/lib/validators/hr-validators";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, and } from "drizzle-orm";
import { differenceInMinutes, parse } from "date-fns";

function calculateHours(checkIn?: string | null, checkOut?: string | null) {
    if (!checkIn || !checkOut) return 0;
    try {
        // Try HH:mm:ss first (common in some browsers/data), then fallback to HH:mm
        let start = parse(checkIn, "HH:mm:ss", new Date());
        if (isNaN(start.getTime())) {
            start = parse(checkIn, "HH:mm", new Date());
        }

        let end = parse(checkOut, "HH:mm:ss", new Date());
        if (isNaN(end.getTime())) {
            end = parse(checkOut, "HH:mm", new Date());
        }

        // If either is still invalid, return 0
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

        let diff = differenceInMinutes(end, start);
        if (diff < 0) diff += 24 * 60; // Handle overnight shift
        return diff / 60;
    } catch (e) {
        return 0;
    }
}

export const upsertAttendanceFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(upsertAttendanceSchema)
    .handler(async ({ data }) => {
        const { employeeId, date, ...rest } = data;

        // Fetch employee to get standardDutyHours
        const employee = await db.query.employees.findFirst({
            where: eq(employees.id, employeeId),
        });

        if (!employee) throw new Error("Employee not found");

        const dutyHours1 = calculateHours(rest.checkIn, rest.checkOut);
        const dutyHours2 = calculateHours(rest.checkIn2, rest.checkOut2);
        const totalDutyHours = (dutyHours1 + dutyHours2) || 0;

        const standardHours = employee.standardDutyHours || 8;
        const overtimeHours = Math.max(0, totalDutyHours - standardHours) || 0;

        // Check if record exists for this employee on this date
        const existing = await db.query.attendance.findFirst({
            where: (table, { and, eq }) => and(eq(table.employeeId, employeeId), eq(table.date, date)),
        });

        const updateData = {
            ...rest,
            dutyHours: totalDutyHours.toFixed(2),
            overtimeHours: overtimeHours.toFixed(2),
            updatedAt: new Date(),
        };

        if (existing) {
            const [updated] = await db
                .update(attendance)
                .set(updateData)
                .where(eq(attendance.id, existing.id))
                .returning();
            return updated;
        } else {
            const [inserted] = await db
                .insert(attendance)
                .values({
                    employeeId,
                    date,
                    ...updateData,
                })
                .returning();
            return inserted;
        }
    });
