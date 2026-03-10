import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance, employees } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

/**
 * Fetch leave records that need admin approval
 */
export const getLeaveApprovalsFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(
        z.object({
            status: z
                .enum(["pending", "approved", "rejected", "all"])
                .default("pending"),
        })
    )
    .handler(async ({ data: { status } }) => {
        const filters = [eq(attendance.status, "leave")];

        if (status !== "all") {
            filters.push(eq(attendance.leaveApprovalStatus, status));
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
                leaveType: attendance.leaveType,
                leaveApprovalStatus: attendance.leaveApprovalStatus,
                isApprovedLeave: attendance.isApprovedLeave,
                notes: attendance.notes,
            })
            .from(attendance)
            .innerJoin(employees, eq(attendance.employeeId, employees.id))
            .where(and(...filters))
            .orderBy(desc(attendance.date));

        // Stats
        const allLeaves = await db
            .select({
                leaveApprovalStatus: attendance.leaveApprovalStatus,
            })
            .from(attendance)
            .where(eq(attendance.status, "leave"));

        const stats = {
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
        };

        allLeaves.forEach((r) => {
            if (r.leaveApprovalStatus === "pending") stats.pendingCount++;
            else if (r.leaveApprovalStatus === "approved") stats.approvedCount++;
            else if (r.leaveApprovalStatus === "rejected") stats.rejectedCount++;
        });

        return { records, stats };
    });

/**
 * Process (approve/reject) a leave request.
 * When approved, sets isApprovedLeave = true (no salary deduction).
 * When rejected, sets isApprovedLeave = false (salary deduction applied).
 */
export const processLeaveApprovalFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(
        z.object({
            id: z.string(),
            status: z.enum(["approved", "rejected", "pending"]),
        })
    )
    .handler(async ({ data: { id, status } }) => {
        const [updated] = await db
            .update(attendance)
            .set({
                leaveApprovalStatus: status,
                // Sync the boolean flag: approved leave → no deduction
                isApprovedLeave: status === "approved",
                updatedAt: new Date(),
            })
            .where(eq(attendance.id, id))
            .returning();

        return updated;
    });
