import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { payslips } from "@/db/schemas/hr-schema";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const overrideBradfordFactorFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      payslipId: z.string(),
      overrideScore: z.string().nullable(), // null means remove override and use computed
    }),
  )
  .handler(async ({ data }) => {
    const [updated] = await db
      .update(payslips)
      .set({ bradfordFactorOverride: data.overrideScore })
      .where(eq(payslips.id, data.payslipId))
      .returning();
    return updated;
  });
