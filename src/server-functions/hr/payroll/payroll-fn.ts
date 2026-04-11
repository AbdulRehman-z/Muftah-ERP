import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { payrolls, employees, payslips, salaryAdvances } from "@/db/schemas/hr-schema";
import { wallets, transactions } from "@/db/schemas/finance-schema";
import {
  requireHrManageMiddleware,
  requireHrViewMiddleware,
} from "@/lib/middlewares";
import { z } from "zod";
import { eq, sql, inArray } from "drizzle-orm";
import { format, parseISO, startOfMonth, subMonths, addDays } from "date-fns";
import { generateEmployeePayslipCore } from "./core";
import { createId } from "@paralleldrive/cuid2";

const createPayrollSchema = z.object({
  month: z.string(), // YYYY-MM-DD
  employeeIds: z.array(z.string()).optional(),
  processedBy: z.string(),
});

export const createPayrollFn = createServerFn()
  .middleware([requireHrManageMiddleware])
  .inputValidator(createPayrollSchema)
  .handler(async ({ data }) => {
    const { month, employeeIds, processedBy } = data;

    // Calculate payroll period
    // Default: Previous month 16th to Current month 15th
    // e.g. If creating for Dec 2025: Period is Nov 16 - Dec 15.
    const monthDate = parseISO(month);
    const prevMonth = subMonths(monthDate, 1);

    const startDate = format(
      addDays(startOfMonth(prevMonth), 15),
      "yyyy-MM-dd",
    );
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
        console.error(
          `Failed to generate payslip for employee ${employee.id}:`,
          error,
        );
        return null; // Don't fail the whole batch
      }
    });

    const results = await Promise.all(payslipPromises);
    const successfulPayslips = results.filter(
      (p): p is NonNullable<typeof p> => p !== null,
    );

    // 4. Update Payroll Total
    const totalAmount = successfulPayslips.reduce(
      (sum, p) => sum + parseFloat(p.netSalary.toString()),
      0,
    );

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
  .middleware([requireHrViewMiddleware])
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
  .middleware([requireHrViewMiddleware])
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
  .middleware([requireHrManageMiddleware])
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
 * Mark payroll as paid — debits from a finance wallet and logs a ledger transaction.
 */
export const markPayrollAsPaidFn = createServerFn()
  .middleware([requireHrManageMiddleware])
  .inputValidator(
    z.object({
      payrollId: z.string(),
      walletId: z.string().min(1, "Please select a payment wallet"),
    }),
  )
  .handler(async ({ data, context }) => {
    return await db.transaction(async (tx) => {
      // 1. Get the payroll details
      const payroll = await tx.query.payrolls.findFirst({
        where: eq(payrolls.id, data.payrollId),
      });

      if (!payroll) throw new Error("Payroll not found");
      if (payroll.status === "paid")
        throw new Error("Payroll is already marked as paid");

      const payrollAmount = parseFloat(payroll.totalAmount || "0");

      // 2. Fetch wallet and validate balance
      const [wallet] = await tx
        .select()
        .from(wallets)
        .where(eq(wallets.id, data.walletId));

      if (!wallet) throw new Error("Selected wallet not found");

      const currentBalance = parseFloat(wallet.balance || "0");
      if (currentBalance < payrollAmount) {
        throw new Error(
          `Insufficient balance in "${wallet.name}". Available: PKR ${currentBalance.toLocaleString()}, Required: PKR ${payrollAmount.toLocaleString()}`,
        );
      }

      // 3. Debit the wallet
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${payrollAmount}`,
        })
        .where(eq(wallets.id, data.walletId));

      // 4. Create ledger transaction
      await tx.insert(transactions).values({
        id: createId(),
        walletId: data.walletId,
        type: "debit",
        amount: payrollAmount.toString(),
        source: `Payroll - ${format(parseISO(payroll.month), "MMM yyyy")}`,
        referenceId: data.payrollId,
        performedById: context.session.user.id,
      });

      // 5. Update the payroll record
      const [updated] = await tx
        .update(payrolls)
        .set({
          status: "paid",
          walletId: data.walletId,
          paidAt: new Date(),
        })
        .where(eq(payrolls.id, data.payrollId))
        .returning();

      return updated;
    });
  });

/**
 * Delete a payroll and all its payslips.
 * Also resets any salary advances that were deducted via this payroll's payslips
 * so they can be recovered in the next payroll cycle.
 */
export const deletePayrollFn = createServerFn()
  .middleware([requireHrManageMiddleware])
  .inputValidator(z.object({ payrollId: z.string() }))
  .handler(async ({ data }) => {
    return await db.transaction(async (tx) => {
      // 1. Get all payslip IDs for this payroll
      const payslipList = await tx.query.payslips.findMany({
        where: eq(payslips.payrollId, data.payrollId),
        columns: { id: true },
      });
      const payslipIds = payslipList.map((p) => p.id);

      // 2. Reset salary advances that were deducted via these payslips.
      //    Move them back to 'approved' so they'll be re-deducted in the next cycle.
      if (payslipIds.length > 0) {
        await tx
          .update(salaryAdvances)
          .set({ status: "approved", deductedInPayslipId: null })
          .where(inArray(salaryAdvances.deductedInPayslipId, payslipIds));
      }

      // 3. Delete payslips
      await tx.delete(payslips).where(eq(payslips.payrollId, data.payrollId));

      // 4. Delete the payroll
      const [deleted] = await tx
        .delete(payrolls)
        .where(eq(payrolls.id, data.payrollId))
        .returning();

      return deleted;
    });
  });
