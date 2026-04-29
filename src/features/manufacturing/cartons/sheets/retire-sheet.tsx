import { useState } from "react";
import { Trash2 } from "lucide-react";
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
import { useRetireCarton } from "../hooks/use-carton-mutations";
import { RETIRE_REASONS } from "@/lib/cartons/carton.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  currentPacks: number;
  sku: string | null;
};

const reasonLabels: Record<string, string> = {
  LOST: "Lost",
  DESTROYED: "Destroyed",
  CONDEMNED: "Condemned (QC)",
  OTHER: "Other",
};

export function RetireSheet({ open, onOpenChange, cartonId, batchId, currentPacks, sku }: Props) {
  const [reasonCategory, setReasonCategory] = useState<"LOST" | "DESTROYED" | "CONDEMNED" | "OTHER">("OTHER");
  const [notes, setNotes] = useState("");
  const mutation = useRetireCarton(cartonId, batchId);

  const isDirty = notes !== "" || reasonCategory !== "OTHER";

  const handleSubmit = () => {
    mutation.mutate(
      { reason: reasonCategory, notes: notes || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setReasonCategory("OTHER");
          setNotes("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Retire Carton"
      description="Permanently remove carton from active inventory"
      icon={Trash2}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      confirmCloseTitle="Cancel retirement?"
      confirmCloseDescription="This carton will not be retired."
    >
      <div className="space-y-6 py-4">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-2">
          <p className="text-sm font-bold text-red-800 dark:text-red-200">
            This action cannot be undone.
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            Carton{sku ? ` ${sku}` : ""} with {currentPacks} packs will be permanently retired and removed from active inventory.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Reason</Label>
          <Select value={reasonCategory} onValueChange={(v) => setReasonCategory(v as typeof reasonCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {RETIRE_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{reasonLabels[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note" className="text-xs font-bold uppercase tracking-wider">
            Additional Details
          </Label>
          <Textarea
            id="note"
            placeholder="Explain why this carton is being retired..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          variant="destructive"
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Retiring…" : "Retire Carton"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}