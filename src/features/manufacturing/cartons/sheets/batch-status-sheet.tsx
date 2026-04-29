import { useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCloseBatch, useReopenBatch } from "../hooks/use-carton-mutations";

type CloseProps = {
  mode: "close";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
};

type ReopenProps = {
  mode: "reopen";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
};

type Props = CloseProps | ReopenProps;

export function BatchStatusSheet(props: Props) {
  if (props.mode === "close") {
    return <CloseBatchSheet {...props} />;
  }
  return <ReopenBatchSheet {...props} />;
}

function CloseBatchSheet({ open, onOpenChange, batchId }: CloseProps) {
  const [reason, setReason] = useState("");
  const [acknowledgeShortfall, setAcknowledgeShortfall] = useState(false);
  const mutation = useCloseBatch();

  const handleSubmit = () => {
    mutation.mutate(
      { productionRunId: batchId, acknowledgeShortfall },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
          setAcknowledgeShortfall(false);
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Close Batch"
      description="Seal batch and prevent further carton changes"
      icon={Lock}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={reason !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
          <p className="text-sm font-bold text-red-800 dark:text-red-200">
            This will close the batch.
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            No further carton modifications (top-ups, transfers, etc.) will be allowed after closing.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">
            Closing Reason
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Production run completed, all cartons accounted for"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <label className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer">
          <input
            type="checkbox"
            checked={acknowledgeShortfall}
            onChange={(e) => setAcknowledgeShortfall(e.target.checked)}
            className="mt-0.5 accent-primary"
          />
          <div>
            <p className="text-sm font-medium">Acknowledge yield shortfall</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Check this if fill rate is below the 80% minimum threshold and you want to proceed anyway.
            </p>
          </div>
        </label>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? "Closing…" : "Close Batch"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}

function ReopenBatchSheet({ open, onOpenChange, batchId }: ReopenProps) {
  const [reason, setReason] = useState("");
  const mutation = useReopenBatch();

  const handleSubmit = () => {
    mutation.mutate(
      { productionRunId: batchId, reopenReason: reason },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReason("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Reopen Batch"
      description="Allow carton modifications again"
      icon={Unlock}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={reason !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Reopening will allow further carton modifications.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">
            Reopen Reason
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Additional cartons found after closing"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? "Reopening…" : "Reopen Batch"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}