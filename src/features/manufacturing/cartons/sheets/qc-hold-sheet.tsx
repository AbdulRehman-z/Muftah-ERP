import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApplyQcHold, useReleaseQcHold } from "../hooks/use-carton-mutations";
import { HOLD_OUTCOMES } from "@/lib/cartons/carton.types";

type ApplyHoldProps = {
  mode: "apply";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  sku: string | null;
};

type ReleaseHoldProps = {
  mode: "release";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  sku: string | null;
  preHoldStatus: string;
};

type Props = ApplyHoldProps | ReleaseHoldProps;

export function QcHoldSheet(props: Props) {
  if (props.mode === "apply") {
    return <ApplyHoldSheet {...props} />;
  }
  return <ReleaseHoldSheet {...props} />;
}

function ApplyHoldSheet({ open, onOpenChange, cartonId, batchId, sku }: ApplyHoldProps) {
  const [reason, setReason] = useState("");
  const mutation = useApplyQcHold(cartonId, batchId);

  const handleSubmit = () => {
    mutation.mutate(
      { reason },
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
      title="Apply QC Hold"
      description={`Place carton${sku ? ` ${sku}` : ""} on hold`}
      icon={ShieldAlert}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={reason !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            This carton will be locked. No pack changes can be made until the hold is released.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">
            Hold Reason
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. QC sample failed visual inspection"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide bg-orange-600 hover:bg-orange-700"
          onClick={handleSubmit}
          disabled={mutation.isPending || !reason.trim()}
        >
          {mutation.isPending ? "Applying…" : "Apply QC Hold"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}

function ReleaseHoldSheet({ open, onOpenChange, cartonId, batchId, sku, preHoldStatus }: ReleaseHoldProps) {
  const [outcome, setOutcome] = useState<string>("CLEARED");
  const [notes, setNotes] = useState("");
  const mutation = useReleaseQcHold(cartonId, batchId);

  const handleSubmit = () => {
    mutation.mutate(
      {
        outcome: outcome as "CLEARED" | "CONDEMNED",
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setOutcome("CLEARED");
          setNotes("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Release QC Hold"
      description={`Release hold on carton${sku ? ` ${sku}` : ""} (will return to ${preHoldStatus})`}
      icon={ShieldCheck}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={notes !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Outcome</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {HOLD_OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {o === "CLEARED" ? "Cleared — Resume normal status" : "Condemned — Retire carton"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider">
            Notes (optional)
          </Label>
          <Textarea
            id="notes"
            placeholder="e.g. QC passed, carton cleared for dispatch"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <Button
          className={`w-full font-bold uppercase tracking-wide ${outcome === "CONDEMNED" ? "bg-destructive hover:bg-destructive/90" : "bg-emerald-600 hover:bg-emerald-700"}`}
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Releasing…" : outcome === "CONDEMNED" ? "Condemn & Retire" : "Clear & Release"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}