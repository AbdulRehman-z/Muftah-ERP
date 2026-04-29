import { useState } from "react";
import { Merge } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMergeCartons } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchId: string;
  sourceCartonId: string;
  sourceSku: string | null;
  sourcePacks: number;
};

export function MergeSheet({ open, onOpenChange, batchId, sourceCartonId, sourceSku, sourcePacks }: Props) {
  const [destinationCartonId, setDestinationCartonId] = useState("");
  const mutation = useMergeCartons(batchId);

  const handleSubmit = () => {
    mutation.mutate(
      {
        sourceCartonIds: [sourceCartonId],
        destinationCartonId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDestinationCartonId("");
        },
        },
);
  };

  return (
    <ResponsiveSheet
      title="Merge Cartons"
      description="Move all packs from this carton into another"
      icon={Merge}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={destinationCartonId !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Source Carton</span>
            <span className="font-mono font-bold">{sourceSku || sourceCartonId.slice(0, 8)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Packs to Merge</span>
            <span className="font-mono font-bold text-amber-600">{sourcePacks}</span>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-xs font-medium text-red-800 dark:text-red-200">
            The source carton will be retired after merge.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetCartonId" className="text-xs font-bold uppercase tracking-wider">
            Target Carton ID
          </Label>
          <Input
            id="destinationCartonId"
            placeholder="Enter target carton ID"
            value={destinationCartonId}
            onChange={(e) => setDestinationCartonId(e.target.value)}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide bg-amber-600 hover:bg-amber-700"
          onClick={handleSubmit}
          disabled={mutation.isPending || !destinationCartonId.trim()}
        >
          {mutation.isPending ? "Merging…" : "Merge Cartons"}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}