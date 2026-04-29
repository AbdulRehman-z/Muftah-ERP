import { useState } from "react";
import { Plus } from "lucide-react";
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
      <div className="space-y-6 py-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Cartons will be created with the capacity defined in the batch recipe.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="count" className="text-xs font-bold uppercase tracking-wider">
            Number of Cartons
          </Label>
          <Input
            id="count"
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zone" className="text-xs font-bold uppercase tracking-wider">
            Zone (optional)
          </Label>
          <Input
            id="zone"
            placeholder="e.g. A-12"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Warehouse zone for new cartons.</p>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Creating</span>
            <span className="font-mono font-bold text-primary">
              {count} carton{count > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || count < 1}
        >
          {mutation.isPending ? "Creating…" : `Add ${count} Carton${count > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}