import { parseISO, eachDayOfInterval, isWeekend, format } from "date-fns";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SalaryBreakdown = {
    standardSalary: number;
    basicSalary: number;          // 50%
    houseRentAllowance: number;   // 20%
    utilitiesAllowance: number;   // 15%
    bikeMaintenanceAllowance: number; // 10%
    mobileAllowance: number;      // 5%
};

export type AttendanceRecord = {
    date: string;
    status: "present" | "absent" | "leave" | "half_day" | "holiday";
    dutyHours: string | null;
    overtimeHours: string | null;
    isNightShift: boolean;
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
    basicSalary: string;
    houseRentAllowance: string;
    utilitiesAllowance: string;
    bikeMaintenanceAllowance: string;
    mobileAllowance: string;
    fuelAllowance: string;
    specialAllowance: string;
    conveyanceAllowance: string;
    standardDutyHours: number;
};

export type DeductionConfig = {
    // Manual deductions
    manualDeductions: Array<{
        description: string;
        amount: number;
    }>;
    // Policy flags
    deductConveyanceOnLeave: boolean;
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
    daysLeave: number;
    daysHalfDay: number;
    totalOvertimeHours: number;
    totalUndertimeHours: number;
    nightShiftsCount: number;

    // Earnings
    basicSalary: number;
    houseRentAllowance: number;
    utilitiesAllowance: number;
    bikeMaintenanceAllowance: number;
    mobileAllowance: number;
    fuelAllowance: number;
    specialAllowance: number;
    conveyanceAllowance: number;
    overtimeAmount: number;
    nightShiftAllowance: number;
    incentiveAmount: number;
    bonusAmount: number;

    // Deductions
    absentDeduction: number;
    leaveDeduction: number;
    advanceDeduction: number;
    taxDeduction: number;
    manualDeductions: Array<{ description: string; amount: number }>;
    otherDeduction: number;
    standardBreakdown: {
        basicSalary: number;
        houseRentAllowance: number;
        utilitiesAllowance: number;
        bikeMaintenanceAllowance: number;
        mobileAllowance: number;
        conveyanceAllowance: number;
    };
    calculationMeta: {
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

    // Meta
    remarks: string;
};

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculates the standard salary breakdown based on fixed percentages.
 * 
 * Breakdown:
 * - Basic: 50%
 * - House Rent: 20%
 * - Utilities: 15%
 * - Bike Maintenance: 10%
 * - Mobile: 5%
 */
export function calculateSalaryBreakdown(totalStandardSalary: number): SalaryBreakdown {
    const total = Math.max(0, totalStandardSalary);

    return {
        standardSalary: total,
        basicSalary: Math.round(total * 0.50),
        houseRentAllowance: Math.round(total * 0.20),
        utilitiesAllowance: Math.round(total * 0.15),
        bikeMaintenanceAllowance: Math.round(total * 0.10),
        mobileAllowance: Math.round(total * 0.05),
    };
}

/**
 * Counts working days in a period (excluding weekends).
 */
export function calculateWorkingDays(startDate: string, endDate: string): number {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const allDays = eachDayOfInterval({ start, end });

    return allDays.filter(day => !isWeekend(day)).length;
}

/**
 * Calculates deductions based on absent days.
 * 
 * Rules:
 * 1. Hour-based: Deduct from Basic only (for partial absences)
 * 2. Day-based: Deduct from Basic + Standard Allowances (for full day absences)
 * 3. Leave-based: Deduct from Conveyance (for unpaid leaves)
 */
export function calculateAbsentDeductions(
    employee: EmployeeData,
    attendanceRecords: AttendanceRecord[],
    totalWorkingDays: number
): {
    absentDeduction: number;
    leaveDeduction: number;
    totalUndertimeHours: number;
    adjustedEarnings: {
        basicSalary: number;
        houseRentAllowance: number;
        utilitiesAllowance: number;
        bikeMaintenanceAllowance: number;
        mobileAllowance: number;
        conveyanceAllowance: number;
    };
} {
    const standardDutyHours = employee.standardDutyHours || 8;

    // Extract base salaries
    const basicSalary = parseFloat(employee.basicSalary || "0");
    const houseRent = parseFloat(employee.houseRentAllowance || "0");
    const utilities = parseFloat(employee.utilitiesAllowance || "0");
    const bikeMaintenance = parseFloat(employee.bikeMaintenanceAllowance || "0");
    const mobile = parseFloat(employee.mobileAllowance || "0");
    const conveyance = parseFloat(employee.conveyanceAllowance || "0");

    // Calculate per-day and per-hour rates
    const perDayBasic = basicSalary / totalWorkingDays;
    const perHourBasic = perDayBasic / standardDutyHours;

    const perDayHouseRent = houseRent / totalWorkingDays;
    const perDayUtilities = utilities / totalWorkingDays;
    const perDayBikeMaintenance = bikeMaintenance / totalWorkingDays;
    const perDayMobile = mobile / totalWorkingDays;
    const perDayConveyance = conveyance / totalWorkingDays;

    let totalAbsentDeduction = 0;
    let totalLeaveDeduction = 0;
    let totalUndertimeHours = 0;

    let basicAdjustment = 0;
    let houseRentAdjustment = 0;
    let utilitiesAdjustment = 0;
    let bikeMaintenanceAdjustment = 0;
    let mobileAdjustment = 0;
    let conveyanceAdjustment = 0;

    for (const record of attendanceRecords) {
        const dutyHours = parseFloat(record.dutyHours || "0");

        if (record.status === "absent") {
            // Full day absent: Deduct full day from Basic + Standard Allowances
            const dayDeduction = perDayBasic + perDayHouseRent + perDayUtilities +
                perDayBikeMaintenance + perDayMobile;

            totalAbsentDeduction += dayDeduction;
            basicAdjustment += perDayBasic;
            houseRentAdjustment += perDayHouseRent;
            utilitiesAdjustment += perDayUtilities;
            bikeMaintenanceAdjustment += perDayBikeMaintenance;
            mobileAdjustment += perDayMobile;
        }
        else if (record.status === "half_day") {
            // Half day: Deduct 50% from Basic + Standard Allowances
            const halfDayDeduction = (perDayBasic + perDayHouseRent + perDayUtilities +
                perDayBikeMaintenance + perDayMobile) * 0.5;

            totalAbsentDeduction += halfDayDeduction;
            basicAdjustment += perDayBasic * 0.5;
            houseRentAdjustment += perDayHouseRent * 0.5;
            utilitiesAdjustment += perDayUtilities * 0.5;
            bikeMaintenanceAdjustment += perDayBikeMaintenance * 0.5;
            mobileAdjustment += perDayMobile * 0.5;
        }
        else if (record.status === "present" && dutyHours < standardDutyHours) {
            // Undertime: Hour-based deduction from Basic only
            const shortHours = standardDutyHours - dutyHours;
            const hourDeduction = perHourBasic * shortHours;

            totalAbsentDeduction += hourDeduction;
            basicAdjustment += hourDeduction;
            totalUndertimeHours += shortHours;
        }
        else if (record.status === "leave") {
            // Unpaid leave: Deduct from Conveyance
            totalLeaveDeduction += perDayConveyance;
            conveyanceAdjustment += perDayConveyance;
        }
    }

    return {
        absentDeduction: Math.round(totalAbsentDeduction),
        leaveDeduction: Math.round(totalLeaveDeduction),
        totalUndertimeHours: +totalUndertimeHours.toFixed(2),
        adjustedEarnings: {
            basicSalary: Math.round(basicSalary - basicAdjustment),
            houseRentAllowance: Math.round(houseRent - houseRentAdjustment),
            utilitiesAllowance: Math.round(utilities - utilitiesAdjustment),
            bikeMaintenanceAllowance: Math.round(bikeMaintenance - bikeMaintenanceAdjustment),
            mobileAllowance: Math.round(mobile - mobileAdjustment),
            conveyanceAllowance: Math.round(conveyance - conveyanceAdjustment),
        },
    };
}

/**
 * Calculates overtime pay.
 * Overtime Rate: 1.5x of hourly basic rate
 */
export function calculateOvertimePay(
    basicSalary: number,
    standardDutyHours: number,
    totalWorkingDays: number,
    overtimeHours: number,
    multiplier: number = 1.5
): number {
    const perDayBasic = basicSalary / totalWorkingDays;
    const perHourBasic = perDayBasic / standardDutyHours;
    const overtimeRate = perHourBasic * multiplier;

    return Math.round(overtimeRate * overtimeHours);
}

/**
 * Main payslip calculation function.
 */
export function calculatePayslip(
    employee: EmployeeData,
    attendanceRecords: AttendanceRecord[],
    payrollPeriod: { month: string; startDate: string; endDate: string },
    deductionConfig: DeductionConfig = { manualDeductions: [], deductConveyanceOnLeave: true },
    additionalAmounts: {
        overtimeAmount?: number;
        nightShiftAllowance?: number;
        incentiveAmount?: number;
        bonusAmount?: number;
        advanceDeduction?: number;
        taxDeduction?: number;
        overtimeMultiplier?: number;
    } = {}
): PayslipCalculation {
    // Calculate working days
    const totalWorkingDays = calculateWorkingDays(payrollPeriod.startDate, payrollPeriod.endDate);

    // Attendance summary
    const daysPresent = attendanceRecords.filter(r => r.status === "present").length;
    const daysAbsent = attendanceRecords.filter(r => r.status === "absent").length;
    const daysLeave = attendanceRecords.filter(r => r.status === "leave").length;
    const daysHalfDay = attendanceRecords.filter(r => r.status === "half_day").length;
    const totalOvertimeHours = attendanceRecords.reduce((sum, r) =>
        sum + parseFloat(r.overtimeHours || "0"), 0
    );
    const nightShiftsCount = attendanceRecords.filter(r => r.isNightShift).length;

    // Calculate absent/leave deductions
    const { absentDeduction, leaveDeduction, totalUndertimeHours, adjustedEarnings } = calculateAbsentDeductions(
        employee,
        attendanceRecords,
        totalWorkingDays
    );

    // Variable allowances (not affected by absences)
    const fuelAllowance = parseFloat(employee.fuelAllowance || "0");
    const specialAllowance = parseFloat(employee.specialAllowance || "0");

    // Additional earnings
    const overtimeAmount = additionalAmounts.overtimeAmount ||
        calculateOvertimePay(
            parseFloat(employee.basicSalary),
            employee.standardDutyHours,
            totalWorkingDays,
            totalOvertimeHours,
            additionalAmounts.overtimeMultiplier || 1.5
        );
    const nightShiftAllowance = additionalAmounts.nightShiftAllowance || 0;
    const incentiveAmount = additionalAmounts.incentiveAmount || 0;
    const bonusAmount = additionalAmounts.bonusAmount || 0;

    // Intermediate rates for transparency
    const stdDutyHours = employee.standardDutyHours || 8;
    const perDayBasicRate = parseFloat(employee.basicSalary) / totalWorkingDays;
    const perHourBasicRate = perDayBasicRate / stdDutyHours;
    const usedMultiplier = additionalAmounts.overtimeMultiplier || 1.5;

    // Calculate gross salary
    const grossSalary =
        adjustedEarnings.basicSalary +
        adjustedEarnings.houseRentAllowance +
        adjustedEarnings.utilitiesAllowance +
        adjustedEarnings.bikeMaintenanceAllowance +
        adjustedEarnings.mobileAllowance +
        adjustedEarnings.conveyanceAllowance +
        fuelAllowance +
        specialAllowance +
        overtimeAmount +
        nightShiftAllowance +
        incentiveAmount +
        bonusAmount;

    // Manual deductions
    const manualDeductionsTotal = deductionConfig.manualDeductions.reduce(
        (sum, d) => sum + d.amount, 0
    );

    // Other deductions
    const advanceDeduction = additionalAmounts.advanceDeduction || 0;
    const taxDeduction = additionalAmounts.taxDeduction || 0;
    const otherDeduction = manualDeductionsTotal;

    // Total deductions (not including adjustment, as that's already applied to earnings)
    const totalDeductions = advanceDeduction + taxDeduction + otherDeduction;

    // Net salary
    const netSalary = Math.max(0, grossSalary - totalDeductions);

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
        daysHalfDay,
        totalOvertimeHours: +totalOvertimeHours.toFixed(2),
        totalUndertimeHours,
        nightShiftsCount,

        basicSalary: adjustedEarnings.basicSalary,
        houseRentAllowance: adjustedEarnings.houseRentAllowance,
        utilitiesAllowance: adjustedEarnings.utilitiesAllowance,
        bikeMaintenanceAllowance: adjustedEarnings.bikeMaintenanceAllowance,
        mobileAllowance: adjustedEarnings.mobileAllowance,
        fuelAllowance,
        specialAllowance,
        conveyanceAllowance: adjustedEarnings.conveyanceAllowance,
        overtimeAmount,
        nightShiftAllowance,
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
        standardBreakdown: {
            basicSalary: parseFloat(employee.basicSalary),
            houseRentAllowance: parseFloat(employee.houseRentAllowance),
            utilitiesAllowance: parseFloat(employee.utilitiesAllowance),
            bikeMaintenanceAllowance: parseFloat(employee.bikeMaintenanceAllowance),
            mobileAllowance: parseFloat(employee.mobileAllowance),
            conveyanceAllowance: parseFloat(employee.conveyanceAllowance),
        },
        calculationMeta: {
            perDayBasic: +perDayBasicRate.toFixed(4),
            perHourBasic: +perHourBasicRate.toFixed(4),
            overtimeMultiplier: usedMultiplier,
            overtimeRatePerHour: +(perHourBasicRate * usedMultiplier).toFixed(4),
            standardDutyHours: stdDutyHours,
        },

        remarks: "",
    };
}

/**
 * Validates payslip calculation for edge cases.
 */
export function validatePayslip(payslip: PayslipCalculation): {
    isValid: boolean;
    warnings: string[];
    errors: string[];
} {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for negative net salary
    if (payslip.netSalary < 0) {
        errors.push("Net salary is negative. Deductions exceed earnings.");
    }

    // Check for zero salary
    if (payslip.grossSalary === 0) {
        warnings.push("Gross salary is zero. Employee may be on unpaid leave.");
    }

    // Check for missing employee details
    if (!payslip.cnic || payslip.cnic === "N/A") {
        warnings.push("Employee CNIC is missing.");
    }

    if (!payslip.bankAccountNumber || payslip.bankAccountNumber === "N/A") {
        warnings.push("Employee bank account details are missing.");
    }

    // Check for excessive deductions
    if (payslip.totalDeductions > payslip.grossSalary * 0.5) {
        warnings.push("Deductions exceed 50% of gross salary.");
    }

    // Check attendance consistency
    const totalDays = payslip.daysPresent + payslip.daysAbsent + payslip.daysLeave + payslip.daysHalfDay;
    if (totalDays > payslip.totalWorkingDays) {
        errors.push("Total attendance days exceed working days in period.");
    }

    return {
        isValid: errors.length === 0,
        warnings,
        errors,
    };
}
