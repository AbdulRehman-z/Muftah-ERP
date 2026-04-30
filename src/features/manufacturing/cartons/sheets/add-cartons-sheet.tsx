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
      description="Create new empty cartons for this batch"
      icon={Plus}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="flex flex-col gap-6 py-4">
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Cartons will be created with the standard capacity defined in the batch recipe.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="count" className="text-sm font-medium text-foreground">
            Number of cartons
          </Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-10"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="zone" className="text-sm font-medium text-foreground">
            Zone <span className="text-muted-foreground text-xs font-normal">(optional)</span>
          </Label>
          <Input
            id="zone"
            placeholder="e.g. A-12"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="h-10 font-mono"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground">Initial warehouse storage area.</p>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Creating</span>
            <span className="font-semibold tabular-nums text-foreground">
              {count} carton{count > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Button
          className="w-full h-10"
          onClick={handleSubmit}
          disabled={mutation.isPending || count < 1}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating…
            </>
          ) : (
            `Add ${count} carton${count > 1 ? "s" : ""}`
          )}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}