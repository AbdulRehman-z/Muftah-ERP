import { createServerFn } from "@tanstack/react-start";
import { db, supplierPayments, purchaseRecords } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";

const addPaymentSchema = z.object({
    supplierId: z.string(),
    purchaseId: z.string().optional(),
    amount: z.string().min(1, "Amount is required"),
    paymentDate: z.date().default(() => new Date()),
    method: z.enum(["cash", "bank_transfer", "cheque"]),
    reference: z.string().optional(),
    bankName: z.string().optional(),
    paidBy: z.string().min(1, "Paid By is required"),
    notes: z.string().optional(),
}).refine((data) => {
    if (["bank_transfer", "cheque"].includes(data.method)) {
        return !!data.bankName && data.bankName.length > 0;
    }
    return true;
}, {
    message: "Bank Name is required",
    path: ["bankName"],
});

export const addPaymentFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(addPaymentSchema)
    .handler(async ({ data }) => {
        return await db.transaction(async (tx) => {
            const [payment] = await tx
                .insert(supplierPayments)
                .values({
                    supplierId: data.supplierId,
                    purchaseId: data.purchaseId,
                    amount: data.amount,
                    paymentDate: data.paymentDate,
                    method: data.method,
                    reference: data.reference,
                    bankName: data.bankName,
                    paidBy: data.paidBy,
                    notes: data.notes,
                })
                .returning();

            if (data.purchaseId) {
                await tx
                    .update(purchaseRecords)
                    .set({
                        paidAmount: sql`${purchaseRecords.paidAmount} + ${data.amount}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(purchaseRecords.id, data.purchaseId));
            }

            return payment;
        });
    });
