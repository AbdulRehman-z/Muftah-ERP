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
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  type AllowanceConfig,
  STANDARD_ALLOWANCES,
} from "@/lib/types/hr-types";

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
  "special",
]);

export const paymentModeEnum = pgEnum("payment_mode", [
  "per_km"
]);

export const shopTypeEnum = pgEnum("shop_type", [
  "old",
  "new"
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
  employmentType: employmentTypeEnum("employment_type")
    .default("full_time")
    .notNull(),
  joiningDate: date("joining_date").notNull(),

  // Payment Info
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),

  // Base Calculation Field
  standardDutyHours: integer("standard_duty_hours").default(8).notNull(),
  standardSalary: decimal("standard_salary", {
    precision: 12,
    scale: 2,
  }).default("0"),

  // JSON configured flexible allowances
  allowanceConfig: jsonb("allowance_config")
    .$type<AllowanceConfig[]>()
    .default(STANDARD_ALLOWANCES),

  // Leave & Attendance Tracking
  annualLeaveBalance: integer("annual_leave_balance").default(30), // Days remaining
  sickLeaveBalance: integer("sick_leave_balance").default(10),
  casualLeaveBalance: integer("casual_leave_balance").default(5),

  // Incentives / Sales
  isOrderBooker: boolean("is_order_booker").default(false).notNull(), // Identifies marketing/sales field staff
  commissionRate: decimal("commission_rate", {
    precision: 5,
    scale: 2,
  }).default("0"),

  ...timestamps,
});

// --- ATTENDANCE ---
export const attendance = pgTable(
  "attendance",
  {
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
    overtimeHours: decimal("overtime_hours", {
      precision: 5,
      scale: 2,
    }).default("0"),

    // Status
    status: attendanceStatusEnum("status").notNull().default("present"),
    isLate: boolean("is_late").default(false),
    isNightShift: boolean("is_night_shift").default(false),

    // Overtime Approval — remarks required; hours only paid when status = 'approved'
    overtimeStatus: text("overtime_status").default("pending"), // pending, approved, rejected
    overtimeRemarks: text("overtime_remarks"), // Required: reason entered by computer operator

    // Early Departure
    earlyDepartureStatus: text("early_departure_status").default("none"), // none, pending, approved, rejected
    checkOutReason: text("check_out_reason"),

    // Leave approval — 'true' means paid approved leave (no deduction)
    isApprovedLeave: boolean("is_approved_leave").default(false),

    // Leave approval workflow status — pending requires admin decision
    leaveApprovalStatus: text("leave_approval_status").default("none"), // none, pending, approved, rejected

    // Leave classification — determines Bradford Factor counting and balance deduction
    leaveType: leaveTypeEnum("leave_type"), // sick | casual | annual | unpaid | special

    // Data source — biometric machine feed or manual entry fallback
    entrySource: text("entry_source").default("manual"), // 'biometric' | 'manual'

    // Order Booker / Sales Logging Fields
    areaVisited: text("area_visited"),
    paymentMode: paymentModeEnum("payment_mode").default("per_km"),
    isCompanyVehicle: boolean("is_company_vehicle").default(false),
    distanceKm: decimal("distance_km", { precision: 8, scale: 2 }).default("0"),
    perKmRate: decimal("per_km_rate", { precision: 8, scale: 2 }).default("0"),
    petrolAmount: decimal("petrol_amount", { precision: 12, scale: 2 }).default("0"),
    saleAmount: decimal("sale_amount", { precision: 12, scale: 2 }).default("0"),
    recoveryAmount: decimal("recovery_amount", { precision: 12, scale: 2 }).default("0"),
    returnAmount: decimal("return_amount", { precision: 12, scale: 2 }).default("0"),
    slipNumbers: text("slip_numbers"),
    shopType: shopTypeEnum("shop_type").default("old"),

    notes: text("notes"),

    ...timestamps,
  },
  (table) => ({
    employeeDateIdx: index("attendance_employee_date_idx").on(
      table.employeeId,
      table.date,
    ),
  }),
);

// --- PAYROLLS ---
export const payrolls = pgTable("payrolls", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  month: date("month").notNull(), // First day of the payroll month (e.g., 2026-05-01)
  startDate: date("start_date").notNull(), // e.g., 2026-05-16 (Previous Month)
  endDate: date("end_date").notNull(), // e.g., 2026-06-15 (Current Month)

  status: text("status").default("draft"), // draft, approved, paid

  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default(
    "0",
  ),

  processedBy: text("processed_by").references(() => user.id),

  // Finance Integration — wallet used to disburse salaries
  walletId: text("wallet_id"), // FK to finance wallets; set when status → 'paid'
  paidAt: timestamp("paid_at"), // Timestamp of disbursement

  ...timestamps,
});

// --- PAYROLL ITEMS (Payslips) ---
export const payslips = pgTable("payslips", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  payrollId: text("payroll_id")
    .notNull()
    .references(() => payrolls.id),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),

  // Attendance Summary for this period
  daysPresent: integer("days_present").default(0),
  daysAbsent: integer("days_absent").default(0),
  daysLeave: integer("days_leave").default(0),
  totalOvertimeHours: decimal("total_overtime_hours", {
    precision: 8,
    scale: 2,
  }).default("0"),
  nightShiftsCount: integer("night_shifts_count").default(0),

  // Earnings
  basicSalary: decimal("basic_salary", { precision: 12, scale: 2 }).notNull(),
  // Dynamic Allowances computed values mapping: { "houseRent": 12000, "bikeMaintenance": 6000 }
  allowanceBreakdown: jsonb("allowance_breakdown")
    .$type<Record<string, number>>()
    .default({}),

  incentiveAmount: decimal("incentive_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),

  overtimeAmount: decimal("overtime_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),
  nightShiftAllowanceAmount: decimal("night_shift_allowance_amount", {
    precision: 12,
    scale: 2,
  }).default("0"),
  bonusAmount: decimal("bonus_amount", { precision: 12, scale: 2 }).default(
    "0",
  ),

  // Deductions
  absentDeduction: decimal("absent_deduction", {
    precision: 12,
    scale: 2,
  }).default("0"),
  leaveDeduction: decimal("leave_deduction", {
    precision: 12,
    scale: 2,
  }).default("0"),
  advanceDeduction: decimal("advance_deduction", {
    precision: 12,
    scale: 2,
  }).default("0"),
  taxDeduction: decimal("tax_deduction", { precision: 12, scale: 2 }).default(
    "0",
  ),
  otherDeduction: decimal("other_deduction", {
    precision: 12,
    scale: 2,
  }).default("0"),

  // Bradford Factor — computed from absences; can be manually overridden by admin
  bradfordFactorScore: decimal("bradford_factor_score", {
    precision: 8,
    scale: 2,
  }).default("0"),
  bradfordFactorOverride: decimal("bradford_factor_override", {
    precision: 8,
    scale: 2,
  }), // null = use computed
  bradfordFactorPeriod: text("bradford_factor_period"), // e.g. "16 Jan 2026 to 15 Feb 2026"

  // Totals
  grossSalary: decimal("gross_salary", { precision: 12, scale: 2 }).notNull(),
  totalDeductions: decimal("total_deductions", {
    precision: 12,
    scale: 2,
  }).notNull(),
  netSalary: decimal("net_salary", { precision: 12, scale: 2 }).notNull(),

  paymentSource: text("payment_source"), // e.g. "Cash", "Bank-HBL"

  remarks: text("remarks"),

  ...timestamps,
});

// --- SALARY ADVANCES ---
export const salaryAdvances = pgTable("salary_advances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),

  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  reason: text("reason").notNull(),

  status: text("status").default("pending").notNull(), // pending, approved (paid), rejected, deducted
  approvedBy: text("approved_by").references(() => user.id),

  // Finance Integration — wallet used to disburse the advance
  walletId: text("wallet_id"), // FK to finance wallets; set when status → 'approved' (paid)
  paidAt: timestamp("paid_at"), // Timestamp of payout

  deductedInPayslipId: text("deducted_in_payslip_id").references(
    () => payslips.id,
  ),

  ...timestamps,
});

// --- NIGHT SHIFT RATES (Annual Configuration) ---
// Fixed rate per night, locked for the calendar year, reviewed annually.
export const nightShiftRates = pgTable("night_shift_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  year: integer("year").notNull().unique(), // e.g., 2026
  ratePerNight: decimal("rate_per_night", { precision: 10, scale: 2 })
    .notNull(), // e.g., "100.00" or "200.00"

  remarks: text("remarks"), // e.g., "Increased from 100 to 150 per board decision"
  setBy: text("set_by").references(() => user.id),

  ...timestamps,
});

// --- TA/DA RATES (Fluctuating Per-Km Rate) ---
// Per-kilometer rate that changes based on fuel prices.
// Only one record is "active" at a time (latest active record wins).
export const tadaRates = pgTable("tada_rates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  ratePerKm: decimal("rate_per_km", { precision: 8, scale: 2 })
    .notNull(), // e.g., "7.00" or "10.00"

  effectiveFrom: date("effective_from").notNull(), // When this rate kicks in
  remarks: text("remarks"), // e.g., "Fuel price increased to PKR 280/L"
  isActive: boolean("is_active").default(true).notNull(),
  setBy: text("set_by").references(() => user.id),

  ...timestamps,
});

// --- TRAVEL LOGS (Employee TA/DA Tracking) ---
// Records individual trips for marketing/sales staff.
export const travelLogs = pgTable("travel_logs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),

  date: date("date").notNull(),
  destination: text("destination").notNull(), // e.g., "Lahore", "Rawalpindi"
  roundTripKm: decimal("round_trip_km", { precision: 8, scale: 2 })
    .notNull(), // Total km for the round trip

  rateApplied: decimal("rate_applied", { precision: 8, scale: 2 })
    .notNull(), // Snapshot of the rate at time of logging
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 })
    .notNull(), // roundTripKm × rateApplied

  purpose: text("purpose"), // e.g., "Client meeting", "Delivery"
  status: text("status").default("pending").notNull(), // pending, approved, rejected
  approvedBy: text("approved_by").references(() => user.id),

  // Link to payslip when amount is paid out
  paidInPayslipId: text("paid_in_payslip_id").references(() => payslips.id),

  ...timestamps,
});

// --- BRADFORD FACTOR AUDIT LOG ---
// Immutable audit trail for manual Bradford Factor overrides.
// Only super-admins can override; every change is permanently logged.
export const bradfordAuditLog = pgTable("bradford_audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),

  payslipId: text("payslip_id")
    .notNull()
    .references(() => payslips.id),

  employeeId: text("employee_id")
    .notNull()
    .references(() => employees.id),

  computedScore: decimal("computed_score", { precision: 8, scale: 2 })
    .notNull(), // The system-calculated score at the time
  overrideScore: decimal("override_score", { precision: 8, scale: 2 })
    .notNull(), // The new score set by admin

  reason: text("reason").notNull(), // Admin must provide justification
  performedBy: text("performed_by")
    .notNull()
    .references(() => user.id),

  performedAt: timestamp("performed_at").defaultNow().notNull(),
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

export const payrollRelations = relations(payrolls, ({ many, one }) => ({
  payslips: many(payslips),
  processor: one(user, {
    fields: [payrolls.processedBy],
    references: [user.id],
  }),
}));

export const payslipRelations = relations(payslips, ({ one }) => ({
  payroll: one(payrolls, {
    fields: [payslips.payrollId],
    references: [payrolls.id],
  }),
  employee: one(employees, {
    fields: [payslips.employeeId],
    references: [employees.id],
  }),
}));

export const salaryAdvanceRelations = relations(salaryAdvances, ({ one }) => ({
  employee: one(employees, {
    fields: [salaryAdvances.employeeId],
    references: [employees.id],
  }),
  payslip: one(payslips, {
    fields: [salaryAdvances.deductedInPayslipId],
    references: [payslips.id],
  }),
  approver: one(user, {
    fields: [salaryAdvances.approvedBy],
    references: [user.id],
  }),
}));

export const nightShiftRateRelations = relations(nightShiftRates, ({ one }) => ({
  setter: one(user, {
    fields: [nightShiftRates.setBy],
    references: [user.id],
  }),
}));

export const tadaRateRelations = relations(tadaRates, ({ one }) => ({
  setter: one(user, {
    fields: [tadaRates.setBy],
    references: [user.id],
  }),
}));

export const travelLogRelations = relations(travelLogs, ({ one }) => ({
  employee: one(employees, {
    fields: [travelLogs.employeeId],
    references: [employees.id],
  }),
  approver: one(user, {
    fields: [travelLogs.approvedBy],
    references: [user.id],
  }),
  payslip: one(payslips, {
    fields: [travelLogs.paidInPayslipId],
    references: [payslips.id],
  }),
}));

export const bradfordAuditLogRelations = relations(bradfordAuditLog, ({ one }) => ({
  payslip: one(payslips, {
    fields: [bradfordAuditLog.payslipId],
    references: [payslips.id],
  }),
  employee: one(employees, {
    fields: [bradfordAuditLog.employeeId],
    references: [employees.id],
  }),
  performer: one(user, {
    fields: [bradfordAuditLog.performedBy],
    references: [user.id],
  }),
}));
