import { useState } from "react";
import { PenLine } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSetCartonCount } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  currentPacks: number;
  capacity: number;
  sku: string | null;
};

export function SetCountSheet({ open, onOpenChange, cartonId, batchId, currentPacks, capacity, sku }: Props) {
  const [newCount, setNewCount] = useState(currentPacks);
  const [reason, setReason] = useState("");
  const mutation = useSetCartonCount(cartonId, batchId);

  const isDirty = newCount !== currentPacks;
  const delta = newCount - currentPacks;

  const handleSubmit = () => {
    mutation.mutate(
      { newCount, reason },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNewCount(currentPacks);
          setReason("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Override Count"
      description={`Set exact pack count for carton${sku ? ` ${sku}` : ""}`}
      icon={PenLine}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
      confirmCloseTitle="Discard count override?"
      confirmCloseDescription="The new count will not be saved."
    >
      <div className="space-y-6 py-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Packs</span>
            <span className="font-mono font-bold">{currentPacks}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Capacity</span>
            <span className="font-mono font-bold">{capacity}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="newCount" className="text-xs font-bold uppercase tracking-wider">
            New Count
          </Label>
          <Input
            id="newCount"
            type="number"
            min={0}
            max={capacity}
            value={newCount}
            onChange={(e) => setNewCount(Math.max(0, parseInt(e.target.value) || 0))}
          />
          {newCount > capacity && (
            <p className="text-xs text-destructive">Exceeds carton capacity ({capacity})</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason" className="text-xs font-bold uppercase tracking-wider">
            Reason for Override
          </Label>
          <Textarea
            id="reason"
            placeholder="e.g. Physical count showed 47 instead of 50"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>

        {isDirty && (
          <div className={`border rounded-lg p-4 ${delta > 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" : delta < 0 ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" : "bg-muted/50 border-border"}`}>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Change</span>
              <span className={`font-mono font-bold ${delta > 0 ? "text-emerald-600" : delta < 0 ? "text-red-600" : ""}`}>
                {delta > 0 ? "+" : ""}{delta} packs
              </span>
            </div>
          </div>
        )}

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || !isDirty || newCount > capacity}
        >
          {mutation.isPending ? "Overriding…" : `Set Count to ${newCount}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}