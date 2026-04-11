import { createServerFn } from "@tanstack/react-start";
import { db } from "@/db";
import { attendance } from "@/db/schemas/hr-schema";
import { requireHrManageMiddleware } from "@/lib/middlewares";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const processOvertimeFn = createServerFn()
    .middleware([requireHrManageMiddleware])
    .inputValidator(
        z.object({
            id: z.string(),
            status: z.enum(["approved", "rejected", "pending"]),
        })
    )
    .handler(async ({ data: { id, status } }) => {
        const [updated] = await db
            .update(attendance)
            .set({ overtimeStatus: status, updatedAt: new Date() })
            .where(eq(attendance.id, id))
            .returning();

        return updated;
    });
