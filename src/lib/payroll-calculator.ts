import { parseISO, eachDayOfInterval, format } from "date-fns";
import { type AllowanceConfig } from "@/lib/types/hr-types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type AttendanceRecord = {
  date: string;
  status: "present" | "absent" | "leave" | "half_day" | "holiday";
  dutyHours: string | null;
  overtimeHours: string | null;
  isNightShift: boolean;
  /**
   * true  → approved paid leave (no deduction)
   * false → unpaid / unapproved leave (conveyance deducted per existing rule)
   */
  isApprovedLeave?: boolean;
  /**
   * Type of leave — used for Bradford Factor and leave balance deduction.
   * sick | casual | annual | unpaid | special
   */
  leaveType?: string | null;
  /**
   * Only count overtime when the admin has explicitly approved it.
   * pending | approved | rejected
   */
  overtimeStatus?: string;
};

export type EmployeeData = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  cnic: string | null;
  designation: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  standardSalary: string;
  allowanceConfig: AllowanceConfig[];
  standardDutyHours?: number; // fallback to 8 if absent
};

export type DeductionConfig = {
  manualDeductions: Array<{
    description: string;
    amount: number;
  }>;
  deductConveyanceOnLeave: boolean; // kept for backward compat, now only applies to unapproved leave
};

export type PayslipCalculation = {
  // Employee Info
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  cnic: string;
  bankName: string;
  bankAccountNumber: string;

  // Period
  payrollMonth: string;
  startDate: string;
  endDate: string;

  // Attendance Summary
  totalWorkingDays: number;
  daysPresent: number;
  daysAbsent: number;
  daysLeave: number; // approved paid leaves
  daysUnapprovedLeave: number; // unpaid / unapproved
  daysSickLeave: number; // sick leaves (no salary deduction but count in Bradford)
  daysHalfDay: number;
  totalOvertimeHours: number;
  totalUndertimeHours: number;
  nightShiftsCount: number;
  bradfordFactorScore: number;
  bradfordFactorPeriod: string; // human-readable period label

  // Earnings
  basicSalary: number;
  allowanceBreakdown: Record<string, number>;

  overtimeAmount: number;
  nightShiftAllowanceAmount: number;
  incentiveAmount: number;
  bonusAmount: number;

  // Deductions
  absentDeduction: number;
  leaveDeduction: number; // from unapproved/unpaid leave
  advanceDeduction: number;
  taxDeduction: number;
  manualDeductions: Array<{ description: string; amount: number }>;
  otherDeduction: number;

  // Original Standard Snapshot
  standardBreakdown: Record<string, number>;

  calculationMeta: {
    calendarDaysInMonth: number;
    perDayBasic: number;
    perHourBasic: number;
    overtimeMultiplier: number;
    overtimeRatePerHour: number;
    standardDutyHours: number;
  };

  // Totals
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  paymentSource: string | null;

  // Meta
  remarks: string;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculates total job days dynamically based on the pay period's calendar
 * length minus whatever days the admin has marked as 'holiday' in attendance.
 * This gives HR full control over weekends/holidays.
 */
export function calculateWorkingDays(
  startDate: string,
  endDate: string,
  records: AttendanceRecord[],
): number {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  const totalDaysInCycle = eachDayOfInterval({ start, end }).length;
  // Count explicit holidays marked by the admin/system
  const holidays = records.filter((r) => r.status === "holiday").length;
  return Math.max(1, totalDaysInCycle - holidays); // Ensure we don't divide by 0
}

/**
 * Derives the effective 'divisor' for daily payout rates (the Job Days).
 * We align this directly with working days (calendar minus holidays)
 * for straight-forward calculation.
 */
export function getCalendarDaysInPayPeriodMonth(
  totalWorkingDays: number,
): number {
  return totalWorkingDays;
}

function getAllowanceAmount(config: AllowanceConfig[], id: string): number {
  return config.find((a) => a.id === id)?.amount || 0;
}

// ============================================================================
// DEDUCTION CALCULATION
// ============================================================================

/**
 * Deduction rules (updated):
 *
 * 1. ABSENT (no notice): full-day deduction from Basic + all allowances except Fuel & Special.
 * 2. APPROVED LEAVE: NO deduction at all.
 * 3. UNAPPROVED / UNPAID LEAVE: Deduct from Conveyance allowance only.
 * 4. HALF-DAY: 50% deduction from Basic + all allowances except Fuel, Special, AND Conveyance.
 * 5. UNDERTIME (present but short hours): hour-based deduction from Basic only.
 *
 * Daily rate is based on CALENDAR DAYS in the pay period's month
 * (not working days), per client requirement.
 */
export function calculateAbsentDeductions(
  employee: EmployeeData,
  attendanceRecords: AttendanceRecord[],
  calendarDaysInMonth: number,
): {
  absentDeduction: number;
  leaveDeduction: number;
  totalUndertimeHours: number;
  adjustedAllowances: Record<string, number>;
} {
  const standardDutyHours = employee.standardDutyHours || 8;
  const config = employee.allowanceConfig || [];

  const basicSalary = parseFloat(employee.standardSalary || "0");
  const perDayBasic = basicSalary / calendarDaysInMonth;
  const perHourBasic = perDayBasic / standardDutyHours;

  let totalAbsentDeduction = 0;
  let totalLeaveDeduction = 0;
  let totalUndertimeHours = 0;

  // Adjustment accumulators (keyed by allowance id)
  const adjustments: Record<string, number> = {};
  adjustments["basicSalary"] = 0;
  for (const a of config) adjustments[a.id] = 0;

  /**
   * Apply a fractional day deduction to:
   *   - Basic salary
   *   - All allowances EXCEPT: fuel, special
   *   - Optionally EXCEPT conveyance (e.g. half-day scenario)
   */
  const applyAbsentDeduction = (fraction: number, skipConveyance = false) => {
    let dailyTotal = 0;

    const basicDeduction = perDayBasic * fraction;
    adjustments["basicSalary"] += basicDeduction;
    dailyTotal += basicDeduction;

    for (const allowance of config) {
      const skip =
        allowance.id === "fuel" ||
        allowance.id === "special" ||
        (skipConveyance && allowance.id === "conveyance");

      if (!skip) {
        const dayRate = (allowance.amount / calendarDaysInMonth) * fraction;
        adjustments[allowance.id] += dayRate;
        dailyTotal += dayRate;
      }
    }
    totalAbsentDeduction += dailyTotal;
  };

  for (const record of attendanceRecords) {
    const dutyHours = parseFloat(record.dutyHours || "0");

    if (record.status === "absent") {
      // Full absent without notice → full deduction
      applyAbsentDeduction(1);
    } else if (record.status === "half_day") {
      // Half-day → 50% deduction, but conveyance is NOT deducted
      applyAbsentDeduction(0.5, /* skipConveyance */ true);
    } else if (record.status === "leave") {
      if (record.isApprovedLeave) {
        // Approved paid leave → zero deduction
        // (nothing to do)
      } else {
        // Unpaid / unapproved leave → deduct conveyance allowance only
        const conveyanceAmt = getAllowanceAmount(config, "conveyance");
        if (conveyanceAmt > 0) {
          const perDayConveyance = conveyanceAmt / calendarDaysInMonth;
          totalLeaveDeduction += perDayConveyance;
          if (adjustments["conveyance"] !== undefined) {
            adjustments["conveyance"] += perDayConveyance;
          }
        }
      }
    } else if (record.status === "present" && dutyHours < standardDutyHours) {
      // Undertime: hour-based deduction from Basic salary only
      const shortHours = standardDutyHours - dutyHours;
      const hourDeduction = perHourBasic * shortHours;
      totalAbsentDeduction += hourDeduction;
      adjustments["basicSalary"] += hourDeduction;
      totalUndertimeHours += shortHours;
    }
  }

  // Build final adjusted allowance map
  const adjustedAllowances: Record<string, number> = {};
  adjustedAllowances["basicSalary"] = Math.round(
    basicSalary - adjustments["basicSalary"],
  );
  for (const allowance of config) {
    adjustedAllowances[allowance.id] = Math.round(
      allowance.amount - adjustments[allowance.id],
    );
  }

  return {
    absentDeduction: Math.round(totalAbsentDeduction),
    leaveDeduction: Math.round(totalLeaveDeduction),
    totalUndertimeHours: +totalUndertimeHours.toFixed(2),
    adjustedAllowances,
  };
}

// ============================================================================
// OVERTIME
// ============================================================================

/**
 * Only count overtime hours where overtimeStatus === "approved".
 * Pending / rejected overtime is ignored.
 */
export function sumApprovedOvertimeHours(records: AttendanceRecord[]): number {
  return records.reduce((sum, r) => {
    const isApproved = !r.overtimeStatus || r.overtimeStatus === "approved";
    if (!isApproved) return sum;
    return sum + parseFloat(r.overtimeHours || "0");
  }, 0);
}

export function calculateOvertimePay(
  basicSalary: number,
  standardDutyHours: number,
  calendarDaysInMonth: number,
  overtimeHours: number,
  multiplier: number = 1.0,
): number {
  const perDayBasic = basicSalary / calendarDaysInMonth;
  const perHourBasic = perDayBasic / standardDutyHours;
  return Math.round(perHourBasic * multiplier * overtimeHours);
}

// ============================================================================
// BRADFORD FACTOR
// ============================================================================

/**
 * Bradford Factor: B = S² × D
 *
 * S = number of separate absence SPELLS (consecutive absents = 1 spell)
 * D = total absent-equivalent days
 *
 * What counts:
 *   - absent        → full day, full spell counting
 *   - sick leave    → counts toward D (no deduction but still tracked)
 *   - unpaid/special leave → counts toward D
 *   - approved paid leaes (casual/annual) → excluded from Bradford
 *   - half_day → counts as 0.5 absent-equivalent days
 */
export function calculateBradfordFactor(
  attendanceRecords: AttendanceRecord[],
): number {
  let spells = 0;
  let totalAbsentDays = 0;
  let inSpell = false;

  const sorted = [...attendanceRecords].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  for (const record of sorted) {
    const isBradfordEvent =
      record.status === "absent" ||
      record.status === "half_day" ||
      (record.status === "leave" &&
        // Sick, special, unpaid leaves count; casual/annual approved leaves do NOT
        (record.leaveType === "sick" ||
          record.leaveType === "special" ||
          record.leaveType === "unpaid" ||
          !record.isApprovedLeave));

    const dayWeight =
      record.status === "half_day" ? 0.5 : isBradfordEvent ? 1 : 0;

    if (isBradfordEvent) {
      totalAbsentDays += dayWeight;
      if (!inSpell) {
        spells++;
        inSpell = true;
      }
    } else {
      inSpell = false;
    }
  }

  return Math.round(Math.pow(spells, 2) * totalAbsentDays);
}

// ============================================================================
// MAIN PAYSLIP CALCULATOR
// ============================================================================

export function calculatePayslip(
  employee: EmployeeData,
  attendanceRecords: AttendanceRecord[],
  payrollPeriod: { month: string; startDate: string; endDate: string },
  deductionConfig: DeductionConfig = {
    manualDeductions: [],
    deductConveyanceOnLeave: true,
  },
  additionalAmounts: {
    overtimeAmount?: number;
    nightShiftAllowance?: number;
    incentiveAmount?: number;
    bonusAmount?: number;
    advanceDeduction?: number;
    taxDeduction?: number;
    overtimeMultiplier?: number;
  } = {},
): PayslipCalculation {
  const stdDutyHours = employee.standardDutyHours || 8;
  const config = employee.allowanceConfig || [];
  const basicSalaryStd = parseFloat(employee.standardSalary || "0");

  // ── Key change: use EXACT Job Days for absolute transparent calculation ──────────────
  const totalWorkingDays = calculateWorkingDays(
    payrollPeriod.startDate,
    payrollPeriod.endDate,
    attendanceRecords,
  );
  const calendarDaysInMonth = getCalendarDaysInPayPeriodMonth(totalWorkingDays);

  // Attendance summary
  const daysPresent = attendanceRecords.filter(
    (r) => r.status === "present",
  ).length;
  const daysAbsent = attendanceRecords.filter(
    (r) => r.status === "absent",
  ).length;
  const daysLeave = attendanceRecords.filter(
    (r) => r.status === "leave" && r.isApprovedLeave,
  ).length;
  const daysUnapprovedLeave = attendanceRecords.filter(
    (r) => r.status === "leave" && !r.isApprovedLeave,
  ).length;
  const daysSickLeave = attendanceRecords.filter(
    (r) => r.status === "leave" && r.leaveType === "sick",
  ).length;
  const daysHalfDay = attendanceRecords.filter(
    (r) => r.status === "half_day",
  ).length;

  // Only approved overtime counts toward pay
  const totalOvertimeHours = sumApprovedOvertimeHours(attendanceRecords);
  const nightShiftsCount = attendanceRecords.filter(
    (r) => r.isNightShift,
  ).length;
  const bradfordFactorScore = calculateBradfordFactor(attendanceRecords);

  // Deductions (uses calendarDaysInMonth as the divisor)
  const {
    absentDeduction,
    leaveDeduction,
    totalUndertimeHours,
    adjustedAllowances,
  } = calculateAbsentDeductions(
    employee,
    attendanceRecords,
    calendarDaysInMonth,
  );

  // Overtime pay
  const overtimeMultiplier = additionalAmounts.overtimeMultiplier || 1.0;
  const overtimeAmount =
    additionalAmounts.overtimeAmount ??
    calculateOvertimePay(
      basicSalaryStd,
      stdDutyHours,
      calendarDaysInMonth,
      totalOvertimeHours,
      overtimeMultiplier,
    );

  // Night-shift allowance
  let nightShiftAllowanceAmount = additionalAmounts.nightShiftAllowance || 0;
  if (nightShiftAllowanceAmount === 0 && nightShiftsCount > 0) {
    const nightShiftRate = getAllowanceAmount(config, "nightShift");
    nightShiftAllowanceAmount = nightShiftRate * nightShiftsCount;
  }

  const incentiveAmount = additionalAmounts.incentiveAmount || 0;
  const bonusAmount = additionalAmounts.bonusAmount || 0;

  // Gross = sum of adjusted allowances (excl. nightShift handled above) + extras
  let sumOfAllowances = 0;
  for (const key of Object.keys(adjustedAllowances)) {
    if (key !== "nightShift") sumOfAllowances += adjustedAllowances[key];
  }
  const grossSalary =
    sumOfAllowances +
    overtimeAmount +
    nightShiftAllowanceAmount +
    incentiveAmount +
    bonusAmount;

  // Deductions
  const manualDeductionsTotal = deductionConfig.manualDeductions.reduce(
    (s, d) => s + d.amount,
    0,
  );
  const advanceDeduction = additionalAmounts.advanceDeduction || 0;
  const taxDeduction = additionalAmounts.taxDeduction || 0;
  const otherDeduction = manualDeductionsTotal;
  // Include absent + leave deductions in total
  const totalDeductions =
    absentDeduction +
    leaveDeduction +
    advanceDeduction +
    taxDeduction +
    otherDeduction;

  const netSalary = Math.max(0, grossSalary - totalDeductions);

  // Standard breakdown snapshot
  const standardBreakdown: Record<string, number> = {};
  standardBreakdown["basicSalary"] = basicSalaryStd;
  for (const a of config) standardBreakdown[a.id] = a.amount;

  const perDayBasic = basicSalaryStd / calendarDaysInMonth;
  const perHourBasic = perDayBasic / stdDutyHours;

  return {
    employeeId: employee.id,
    employeeCode: employee.employeeCode,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    designation: employee.designation,
    cnic: employee.cnic || "N/A",
    bankName: employee.bankName || "N/A",
    bankAccountNumber: employee.bankAccountNumber || "N/A",

    payrollMonth: format(parseISO(payrollPeriod.month), "MMM-yy"),
    startDate: payrollPeriod.startDate,
    endDate: payrollPeriod.endDate,

    totalWorkingDays,
    daysPresent,
    daysAbsent,
    daysLeave,
    daysUnapprovedLeave,
    daysSickLeave,
    daysHalfDay,
    totalOvertimeHours: +totalOvertimeHours.toFixed(2),
    totalUndertimeHours,
    nightShiftsCount,
    bradfordFactorScore,
    bradfordFactorPeriod: `${format(parseISO(payrollPeriod.startDate), "d MMM yyyy")} to ${format(parseISO(payrollPeriod.endDate), "d MMM yyyy")}`,

    basicSalary: adjustedAllowances["basicSalary"] || 0,
    allowanceBreakdown: adjustedAllowances,

    overtimeAmount,
    nightShiftAllowanceAmount,
    incentiveAmount,
    bonusAmount,

    absentDeduction: Math.round(absentDeduction),
    leaveDeduction: Math.round(leaveDeduction),
    advanceDeduction: Math.round(advanceDeduction),
    taxDeduction: Math.round(taxDeduction),
    manualDeductions: deductionConfig.manualDeductions,
    otherDeduction: Math.round(otherDeduction),

    grossSalary: Math.round(grossSalary),
    totalDeductions: Math.round(totalDeductions),
    netSalary: Math.round(netSalary),
    paymentSource: null,

    standardBreakdown,
    calculationMeta: {
      calendarDaysInMonth,
      perDayBasic: +perDayBasic.toFixed(4),
      perHourBasic: +perHourBasic.toFixed(4),
      overtimeMultiplier,
      overtimeRatePerHour: +(perHourBasic * overtimeMultiplier).toFixed(4),
      standardDutyHours: stdDutyHours,
    },

    remarks: "",
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validatePayslip(payslip: PayslipCalculation): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (payslip.netSalary < 0) {
    errors.push("Net salary is negative. Deductions exceed earnings.");
  }
  if (payslip.grossSalary === 0) {
    warnings.push("Gross salary is zero. Employee may be on unpaid leave.");
  }
  const totalDays =
    payslip.daysPresent +
    payslip.daysAbsent +
    payslip.daysLeave +
    payslip.daysUnapprovedLeave +
    payslip.daysHalfDay;
  if (totalDays > payslip.totalWorkingDays) {
    errors.push("Total attendance days exceed working days in period.");
  }

  return { isValid: errors.length === 0, warnings, errors };
}
