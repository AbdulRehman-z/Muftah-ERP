import { db } from "./src/db";
import { employees, attendance } from "./src/db/schemas/hr-schema";
import { format } from "date-fns";

async function run() {
  console.log("Seeding Order Booker...");
  
  // 1. Create a dummy order booker
  const [emp] = await db.insert(employees).values({
    firstName: "Speedy",
    lastName: "Booker",
    employeeCode: `OB-${Date.now().toString().slice(-6)}`,
    designation: "Sales Rep",
    department: "Marketing",
    status: "active",
    employmentType: "full_time",
    joiningDate: new Date().toISOString(),
    standardDutyHours: 8,
    standardSalary: "50000",
    commissionRate: "12.5",
    isOrderBooker: true,
  }).returning();
  
  console.log(`Created Employee: ${emp.firstName} ${emp.lastName} (ID: ${emp.id})`);

  // 2. Create today's attendance log for this booker
  const today = format(new Date(), "yyyy-MM-dd");
  
  const [att] = await db.insert(attendance).values({
    employeeId: emp.id,
    date: today,
    status: "present",
    checkIn: "09:00",
    checkOut: "18:00",
    // Order Booker specific fields
    areaVisited: "Downtown Fast Zone",
    shopType: "new",
    paymentMode: "per_km",
    distanceKm: "25",
    perKmRate: "15",
    saleAmount: "125000",
    recoveryAmount: "45000",
    returnAmount: "0",
    slipNumbers: "INV-999, INV-1000",
  }).returning();

  console.log(`Created Attendance record for today (ID: ${att.id})`);
  console.log("Seeding complete!");
  process.exit(0);
}

run().catch(console.error);
