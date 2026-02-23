import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { employees } from "@/db/schemas/hr-schema";
import { eq } from "drizzle-orm";
import { updateEmployeeSchema } from "@/lib/validators/hr-validators";
import { requireAuthMiddleware } from "@/lib/middlewares";

export const updateEmployeeFn = createServerFn()
    .middleware([requireAuthMiddleware])
    .inputValidator(updateEmployeeSchema)
    .handler(async ({ data }) => {
        // Exclude ID from update payload and ensure it's used only for WHERE clause
        const { id, ...updateData } = data;

        const [updatedEmployee] = await db
            .update(employees)
            .set({
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                employeeCode: updateData.employeeCode,
                designation: updateData.designation,
                department: updateData.department,
                joiningDate: updateData.joiningDate,
                status: updateData.status as "active" | "on_leave" | "terminated" | "resigned",
                employmentType: updateData.employmentType as "full_time" | "part_time" | "contract" | "intern",
                phone: updateData.phone,
                cnic: updateData.cnic,
                address: updateData.address,
                standardSalary: updateData.standardSalary || "0",
                allowanceConfig: updateData.allowanceConfig,
            })
            .where(eq(employees.id, id))
            .returning();

        return updatedEmployee;
    });
