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
                basicSalary: updateData.basicSalary || "0",
                houseRentAllowance: updateData.houseRentAllowance,
                utilitiesAllowance: updateData.utilitiesAllowance,
                conveyanceAllowance: updateData.conveyanceAllowance,
                bikeMaintenanceAllowance: updateData.bikeMaintenanceAllowance,
                mobileAllowance: updateData.mobileAllowance,
                fuelAllowance: updateData.fuelAllowance,
                specialAllowance: updateData.specialAllowance,
                incentivePercentage: updateData.incentivePercentage,
                standardDutyHours: updateData.standardDutyHours,
                isOperator: updateData.isOperator,
            })
            .where(eq(employees.id, id))
            .returning();

        return updatedEmployee;
    });
