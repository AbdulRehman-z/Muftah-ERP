import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, and, gt, desc, or } from "drizzle-orm";
import { z } from "zod";

export const getOvertimeApprovalsFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(
        z.object({
            status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
        }),
    )
    .handler(async ({ data: { status } }) => {
        const filters = [gt(attendance.overtimeHours, "0")];

        if (status !== "all") {
            filters.push(eq(attendance.overtimeStatus, status));
        } else {
            // All means everything that has OT > 0 and a status
            filters.push(or(
                eq(attendance.overtimeStatus, "pending"),
                eq(attendance.overtimeStatus, "approved"),
                eq(attendance.overtimeStatus, "rejected")
            ));
        }

        const records = await db
            .select({
                id: attendance.id,
                employeeId: employees.id,
                employeeCode: employees.employeeCode,
                firstName: employees.firstName,
                lastName: employees.lastName,
                designation: employees.designation,
                date: attendance.date,
                dutyHours: attendance.dutyHours,
                overtimeHours: attendance.overtimeHours,
                overtimeStatus: attendance.overtimeStatus,
                overtimeRemarks: attendance.overtimeRemarks,
            })
            .from(attendance)
            .innerJoin(employees, eq(attendance.employeeId, employees.id))
            .where(and(...filters))
            .orderBy(desc(attendance.date));

        // Calculate quick stats
        const allRecords = await db
            .select({ overtimeStatus: attendance.overtimeStatus, overtimeHours: attendance.overtimeHours })
            .from(attendance)
            .where(gt(attendance.overtimeHours, "0"));

        const stats = {
            pendingRequests: 0,
            pendingHours: 0,
            approvedRequests: 0,
            approvedHours: 0,
            rejectedRequests: 0,
            rejectedHours: 0,
        };

        allRecords.forEach(r => {
            const hours = parseFloat(r.overtimeHours || "0");
            if (r.overtimeStatus === "pending") {
                stats.pendingRequests++;
                stats.pendingHours += hours;
            } else if (r.overtimeStatus === "approved") {
                stats.approvedRequests++;
                stats.approvedHours += hours;
            } else if (r.overtimeStatus === "rejected") {
                stats.rejectedRequests++;
                stats.rejectedHours += hours;
            }
        });

        return {
            records,
            stats,
        };
    });
