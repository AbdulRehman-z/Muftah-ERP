import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { salaryAdvances, employees } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * List all salary advances, with pagination
 */
export const listSalaryAdvancesFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ limit: z.number().optional().default(50) }))
  .handler(async ({ data }) => {
    return await db.query.salaryAdvances.findMany({
      with: {
        employee: {
          columns: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true,
            designation: true,
          },
        },
        approver: {
          columns: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: (salaryAdvances, { desc }) => [desc(salaryAdvances.createdAt)],
      limit: data.limit,
    });
  });

/**
 * Request/Create a new salary advance
 */
export const createSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      employeeId: z.string(),
      amount: z.number().positive(),
      date: z.string(), // YYYY-MM-DD
      reason: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const [inserted] = await db
      .insert(salaryAdvances)
      .values({
        employeeId: data.employeeId,
        amount: data.amount.toString(),
        date: data.date,
        reason: data.reason,
      })
      .returning();
    return inserted;
  });

/**
 * Approve a salary advance and deduct from finance wallet
 */
export const approveSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      advanceId: z.string(),
      performedById: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const advance = await db.query.salaryAdvances.findFirst({
      where: eq(salaryAdvances.id, data.advanceId),
    });

    if (!advance) throw new Error("Salary advance not found");
    if (advance.status !== "pending")
      throw new Error("Only pending advances can be approved");

    // Simple status update without finance integration
    const [updated] = await db
      .update(salaryAdvances)
      .set({
        status: "approved",
        approvedBy: data.performedById,
        paidAt: new Date(),
      })
      .where(eq(salaryAdvances.id, data.advanceId))
      .returning();

    return updated;
  });

/**
 * Reject a salary advance
 */
export const rejectSalaryAdvanceFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ advanceId: z.string() }))
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(salaryAdvances)
      .set({ status: "rejected" })
      .where(eq(salaryAdvances.id, data.advanceId))
      .returning();
    return updated;
  });
