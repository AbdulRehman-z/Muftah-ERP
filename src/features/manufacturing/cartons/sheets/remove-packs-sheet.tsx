import { useState } from "react";
import { PackageMinus, Loader2, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

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
  const overLimit = packsToRemove > currentPacks;

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
      <div className="flex flex-col gap-6 py-4">
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current quantity</span>
            <span className="font-semibold tabular-nums text-foreground">
              {currentPacks} / {capacity}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="packsToRemove" className="text-sm font-medium text-foreground">
            Packs to remove
          </Label>
          <Input
            id="packsToRemove"
            type="number"
            min={1}
            max={currentPacks}
            value={packsToRemove}
            onChange={(e) => setPacksToRemove(Math.max(1, parseInt(e.target.value) || 1))}
            className={cn(
              "h-10 font-semibold",
              overLimit && "border-destructive focus-visible:ring-destructive/20"
            )}
          />
          {overLimit && (
            <p className="text-xs text-destructive flex items-center gap-1.5">
              <AlertCircle className="size-3.5 shrink-0" />
              Exceeds available packs.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-foreground">Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMOVAL_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {reasonLabels[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="notes" className="text-sm font-medium text-foreground">
            Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Record adjustment justification..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 flex justify-between text-sm">
          <span className="text-destructive">Remaining quantity</span>
          <span className="font-semibold tabular-nums text-destructive">
            {currentPacks - (overLimit ? 0 : packsToRemove)} / {capacity}
          </span>
        </div>

        <Button
          className="w-full h-10"
          variant="destructive"
          onClick={handleSubmit}
          disabled={mutation.isPending || overLimit || packsToRemove < 1}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Removing…
            </>
          ) : (
            `Remove ${packsToRemove} pack${packsToRemove !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}