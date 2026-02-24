import { useState, useEffect } from "react";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOverrideBradford } from "@/hooks/hr/use-override-bradford";
import { Loader2, ShieldAlert } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslipId: string;
  currentScore: string | null;
};

export const OverrideBradfordDialog = ({
  open,
  onOpenChange,
  payslipId,
  currentScore,
}: Props) => {
  const [score, setScore] = useState<string>("");
  const mutate = useOverrideBradford();

  useEffect(() => {
    if (open) {
      setScore(currentScore || "");
    }
  }, [open, currentScore]);

  const handleSave = async () => {
    const val = score.trim() === "" ? null : score.trim();
    await mutate.mutateAsync(
      { payslipId, overrideScore: val },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Override Bradford Factor"
      description="Manually adjust the Bradford Factor score for this payslip."
      icon={ShieldAlert}
    >
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            New Score
          </label>
          <Input
            type="number"
            placeholder="e.g. 50 (leave empty to reset to computed)"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Leaving this blank will remove the override and revert to the
            system-calculated score.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={mutate.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={mutate.isPending}>
            {mutate.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : null}
            Save Changes
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
