import { useState } from "react";
import { PackagePlus } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTopUpCarton } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  currentPacks: number;
  capacity: number;
  sku: string | null;
};

export function TopUpSheet({ open, onOpenChange, cartonId, batchId, currentPacks, capacity, sku }: Props) {
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const mutation = useTopUpCarton(cartonId, batchId);

  const maxAdd = capacity - currentPacks;
  const isDirty = delta !== 1 || reason !== "";

  const handleSubmit = () => {
    mutation.mutate(
      { delta, reason: reason || undefined },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDelta(1);
          setReason("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Top-Up Packs"
      description={`Add packs to carton${sku ? ` ${sku}` : ""}`}
      icon={PackagePlus}
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
            <span className="text-muted-foreground">Available Space</span>
            <span className="font-mono font-bold text-emerald-600">{maxAdd} packs</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delta" className="text-xs font-bold uppercase tracking-wider">
            Packs to Add
          </Label>
          <Input
            id="delta"
            type="number"
            min={1}
            max={maxAdd}
            value={delta}
            onChange={(e) => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
          />
          {delta > maxAdd && (
            <p className="text-xs text-destructive">Exceeds available capacity by {delta - maxAdd}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">
            Reason (optional)
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Production top-up from line 3"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">New Total</span>
            <span className="font-mono font-bold text-primary">
              {currentPacks + delta} / {capacity}
            </span>
          </div>
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || delta > maxAdd || delta < 1}
        >
          {mutation.isPending ? "Adding…" : `Top-Up ${delta} Pack${delta > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}