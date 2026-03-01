// ─────────────────────────────────────────────────────────────────────────────
// ALLOWANCE CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export type AllowanceConfig = {
  id: string;    // e.g., "houseRent", "conveyance", "fuel"
  name: string;  // Display name shown in UI and payslips
  amount: number; // Monthly amount in PKR

  /**
   * Deduction flags — determines on which attendance events this allowance
   * is deducted. This is the single source of truth for all deduction logic.
   * No hardcoded "if sales staff" checks anywhere in the codebase.
   */
  deductions: {
    absent: boolean;       // Deduct per day when employee is absent (unauthorized)
    leave: boolean;        // Deduct per day when employee is on casual/annual leave
    specialLeave: boolean; // Deduct per day when employee is on special leave (only Basic is paid)
    lateArrival: boolean;  // Deduct proportionally for late arrival (hourly basis)
    earlyLeaving: boolean; // Deduct proportionally for early leaving (hourly basis)
  };

  /**
   * How late/early deductions are calculated for this allowance.
   * - "hourly"  → (amount / workingDaysInMonth / dailyDutyHours) × lateHours  [default]
   * - "perDay"  → (amount / workingDaysInMonth) — full day deducted regardless of hours
   * Only relevant when lateArrival or earlyLeaving is true.
   */
  lateEarlyBasis?: "hourly" | "perDay";
};

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD ALLOWANCES
// Correct defaults per client deduction rules:
//
// Leave        → Conveyance (general) or Fuel (sales) only
// Absent       → Basic + House Rent + Conveyance/Fuel + Utilities + Mobile + Bike (where applicable)
// Special Leave→ Everything EXCEPT Basic is deducted
// Late/Early   → Basic salary only, on hourly basis
// ─────────────────────────────────────────────────────────────────────────────

export const STANDARD_ALLOWANCES: AllowanceConfig[] = [
  {
    id: "houseRent",
    name: "House Rent",
    amount: 0,
    deductions: {
      absent: true,
      leave: false,
      specialLeave: true,  // Only Basic is paid on special leave → everything else deducted
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "utilities",
    name: "Utilities",
    amount: 0,
    deductions: {
      absent: true,
      leave: false,
      specialLeave: true,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "conveyance",
    name: "Conveyance Allowance",
    amount: 0,
    deductions: {
      absent: true,
      leave: true,         // General staff: deducted on casual/annual leave
      specialLeave: true,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "fuel",
    name: "Fuel Allowance",
    amount: 0,
    deductions: {
      absent: true,        // Fixed: was incorrectly false
      leave: true,         // Sales staff: deducted on leave (replaces conveyance)
      specialLeave: true,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "mobile",
    name: "Mobile Allowance",
    amount: 0,
    deductions: {
      absent: true,
      leave: false,
      specialLeave: true,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "bikeMaintenance",
    name: "Bike Maintenance",
    amount: 0,
    deductions: {
      absent: true,
      leave: false,
      specialLeave: true,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "technical",
    name: "Technical Allowance",
    amount: 0,
    deductions: {
      absent: true,
      leave: false,
      specialLeave: false, // Technical allowance: client did not specify — defaulting to not deducted
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "special",
    name: "Special Allowance",
    amount: 0,
    deductions: {
      absent: false,
      leave: false,
      specialLeave: false,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
  {
    id: "nightShift",
    name: "Night Shift Allowance",
    amount: 0,
    deductions: {
      absent: false,
      leave: false,
      specialLeave: false,
      lateArrival: false,
      earlyLeaving: false,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DEDUCTION ENGINE TYPES
// Used by calculateDeductions() utility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single attendance event for an employee in a given month.
 * The engine processes all events and accumulates deductions.
 */
export type AttendanceEvent =
  | { type: "absent"; date: string }
  | { type: "leave"; date: string }
  | { type: "specialLeave"; date: string }
  | { type: "lateArrival"; date: string; lateMinutes: number }
  | { type: "earlyLeaving"; date: string; earlyMinutes: number };

/**
 * An advance taken by the employee that needs to be recovered this month.
 */
export type AdvanceEntry = {
  id: string;
  description: string;
  amount: number;        // Total advance amount
  recoveryAmount: number; // Amount to recover THIS month (could be installment)
};

/**
 * Input to the calculateDeductions() function.
 */
export type DeductionInput = {
  basicSalary: number;
  standardDutyHours: number;       // Daily duty hours e.g. 8
  workingDaysInMonth: number;       // e.g. 26
  allowances: AllowanceConfig[];
  attendanceEvents: AttendanceEvent[];
  advances: AdvanceEntry[];
};

/**
 * A single line item in the deduction breakdown.
 * Used to render a detailed payslip.
 */
export type DeductionLineItem = {
  label: string;        // e.g. "House Rent (Absent × 2 days)"
  amount: number;       // Deducted amount in PKR
  reason: string;       // e.g. "absent" | "leave" | "specialLeave" | "lateArrival" | "earlyLeaving" | "advance"
};

/**
 * Full output of the calculateDeductions() function.
 */
export type DeductionResult = {
  grossSalary: number;          // basicSalary + sum of all allowances
  totalDeductions: number;      // Sum of all deduction line items
  netSalary: number;            // grossSalary - totalDeductions
  basicSalaryDeduction: number; // Portion of basic salary deducted (absent/late/early)
  advanceRecovery: number;      // Total advance recovered this month
  breakdown: DeductionLineItem[]; // Itemized list for payslip rendering
};