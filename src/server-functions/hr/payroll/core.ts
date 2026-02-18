import { db } from "@/db";
import { employees, payslips } from "@/db/schemas/hr-schema";
import { eq, and } from "drizzle-orm";
import { calculatePayslip, type DeductionConfig, type AttendanceRecord, type EmployeeData } from "@/lib/payroll-calculator";


export type GeneratePayslipInput = {
    employeeId: string;
    payrollId: string;
    payrollPeriod: {
        month: string; // YYYY-MM-DD
        startDate: string; // YYYY-MM-DD
        endDate: string; // YYYY-MM-DD
    };
    deductionConfig?: DeductionConfig;
    additionalAmounts?: {
        overtimeAmount?: number;
        nightShiftAllowance?: number;
        incentiveAmount?: number;
        bonusAmount?: number;
        advanceDeduction?: number;
        taxDeduction?: number;
    };
};

/**
 * Core logic to generate a payslip. Uses internal DB calls.
 * Can be called by Server Functions or background jobs.
 */
export async function generateEmployeePayslipCore(input: GeneratePayslipInput) {
    const { employeeId, payrollId, payrollPeriod, deductionConfig, additionalAmounts } = input;

    // 1. Fetch employee data
    const employeeData = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
    });

    if (!employeeData) {
        throw new Error(`Employee with ID ${employeeId} not found`);
    }

    // 2. Fetch attendance records for the period
    const attendanceRecords = await db.query.attendance.findMany({
        where: (table, { and, gte, lte, eq }) => and(
            eq(table.employeeId, employeeId),
            gte(table.date, payrollPeriod.startDate),
            lte(table.date, payrollPeriod.endDate)
        ),
    });

    // Map to required format
    const formattedAttendance: AttendanceRecord[] = attendanceRecords.map((record) => ({
        date: record.date,
        status: record.status,
        dutyHours: record.dutyHours,
        overtimeHours: record.overtimeHours,
        isNightShift: record.isNightShift || false,
    }));

    // 3. Calculate payslip
    const payslipCalc = calculatePayslip(
        employeeData as unknown as EmployeeData,
        formattedAttendance,
        payrollPeriod,
        deductionConfig,
        additionalAmounts
    );

    // 4. Save to database
    // Ensure standardSalary is preserved via the input or stored if needed, 
    // but payslip table stores the computed values.

    // Check if payslip already exists for this run and employee to avoid duplicates?
    // For now, let's just insert validation or update logic later.
    // Ideally we should delete existing if creating fresh? Or fail.
    // Let's assume we want to overwrite if exists -> Use onConflictDoUpdate or delete first.
    // But since Drizzle simplistic insert, let's just delete first strictly.

    await db.delete(payslips).where(
        and(
            eq(payslips.payrollId, payrollId),
            eq(payslips.employeeId, employeeId)
        )
    );

    const [savedPayslip] = await db
        .insert(payslips)
        .values({
            payrollId,
            employeeId: employeeData.id,

            daysPresent: payslipCalc.daysPresent,
            daysAbsent: payslipCalc.daysAbsent,
            daysLeave: payslipCalc.daysLeave,
            totalOvertimeHours: payslipCalc.totalOvertimeHours.toString(),
            nightShiftsCount: payslipCalc.nightShiftsCount,

            basicSalary: payslipCalc.basicSalary.toString(),
            houseRentAllowance: payslipCalc.houseRentAllowance.toString(),
            utilitiesAllowance: payslipCalc.utilitiesAllowance.toString(),
            bikeMaintenanceAllowance: payslipCalc.bikeMaintenanceAllowance.toString(),
            mobileAllowance: payslipCalc.mobileAllowance.toString(),
            fuelAllowance: payslipCalc.fuelAllowance.toString(),
            specialAllowance: payslipCalc.specialAllowance.toString(),
            conveyanceAllowance: payslipCalc.conveyanceAllowance.toString(),

            overtimeAmount: payslipCalc.overtimeAmount.toString(),
            nightShiftAllowanceAmount: payslipCalc.nightShiftAllowance.toString(),
            incentiveAmount: payslipCalc.incentiveAmount.toString(),
            bonusAmount: payslipCalc.bonusAmount.toString(),

            absentDeduction: payslipCalc.absentDeduction.toString(),
            advanceDeduction: payslipCalc.advanceDeduction.toString(),
            taxDeduction: payslipCalc.taxDeduction.toString(),
            otherDeduction: payslipCalc.otherDeduction.toString(),

            grossSalary: payslipCalc.grossSalary.toString(),
            totalDeductions: payslipCalc.totalDeductions.toString(),
            netSalary: payslipCalc.netSalary.toString(),

            remarks: payslipCalc.remarks,
        })
        .returning();

    return {
        ...savedPayslip,
        calculation: payslipCalc,
    };
}
