import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { Button } from "@/components/ui/button";
import { useApproveSalaryAdvance } from "@/hooks/hr/use-salary-advances";
import { Loader2, CheckCircle2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export const ApproveAdvanceDialog = ({
  open,
  onOpenChange,
  advanceId,
  amount,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  advanceId: string | null;
  amount: string | null;
}) => {
  const mutate = useApproveSalaryAdvance();
  const { data: session } = authClient.useSession();

  const handleApprove = async () => {
    if (!advanceId) return;

    await mutate.mutateAsync(
      {
        data: {
          advanceId,
          performedById: session?.user.id || "",
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
      title="Approve Salary Advance"
      description="Are you sure you want to approve this salary advance? This will mark it as approved and ready for disbursement."
      icon={CheckCircle2}
    >
      <div className="space-y-4 py-4">
        <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
          <span className="text-sm font-semibold">Amount to Pay</span>
          <span className="text-lg font-black text-primary">
            PKR {amount ? parseFloat(amount).toLocaleString() : "0"}
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutate.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleApprove} disabled={mutate.isPending}>
            {mutate.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Confirm Approval
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
