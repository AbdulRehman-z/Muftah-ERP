import { db } from "./index";
import {
    employees,
    attendance,
    payrolls,
    payslips,
    employeeStatusEnum,
    employmentTypeEnum,
    attendanceStatusEnum
} from "./schemas/hr-schema";
import { user } from "./schemas/auth-schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import {
    format,
    subDays,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSunday,
    addHours,
    addMinutes,
    parseISO,
    subMonths,
    addDays
} from "date-fns";

async function seedHR() {
    console.log("🌱 Seeding HR data...");

    // 1. Ensure an Admin User exists for references
    let adminUser = await db.query.user.findFirst({
        where: eq(user.role, "admin")
    });

    if (!adminUser) {
        console.log("Creating admin user...");
        const [newUser] = await db.insert(user).values({
            id: createId(),
            name: "Main Admin",
            email: "admin@titan.com",
            role: "admin",
            emailVerified: true,
        }).returning();
        adminUser = newUser;
    }

    // 2. Clear existing HR data (optional - be careful in production!)
    // For a development seed, it's often better to start fresh
    // await db.delete(payslips);
    // await db.delete(attendance);
    // await db.delete(payrolls);
    // await db.delete(employees);

    // 3. Create Employees
    const employeeData = [
        {
            employeeCode: "EMP001",
            firstName: "Faisal",
            lastName: "Ahmed",
            designation: "General Manager",
            department: "Administration",
            joiningDate: "2023-01-15",
            standardSalary: "250000",
            basicSalary: "125000",
            houseRentAllowance: "50000",
            utilitiesAllowance: "25000",
            conveyanceAllowance: "25000",
            mobileAllowance: "10000",
            specialAllowance: "15000",
            standardDutyHours: 8,
            isOperator: false,
        },
        {
            employeeCode: "EMP002",
            firstName: "Sara",
            lastName: "Khan",
            designation: "Finance Manager",
            department: "Finance",
            joiningDate: "2023-03-10",
            standardSalary: "180000",
            basicSalary: "90000",
            houseRentAllowance: "36000",
            utilitiesAllowance: "18000",
            conveyanceAllowance: "18000",
            mobileAllowance: "5000",
            specialAllowance: "13000",
            standardDutyHours: 8,
            isOperator: false,
        },
        {
            employeeCode: "EMP003",
            firstName: "Zeeshan",
            lastName: "Ali",
            designation: "Production Supervisor",
            department: "Production",
            joiningDate: "2023-06-01",
            standardSalary: "120000",
            basicSalary: "60000",
            houseRentAllowance: "24000",
            utilitiesAllowance: "12000",
            conveyanceAllowance: "12000",
            bikeMaintenanceAllowance: "5000",
            fuelAllowance: "7000",
            standardDutyHours: 8,
            isOperator: false,
        },
        {
            employeeCode: "OP001",
            firstName: "Billal",
            lastName: "Raza",
            designation: "Machine Operator",
            department: "Production",
            joiningDate: "2023-08-15",
            standardSalary: "70000",
            basicSalary: "35000",
            houseRentAllowance: "14000",
            utilitiesAllowance: "7000",
            conveyanceAllowance: "7000",
            specialAllowance: "7000",
            standardDutyHours: 8,
            isOperator: true, // Split shift logic
        },
        {
            employeeCode: "OP002",
            firstName: "Usman",
            lastName: "Pervaiz",
            designation: "Machine Operator",
            department: "Production",
            joiningDate: "2023-09-20",
            standardSalary: "65000",
            basicSalary: "32500",
            houseRentAllowance: "13000",
            utilitiesAllowance: "6500",
            conveyanceAllowance: "6500",
            specialAllowance: "6500",
            standardDutyHours: 8,
            isOperator: true,
        },
        {
            employeeCode: "SEC001",
            firstName: "Iqbal",
            lastName: "Masih",
            designation: "Security Guard",
            department: "Security",
            joiningDate: "2023-02-01",
            standardSalary: "45000",
            basicSalary: "22500",
            houseRentAllowance: "9000",
            utilitiesAllowance: "4500",
            conveyanceAllowance: "4500",
            specialAllowance: "4500",
            standardDutyHours: 12, // 12 hour shift
            isOperator: false,
        },
    ];

    console.log(`Inserting ${employeeData.length} employees...`);
    const insertedEmployees = [];
    for (const emp of employeeData) {
        // Check if employee already exists
        const existing = await db.query.employees.findFirst({
            where: eq(employees.employeeCode, emp.employeeCode)
        });

        if (existing) {
            insertedEmployees.push(existing);
        } else {
            const [newEmp] = await db.insert(employees).values({
                ...emp,
                id: createId(),
                status: "active",
                employmentType: "full_time"
            }).returning();
            insertedEmployees.push(newEmp);
        }
    }

    // 4. Generate Attendance for the last 45 days
    console.log("Generating attendance data...");
    const today = new Date();
    const startDate = subDays(today, 45);
    const dateRange = eachDayOfInterval({ start: startDate, end: today });

    for (const date of dateRange) {
        const dateStr = format(date, "yyyy-MM-dd");
        const isSun = isSunday(date);

        for (const emp of insertedEmployees) {
            // Check if attendance already exists
            const existing = await db.query.attendance.findFirst({
                where: and(
                    eq(attendance.employeeId, emp.id),
                    eq(attendance.date, dateStr)
                )
            });

            if (existing) continue;

            if (isSun) {
                // Sunday is holiday
                await db.insert(attendance).values({
                    employeeId: emp.id,
                    date: dateStr,
                    status: "holiday",
                });
                continue;
            }

            // Probability logic for status
            const rand = Math.random();
            let status: "present" | "absent" | "leave" | "half_day" = "present";

            if (rand < 0.03) status = "absent";
            else if (rand < 0.05) status = "leave";
            else if (rand < 0.08) status = "half_day";

            if (status === "present") {
                const isLate = Math.random() < 0.1;
                const checkInTime = isLate ? "09:30:00" : "09:00:00";
                const checkOutTime = "17:00:00";

                // For Operators, handle split shift or extra hours
                if (emp.isOperator) {
                    await db.insert(attendance).values({
                        employeeId: emp.id,
                        date: dateStr,
                        status: "present",
                        checkIn: "08:00:00",
                        checkOut: "12:00:00",
                        checkIn2: "13:00:00",
                        checkOut2: "17:30:00",
                        dutyHours: "8.5",
                        overtimeHours: "0.5",
                        isNightShift: Math.random() < 0.2, // Sometimes night shift
                    });
                } else if (emp.standardDutyHours === 12) {
                    // Security guard
                    await db.insert(attendance).values({
                        employeeId: emp.id,
                        date: dateStr,
                        status: "present",
                        checkIn: "08:00:00",
                        checkOut: "20:00:00",
                        dutyHours: "12",
                        overtimeHours: "4", // 12 - 8 = 4 overtime if base is 8
                    });
                } else {
                    // Standard employee
                    await db.insert(attendance).values({
                        employeeId: emp.id,
                        date: dateStr,
                        status: "present",
                        checkIn: checkInTime,
                        checkOut: checkOutTime,
                        dutyHours: "8",
                        isLate,
                    });
                }
            } else {
                await db.insert(attendance).values({
                    employeeId: emp.id,
                    date: dateStr,
                    status: status,
                });
            }
        }
    }

    // 5. Create a Payroll Run for Previous Month
    console.log("Creating sample payroll run...");
    const lastMonth = subMonths(startOfMonth(today), 1);
    const monthStr = format(lastMonth, "yyyy-MM");

    // Period: 16th of prev-prev month to 15th of prev month
    const payrollMonthDate = parseISO(`${monthStr}-01`);
    const prevMonth = subMonths(payrollMonthDate, 1);
    const periodStart = format(addDays(startOfMonth(prevMonth), 15), "yyyy-MM-dd");
    const periodEnd = format(addDays(startOfMonth(payrollMonthDate), 14), "yyyy-MM-dd");

    const existingPayroll = await db.query.payrolls.findFirst({
        where: eq(payrolls.month, `${monthStr}-01`)
    });

    if (!existingPayroll) {
        const [newPayroll] = await db.insert(payrolls).values({
            id: createId(),
            month: `${monthStr}-01`,
            startDate: periodStart,
            endDate: periodEnd,
            status: "approved",
            processedBy: adminUser.id,
        }).returning();

        console.log(`Payroll created for ${monthStr}`);

        // We won't generate all payslips here as they usually depend on the calculator logic,
        // but we can seed one or two manually to test the UI.
        for (const emp of insertedEmployees.slice(0, 3)) {
            const standardSalary = emp.standardSalary ?? "0";
            await db.insert(payslips).values({
                id: createId(),
                payrollId: newPayroll.id,
                employeeId: emp.id,
                daysPresent: 24,
                daysAbsent: 1,
                daysLeave: 1,
                basicSalary: emp.basicSalary ?? "0",
                houseRentAllowance: emp.houseRentAllowance ?? "0",
                utilitiesAllowance: emp.utilitiesAllowance ?? "0",
                conveyanceAllowance: emp.conveyanceAllowance ?? "0",
                bikeMaintenanceAllowance: emp.bikeMaintenanceAllowance ?? "0",
                mobileAllowance: emp.mobileAllowance ?? "0",
                fuelAllowance: emp.fuelAllowance ?? "0",
                specialAllowance: emp.specialAllowance ?? "0",
                grossSalary: standardSalary,
                totalDeductions: "5000",
                netSalary: (parseFloat(standardSalary) - 5000).toString(),
            });
        }
    }

    console.log("✅ HR Seeding Completed!");
    process.exit(0);
}

seedHR().catch((err) => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
