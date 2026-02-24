import { db } from "./index";
import { employees, attendance, payrolls, payslips } from "./schemas/hr-schema";
import { user } from "./schemas/auth-schema";
import { eq, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
  format,
  subDays,
  eachDayOfInterval,
  isSunday,
  parseISO,
  subMonths,
  startOfMonth,
  addDays,
} from "date-fns";
import { type AllowanceConfig } from "@/lib/types/hr-types";
import {
  calculatePayslip,
  type EmployeeData,
  type AttendanceRecord,
} from "@/lib/payroll-calculator";

// ---------------------------------------------------------------------------
// Employee definitions — uses the current schema shape:
//   standardSalary  = the Basic Salary (top-level PKR amount)
//   allowanceConfig = JSON array of { id, name, amount }
//   No basicSalary / isOperator / individual allowance columns
// ---------------------------------------------------------------------------

type EmployeeSeed = {
  employeeCode: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  joiningDate: string;
  employmentType: "full_time" | "part_time" | "contract" | "intern";
  standardSalary: string;
  standardDutyHours: number;
  allowanceConfig: AllowanceConfig[];
  cnic?: string;
  phone?: string;
  address?: string;
  bankName?: string;
  bankAccountNumber?: string;
};

const employeeData: EmployeeSeed[] = [
  {
    employeeCode: "EMP001",
    firstName: "Faisal",
    lastName: "Ahmed",
    designation: "General Manager",
    department: "Administration",
    joiningDate: "2023-01-15",
    employmentType: "full_time",
    standardSalary: "125000",
    standardDutyHours: 8,
    phone: "0321-1234567",
    bankName: "HBL",
    bankAccountNumber: "12345678901",
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 50000 },
      { id: "utilities", name: "Utilities", amount: 25000 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 25000 },
      { id: "mobile", name: "Mobile Allowance", amount: 10000 },
      { id: "special", name: "Special Allowance", amount: 15000 },
    ],
  },
  {
    employeeCode: "EMP002",
    firstName: "Sara",
    lastName: "Khan",
    designation: "Finance Manager",
    department: "Finance",
    joiningDate: "2023-03-10",
    employmentType: "full_time",
    standardSalary: "90000",
    standardDutyHours: 8,
    phone: "0333-9876543",
    bankName: "MCB",
    bankAccountNumber: "98765432101",
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 36000 },
      { id: "utilities", name: "Utilities", amount: 18000 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 18000 },
      { id: "mobile", name: "Mobile Allowance", amount: 5000 },
      { id: "special", name: "Special Allowance", amount: 13000 },
    ],
  },
  {
    employeeCode: "EMP003",
    firstName: "Zeeshan",
    lastName: "Ali",
    designation: "Production Supervisor",
    department: "Production",
    joiningDate: "2023-06-01",
    employmentType: "full_time",
    standardSalary: "60000",
    standardDutyHours: 8,
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 24000 },
      { id: "utilities", name: "Utilities", amount: 12000 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 12000 },
      { id: "bikeMaintenance", name: "Bike Maintenance", amount: 5000 },
      { id: "fuel", name: "Fuel Allowance", amount: 7000 },
    ],
  },
  {
    employeeCode: "OP001",
    firstName: "Billal",
    lastName: "Raza",
    designation: "Machine Operator",
    department: "Production",
    joiningDate: "2023-08-15",
    employmentType: "full_time",
    standardSalary: "35000",
    standardDutyHours: 8,
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 14000 },
      { id: "utilities", name: "Utilities", amount: 7000 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 7000 },
      { id: "special", name: "Special Allowance", amount: 7000 },
    ],
  },
  {
    employeeCode: "OP002",
    firstName: "Usman",
    lastName: "Pervaiz",
    designation: "Machine Operator",
    department: "Production",
    joiningDate: "2023-09-20",
    employmentType: "full_time",
    standardSalary: "32500",
    standardDutyHours: 8,
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 13000 },
      { id: "utilities", name: "Utilities", amount: 6500 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 6500 },
      { id: "special", name: "Special Allowance", amount: 6500 },
    ],
  },
  {
    employeeCode: "SEC001",
    firstName: "Iqbal",
    lastName: "Masih",
    designation: "Security Guard",
    department: "Security",
    joiningDate: "2023-02-01",
    employmentType: "full_time",
    standardSalary: "22500",
    standardDutyHours: 12, // 12-hour shift
    allowanceConfig: [
      { id: "houseRent", name: "House Rent", amount: 9000 },
      { id: "utilities", name: "Utilities", amount: 4500 },
      { id: "conveyance", name: "Conveyance Allowance", amount: 4500 },
      { id: "special", name: "Special Allowance", amount: 4500 },
      { id: "nightShift", name: "Night Shift Allowance", amount: 1000 }, // per shift
    ],
  },
];

// ---------------------------------------------------------------------------

async function seedHR() {
  console.log("🌱 Seeding HR data...");

  // 1. Ensure an Admin User exists
  let adminUser = await db.query.user.findFirst({
    where: eq(user.role, "admin"),
  });

  if (!adminUser) {
    console.log("Creating admin user...");
    const [newUser] = await db
      .insert(user)
      .values({
        id: createId(),
        name: "Main Admin",
        email: "admin@titan.com",
        role: "admin",
        emailVerified: true,
      })
      .returning();
    adminUser = newUser;
  }

  // 2. Upsert Employees
  console.log(`Upserting ${employeeData.length} employees...`);
  const insertedEmployees: (typeof employees.$inferSelect)[] = [];

  for (const emp of employeeData) {
    const existing = await db.query.employees.findFirst({
      where: eq(employees.employeeCode, emp.employeeCode),
    });

    if (existing) {
      // Update to keep schema-aligned (drops stale columns automatically)
      const [updated] = await db
        .update(employees)
        .set({
          standardSalary: emp.standardSalary,
          standardDutyHours: emp.standardDutyHours,
          allowanceConfig: emp.allowanceConfig,
          firstName: emp.firstName,
          lastName: emp.lastName,
          designation: emp.designation,
          department: emp.department,
          phone: emp.phone ?? null,
          bankName: emp.bankName ?? null,
          bankAccountNumber: emp.bankAccountNumber ?? null,
        })
        .where(eq(employees.employeeCode, emp.employeeCode))
        .returning();
      insertedEmployees.push(updated);
      console.log(
        `  Updated: ${emp.employeeCode} – ${emp.firstName} ${emp.lastName}`,
      );
    } else {
      const [newEmp] = await db
        .insert(employees)
        .values({
          id: createId(),
          employeeCode: emp.employeeCode,
          firstName: emp.firstName,
          lastName: emp.lastName,
          designation: emp.designation,
          department: emp.department ?? null,
          joiningDate: emp.joiningDate,
          employmentType: emp.employmentType,
          status: "active",
          standardSalary: emp.standardSalary,
          standardDutyHours: emp.standardDutyHours,
          allowanceConfig: emp.allowanceConfig,
          phone: emp.phone ?? null,
          cnic: emp.cnic ?? null,
          address: emp.address ?? null,
          bankName: emp.bankName ?? null,
          bankAccountNumber: emp.bankAccountNumber ?? null,
        })
        .returning();
      insertedEmployees.push(newEmp);
      console.log(
        `  Inserted: ${emp.employeeCode} – ${emp.firstName} ${emp.lastName}`,
      );
    }
  }

  // 3. Generate Attendance — last 45 days
  console.log("Generating attendance records...");
  const today = new Date();
  const startDate = subDays(today, 45);
  const dateRange = eachDayOfInterval({ start: startDate, end: today });

  for (const date of dateRange) {
    const dateStr = format(date, "yyyy-MM-dd");
    const isSun = isSunday(date);

    for (const emp of insertedEmployees) {
      const existing = await db.query.attendance.findFirst({
        where: and(
          eq(attendance.employeeId, emp.id),
          eq(attendance.date, dateStr),
        ),
      });
      if (existing) continue;

      if (isSun) {
        await db.insert(attendance).values({
          id: createId(),
          employeeId: emp.id,
          date: dateStr,
          status: "holiday",
        });
        continue;
      }

      const rand = Math.random();
      let status: "present" | "absent" | "leave" | "half_day" = "present";
      if (rand < 0.03) status = "absent";
      else if (rand < 0.05) status = "leave";
      else if (rand < 0.08) status = "half_day";

      if (status !== "present") {
        // For leave: 70% are approved paid leave (no deduction)
        const isApproved = status === "leave" ? Math.random() < 0.7 : false;
        const leaveTypes = [
          "casual",
          "sick",
          "annual",
          "unpaid",
          "special",
        ] as const;
        const randType =
          leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
        await db.insert(attendance).values({
          id: createId(),
          employeeId: emp.id,
          date: dateStr,
          status,
          isApprovedLeave: isApproved,
          leaveType: status === "leave" ? randType : null,
          entrySource: "manual",
        });
        continue;
      }

      const isLate = Math.random() < 0.1;

      // Operators — split shift with occasional overtime
      if (emp.designation.toLowerCase().includes("operator")) {
        const overtimeHrs = Math.random() < 0.3 ? "0.5" : "0";
        const dutyHrs = (8.5 + parseFloat(overtimeHrs)).toString();
        await db.insert(attendance).values({
          id: createId(),
          employeeId: emp.id,
          date: dateStr,
          status: "present",
          checkIn: "08:00:00",
          checkOut: "12:00:00",
          checkIn2: "13:00:00",
          checkOut2: Math.random() < 0.3 ? "17:30:00" : "17:00:00",
          dutyHours: dutyHrs,
          overtimeHours: overtimeHrs,
          isNightShift: Math.random() < 0.2,
          isLate,
          overtimeStatus: overtimeHrs === "0" ? "pending" : "approved",
        });
      }
      // Security guard — 12-hour shift
      else if (emp.designation.toLowerCase().includes("guard")) {
        const isNightShift = Math.random() < 0.5;
        const checkIn = isNightShift ? "20:00:00" : "08:00:00";
        const checkOut = isNightShift ? "08:00:00" : "20:00:00";
        await db.insert(attendance).values({
          id: createId(),
          employeeId: emp.id,
          date: dateStr,
          status: "present",
          checkIn,
          checkOut,
          dutyHours: "12",
          overtimeHours: "0",
          isNightShift,
          isLate,
        });
      }
      // Standard office employees
      else {
        const undertimeChance = Math.random();
        let dutyHrs = "8";
        let checkOut = "17:00:00";
        let earlyDeparture = false;
        if (undertimeChance < 0.05) {
          // Left 1-2 hours early on rare days
          const shortBy = 1 + Math.floor(Math.random() * 2);
          dutyHrs = (8 - shortBy).toString();
          checkOut = shortBy === 2 ? "15:00:00" : "16:00:00";
          earlyDeparture = true;
        }
        await db.insert(attendance).values({
          id: createId(),
          employeeId: emp.id,
          date: dateStr,
          status: "present",
          checkIn: isLate ? "09:30:00" : "09:00:00",
          checkOut,
          dutyHours: isLate ? (parseFloat(dutyHrs) - 0.5).toString() : dutyHrs,
          overtimeHours: "0",
          isLate,
          earlyDepartureStatus: earlyDeparture ? "pending" : "none",
        });
      }
    }
  }

  // 4. Create Payroll Run (previous month) + Payslips via official calculator
  console.log("Creating sample payroll + payslips...");
  const lastMonth = subMonths(startOfMonth(today), 1);
  const monthStr = format(lastMonth, "yyyy-MM");
  const payrollMonthDate = parseISO(`${monthStr}-01`);
  const prevMonth = subMonths(payrollMonthDate, 1);
  const periodStart = format(
    addDays(startOfMonth(prevMonth), 15),
    "yyyy-MM-dd",
  );
  const periodEnd = format(
    addDays(startOfMonth(payrollMonthDate), 14),
    "yyyy-MM-dd",
  );

  let payrollRecord = await db.query.payrolls.findFirst({
    where: eq(payrolls.month, `${monthStr}-01`),
  });

  if (!payrollRecord) {
    const [newPayroll] = await db
      .insert(payrolls)
      .values({
        id: createId(),
        month: `${monthStr}-01`,
        startDate: periodStart,
        endDate: periodEnd,
        status: "approved",
        processedBy: adminUser.id,
      })
      .returning();
    payrollRecord = newPayroll;
    console.log(`  Payroll run created for ${monthStr}`);
  }

  // Seed payslips for all employees using the real calculator
  for (const emp of insertedEmployees) {
    const existing = await db.query.payslips.findFirst({
      where: and(
        eq(payslips.payrollId, payrollRecord.id),
        eq(payslips.employeeId, emp.id),
      ),
    });
    if (existing) continue;

    // Pull attendance for the payroll period
    const attRecords = await db.query.attendance.findMany({
      where: and(eq(attendance.employeeId, emp.id)),
    });

    // Filter to the period window
    const periodAttendance: AttendanceRecord[] = attRecords
      .filter((r) => r.date >= periodStart && r.date <= periodEnd)
      .map((r) => ({
        date: r.date,
        status: r.status as AttendanceRecord["status"],
        dutyHours: r.dutyHours ?? "0",
        overtimeHours: r.overtimeHours ?? "0",
        isNightShift: r.isNightShift ?? false,
        isApprovedLeave: r.isApprovedLeave ?? false,
        leaveType: r.leaveType ?? null,
        overtimeStatus:
          (r.overtimeStatus as "approved" | "pending" | "rejected") ??
          "pending",
      }));

    // Build EmployeeData shape for calculator
    const empData: EmployeeData = {
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      cnic: emp.cnic,
      designation: emp.designation,
      bankName: emp.bankName,
      bankAccountNumber: emp.bankAccountNumber,
      standardSalary: emp.standardSalary ?? "0",
      allowanceConfig: (emp.allowanceConfig as AllowanceConfig[]) ?? [],
      standardDutyHours: emp.standardDutyHours ?? 8,
    };

    const calc = calculatePayslip(
      empData,
      periodAttendance,
      { month: `${monthStr}-01`, startDate: periodStart, endDate: periodEnd },
      { manualDeductions: [], deductConveyanceOnLeave: true },
    );

    await db.insert(payslips).values({
      id: createId(),
      payrollId: payrollRecord.id,
      employeeId: emp.id,

      // Attendance summary
      daysPresent: calc.daysPresent,
      daysAbsent: calc.daysAbsent,
      daysLeave: calc.daysLeave,
      totalOvertimeHours: calc.totalOvertimeHours.toString(),
      nightShiftsCount: calc.nightShiftsCount,
      bradfordFactorScore: calc.bradfordFactorScore.toString(),

      // Earnings
      basicSalary: calc.basicSalary.toString(),
      allowanceBreakdown: calc.allowanceBreakdown,
      overtimeAmount: calc.overtimeAmount.toString(),
      nightShiftAllowanceAmount: calc.nightShiftAllowanceAmount.toString(),
      incentiveAmount: calc.incentiveAmount.toString(),
      bonusAmount: calc.bonusAmount.toString(),

      // Deductions
      absentDeduction: calc.absentDeduction.toString(),
      leaveDeduction: calc.leaveDeduction.toString(),
      advanceDeduction: calc.advanceDeduction.toString(),
      taxDeduction: calc.taxDeduction.toString(),
      otherDeduction: calc.otherDeduction.toString(),

      // Bradford
      bradfordFactorPeriod: calc.bradfordFactorPeriod,

      // Totals
      grossSalary: calc.grossSalary.toString(),
      totalDeductions: calc.totalDeductions.toString(),
      netSalary: calc.netSalary.toString(),

      remarks: "",
    });

    console.log(
      `  Payslip: ${emp.employeeCode} ${emp.firstName} ${emp.lastName}` +
        ` → gross PKR ${calc.grossSalary.toLocaleString()}, net PKR ${calc.netSalary.toLocaleString()}`,
    );
  }

  // Update payroll total amount
  const allPayslips = await db.query.payslips.findMany({
    where: eq(payslips.payrollId, payrollRecord.id),
  });
  const totalGross = allPayslips.reduce(
    (s, p) => s + parseFloat(p.grossSalary ?? "0"),
    0,
  );
  await db
    .update(payrolls)
    .set({ totalAmount: totalGross.toString() })
    .where(eq(payrolls.id, payrollRecord.id));
  console.log(`  Total payroll amount: PKR ${totalGross.toLocaleString()}`);

  console.log("✅ HR Seeding Completed!");
  process.exit(0);
}

seedHR().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
