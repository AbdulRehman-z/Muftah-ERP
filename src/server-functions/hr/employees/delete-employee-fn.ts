import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { employees, attendance, payslips } from "@/db/schemas/hr-schema";
import { eq } from "drizzle-orm";
import { deleteEmployeeSchema } from "@/lib/validators/hr-validators";
import { requireAdminMiddleware } from "@/lib/middlewares";

export const deleteEmployeeFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator((data: unknown) => deleteEmployeeSchema.parse(data))
  .handler(async ({ data }) => {
    await db.transaction(async (tx) => {
      // Delete related records first to avoid foreign key constraints
      await tx.delete(attendance).where(eq(attendance.employeeId, data.id));
      await tx.delete(payslips).where(eq(payslips.employeeId, data.id));

      // Finally delete the employee
      await tx.delete(employees).where(eq(employees.id, data.id));
    });

    return { success: true };
  });
