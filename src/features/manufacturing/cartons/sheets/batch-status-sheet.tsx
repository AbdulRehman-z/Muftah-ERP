import { useState } from "react";
import { Lock, Unlock, Loader2, AlertCircle } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCloseBatch, useReopenBatch } from "../hooks/use-carton-mutations";
import { cn } from "@/lib/utils";

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
      <div className="flex flex-col gap-6 py-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 flex flex-col gap-1">
          <p className="text-xs font-medium text-destructive">
            Operational lock will be applied.
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Closing prevents any further modifications (top-ups, transfers, or repacking) to cartons in this run.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reason" className="text-sm font-medium text-foreground">
            Closing reason
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Production run completed, all inventory accounted for"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <label className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border hover:bg-muted/40 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={acknowledgeShortfall}
            onChange={(e) => setAcknowledgeShortfall(e.target.checked)}
            className="mt-0.5 accent-primary shrink-0"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-foreground">Acknowledge yield shortfall</span>
            <span className="text-xs text-muted-foreground leading-snug">
              Confirm processing despite fill rate being below the 80% minimum threshold.
            </span>
          </div>
        </label>

        <Button
          className="w-full h-10"
          variant="destructive"
          onClick={handleSubmit}
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Closing…
            </>
          ) : (
            "Close Batch"
          )}
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
      description="Restore batch to active state"
      icon={Unlock}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={reason !== ""}
    >
      <div className="flex flex-col gap-6 py-4">
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20 px-4 py-3.5 flex items-center gap-2">
          <AlertCircle className="size-3.5 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            Reopening will allow further inventory modifications.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="reason" className="text-sm font-medium text-foreground">
            Reopen reason
          </Label>
          <Textarea
            id="reason"
            placeholder="Why is this batch being unlocked?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          className="w-full h-10"
          onClick={handleSubmit}
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Reopening…
            </>
          ) : (
            "Reopen Batch"
          )}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}