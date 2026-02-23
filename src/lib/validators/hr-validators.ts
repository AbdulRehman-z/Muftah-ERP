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
    bankName: z.string(),
    bankAccountNumber: z.string(),

    standardDutyHours: z.number().int().min(1).max(24),
    standardSalary: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
        message: "Must be a positive number",
    }),

    allowanceConfig: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            amount: z.number().nonnegative("Must be a positive number"),
        })
    ),
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
    // Leave classification for Bradford Factor + balance tracking
    leaveType: z.enum(["sick", "casual", "annual", "unpaid", "special"]).nullable().optional(),
    checkIn: z.string().nullable(),
    checkOut: z.string().nullable(),
    checkIn2: z.string().nullable(),
    checkOut2: z.string().nullable(),
    dutyHours: z.string().nullable(),
    overtimeHours: z.string().nullable(),
    isLate: z.boolean().nullable(),
    isNightShift: z.boolean().nullable(),
    // Leave policy
    isApprovedLeave: z.boolean().nullable(),  // true = paid approved leave, no deduction
    // Overtime workflow
    overtimeRemarks: z.string().nullable(),   // required when overtime > 0
    overtimeStatus: z.enum(["pending", "approved", "rejected"]).nullable(),
    // Entry source for dual-entry system
    entrySource: z.enum(["biometric", "manual"]).default("manual"),
    notes: z.string().nullable(),
});
