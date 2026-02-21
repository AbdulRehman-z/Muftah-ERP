import { db } from "@/db";
import { employees, payslips, payrolls } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";
// import { generateEmployeePayslipCore } from "./payroll/core";
import { calculateAbsentDeductions, calculatePayslip, calculateSalaryBreakdown, calculateWorkingDays } from "@/lib/payroll-calculator";
import { createServerFn } from "@tanstack/react-start";
import { generateEmployeePayslipCore } from "./core";

/**
 * Get list of employees with their payroll status for a specific month.
 */
export const getMonthlyPayrollTableFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        month: z.string(), // YYYY-MM
        limit: z.number().default(7),
        offset: z.number().default(0),
    }))
    .handler(async ({ data }) => {
        const { month, limit, offset } = data;
        // Payroll period: 16th of prev month to 15th of current month
        const monthDate = parseISO(`${month}-01`);
        const prevMonth = subMonths(monthDate, 1);
        const startDate = format(addDays(startOfMonth(prevMonth), 15), "yyyy-MM-dd");
        const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

        // Find the payroll for this month (if any)
        const payroll = await db.query.payrolls.findFirst({
            where: eq(payrolls.month, `${month}-01`),
        });

        // Fetch paginated active employees
        const allEmployees = await db.query.employees.findMany({
            where: eq(employees.status, "active"),
            with: {
                user: true,
            },
            limit,
            offset,
            orderBy: [asc(employees.employeeCode)],
        });

        // Get total count for pagination
        const [{ count }] = await db.select({ count: sql<number>`count(*)` })
            .from(employees)
            .where(eq(employees.status, "active"));

        // Fetch existing payslips for this payroll (if exists)
        let existingPayslips: Record<string, any> = {};
        if (payroll) {
            const payslipsList = await db.query.payslips.findMany({
                where: eq(payslips.payrollId, payroll.id),
            });
            payslipsList.forEach(p => {
                existingPayslips[p.employeeId] = p;
            });
        }

        // Fetch missed payslip info for previous month
        const lastMonthStr = format(subMonths(monthDate, 1), "yyyy-MM");
        const lastMonthPayroll = await db.query.payrolls.findFirst({
            where: eq(payrolls.month, `${lastMonthStr}-01`),
        });

        const lastMonthPayslips: Record<string, boolean> = {};
        if (lastMonthPayroll) {
            const list = await db.query.payslips.findMany({
                where: eq(payslips.payrollId, lastMonthPayroll.id),
                columns: { employeeId: true }
            });
            list.forEach(p => lastMonthPayslips[p.employeeId] = true);
        }

        // Calculate total stats for the whole month (not just paginated)
        const totalStats = await db.select({
            totalBasic: sql<string>`sum(${employees.standardSalary})`,
        })
            .from(employees)
            .where(eq(employees.status, "active"));

        const generatedStats = await db.select({
            totalGenerated: sql<string>`sum(${payslips.netSalary})`,
            count: sql<number>`count(*)`
        })
            .from(payslips)
            .where(payroll ? eq(payslips.payrollId, payroll.id) : sql`1=0`);
        const tableData = allEmployees.map(emp => {
            const payslip = existingPayslips[emp.id];

            // Check if joining month completed? 
            // Logic: calculated based on joiningDate vs selected month.
            // For now, simple logic: if joining date is before period end.
            const isEligible = emp.joiningDate <= endDate;
            const missedLastMonth = lastMonthPayroll && !lastMonthPayslips[emp.id];

            return {
                id: emp.id,
                employeeCode: emp.employeeCode,
                firstName: emp.firstName,
                lastName: emp.lastName,
                designation: emp.designation,
                department: emp.department,
                joiningDate: emp.joiningDate,
                basicSalary: emp.basicSalary,
                standardSalary: emp.standardSalary,

                // Payroll Status
                hasPayslip: !!payslip,
                payslipId: payslip?.id,
                netSalary: payslip?.netSalary,
                status: payroll?.status || "pending",

                isEligible,
                missedLastMonth,
            };
        });

        return {
            period: { startDate, endDate },
            employees: tableData,
            payrollId: payroll?.id,
            payrollStatus: payroll?.status,
            activeCount: count,
            totalEmployees: count,
            totalSalaryBudget: totalStats[0]?.totalBasic || "0",
            totalNetProcessed: generatedStats[0]?.totalGenerated || "0",
            payslipsGeneratedCount: generatedStats[0]?.count || 0,
        };
    });

/**
 * Preview Payroll Calculation for Single Employee (Calculator Sheet)
 * Performs calculation on-the-fly without saving.
 */
export const previewEmployeePayslipFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        employeeId: z.string(),
        month: z.string(), // YYYY-MM
        manualDeductions: z.array(z.object({
            description: z.string(),
            amount: z.number(),
        })).optional(),
        additionalAmounts: z.object({
            overtimeAmount: z.number().optional(),
            nightShiftAllowance: z.number().optional(),
            incentiveAmount: z.number().optional(),
            bonusAmount: z.number().optional(),
            advanceDeduction: z.number().optional(),
            taxDeduction: z.number().optional(),
            overtimeMultiplier: z.number().optional(),
        }).optional(),
    }))
    .handler(async ({ data }) => {
        const { employeeId, month } = data;

        // Calculate period
        const monthDate = parseISO(`${month}-01`);
        const prevMonth = subMonths(monthDate, 1);
        const startDate = format(addDays(startOfMonth(prevMonth), 15), "yyyy-MM-dd");
        const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

        // Use the core logic wrapper but we need it to return the CALCULATION object, 
        // passing saving to DB.
        // Actually, `generateEmployeePayslipCore` saves to DB. 
        // We will call `calculatePayslip` directly here.

        const employeeData = await db.query.employees.findFirst({
            where: eq(employees.id, employeeId),
        });
        if (!employeeData) throw new Error("Employee not found");

        const attendanceRecords = await db.query.attendance.findMany({
            where: (table, { and, gte, lte, eq }) => and(
                eq(table.employeeId, employeeId),
                gte(table.date, startDate),
                lte(table.date, endDate)
            ),
        });

        const formattedAttendance = attendanceRecords.map((record) => ({
            date: record.date,
            status: record.status as any,
            dutyHours: record.dutyHours,
            overtimeHours: record.overtimeHours,
            isNightShift: record.isNightShift || false,
        }));

        const calculation = calculatePayslip(
            employeeData as any,
            formattedAttendance,
            { month: `${month}-01`, startDate, endDate },
            {
                manualDeductions: data.manualDeductions || [],
                deductConveyanceOnLeave: true
            },
            data.additionalAmounts
        );

        // Fetch missed payslip info for previous month
        const lastMonthStr = format(subMonths(monthDate, 1), "yyyy-MM");
        const lastMonthPayroll = await db.query.payrolls.findFirst({
            where: eq(payrolls.month, `${lastMonthStr}-01`),
        });

        let missedLastMonth = false;
        if (lastMonthPayroll) {
            const lastPayslip = await db.query.payslips.findFirst({
                where: and(
                    eq(payslips.payrollId, lastMonthPayroll.id),
                    eq(payslips.employeeId, employeeId)
                ),
            });
            missedLastMonth = !lastPayslip;
        }

        return {
            ...calculation,
            missedLastMonth,
            lastMonthStandardSalary: employeeData.standardSalary || "0",
        };
    });

/**
 * Generate (Save) Single Payslip from Preview
 * This creates/updates the payslip record.
 */
export const saveEmployeePayslipFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        employeeId: z.string(),
        month: z.string(),
        // We trust the preview data or re-calculate? 
        // Safer to RE-CALCULATE with verified inputs.
        // So we accept the CONFIG.
        deductionConfig: z.any(),
        additionalAmounts: z.any(),
    }))
    .handler(async ({ data }) => {
        const { employeeId, month, deductionConfig, additionalAmounts } = data;

        // 1. Ensure Payroll Run exists for this month
        // Period logic
        const monthDate = parseISO(`${month}-01`);
        const prevMonth = subMonths(monthDate, 1);
        const startDate = format(addDays(startOfMonth(prevMonth), 15), "yyyy-MM-dd");
        const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

        let payroll = await db.query.payrolls.findFirst({
            where: eq(payrolls.month, `${month}-01`),
        });

        if (!payroll) {
            // Create if missing
            const [newPayroll] = await db.insert(payrolls).values({
                month: `${month}-01`,
                startDate,
                endDate,
                status: "draft",
                totalAmount: "0",
            }).returning();
            payroll = newPayroll;
        }

        // 2. Call Core Generator
        const result = await generateEmployeePayslipCore({
            employeeId,
            payrollId: payroll.id,
            payrollPeriod: {
                month: `${month}-01`,
                startDate,
                endDate
            },
            deductionConfig,
            additionalAmounts
        });

        return result;
    });

/**
 * Get Employee Payroll History
 */
export const getEmployeePayrollHistoryFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ employeeId: z.string() }))
    .handler(async ({ data }) => {
        return await db.query.payslips.findMany({
            where: eq(payslips.employeeId, data.employeeId),
            with: {
                payroll: true,
                employee: true,
            },
            orderBy: [desc(payslips.createdAt)],
        });
    });
