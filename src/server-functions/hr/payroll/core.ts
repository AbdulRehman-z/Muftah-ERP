import { db } from "@/db";
import {
  employees,
  payslips,
  salaryAdvances,
  advanceInstallments,
  nightShiftRates,
  travelLogs,
  attendance,
} from "@/db/schemas/hr-schema";
import { wallets, transactions } from "@/db/schemas/finance-schema";
import { eq, and, inArray, sql, gte, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  calculatePayslip,
  calculateYearlyBradfordFactor,
  type DeductionConfig,
  type AttendanceRecord,
  type EmployeeData,
} from "@/lib/payroll-calculator";

export type GeneratePayslipInput = {
  employeeId: string;
  payrollId: string;
  payrollPeriod: {
    month: string;
    startDate: string;
    endDate: string;
  };
  deductionConfig?: DeductionConfig;
  additionalAmounts?: {
    overtimeAmount?: number;
    nightShiftAllowance?: number;
    incentiveAmount?: number;
    bonusAmount?: number;
    advanceDeduction?: number;
    taxDeduction?: number;
    overtimeMultiplier?: number;
  };
  /**
   * Arrears Roll-Forward -- missed prior-cycle salaries to include in this slip.
   *
   * Each entry in arrearsFromMonths is a YYYY-MM payout-month key that was missed.
   * arrearsAmount is the total PKR to add on top of this cycle's net salary.
   * The months are stored in the payslip so future detection queries skip them.
   *
   * Runtime validation rules:
   *  - All months must be valid YYYY-MM strings strictly in the past
   *  - Max 12 months per payslip (prevents accidental mass-rollup)
   *  - arrearsAmount must be > 0 when arrearsFromMonths is non-empty
   */
  arrears?: {
    arrearsAmount: number;
    arrearsFromMonths: string[];
  };
  /**
   * ID of the wallet to debit net salary from.
   * If provided, wallet balance is validated and debited inside the same
   * DB transaction as the payslip insert -- so insufficient balance rolls
   * back the entire operation.
   * If omitted, payslip is saved without any wallet debit (for previewing
   * or when deduction happens at a later payroll-run step).
   */
  walletId?: string;
  autoDeductAdvances?: boolean;
  autoUpdateLeaveBalances?: boolean;
  autoFetchNightShiftRate?: boolean;
  autoFetchTada?: boolean;
};

export async function generateEmployeePayslipCore(
  input: GeneratePayslipInput,
  performedById: string,
) {
  const {
    employeeId,
    payrollId,
    payrollPeriod,
    deductionConfig,
    additionalAmounts = {},
    arrears,
    walletId,
    autoDeductAdvances = true,
    autoUpdateLeaveBalances = true,
    autoFetchNightShiftRate = true,
    autoFetchTada = true,
  } = input;

  // -- 0. Validate arrears (fail-fast before any DB work) --------------------
  const arrearsAmt = arrears?.arrearsAmount ?? 0;
  const arrearsMonths = arrears?.arrearsFromMonths ?? [];

  if (arrearsMonths.length > 0) {
    if (arrearsAmt <= 0) {
      throw new Error("arrearsAmount must be > 0 when arrearsFromMonths is provided.");
    }
    if (arrearsMonths.length > 12) {
      throw new Error("Cannot roll forward more than 12 missed months in a single payslip.");
    }
    const todayKey = payrollPeriod.month.substring(0, 7); // YYYY-MM of current cycle
    const monthRe = /^\d{4}-(0[1-9]|1[0-2])$/;
    for (const m of arrearsMonths) {
      if (!monthRe.test(m)) {
        throw new Error(`Invalid arrears month key: "${m}". Must be YYYY-MM format.`);
      }
      if (m >= todayKey) {
        throw new Error(
          `Arrears month "${m}" is not in the past. Only closed cycles can be rolled forward.`,
        );
      }
    }
  }

  // -- 1. Employee -----------------------------------------------------------
  const employeeData = await db.query.employees.findFirst({
    where: eq(employees.id, employeeId),
  });
  if (!employeeData) throw new Error(`Employee ${employeeId} not found`);

  // -- 2. Attendance ---------------------------------------------------------
  const rawAttendance = await db.query.attendance.findMany({
    where: (table, { and, gte, lte, eq }) =>
      and(
        eq(table.employeeId, employeeId),
        gte(table.date, payrollPeriod.startDate),
        lte(table.date, payrollPeriod.endDate),
      ),
  });

  const formattedAttendance: AttendanceRecord[] = rawAttendance.map((r) => ({
    date: r.date,
    status: r.status,
    dutyHours: r.dutyHours,
    overtimeHours: r.overtimeHours,
    isNightShift: r.isNightShift || false,
    isApprovedLeave: r.isApprovedLeave ?? false,
    leaveType: r.leaveType ?? null,
    overtimeStatus: r.overtimeStatus ?? "pending",
    isLate: r.isLate ?? false,
    earlyDepartureStatus: r.earlyDepartureStatus ?? "none",
  }));

  // -- 3. Salary advances (installment-aware) --------------------------------
  let advanceDeduction: number;
  let advanceIdsToProcess: Array<{
    id: string;
    installmentAmount: number;
    installmentNo: number;
    isFullySettled: boolean;
  }> = [];

  if (autoDeductAdvances && additionalAmounts.advanceDeduction === undefined) {
    const pendingAdvances = await db.query.salaryAdvances.findMany({
      where: and(
        eq(salaryAdvances.employeeId, employeeId),
        eq(salaryAdvances.status, "approved"),
      ),
    });

    // Only advances that still have installments remaining
    const activeAdvances = pendingAdvances.filter(
      (a) => a.installmentsPaid < a.installmentMonths,
    );

    advanceDeduction = 0;
    for (const adv of activeAdvances) {
      const instAmt = adv.installmentAmount
        ? parseFloat(adv.installmentAmount)
        : parseFloat(adv.amount); // fallback: full amount for legacy single-shot
      advanceDeduction += instAmt;
      advanceIdsToProcess.push({
        id: adv.id,
        installmentAmount: instAmt,
        installmentNo: adv.installmentsPaid + 1,
        isFullySettled: adv.installmentsPaid + 1 >= adv.installmentMonths,
      });
    }
  } else {
    advanceDeduction = additionalAmounts.advanceDeduction ?? 0;
  }

  // -- 4. Night shift rate ---------------------------------------------------
  let nightShiftAllowance = additionalAmounts.nightShiftAllowance;
  if (autoFetchNightShiftRate && nightShiftAllowance === undefined) {
    const nightShifts = formattedAttendance.filter((r) => r.isNightShift);
    if (nightShifts.length > 0) {
      const payrollYear = new Date(payrollPeriod.month).getFullYear();
      const rateConfig = await db.query.nightShiftRates.findFirst({
        where: eq(nightShiftRates.year, payrollYear),
      });
      nightShiftAllowance = (rateConfig ? parseFloat(rateConfig.ratePerNight) : 0) * nightShifts.length;
    } else {
      nightShiftAllowance = 0;
    }
  }

  // -- 5. TA/DA from travel logs ---------------------------------------------
  let tadaAmount = 0;
  if (autoFetchTada) {
    const approvedTrips = await db.query.travelLogs.findMany({
      where: and(
        eq(travelLogs.employeeId, employeeId),
        eq(travelLogs.status, "approved"),
        and(
          sql`${travelLogs.date} >= ${payrollPeriod.startDate}`,
          sql`${travelLogs.date} <= ${payrollPeriod.endDate}`,
        ),
      ),
    });
    tadaAmount = approvedTrips.reduce(
      (sum, t) => sum + parseFloat(t.totalAmount || "0"),
      0,
    );
  }

  // -- 5.5 Order booker TA + commission --------------------------------------
  let dynamicTA = 0;
  let totalRecovery = 0;
  for (const record of rawAttendance) {
    if (record.recoveryAmount) totalRecovery += parseFloat(record.recoveryAmount);
    if (record.isCompanyVehicle) {
      if (record.petrolAmount) dynamicTA += parseFloat(record.petrolAmount);
    } else if (record.paymentMode === "per_km" && record.distanceKm && record.perKmRate) {
      dynamicTA += parseFloat(record.distanceKm) * parseFloat(record.perKmRate);
    }
  }
  const commissionRate = employeeData.commissionRate ? parseFloat(employeeData.commissionRate) : 0;
  const orderBookerCommission = totalRecovery * (commissionRate / 100);

  // -- 6. Calculate payslip --------------------------------------------------
  const mergedAdditional = {
    ...additionalAmounts,
    advanceDeduction,
    nightShiftAllowance: nightShiftAllowance ?? additionalAmounts.nightShiftAllowance,
    incentiveAmount:
      (additionalAmounts.incentiveAmount || 0) + tadaAmount + dynamicTA + orderBookerCommission,
  };

  const payslipCalc = calculatePayslip(
    employeeData as unknown as EmployeeData,
    formattedAttendance,
    payrollPeriod,
    deductionConfig,
    mergedAdditional,
  );

  // -- 6.5 Yearly Bradford Factor (Jan 1 - Dec 31 of the payroll year) -------
  const payrollYear = new Date(payrollPeriod.month).getFullYear();
  const yearStart = `${payrollYear}-01-01`;
  const yearEnd = `${payrollYear}-12-31`;
  const yearAttendanceRaw = await db.query.attendance.findMany({
    where: (table, { and, eq, gte, lte }) =>
      and(
        eq(table.employeeId, employeeId),
        gte(table.date, yearStart),
        lte(table.date, yearEnd),
      ),
  });
  const yearAttendanceFormatted: AttendanceRecord[] = yearAttendanceRaw.map((r) => ({
    date: r.date,
    status: r.status as any,
    dutyHours: r.dutyHours,
    overtimeHours: r.overtimeHours,
    isNightShift: r.isNightShift || false,
    isApprovedLeave: r.isApprovedLeave ?? false,
    leaveType: r.leaveType ?? null,
    overtimeStatus: r.overtimeStatus ?? "pending",
    isLate: r.isLate ?? false,
    earlyDepartureStatus: r.earlyDepartureStatus ?? "none",
  }));
  const yearlyBradfordScore = calculateYearlyBradfordFactor(yearAttendanceFormatted);

  // -- 7. Validate wallet balance BEFORE writing anything --------------------
  // Include arrears so the wallet covers the FULL amount the employee is owed.
  const totalNetWithArrears = payslipCalc.netSalary + arrearsAmt;

  let walletName: string | null = null;
  if (walletId) {
    const [wallet] = await db
      .select({ id: wallets.id, name: wallets.name, balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.id, walletId));

    if (!wallet) throw new Error("Selected wallet not found.");

    const available = parseFloat(wallet.balance || "0");
    const required = totalNetWithArrears;

    if (available < required) {
      const arrearsNote =
        arrearsAmt > 0
          ? ` (includes PKR ${Math.round(arrearsAmt).toLocaleString()} arrears for ${arrearsMonths.join(", ")})`
          : "";
      throw new Error(
        `Insufficient balance in "${wallet.name}"${arrearsNote}. ` +
        `Available: PKR ${Math.round(available).toLocaleString()}, ` +
        `Required: PKR ${Math.round(required).toLocaleString()}.`,
      );
    }
    walletName = wallet.name;
  }

  // -- 8. Atomic transaction: delete old -> save payslip -> debit wallet -----
  const savedPayslip = await db.transaction(async (tx) => {
    // 8a. Delete existing payslip for this payroll+employee (idempotent regeneration)
    await tx
      .delete(payslips)
      .where(
        and(
          eq(payslips.payrollId, payrollId),
          eq(payslips.employeeId, employeeId),
        ),
      );

    // 8b. Insert new payslip
    const [slip] = await tx
      .insert(payslips)
      .values({
        payrollId,
        employeeId: employeeData.id,

        daysPresent: payslipCalc.daysPresent,
        daysAbsent: payslipCalc.daysAbsent,
        daysLeave: payslipCalc.daysLeave,
        totalOvertimeHours: payslipCalc.totalOvertimeHours.toString(),
        nightShiftsCount: payslipCalc.nightShiftsCount,

        bradfordFactorScore: payslipCalc.bradfordFactorScore.toString(),
        bradfordFactorPeriod: payslipCalc.bradfordFactorPeriod,
        yearlyBradfordScore: yearlyBradfordScore.toString(),

        basicSalary: payslipCalc.basicSalary.toString(),
        allowanceBreakdown: payslipCalc.allowanceBreakdown,
        overtimeAmount: payslipCalc.overtimeAmount.toString(),
        nightShiftAllowanceAmount: payslipCalc.nightShiftAllowanceAmount.toString(),
        incentiveAmount: payslipCalc.incentiveAmount.toString(),
        bonusAmount: payslipCalc.bonusAmount.toString(),

        absentDeduction: payslipCalc.absentDeduction.toString(),
        leaveDeduction: payslipCalc.leaveDeduction.toString(),
        advanceDeduction: payslipCalc.advanceDeduction.toString(),
        taxDeduction: payslipCalc.taxDeduction.toString(),
        otherDeduction: payslipCalc.otherDeduction.toString(),

        grossSalary: payslipCalc.grossSalary.toString(),
        totalDeductions: payslipCalc.totalDeductions.toString(),
        // Net = calculator net + rolled-forward arrears from missed cycles
        netSalary: totalNetWithArrears.toString(),

        // Arrears audit trail -- stored permanently so future missed-cycle
        // detection queries skip these months for this employee.
        arrearsAmount: arrearsAmt.toString(),
        arrearsFromMonths: arrearsMonths.length > 0 ? arrearsMonths : [],

        // Store wallet name as historical text record -- survives wallet deletion
        paymentSource: walletName,
        remarks: [
          payslipCalc.remarks,
          arrearsMonths.length > 0
            ? `Includes arrears of PKR ${Math.round(arrearsAmt).toLocaleString()} for: ${arrearsMonths.join(", ")}.`
            : null,
        ].filter(Boolean).join(" ") || null,
      })
      .returning();

    // 8c. Debit wallet -- full amount including arrears (same transaction -- rolls back on any failure)
    if (walletId && walletName) {
      await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${totalNetWithArrears}` })
        .where(eq(wallets.id, walletId));

      await tx.insert(transactions).values({
        id: createId(),
        walletId,
        type: "debit",
        amount: totalNetWithArrears.toString(),
        source: arrearsAmt > 0 ? "Payroll (with Arrears)" : "Payroll",
        referenceId: slip.id,
        performedById,
      });
    }

    // 8d. Record advance installments and track progress
    if (advanceIdsToProcess.length > 0) {
      for (const adv of advanceIdsToProcess) {
        // Insert an installment record
        await tx.insert(advanceInstallments).values({
          id: createId(),
          advanceId: adv.id,
          payslipId: slip.id,
          amount: adv.installmentAmount.toString(),
          installmentNo: adv.installmentNo,
        });

        // Increment installments paid
        if (adv.isFullySettled) {
          await tx
            .update(salaryAdvances)
            .set({ status: "settled", installmentsPaid: adv.installmentNo })
            .where(eq(salaryAdvances.id, adv.id));
        } else {
          await tx
            .update(salaryAdvances)
            .set({ installmentsPaid: adv.installmentNo })
            .where(eq(salaryAdvances.id, adv.id));
        }
      }
    }

    return slip;
  });

  // -- 9. Update leave balances (outside transaction -- non-critical) ---------
  if (autoUpdateLeaveBalances) {
    const currentYear = new Date().getFullYear();
    const leaveYearStartYear = employeeData.leaveYearStart
      ? new Date(employeeData.leaveYearStart).getFullYear()
      : null;

    // Auto-reset annual leave balance when a new calendar year is detected
    const shouldResetLeave = leaveYearStartYear === null || leaveYearStartYear < currentYear;
    const allowance = employeeData.annualLeaveAllowance ?? 14;
    const currentBalance = shouldResetLeave
      ? allowance // fresh year -- start from full allowance
      : (employeeData.annualLeaveBalance ?? allowance);

    const leaveTaken = rawAttendance.filter(
      (r) => r.status === "leave" && r.isApprovedLeave,
    );
    const annualTaken = leaveTaken.filter((r) => r.leaveType === "annual").length;
    const sickTaken = leaveTaken.filter((r) => r.leaveType === "sick").length;

    const updatePayload: Record<string, any> = {
      sickLeaveBalance: Math.max(0, (employeeData.sickLeaveBalance ?? 10) - sickTaken),
    };

    if (shouldResetLeave) {
      updatePayload.annualLeaveBalance = Math.max(0, allowance - annualTaken);
      updatePayload.leaveYearStart = `${currentYear}-01-01`;
    } else if (annualTaken > 0) {
      updatePayload.annualLeaveBalance = Math.max(0, currentBalance - annualTaken);
    }

    await db
      .update(employees)
      .set(updatePayload)
      .where(eq(employees.id, employeeId));
  }

  return {
    ...savedPayslip,
    calculation: payslipCalc,
    arrearsAmount: arrearsAmt,
    arrearsFromMonths: arrearsMonths,
    totalNetWithArrears,
    walletDebited: walletId
      ? { walletId, walletName, amount: totalNetWithArrears }
      : null,
  };
}