import { db } from "@/db";
import { employees, payslips, payrolls, attendance } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, and, sql, desc, asc, inArray, gte, lte } from "drizzle-orm";
import {
  format,
  parseISO,
  startOfMonth,
  subMonths,
  addDays,
  eachDayOfInterval,
  isAfter,
} from "date-fns";
import { calculatePayslip } from "@/lib/payroll-calculator";
import { createServerFn } from "@tanstack/react-start";
import { generateEmployeePayslipCore } from "./core";

// ── Helper ─────────────────────────────────────────────────────────────────

/**
 * Given a cycle date range, an employee's restDays array, and their
 * attendance records, returns the three per-employee readiness fields.
 *
 * "Unmarked days" = working days that have already elapsed (up to today)
 * with zero attendance record — rest days and holidays are excluded.
 */
function computeEmployeeReadiness(
  startDate: string,
  endDate: string,
  restDays: number[],
  empRecords: {
    date: string;
    status: string;
    overtimeStatus: string | null;
    overtimeHours: string | null;
    leaveApprovalStatus: string | null;
  }[],
): {
  unmarkedDays: number;
  hasPendingOvertimeApprovals: boolean;
  hasPendingLeaveApprovals: boolean;
} {
  const today = format(new Date(), "yyyy-MM-dd");

  // Build set of dates that have a record (any status)
  const recordedDates = new Set(empRecords.map((r) => r.date));

  // Build set of holiday dates
  const holidayDates = new Set(
    empRecords.filter((r) => r.status === "holiday").map((r) => r.date),
  );

  // Working days that have elapsed = not a rest day, not a holiday, not in future
  const allDays = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  });

  const elapsedWorkingDays = allDays.filter((d) => {
    const dateStr = format(d, "yyyy-MM-dd");
    return (
      dateStr <= today &&
      !restDays.includes(d.getDay()) &&
      !holidayDates.has(dateStr)
    );
  });

  const unmarkedDays = elapsedWorkingDays.filter(
    (d) => !recordedDates.has(format(d, "yyyy-MM-dd")),
  ).length;

  const hasPendingOvertimeApprovals = empRecords.some(
    (r) =>
      r.overtimeStatus === "pending" &&
      parseFloat(r.overtimeHours || "0") > 0,
  );

  const hasPendingLeaveApprovals = empRecords.some(
    (r) => r.leaveApprovalStatus === "pending",
  );

  return { unmarkedDays, hasPendingOvertimeApprovals, hasPendingLeaveApprovals };
}

// ── Main Fn ────────────────────────────────────────────────────────────────

export const getMonthlyPayrollTableFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      month: z.string(), // YYYY-MM
      limit: z.number().default(7),
      offset: z.number().default(0),
    }),
  )
  .handler(async ({ data }) => {
    const { month, limit, offset } = data;

    const monthDate = parseISO(`${month}-01`);
    const prevMonth = subMonths(monthDate, 1);
    const startDate = format(
      addDays(startOfMonth(prevMonth), 15),
      "yyyy-MM-dd",
    );
    const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

    // ── Payroll record for this month ──────────────────────────────────
    const payroll = await db.query.payrolls.findFirst({
      where: eq(payrolls.month, `${month}-01`),
    });

    // ── Paginated active employees (includes restDays via schema) ──────
    const allEmployees = await db.query.employees.findMany({
      where: eq(employees.status, "active"),
      limit,
      offset,
      orderBy: [asc(employees.employeeCode)],
    });

    // ── Total active count ─────────────────────────────────────────────
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.status, "active"));

    // ── Existing payslips for this payroll ─────────────────────────────
    let existingPayslips: Record<string, any> = {};
    if (payroll) {
      const payslipsList = await db.query.payslips.findMany({
        where: eq(payslips.payrollId, payroll.id),
      });
      payslipsList.forEach((p) => {
        existingPayslips[p.employeeId] = p;
      });
    }

    // ── Last-month missed payslip check ────────────────────────────────
    const lastMonthStr = format(subMonths(monthDate, 1), "yyyy-MM");
    const lastMonthPayroll = await db.query.payrolls.findFirst({
      where: eq(payrolls.month, `${lastMonthStr}-01`),
    });
    const lastMonthPayslips: Record<string, boolean> = {};
    if (lastMonthPayroll) {
      const list = await db.query.payslips.findMany({
        where: eq(payslips.payrollId, lastMonthPayroll.id),
        columns: { employeeId: true },
      });
      list.forEach((p) => (lastMonthPayslips[p.employeeId] = true));
    }

    // ── Batch-fetch attendance for ALL paginated employees in one query ─
    // This is critical — avoids N+1 (one query per employee).
    const employeeIds = allEmployees.map((e) => e.id);

    const allAttendanceRecords =
      employeeIds.length > 0
        ? await db
          .select({
            employeeId: attendance.employeeId,
            date: attendance.date,
            status: attendance.status,
            overtimeStatus: attendance.overtimeStatus,
            overtimeHours: attendance.overtimeHours,
            leaveApprovalStatus: attendance.leaveApprovalStatus,
          })
          .from(attendance)
          .where(
            and(
              inArray(attendance.employeeId, employeeIds),
              gte(attendance.date, startDate),
              lte(attendance.date, endDate),
            ),
          )
        : [];

    // Group records by employeeId for O(1) lookup
    const attendanceByEmployee = allAttendanceRecords.reduce(
      (acc, rec) => {
        if (!acc[rec.employeeId]) acc[rec.employeeId] = [];
        acc[rec.employeeId].push(rec);
        return acc;
      },
      {} as Record<string, typeof allAttendanceRecords>,
    );

    // ── KPI stats (whole dataset, not just page) ───────────────────────
    const totalStats = await db
      .select({ totalBasic: sql<string>`sum(${employees.standardSalary})` })
      .from(employees)
      .where(eq(employees.status, "active"));

    const generatedStats = await db
      .select({
        totalGenerated: sql<string>`sum(CAST(${payslips.netSalary} AS numeric))`,
        count: sql<number>`count(*)`,
      })
      .from(payslips)
      .where(payroll ? eq(payslips.payrollId, payroll.id) : sql`1=0`);

    const pendingGrossStats = await db
      .select({
        totalPending: sql<string>`sum(CAST(${employees.standardSalary} AS numeric))`,
      })
      .from(employees)
      .leftJoin(
        payslips,
        and(
          eq(payslips.employeeId, employees.id),
          payroll ? eq(payslips.payrollId, payroll.id) : sql`1=0`,
        ),
      )
      .where(
        and(eq(employees.status, "active"), sql`${payslips.id} IS NULL`),
      );

    // ── Build table rows ───────────────────────────────────────────────
    const tableData = allEmployees.map((emp) => {
      const payslip = existingPayslips[emp.id];
      const isEligible = emp.joiningDate <= endDate;
      const missedLastMonth = lastMonthPayroll && !lastMonthPayslips[emp.id];

      // Per-employee rest days — default [0] (Sunday) if not set
      const restDays: number[] = (emp.restDays as number[] | null) ?? [0];

      const empRecords = attendanceByEmployee[emp.id] ?? [];

      const { unmarkedDays, hasPendingOvertimeApprovals, hasPendingLeaveApprovals } =
        computeEmployeeReadiness(startDate, endDate, restDays, empRecords);

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        designation: emp.designation,
        department: emp.department,
        joiningDate: emp.joiningDate,
        standardSalary: emp.standardSalary,

        // Payroll status
        hasPayslip: !!payslip,
        payslipId: payslip?.id,
        netSalary: payslip?.netSalary,
        status: payroll?.status || "pending",

        isEligible,
        missedLastMonth,

        // ── Per-employee readiness ──────────────────────────────────
        unmarkedDays,
        hasPendingOvertimeApprovals,
        hasPendingLeaveApprovals,
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
      totalPendingGross: pendingGrossStats[0]?.totalPending || "0",
      payslipsGeneratedCount: generatedStats[0]?.count || 0,
    };
  });

// ── Preview Payslip ────────────────────────────────────────────────────────

export const previewEmployeePayslipFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeId: z.string(),
      month: z.string(),
      manualDeductions: z
        .array(z.object({ description: z.string(), amount: z.number() }))
        .optional(),
      additionalAmounts: z
        .object({
          overtimeAmount: z.number().optional(),
          nightShiftAllowance: z.number().optional(),
          incentiveAmount: z.number().optional(),
          bonusAmount: z.number().optional(),
          advanceDeduction: z.number().optional(),
          taxDeduction: z.number().optional(),
          overtimeMultiplier: z.number().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { employeeId, month } = data;

    const monthDate = parseISO(`${month}-01`);
    const prevMonth = subMonths(monthDate, 1);
    const startDate = format(
      addDays(startOfMonth(prevMonth), 15),
      "yyyy-MM-dd",
    );
    const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

    const employeeData = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });
    if (!employeeData) throw new Error("Employee not found");

    const attendanceRecords = await db.query.attendance.findMany({
      where: (table, { and, gte, lte, eq }) =>
        and(
          eq(table.employeeId, employeeId),
          gte(table.date, startDate),
          lte(table.date, endDate),
        ),
    });
    const formattedAttendance = attendanceRecords.map((record) => ({
      date: record.date,
      status: record.status as any,
      dutyHours: record.dutyHours,
      overtimeHours: record.overtimeHours,
      isNightShift: record.isNightShift || false,
      isApprovedLeave: record.isApprovedLeave ?? false,
      leaveType: record.leaveType ?? null,
      overtimeStatus: record.overtimeStatus ?? "pending",
      isLate: record.isLate ?? false,
      earlyDepartureStatus: record.earlyDepartureStatus ?? "none",
    }));

    let advanceDeduction = data.additionalAmounts?.advanceDeduction ?? 0;
    if (advanceDeduction === 0) {
      const pendingAdvances = await db.query.salaryAdvances.findMany({
        where: (table, { and, eq }) =>
          and(eq(table.employeeId, employeeId), eq(table.status, "approved")),
      });
      const notYetDeducted = pendingAdvances.filter(
        (a) => !a.deductedInPayslipId,
      );
      advanceDeduction = notYetDeducted.reduce(
        (sum, a) => sum + parseFloat(a.amount || "0"),
        0,
      );
    }

    const calculation = calculatePayslip(
      employeeData as any,
      formattedAttendance,
      { month: `${month}-01`, startDate, endDate },
      {
        manualDeductions: data.manualDeductions || [],
        deductConveyanceOnLeave: true,
      },
      { ...(data.additionalAmounts || {}), advanceDeduction },
    );

    const lastMonthStr = format(subMonths(monthDate, 1), "yyyy-MM");
    const lastMonthPayroll = await db.query.payrolls.findFirst({
      where: eq(payrolls.month, `${lastMonthStr}-01`),
    });

    let missedLastMonth = false;
    if (lastMonthPayroll) {
      const lastPayslip = await db.query.payslips.findFirst({
        where: and(
          eq(payslips.payrollId, lastMonthPayroll.id),
          eq(payslips.employeeId, employeeId),
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

// ── Save Payslip ───────────────────────────────────────────────────────────

export const saveEmployeePayslipFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeId: z.string(),
      month: z.string(),
      deductionConfig: z.any(),
      additionalAmounts: z.any(),
    }),
  )
  .handler(async ({ data }) => {
    const { employeeId, month, deductionConfig, additionalAmounts } = data;

    const monthDate = parseISO(`${month}-01`);
    const prevMonth = subMonths(monthDate, 1);
    const startDate = format(
      addDays(startOfMonth(prevMonth), 15),
      "yyyy-MM-dd",
    );
    const endDate = format(addDays(startOfMonth(monthDate), 14), "yyyy-MM-dd");

    let payroll = await db.query.payrolls.findFirst({
      where: eq(payrolls.month, `${month}-01`),
    });

    if (!payroll) {
      const [newPayroll] = await db
        .insert(payrolls)
        .values({
          month: `${month}-01`,
          startDate,
          endDate,
          status: "draft",
          totalAmount: "0",
        })
        .returning();
      payroll = newPayroll;
    }

    return await generateEmployeePayslipCore({
      employeeId,
      payrollId: payroll.id,
      payrollPeriod: { month: `${month}-01`, startDate, endDate },
      deductionConfig,
      additionalAmounts,
    });
  });

// ── Employee Payroll History ───────────────────────────────────────────────

export const getEmployeePayrollHistoryFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ employeeId: z.string() }))
  .handler(async ({ data }) => {
    return await db.query.payslips.findMany({
      where: eq(payslips.employeeId, data.employeeId),
      with: { payroll: true, employee: true },
      orderBy: [desc(payslips.createdAt)],
    });
  });