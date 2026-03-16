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
        status: data.status as
          | "active"
          | "on_leave"
          | "terminated"
          | "resigned",
        employmentType: data.employmentType as
          | "full_time"
          | "part_time"
          | "contract"
          | "intern",
        phone: data.phone,
        cnic: data.cnic,
        address: data.address,
        bankName: data.bankName,
        restDays: data.restDays ?? [0],
        bankAccountNumber: data.bankAccountNumber,
        standardDutyHours: data.standardDutyHours,
        standardSalary: data.standardSalary || "0",
        commissionRate: data.commissionRate || "0",
        isOrderBooker: data.isOrderBooker ?? false,
        allowanceConfig: data.allowanceConfig,
      })
      .returning();

    return newEmployee;
  });
