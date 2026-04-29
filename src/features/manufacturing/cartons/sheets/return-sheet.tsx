import { useState } from "react";
import { RotateCcw } from "lucide-react";
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
import { useProcessReturn } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReturnSheet({ open, onOpenChange }: Props) {
  const [dispatchOrderId, setDispatchOrderId] = useState("");
  const [cartonId, setCartonId] = useState("");
  const [packsReturned, setPacksReturned] = useState(1);
  const [condition, setCondition] = useState<"GOOD" | "DAMAGED">("GOOD");
  const [destinationCartonId, setDestinationCartonId] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useProcessReturn();
  const isDirty = dispatchOrderId !== "" || cartonId !== "" || packsReturned !== 1 || notes !== "";

  const handleSubmit = () => {
    mutation.mutate(
      {
        dispatchOrderId,
        lines: [
          {
            cartonId,
            packsReturned,
            condition,
            ...(destinationCartonId ? { destinationCartonId } : {}),
          },
        ],
        notes,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDispatchOrderId("");
          setCartonId("");
          setPacksReturned(1);
          setCondition("GOOD");
          setDestinationCartonId("");
          setNotes("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Process Return"
      description="Record returned carton(s) from a dispatch"
      icon={RotateCcw}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={isDirty}
    >
      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Label htmlFor="dispatchOrderId" className="text-xs font-bold uppercase tracking-wider">
            Dispatch Order ID *
          </Label>
          <Input
            id="dispatchOrderId"
            placeholder="e.g. INV-2024-0123"
            value={dispatchOrderId}
            onChange={(e) => setDispatchOrderId(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cartonId" className="text-xs font-bold uppercase tracking-wider">
            Carton ID *
          </Label>
          <Input
            id="cartonId"
            placeholder="Enter carton ID being returned"
            value={cartonId}
            onChange={(e) => setCartonId(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="packsReturned" className="text-xs font-bold uppercase tracking-wider">
              Packs Returned
            </Label>
            <Input
              id="packsReturned"
              type="number"
              min={1}
              value={packsReturned}
              onChange={(e) => setPacksReturned(Math.max(1, parseInt(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider">Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as "GOOD" | "DAMAGED")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOD">Good — Restock</SelectItem>
                <SelectItem value="DAMAGED">Damaged — Separate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="destinationCartonId" className="text-xs font-bold uppercase tracking-wider">
            Destination Carton (optional)
          </Label>
          <Input
            id="destinationCartonId"
            placeholder="Carton ID to receive returned packs"
            value={destinationCartonId}
            onChange={(e) => setDestinationCartonId(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Leave blank to add packs back to the original carton.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-wider">
            Notes
          </Label>
          <Textarea
            id="notes"
            placeholder="Return reason, delivery person, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide"
          onClick={handleSubmit}
          disabled={mutation.isPending || !dispatchOrderId.trim() || !cartonId.trim()}
        >
          {mutation.isPending ? "Processing…" : "Process Return"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}