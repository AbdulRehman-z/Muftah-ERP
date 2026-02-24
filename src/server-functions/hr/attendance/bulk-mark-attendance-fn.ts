import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export const bulkMarkAttendanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeIds: z.array(z.string()),
      date: z.string(),
      status: z.enum(["present", "absent", "leave", "half_day", "holiday"]),
    }),
  )
  .handler(async ({ data }) => {
    const { employeeIds, date, status } = data;

    // 1. Fetch employees to get their standardHours
    const employeesList = await db.query.employees.findMany({
      where: (table, { inArray }) => inArray(table.id, employeeIds),
    });

    const getDutyHours = (empId: string) => {
      const employee = employeesList.find((e) => e.id === empId);
      const standard = employee?.standardDutyHours || 8;
      if (status === "present") return standard.toFixed(2);
      if (status === "half_day") return (standard / 2).toFixed(2);
      return "0.00";
    };

    // 2. Fetch existing records for this date
    const existingRecords = await db.query.attendance.findMany({
      where: (table, { and, eq, inArray }) =>
        and(eq(table.date, date), inArray(table.employeeId, employeeIds)),
    });

    const existingEmployeeIds = existingRecords.map((r) => r.employeeId);
    const newEmployeeIds = employeeIds.filter(
      (id) => !existingEmployeeIds.includes(id),
    );

    // 3. Update existing
    if (existingRecords.length > 0) {
      for (const record of existingRecords) {
        await db
          .update(attendance)
          .set({
            status,
            dutyHours: getDutyHours(record.employeeId),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(attendance.date, date),
              eq(attendance.employeeId, record.employeeId),
            ),
          );
      }
    }

    // 4. Insert new
    if (newEmployeeIds.length > 0) {
      const newRecords = newEmployeeIds.map((id) => ({
        id: createId(),
        employeeId: id,
        date,
        status,
        dutyHours: getDutyHours(id),
        overtimeHours: "0.00",
      }));
      await db.insert(attendance).values(newRecords);
    }

    return {
      success: true,
      updated: existingRecords.length,
      inserted: newEmployeeIds.length,
    };
  });
