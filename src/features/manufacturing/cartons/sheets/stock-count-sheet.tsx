import { useState } from "react";
import { ClipboardList } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateStockCount } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId?: string;
};

export function StockCountSheet({ open, onOpenChange, batchId }: Props) {
  const [sku, setSku] = useState("");
  const [notes, setNotes] = useState("");
  const mutation = useCreateStockCount();

  const isDirty = sku !== "" || notes !== "";

  const handleSubmit = () => {
    mutation.mutate(
      {
        batchId,
        sku: sku || undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSku("");
          setNotes("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Start Stock Count"
      description="Create a new physical inventory count session"
      icon={ClipboardList}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="space-y-6 py-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            A stock count session will create count lines for all cartons matching the filters below.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Each carton will need a physical count entered before the session can be submitted for approval.
          </p>
        </div>

        {batchId && (
          <div className="space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Batch ID
            </Label>
            <p className="text-sm font-mono">{batchId}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="sku" className="text-xs font-bold uppercase tracking-wider">
            SKU Filter (optional)
          </Label>
          <Input
            id="sku"
            placeholder="Leave blank to count all SKUs"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Only count cartons matching this SKU.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="e.g. Monthly inventory check — March 2024"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Creating…" : "Start Stock Count"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}