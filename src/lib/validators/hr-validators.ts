import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Matches AllowanceConfig.deductions exactly — required, not optional.
 * The type mismatch error was caused by .optional() being here while
 * AllowanceConfig had deductions as a required field.
 */
const deductionsSchema = z.object({
  absent: z.boolean(),
  annualLeave: z.boolean(),
  sickLeave: z.boolean(),
  specialLeave: z.boolean(),
  lateArrival: z.boolean(),
  earlyLeaving: z.boolean(),
});

const allowanceConfigSchema = z.object({
  id: z.string().min(1, "Allowance ID is required"),
  name: z.string().min(1, "Allowance name cannot be empty"),
  amount: z.number().nonnegative("Amount must be 0 or greater"),
  deductions: deductionsSchema, // ← required, not optional — fixes the TS error
  lateEarlyBasis: z.enum(["hourly", "perDay"]).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE SCHEMAS
// ─────────────────────────────────────────────────────────────────────────────

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

  standardDutyHours: z
    .number()
    .int("Duty hours must be a whole number")
    .min(1, "Must be at least 1 hour")
    .max(24, "Cannot exceed 24 hours"),

  standardSalary: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Must be a valid positive number",
    }),

  commissionRate: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
      message: "Must be a valid percentage between 0 and 100",
    }),

  isOrderBooker: z.boolean(),
  allowanceConfig: z.array(allowanceConfigSchema),
});

export const updateEmployeeSchema = createEmployeeSchema.extend({
  id: z.string().min(1, "Employee ID is required"),
});

export const deleteEmployeeSchema = z.object({
  id: z.string().min(1, "Employee ID is required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

export const upsertAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["present", "absent", "leave", "holiday"]),

  // Leave classification for Bradford Factor + balance tracking
  leaveType: z
    .enum(["sick", "casual", "annual", "unpaid", "special"])
    .nullable()
    .optional(),

  checkIn: z.string().nullable(),
  checkOut: z.string().nullable(),
  checkIn2: z.string().nullable(),
  checkOut2: z.string().nullable(),
  dutyHours: z.string().nullable(),
  overtimeHours: z.string().nullable(),
  isLate: z.boolean().nullable(),
  isNightShift: z.boolean().nullable(),

  // Leave policy
  isApprovedLeave: z.boolean().nullable(),

  // Leave approval workflow
  leaveApprovalStatus: z
    .enum(["none", "pending", "approved", "rejected"])
    .nullable()
    .optional()
    .default("none"),

  // Overtime workflow
  overtimeRemarks: z.string().nullable(),
  overtimeStatus: z.enum(["pending", "approved", "rejected"]).nullable(),

  // Early departure workflow
  earlyDepartureStatus: z
    .enum(["none", "pending", "approved", "rejected"])
    .nullable()
    .optional(),

  // Order Booker Tracking
  areaVisited: z.string().nullable().optional(),
  paymentMode: z.enum(["per_km"]).default("per_km"),
  isCompanyVehicle: z.boolean().default(false),
  distanceKm: z.string().nullable().optional(),
  perKmRate: z.string().nullable().optional(),
  petrolAmount: z.string().nullable().optional(),
  saleAmount: z.string().nullable().optional(),
  recoveryAmount: z.string().nullable().optional(),
  returnAmount: z.string().nullable().optional(),
  slipNumbers: z.string().nullable().optional(),
  shopType: z.enum(["old", "new"]).nullable().optional().default("old"),

  // Entry source for dual-entry system
  entrySource: z.enum(["biometric", "manual"]).default("manual"),
  notes: z.string().nullable(),
}).refine(
  (data) => {
    const ot = parseFloat(data.overtimeHours || "0");
    if (ot > 0 && !data.overtimeRemarks?.trim()) {
      return false;
    }
    return true;
  },
  {
    message: "Overtime reason is required when overtime hours are greater than 0",
    path: ["overtimeRemarks"],
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED TYPES — inferred directly from schemas so they always stay in sync
// ─────────────────────────────────────────────────────────────────────────────

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type UpsertAttendanceInput = z.infer<typeof upsertAttendanceSchema>;