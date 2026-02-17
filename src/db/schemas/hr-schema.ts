import {
    boolean,
    decimal,
    index,
    integer,
    pgEnum,
    pgTable,
    text,
    time,
    timestamp,
    date
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { user } from "./auth-schema";

const timestamps = {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
};

// --- ENUMS ---
export const employeeStatusEnum = pgEnum("employee_status", [
    "active",
    "on_leave",
    "terminated",
    "resigned",
]);

export const employmentTypeEnum = pgEnum("employment_type", [
    "full_time",
    "part_time",
    "contract",
    "intern",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
    "present",
    "absent",
    "leave",
    "half_day",
    "holiday",
]);

export const leaveTypeEnum = pgEnum("leave_type", [
    "sick",
    "casual",
    "annual",
    "unpaid",
]);

// --- EMPLOYEES ---
export const employees = pgTable("employees", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),
    userId: text("user_id").references(() => user.id), // Optional link to auth user

    // Identity
    employeeCode: text("employee_code").notNull().unique(), // e.g., "110005"
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    cnic: text("cnic"), // National ID
    phone: text("phone"),
    address: text("address"),

    // Job Details
    designation: text("designation").notNull(), // e.g., "CEO", "Security Guard"
    department: text("department"), // e.g., "Sale & Finance"
    status: employeeStatusEnum("status").default("active").notNull(),
    employmentType: employmentTypeEnum("employment_type").default("full_time").notNull(),
    joiningDate: date("joining_date").notNull(),

    // Compensation Structure (Snapshot/Current)
    basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull().default("0"),
    houseRentAllowance: decimal("house_rent_allowance", { precision: 12, scale: 2 }).default("0"),
    utilitiesAllowance: decimal("utilities_allowance", { precision: 12, scale: 2 }).default("0"),
    conveyanceAllowance: decimal("conveyance_allowance", { precision: 12, scale: 2 }).default("0"),
    bikeMaintenanceAllowance: decimal("bike_maintenance_allowance", { precision: 12, scale: 2 }).default("0"),
    mobileAllowance: decimal("mobile_allowance", { precision: 12, scale: 2 }).default("0"),
    fuelAllowance: decimal("fuel_allowance", { precision: 12, scale: 2 }).default("0"),
    specialAllowance: decimal("special_allowance", { precision: 12, scale: 2 }).default("0"),

    // Variable Components (Percentages or Rates)
    incentivePercentage: decimal("incentive_percentage", { precision: 5, scale: 2 }).default("0"), // e.g. 2.00%

    // Duty Rules
    standardDutyHours: integer("standard_duty_hours").default(8).notNull(), // 8 or 12
    isOperator: boolean("is_operator").default(false).notNull(), // Determines attendance logic (split shift vs single)

    ...timestamps,
});

// --- ATTENDANCE ---
export const attendance = pgTable("attendance", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),
    employeeId: text("employee_id")
        .notNull()
        .references(() => employees.id),

    date: date("date").notNull(), // The canonical date of attendance

    // Shift 1 (Standard)
    checkIn: time("check_in"),
    checkOut: time("check_out"),

    // Shift 2 (For Operators/Split Shifts)
    checkIn2: time("check_in_2"),
    checkOut2: time("check_out_2"),

    // Calculated/Manual Overrides
    dutyHours: decimal("duty_hours", { precision: 5, scale: 2 }).default("0"),
    overtimeHours: decimal("overtime_hours", { precision: 5, scale: 2 }).default("0"),

    // Status
    status: attendanceStatusEnum("status").notNull().default("present"),
    isLate: boolean("is_late").default(false),
    isNightShift: boolean("is_night_shift").default(false),

    notes: text("notes"),

    ...timestamps,
}, (table) => ({
    employeeDateIdx: index("attendance_employee_date_idx").on(table.employeeId, table.date),
}));


// --- PAYROLL RUNS ---
export const payrollRuns = pgTable("payroll_runs", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),

    month: date("month").notNull(), // First day of the payroll month (e.g., 2026-05-01)
    startDate: date("start_date").notNull(), // e.g., 2026-05-16 (Previous Month)
    endDate: date("end_date").notNull(), // e.g., 2026-06-15 (Current Month)

    status: text("status").default("draft"), // draft, approved, paid

    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),

    processedBy: text("processed_by").references(() => user.id),

    ...timestamps,
});

// --- PAYROLL ITEMS (Payslips) ---
export const payslips = pgTable("payslips", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => createId()),
    payrollRunId: text("payroll_run_id")
        .notNull()
        .references(() => payrollRuns.id),
    employeeId: text("employee_id")
        .notNull()
        .references(() => employees.id),

    // Attendance Summary for this period
    daysPresent: integer("days_present").default(0),
    daysAbsent: integer("days_absent").default(0),
    daysLeave: integer("days_leave").default(0),
    totalOvertimeHours: decimal("total_overtime_hours", { precision: 8, scale: 2 }).default("0"),
    nightShiftsCount: integer("night_shifts_count").default(0),

    // Earnings
    basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
    houseRentAllowance: decimal("house_rent_allowance", { precision: 12, scale: 2 }).default("0"),
    utilitiesAllowance: decimal("utilities_allowance", { precision: 12, scale: 2 }).default("0"),
    conveyanceAllowance: decimal("conveyance_allowance", { precision: 12, scale: 2 }).default("0"),
    bikeMaintenanceAllowance: decimal("bike_maintenance_allowance", { precision: 12, scale: 2 }).default("0"),
    mobileAllowance: decimal("mobile_allowance", { precision: 12, scale: 2 }).default("0"),
    fuelAllowance: decimal("fuel_allowance", { precision: 12, scale: 2 }).default("0"),
    specialAllowance: decimal("special_allowance", { precision: 12, scale: 2 }).default("0"),
    incentiveAmount: decimal("incentive_amount", { precision: 12, scale: 2 }).default("0"),

    overtimeAmount: decimal("overtime_amount", { precision: 12, scale: 2 }).default("0"),
    nightShiftAllowanceAmount: decimal("night_shift_allowance_amount", { precision: 12, scale: 2 }).default("0"),
    bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }).default("0"),

    // Deductions
    absentDeduction: decimal("absent_deduction", { precision: 12, scale: 2 }).default("0"),
    advanceDeduction: decimal("advance_deduction", { precision: 12, scale: 2 }).default("0"),
    taxDeduction: decimal("tax_deduction", { precision: 12, scale: 2 }).default("0"),
    otherDeduction: decimal("other_deduction", { precision: 12, scale: 2 }).default("0"),

    // Totals
    grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
    totalDeductions: decimal("total_deductions", { precision: 12, scale: 2 }).notNull(),
    netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),

    remarks: text("remarks"),

    ...timestamps,
});

// --- RELATIONS ---
export const employeeRelations = relations(employees, ({ one, many }) => ({
    user: one(user, {
        fields: [employees.userId],
        references: [user.id],
    }),
    attendance: many(attendance),
    payslips: many(payslips),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
    employee: one(employees, {
        fields: [attendance.employeeId],
        references: [employees.id],
    }),
}));

export const payrollRunRelations = relations(payrollRuns, ({ many, one }) => ({
    payslips: many(payslips),
    processor: one(user, {
        fields: [payrollRuns.processedBy],
        references: [user.id],
    }),
}));

export const payslipRelations = relations(payslips, ({ one }) => ({
    payrollRun: one(payrollRuns, {
        fields: [payslips.payrollRunId],
        references: [payrollRuns.id],
    }),
    employee: one(employees, {
        fields: [payslips.employeeId],
        references: [employees.id],
    }),
}));
