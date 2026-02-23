import { db } from "@/db";
import { employees, payslips, salaryAdvances, attendance as attendanceTable } from "@/db/schemas/hr-schema";
import { eq, and, lte, gte, inArray } from "drizzle-orm";
import {
    calculatePayslip,
    type DeductionConfig,
    type AttendanceRecord,
    type EmployeeData,
} from "@/lib/payroll-calculator";
import { format, parseISO } from "date-fns";

export type GeneratePayslipInput = {
    employeeId: string;
    payrollId: string;
    payrollPeriod: {
        month: string;     // YYYY-MM-DD
        startDate: string; // YYYY-MM-DD
        endDate: string;   // YYYY-MM-DD
    };
    deductionConfig?: DeductionConfig;
    additionalAmounts?: {
        overtimeAmount?: number;
        nightShiftAllowance?: number;
        incentiveAmount?: number;
        bonusAmount?: number;
        advanceDeduction?: number; // manual override; if not provided, auto-pulled from DB
        taxDeduction?: number;
        overtimeMultiplier?: number;
    };
    /** If true, auto-deduct pending approved salary advances for this employee */
    autoDeductAdvances?: boolean;
    /** If true, update leave balance counters on the employee record */
    autoUpdateLeaveBalances?: boolean;
};

/**
 * Core logic to generate a payslip. Uses internal DB calls.
 * Can be called by Server Functions or background jobs.
 */
export async function generateEmployeePayslipCore(input: GeneratePayslipInput) {
    const {
        employeeId,
        payrollId,
        payrollPeriod,
        deductionConfig,
        additionalAmounts = {},
        autoDeductAdvances = true,
        autoUpdateLeaveBalances = true,
    } = input;

    // 1. Fetch employee data
    const employeeData = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
    });
    if (!employeeData) throw new Error(`Employee with ID ${employeeId} not found`);

    // 2. Fetch attendance records for the period (including new fields)
    const rawAttendance = await db.query.attendance.findMany({
        where: (table, { and, gte, lte, eq }) =>
            and(
                eq(table.employeeId, employeeId),
                gte(table.date, payrollPeriod.startDate),
                lte(table.date, payrollPeriod.endDate)
            ),
    });

    // Map to AttendanceRecord shape (including new leaveType + isApprovedLeave for Bradford)
    const formattedAttendance: AttendanceRecord[] = rawAttendance.map((r) => ({
        date: r.date,
        status: r.status,
        dutyHours: r.dutyHours,
        overtimeHours: r.overtimeHours,
        isNightShift: r.isNightShift || false,
        isApprovedLeave: r.isApprovedLeave ?? false,
        leaveType: r.leaveType ?? null,
        overtimeStatus: r.overtimeStatus ?? "pending",
    }));

    // 3. Auto-pull salary advance deductions if not manually overridden
    let advanceDeduction = additionalAmounts.advanceDeduction ?? 0;
    let advanceIdsToMark: string[] = [];

    if (autoDeductAdvances && advanceDeduction === 0) {
        const pendingAdvances = await db.query.salaryAdvances.findMany({
            where: and(
                eq(salaryAdvances.employeeId, employeeId),
                eq(salaryAdvances.status, "approved")
            ),
        });
        // Sum all approved (but not yet deducted) advances
        const notYetDeducted = pendingAdvances.filter(a => !a.deductedInPayslipId);
        advanceDeduction = notYetDeducted.reduce(
            (sum, a) => sum + parseFloat(a.amount || "0"), 0
        );
        advanceIdsToMark = notYetDeducted.map(a => a.id);
    }

    // 4. Calculate payslip using the updated calculator
    const mergedAdditional = {
        ...additionalAmounts,
        advanceDeduction,
    };

    const payslipCalc = calculatePayslip(
        employeeData as unknown as EmployeeData,
        formattedAttendance,
        payrollPeriod,
        deductionConfig,
        mergedAdditional
    );

    // 5. Delete existing payslip for this payroll + employee (idempotent)
    await db.delete(payslips).where(
        and(
            eq(payslips.payrollId, payrollId),
            eq(payslips.employeeId, employeeId)
        )
    );

    // 6. Save payslip to DB
    const [savedPayslip] = await db
        .insert(payslips)
        .values({
            payrollId,
            employeeId: employeeData.id,

            // Attendance summary
            daysPresent: payslipCalc.daysPresent,
            daysAbsent: payslipCalc.daysAbsent,
            daysLeave: payslipCalc.daysLeave,
            totalOvertimeHours: payslipCalc.totalOvertimeHours.toString(),
            nightShiftsCount: payslipCalc.nightShiftsCount,

            // Bradford Factor
            bradfordFactorScore: payslipCalc.bradfordFactorScore.toString(),
            bradfordFactorPeriod: payslipCalc.bradfordFactorPeriod,
            // bradfordFactorOverride left null — admin can set via separate mutation

            // Earnings
            basicSalary: payslipCalc.basicSalary.toString(),
            allowanceBreakdown: payslipCalc.allowanceBreakdown,
            overtimeAmount: payslipCalc.overtimeAmount.toString(),
            nightShiftAllowanceAmount: payslipCalc.nightShiftAllowanceAmount.toString(),
            incentiveAmount: payslipCalc.incentiveAmount.toString(),
            bonusAmount: payslipCalc.bonusAmount.toString(),

            // Deductions
            absentDeduction: payslipCalc.absentDeduction.toString(),
            leaveDeduction: payslipCalc.leaveDeduction.toString(),
            advanceDeduction: payslipCalc.advanceDeduction.toString(),
            taxDeduction: payslipCalc.taxDeduction.toString(),
            otherDeduction: payslipCalc.otherDeduction.toString(),

            // Totals
            grossSalary: payslipCalc.grossSalary.toString(),
            totalDeductions: payslipCalc.totalDeductions.toString(),
            netSalary: payslipCalc.netSalary.toString(),

            remarks: payslipCalc.remarks,
        })
        .returning();

    // 7. Mark salary advances as deducted in this payslip
    if (advanceIdsToMark.length > 0) {
        await db
            .update(salaryAdvances)
            .set({
                status: "deducted",
                deductedInPayslipId: savedPayslip.id,
            })
            .where(inArray(salaryAdvances.id, advanceIdsToMark));
    }

    // 8. Auto-update leave balances on the employee record
    if (autoUpdateLeaveBalances) {
        const leaveTaken = rawAttendance.filter(r => r.status === "leave" && r.isApprovedLeave);

        const annualTaken = leaveTaken.filter(r => r.leaveType === "annual").length;
        const casualTaken = leaveTaken.filter(r => r.leaveType === "casual").length;
        const sickTaken = leaveTaken.filter(r => r.leaveType === "sick").length;

        if (annualTaken > 0 || casualTaken > 0 || sickTaken > 0) {
            await db
                .update(employees)
                .set({
                    annualLeaveBalance:
                        Math.max(0, (employeeData.annualLeaveBalance ?? 30) - annualTaken),
                    casualLeaveBalance:
                        Math.max(0, (employeeData.casualLeaveBalance ?? 5) - casualTaken),
                    sickLeaveBalance:
                        Math.max(0, (employeeData.sickLeaveBalance ?? 10) - sickTaken),
                })
                .where(eq(employees.id, employeeId));
        }
    }

    return {
        ...savedPayslip,
        calculation: payslipCalc,
    };
}
