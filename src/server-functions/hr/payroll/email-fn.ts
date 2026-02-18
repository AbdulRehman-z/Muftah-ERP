import { createServerFn } from "@tanstack/react-start";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { db } from "@/db";
import { payslips } from "@/db/schemas/hr-schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email-client";
import { generatePayslipEmailHtml } from "@/email-templates/payslip-template";

export const sendPayslipEmailFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        payslipId: z.string(),
    }))
    .handler(async ({ data }) => {
        const { payslipId } = data;

        const payslip = await db.query.payslips.findFirst({
            where: eq(payslips.id, payslipId),
            with: {
                employee: {
                    with: {
                        user: true
                    }
                },
                payroll: true
            }
        });

        if (!payslip) throw new Error("Payslip not found");

        const employeeEmail = (payslip.employee as any).user?.email;

        if (!employeeEmail) {
            throw new Error("Employee does not have an email address associated with their account.");
        }

        const html = generatePayslipEmailHtml(payslip);

        await sendEmail({
            email: employeeEmail,
            subject: `Payslip - ${payslip.payroll.month}`,
            html: html
        });

        return { success: true };
    });
