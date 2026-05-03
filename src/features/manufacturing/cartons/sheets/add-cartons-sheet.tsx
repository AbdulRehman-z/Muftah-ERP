import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAddCartons } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
};

export function AddCartonsSheet({ open, onOpenChange, batchId }: Props) {
  const [count, setCount] = useState(1);
  const [zone, setZone] = useState("");
  const mutation = useAddCartons();

  const isDirty = count !== 1 || zone !== "";

  const handleSubmit = () => {
    mutation.mutate(
      {
        productionRunId: batchId,
        count,
        zone: zone || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCount(1);
          setZone("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Add Cartons"
      description="Create empty tracking units"
      icon={Plus}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="flex flex-col gap-8 py-6">
        {/* Info Card */}
        <div className="rounded-lg border border-border bg-muted/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Batch Operations</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Generating new cartons will create individual tracking IDs for this production run. Cartons inherit the default capacity of the product recipe.
          </p>
        </div>

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor="count" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quantity to Generate
            </Label>
            <div className="relative">
              <Input
                id="count"
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 0))}
                className="h-12 text-lg font-bold tabular-nums pl-4 bg-muted/10 focus:bg-background transition-colors"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
                Units
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">Max 500 cartons per operation</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Storage Zone
            </Label>
            <Input
              id="zone"
              placeholder="e.g. ZONE-A"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="h-12 font-mono uppercase tracking-widest text-sm bg-muted/10 focus:bg-background transition-colors"
              autoComplete="off"
            />
            <p className="text-[11px] text-muted-foreground">Optional: Initial physical location in warehouse</p>
          </div>
        </div>

        <div className="pt-4 mt-auto">
          <Button
            size="lg"
            className="w-full h-12 font-bold uppercase tracking-widest text-xs"
            onClick={handleSubmit}
            disabled={mutation.isPending || count < 1}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Generating...
              </>
            ) : (
              `Create ${count} Carton${count !== 1 ? "s" : ""}`
            )}
          </Button>
        </div>
      </div>
    </ResponsiveSheet>
  );
}