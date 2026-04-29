import { useState } from "react";
import { PackageMinus } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRemovePacks } from "../hooks/use-carton-mutations";
import { REMOVAL_REASONS } from "@/lib/cartons/carton.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  currentPacks: number;
  capacity: number;
  sku: string | null;
};

const reasonLabels: Record<string, string> = {
  QC_FAIL: "QC Failure",
  DAMAGED: "Damaged",
  TRANSFER: "Transfer Out",
  OTHER: "Other",
};

export function RemovePacksSheet({ open, onOpenChange, cartonId, batchId, currentPacks, capacity, sku }: Props) {
  const [packsToRemove, setPacksToRemove] = useState(1);
  const [reason, setReason] = useState<"QC_FAIL" | "DAMAGED" | "TRANSFER" | "OTHER">("OTHER");
  const [notes, setNotes] = useState("");
  const mutation = useRemovePacks(cartonId, batchId);

  const isDirty = packsToRemove !== 1 || notes !== "";

  const handleSubmit = () => {
    mutation.mutate(
      { delta: packsToRemove, reason, notes: notes || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setPacksToRemove(1);
          setReason("OTHER");
          setNotes("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Remove Packs"
      description={`Remove packs from carton${sku ? ` ${sku}` : ""}`}
      icon={PackageMinus}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="space-y-6 py-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Packs</span>
            <span className="font-mono font-bold">{currentPacks} / {capacity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Min After Removal</span>
            <span className="font-mono font-bold text-amber-600">0 packs</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="packsToRemove" className="text-xs font-bold uppercase tracking-wider">
            Packs to Remove
          </Label>
          <Input
            id="packsToRemove"
            type="number"
            min={1}
            max={currentPacks}
            value={packsToRemove}
            onChange={(e) => setPacksToRemove(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {packsToRemove > currentPacks && (
            <p className="text-xs text-destructive">Cannot remove more than {currentPacks} packs</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {REMOVAL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>{reasonLabels[r]}</SelectItem>
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
            placeholder="Additional details..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-destructive">Remaining After</span>
            <span className="font-mono font-bold text-destructive">
              {currentPacks - packsToRemove} / {capacity}
            </span>
          </div>
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide bg-destructive hover:bg-destructive/90"
          onClick={handleSubmit}
          disabled={mutation.isPending || packsToRemove > currentPacks || packsToRemove < 1}
        >
          {mutation.isPending ? "Removing…" : `Remove ${packsToRemove} Pack${packsToRemove > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}