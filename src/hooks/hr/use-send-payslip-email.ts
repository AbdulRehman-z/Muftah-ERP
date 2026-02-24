import { useMutation } from "@tanstack/react-query";
import { sendPayslipEmailFn } from "@/server-functions/hr/payroll/email-fn";
import { toast } from "sonner";

export function useSendPayslipEmail() {
  return useMutation({
    mutationFn: (payslipId: string) =>
      sendPayslipEmailFn({ data: { payslipId } }),
    onSuccess: () => {
      toast.success("Payslip emailed successfully");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}
