import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import {
  employees,
  attendance,
  payslips,
  salaryAdvances,
} from "@/db/schemas/hr-schema";
import { eq } from "drizzle-orm";
import { deleteEmployeeSchema } from "@/lib/validators/hr-validators";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const deleteEmployeeFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator((data: unknown) => deleteEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    await db
      .update(employees)
      .set({ status: "pending_deletion" })
      .where(eq(employees.id, data.id));
    return { success: true };
  });

/**
 * Approve and execute actual deletion of an employee and their records
 */
export const approveEmployeeDeletionFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator((data: unknown) => deleteEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      // Delete related records first to avoid foreign key constraints
      await tx.delete(attendance).where(eq(attendance.employeeId, data.id));
      await tx.delete(payslips).where(eq(payslips.employeeId, data.id));
      await tx
        .delete(salaryAdvances)
        .where(eq(salaryAdvances.employeeId, data.id));

      // Finally delete the employee record
      await tx.delete(employees).where(eq(employees.id, data.id));
    });

    return { success: true };
  });

/**
 * Cancel a pending deletion request
 */
export const cancelEmployeeDeletionFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator((data: unknown) => deleteEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    await db
      .update(employees)
      .set({ status: "active" })
      .where(eq(employees.id, data.id));
    return { success: true };
  });


