import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBulkAdjust } from "../hooks/use-carton-mutations";
import { BULK_ADJUST_STRATEGIES } from "@/lib/cartons/carton.types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonIds: string[];
};

export function BulkAdjustSheet({ open, onOpenChange, cartonIds }: Props) {
  const [delta, setDelta] = useState(0);
  const [strategy, setStrategy] = useState<string>("CAP");
  const mutation = useBulkAdjust();

  const handleSubmit = () => {
    mutation.mutate(
      {
        cartonIds,
        delta,
        strategy: strategy as "SKIP" | "CAP",
        reason: "Bulk adjustment",
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDelta(0);
          setStrategy("CAP");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Bulk Adjust"
      description={`Adjust ${cartonIds.length} carton${cartonIds.length > 1 ? "s" : ""}`}
      icon={ArrowRightLeft}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={delta !== 0}
    >
      <div className="space-y-6 py-4">
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            {cartonIds.length} carton{cartonIds.length > 1 ? "s" : ""} selected.
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            Use positive delta to add packs, negative to remove.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="delta" className="text-xs font-bold uppercase tracking-wider">
            Delta (packs per carton)
          </Label>
          <Input
            id="delta"
            type="number"
            value={delta}
            onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider">
            Overflow Strategy
          </Label>
          <div className="space-y-2">
            {BULK_ADJUST_STRATEGIES.map((s) => (
              <label
                key={s}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${strategy === s ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
              >
                <input
                  type="radio"
                  name="strategy"
                  value={s}
                  checked={strategy === s}
                  onChange={() => setStrategy(s)}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-bold">{s === "SKIP" ? "Skip Overflow" : "Cap at Capacity"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s === "SKIP"
                      ? "Skip cartons where delta would exceed capacity"
                      : "Adjust to max capacity if delta would exceed it"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || delta === 0}
        >
          {mutation.isPending ? "Adjusting…" : `Apply ${delta > 0 ? "+" : ""}${delta} to ${cartonIds.length} Carton${cartonIds.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}