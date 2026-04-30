import { useState } from "react";
import { PackagePlus, Loader2, AlertCircle } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTopUpCarton } from "../hooks/use-carton-mutations";
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

export function TopUpSheet({ open, onOpenChange, cartonId, batchId, currentPacks, capacity, sku }: Props) {
  const [delta, setDelta] = useState(1);
  const [reason, setReason] = useState("");
  const mutation = useTopUpCarton(cartonId, batchId);

  const maxAdd = capacity - currentPacks;
  const isDirty = delta !== 1 || reason !== "";
  const overLimit = delta > maxAdd;

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
      <div className="flex flex-col gap-6 py-4">
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5 flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current quantity</span>
            <span className="font-semibold tabular-nums text-foreground">{currentPacks} / {capacity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Available space</span>
            <span className="font-semibold tabular-nums text-green-600">{maxAdd} packs</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="delta" className="text-sm font-medium text-foreground">
            Packs to add
          </Label>
          <Input
            id="delta"
            type="number"
            min={1}
            max={maxAdd}
            value={delta}
            onChange={(e) => setDelta(Math.max(1, parseInt(e.target.value) || 1))}
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
          <Label htmlFor="reason" className="text-sm font-medium text-foreground">
            Reason <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <Textarea
            id="reason"
            placeholder="Explain transaction context..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5 flex justify-between text-sm">
          <span className="text-muted-foreground">New total</span>
          <span className="font-semibold tabular-nums text-foreground">
            {currentPacks + (overLimit ? 0 : delta)} / {capacity}
          </span>
        </div>

        <Button
          className="w-full h-10"
          onClick={handleSubmit}
          disabled={mutation.isPending || overLimit || delta < 1}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Adding…
            </>
          ) : (
            `Top-Up ${delta} pack${delta !== 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}