import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRepackCarton } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonId: string;
  batchId: string;
  currentCapacity: number;
  currentPacks: number;
};

export function RepackSheet({ open, onOpenChange, cartonId, batchId, currentCapacity, currentPacks }: Props) {
  const [newCapacity, setNewCapacity] = useState(currentCapacity);
  const [justification, setJustification] = useState("");
  const mutation = useRepackCarton(cartonId, batchId);

  const isDirty = newCapacity !== currentCapacity || justification !== "";

  const handleSubmit = () => {
    mutation.mutate(
      { newCapacity, justification },
      {
        onSuccess: () => {
          onOpenChange(false);
          setNewCapacity(currentCapacity);
          setJustification("");
        },
      },
    );
  };

  const packsWillBeCapped = newCapacity < currentPacks;

  return (
    <ResponsiveSheet
      title="Repack Carton"
      description="Change carton capacity (pack count will adjust)"
      icon={RefreshCw}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="space-y-6 py-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Capacity</span>
            <span className="font-mono font-bold">{currentCapacity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Packs</span>
            <span className="font-mono font-bold">{currentPacks}</span>
          </div>
        </div>

        {packsWillBeCapped && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs font-medium text-red-800 dark:text-red-200">
              {currentPacks - newCapacity} packs will be removed (capped to new capacity).
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="newCapacity" className="text-xs font-bold uppercase tracking-wider">
            New Capacity
          </Label>
          <Input
            id="newCapacity"
            type="number"
            min={1}
            value={newCapacity}
            onChange={(e) => setNewCapacity(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="justification" className="text-xs font-bold uppercase tracking-wider">
            Justification
          </Label>
          <Textarea
            id="justification"
            placeholder="e.g. Switching from 48-pack to 24-pack carton format"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={2}
          />
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Packs After Repack</span>
            <span className="font-mono font-bold text-primary">
              {Math.min(currentPacks, newCapacity)} / {newCapacity}
            </span>
          </div>
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || !isDirty || newCapacity < 1}
        >
          {mutation.isPending ? "Repacking…" : "Repack Carton"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}