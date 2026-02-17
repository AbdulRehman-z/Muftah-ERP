import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { employees } from "@/db/schemas/hr-schema";
import { createEmployeeSchema } from "@/lib/validators/hr-validators";
import { requireAuthMiddleware } from "@/lib/middlewares";

export const createEmployeeFn = createServerFn()
    .middleware([requireAuthMiddleware])
    .inputValidator(createEmployeeSchema)
    .handler(async ({ data }) => {
        const [newEmployee] = await db
            .insert(employees)
            .values({
                firstName: data.firstName,
                lastName: data.lastName,
                employeeCode: data.employeeCode,
                designation: data.designation,
                department: data.department,
                joiningDate: data.joiningDate,
                status: data.status as "active" | "on_leave" | "terminated" | "resigned",
                employmentType: data.employmentType as "full_time" | "part_time" | "contract" | "intern",
                phone: data.phone,
                cnic: data.cnic,
                address: data.address,
                basicSalary: data.basicSalary || "0",
                houseRentAllowance: data.houseRentAllowance || "0",
                utilitiesAllowance: data.utilitiesAllowance || "0",
                conveyanceAllowance: data.conveyanceAllowance || "0",
                bikeMaintenanceAllowance: data.bikeMaintenanceAllowance || "0",
                mobileAllowance: data.mobileAllowance || "0",
                fuelAllowance: data.fuelAllowance || "0",
                specialAllowance: data.specialAllowance || "0",
                incentivePercentage: data.incentivePercentage || "0",
                standardDutyHours: data.standardDutyHours,
                isOperator: data.isOperator,
            })
            .returning();

        return newEmployee;
    });
