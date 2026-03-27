import { useState, useEffect } from "react";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateSalaryAdvance } from "@/hooks/hr/use-salary-advances";
import { useQuery } from "@tanstack/react-query";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Loader2, HandCoins } from "lucide-react";
import { toast } from "sonner";

const INSTALLMENT_OPTIONS = [
  { value: "1", label: "Full amount (1 month)", description: "Deducted entirely in the next payslip" },
  { value: "3", label: "3 Monthly Installments", description: "Split across 3 payslips" },
  { value: "6", label: "6 Monthly Installments", description: "Split across 6 payslips" },
  { value: "12", label: "12 Monthly Installments", description: "Split across 12 payslips" },
];

export const RequestAdvanceDialog = ({
  open,
  onOpenChange,
  defaultEmployeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: string;
}) => {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [installmentMonths, setInstallmentMonths] = useState("1");
  const mutate = useCreateSalaryAdvance();

  // Get active employees — only load when dialog is open
  const { data: employees = [], isLoading: isEmployeesLoading } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: () => getEmployeesFn({ data: { status: "active" } }),
    enabled: open,
  });

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setEmployeeId(defaultEmployeeId || "");
      setAmount("");
      setReason("");
      setInstallmentMonths("1");
    }
  }, [open, defaultEmployeeId]);

  const parsedAmount = parseFloat(amount) || 0;
  const parsedInstallments = parseInt(installmentMonths, 10);
  const perInstallment = parsedAmount > 0 && parsedInstallments > 1
    ? (parsedAmount / parsedInstallments).toFixed(2)
    : null;

  const handleSubmit = async () => {
    if (!employeeId || !amount || !reason) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Invalid amount.");
      return;
    }

    await mutate.mutateAsync(
      {
        data: {
          employeeId,
          amount: parsedAmount,
          reason,
          date: new Date().toISOString().split("T")[0],
          installmentMonths: parsedInstallments,
        },
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Request Salary Advance"
      description="Create a new salary advance request for an employee."
      icon={HandCoins}
    >
      <div className="space-y-6 py-4">
        <div className="flex flex-col space-y-2">
          <label className="text-sm font-semibold ">
            Employee <span className="text-destructive">*</span>
          </label>
          <Select value={employeeId} onValueChange={setEmployeeId} disabled={isEmployeesLoading}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder={isEmployeesLoading ? "Loading employees..." : "Select an employee..."} />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp: any) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-semibold ">
            Amount (PKR) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            placeholder="e.g. 30000"
            value={amount}
            className="h-11"
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-semibold">
            Repayment Plan <span className="text-destructive">*</span>
          </label>
          <Select value={installmentMonths} onValueChange={setInstallmentMonths}>
            <SelectTrigger className="h-11">
              <SelectValue placeholder="Select repayment plan..." />
            </SelectTrigger>
            <SelectContent>
              {INSTALLMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {perInstallment && parsedAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              ≈ PKR {parseFloat(perInstallment).toLocaleString()} deducted per payslip over {parsedInstallments} months
            </p>
          )}
        </div>

        <div className="flex flex-col space-y-2">
          <label className="text-sm font-semibold ">
            Reason / Description <span className="text-destructive">*</span>
          </label>
          <Textarea
            placeholder="Why is this advance being requested?"
            value={reason}
            className=" resize-none"
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutate.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={mutate.isPending}>
            {mutate.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Submit Request
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
