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

export const RequestAdvanceDialog = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
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
      setEmployeeId("");
      setAmount("");
      setReason("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!employeeId || !amount || !reason) {
      toast.error("Please fill all required fields.");
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Invalid amount.");
      return;
    }

    await mutate.mutateAsync(
      {
        data: {
          employeeId,
          amount: amt,
          reason,
          date: new Date().toISOString().split("T")[0],
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
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
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

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Amount (PKR) <span className="text-destructive">*</span>
          </label>
          <Input
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            className="h-11 "
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
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
