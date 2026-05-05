import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { upsertAttendanceSchema } from "@/lib/validators/hr-validators";
import { requireHrManageMiddleware } from "@/lib/middlewares";
import { eq } from "drizzle-orm";
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
  .middleware([requireHrManageMiddleware])
  .inputValidator(upsertAttendanceSchema)
  .handler(async ({ data }) => {
    const { employeeId, date, ...rest } = data;

    // Fetch employee to get standardDutyHours
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });
    if (!employee) throw new Error("Employee not found");

    const standardHours = employee.standardDutyHours || 8;

    let finalDutyHours: string;
    let finalOvertimeHours: string;

    // Auto-calculate from check-in/out times
    const dutyHours1 = calculateHours(rest.checkIn, rest.checkOut);
    const dutyHours2 = calculateHours(rest.checkIn2, rest.checkOut2);
    const totalDuty = dutyHours1 + dutyHours2 || 0;

    // If time tracking inputs were filled, use them. Otherwise default based on status.
    if (totalDuty > 0) {
      finalDutyHours = totalDuty.toFixed(2);
    } else {
      if (rest.status === "present") finalDutyHours = standardHours.toFixed(2);
      else finalDutyHours = "0.00";
    }

    // Overtime is always manual input now
    finalOvertimeHours = Math.max(
      0,
      parseFloat(rest.overtimeHours || "0"),
    ).toFixed(2);

    // Check if record already exists for this employee+date
    const existing = await db.query.attendance.findFirst({
      where: (table, { and, eq }) =>
        and(eq(table.employeeId, employeeId), eq(table.date, date)),
    });

    const updateData = {
      status: rest.status,
      checkIn: rest.status === "present" ? (rest.checkIn || null) : null,
      checkOut: rest.status === "present" ? (rest.checkOut || null) : null,
      checkIn2: rest.status === "present" ? (rest.checkIn2 || null) : null,
      checkOut2: rest.status === "present" ? (rest.checkOut2 || null) : null,
      dutyHours: finalDutyHours,
      overtimeHours: finalOvertimeHours,
      isLate: rest.isLate ?? false,
      isNightShift: rest.isNightShift ?? false,
      isApprovedLeave: rest.isApprovedLeave ?? false,
      leaveType: rest.status === "leave" ? (rest.leaveType ?? null) : null,
      leaveApprovalStatus:
        rest.status === "leave"
          ? (rest.leaveApprovalStatus ?? "pending")
          : "none",
      earlyDepartureStatus: rest.earlyDepartureStatus ?? null,
      overtimeRemarks: rest.overtimeRemarks || null,
      overtimeStatus: rest.overtimeStatus || "pending",
      entrySource: rest.entrySource || "manual",
      notes: rest.notes || null,

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
        .values({ employeeId, date, ...updateData })
        .returning();
      return inserted;
    }
  });
