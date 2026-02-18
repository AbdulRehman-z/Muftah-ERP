import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { payrolls, employees, payslips } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { format, parseISO, startOfMonth, subMonths, addDays } from "date-fns";
import { generateEmployeePayslipCore } from "./core";

const createPayrollSchema = z.object({
    month: z.string(), // YYYY-MM-DD
    employeeIds: z.array(z.string()).optional(),
    processedBy: z.string(),
});

/**
 * Creates a new payroll and auto-generates payslips for all eligible employees.
 */
export const createPayrollFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(createPayrollSchema)
    .handler(async ({ data }) => {
        const { month, employeeIds, processedBy } = data;

        // Calculate payroll period
        // Default: Previous month 16th to Current month 15th
        // e.g. If creating for Dec 2025: Period is Nov 16 - Dec 15.
        const monthDate = parseISO(month);
        const prevMonth = subMonths(monthDate, 1);

        const startDate = format(addDays(startOfMonth(prevMonth), 15), "yyyy-MM-dd");
        const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

        // 1. Create payroll record
        const [payroll] = await db
            .insert(payrolls)
            .values({
                month,
                startDate,
                endDate,
                status: "draft",
                totalAmount: "0",
                processedBy,
            })
            .returning();

        // 2. Identify employees to process
        let employeesToProcess;
        if (employeeIds && employeeIds.length > 0) {
            employeesToProcess = await db.query.employees.findMany({
                where: (employees, { inArray }) => inArray(employees.id, employeeIds),
            });
        } else {
            employeesToProcess = await db.query.employees.findMany({
                where: eq(employees.status, "active"),
            });
        }

        // 3. Generate Payslips in Parallel
        const payslipPromises = employeesToProcess.map(async (employee) => {
            try {
                return await generateEmployeePayslipCore({
                    employeeId: employee.id,
                    payrollId: payroll.id,
                    payrollPeriod: {
                        month,
                        startDate,
                        endDate,
                    },
                    // Deduction config and additional amounts are defaults for bulk run
                    // Individual adjustments can happen via separate "Regenerate Single Payslip" actions if needed
                });
            } catch (error) {
                console.error(`Failed to generate payslip for employee ${employee.id}:`, error);
                return null; // Don't fail the whole batch
            }
        });

        const results = await Promise.all(payslipPromises);
        const successfulPayslips = results.filter((p): p is NonNullable<typeof p> => p !== null);

        // 4. Update Payroll Total
        const totalAmount = successfulPayslips.reduce((sum, p) => sum + parseFloat(p.netSalary.toString()), 0);

        await db
            .update(payrolls)
            .set({ totalAmount: totalAmount.toString() })
            .where(eq(payrolls.id, payroll.id));

        return {
            payroll: {
                ...payroll,
                totalAmount: totalAmount.toString(),
            },
            totalEmployees: employeesToProcess.length,
            generatedCount: successfulPayslips.length,
            failedCount: employeesToProcess.length - successfulPayslips.length,
            message: `Payroll created. Generated ${successfulPayslips.length} payslips.`,
        };
    });

/**
 * Get payroll by ID
 */
export const getPayrollByIdFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ payrollId: z.string() }))
    .handler(async ({ data }) => {
        return await db.query.payrolls.findFirst({
            where: eq(payrolls.id, data.payrollId),
            with: {
                payslips: {
                    with: {
                        employee: {
                            columns: {
                                id: true,
                                employeeCode: true,
                                firstName: true,
                                lastName: true,
                                designation: true,
                                cnic: true,
                                bankName: true,
                                bankAccountNumber: true,
                            },
                        },
                    },
                },
                processor: {
                    columns: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    });

/**
 * List all payrolls
 */
export const listPayrollsFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ limit: z.number().optional().default(50) }))
    .handler(async ({ data }) => {
        return await db.query.payrolls.findMany({
            with: {
                processor: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: (payrolls, { desc }) => [desc(payrolls.month)],
            limit: data.limit,
        });
    });

/**
 * Approve payroll
 */
export const approvePayrollFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ payrollId: z.string() }))
    .handler(async ({ data }) => {
        const [updated] = await db
            .update(payrolls)
            .set({ status: "approved" })
            .where(eq(payrolls.id, data.payrollId))
            .returning();

        return updated;
    });

/**
 * Mark payroll as paid
 */
export const markPayrollAsPaidFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ payrollId: z.string() }))
    .handler(async ({ data }) => {
        const [updated] = await db
            .update(payrolls)
            .set({ status: "paid" })
            .where(eq(payrolls.id, data.payrollId))
            .returning();

        return updated;
    });

/**
 * Delete a payroll and all its payslips
 */
export const deletePayrollFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({ payrollId: z.string() }))
    .handler(async ({ data }) => {
        // First delete payslips
        await db.delete(payslips).where(eq(payslips.payrollId, data.payrollId));

        // Then delete
        const [deleted] = await db
            .delete(payrolls)
            .where(eq(payrolls.id, data.payrollId))
            .returning();

        return deleted;
    });
