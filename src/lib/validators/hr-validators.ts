import { z } from "zod";

export const createEmployeeSchema = z.object({
    firstName: z.string().min(1, "First Name is required"),
    lastName: z.string().min(1, "Last Name is required"),
    employeeCode: z.string().min(1, "Employee Code is required"),
    designation: z.string().min(1, "Designation is required"),
    department: z.string().min(1, "Department is required"),
    joiningDate: z.string().min(1, "Joining Date is required"),

    status: z.enum(["active", "on_leave", "terminated", "resigned"]),
    employmentType: z.enum(["full_time", "part_time", "contract", "intern"]),

    phone: z.string(),
    cnic: z.string(),
    address: z.string(),

    basicSalary: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Must be a positive number",
    }),

    houseRentAllowance: z.string(),
    utilitiesAllowance: z.string(),
    conveyanceAllowance: z.string(),
    bikeMaintenanceAllowance: z.string(),
    mobileAllowance: z.string(),
    fuelAllowance: z.string(),
    specialAllowance: z.string(),
    incentivePercentage: z.string(),

    standardDutyHours: z.union([z.literal(8), z.literal(12)]),

    isOperator: z.boolean(),
});

export const updateEmployeeSchema = createEmployeeSchema.extend({
    id: z.string().min(1, "Employee ID is required"),
});

export const deleteEmployeeSchema = z.object({
    id: z.string().min(1, "Employee ID is required"),
});

export const upsertAttendanceSchema = z.object({
    employeeId: z.string().min(1, "Employee is required"),
    date: z.string().min(1, "Date is required"),
    status: z.enum(["present", "absent", "leave", "half_day", "holiday"]),
    checkIn: z.string().nullable(),
    checkOut: z.string().nullable(),
    checkIn2: z.string().nullable(),
    checkOut2: z.string().nullable(),
    isLate: z.boolean().nullable(),
    notes: z.string().nullable(),
});
