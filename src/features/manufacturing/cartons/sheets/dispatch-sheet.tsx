import { useState } from "react";
import { Truck } from "lucide-react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDispatch } from "../hooks/use-carton-mutations";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartonIds: string[];
  userId: string;
};

export function DispatchSheet({ open, onOpenChange, cartonIds, userId }: Props) {
  const [orderId, setOrderId] = useState("");
  const mutation = useDispatch();

  const handleSubmit = () => {
    mutation.mutate(
      {
        lines: cartonIds.map((id) => ({ cartonId: id, packsToDispatch: 0 })),
        dispatchedBy: userId,
        orderId: orderId || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setOrderId("");
        },
      },
    );
  };

  return (
    <ResponsiveSheet
      title="Dispatch Cartons"
      description={`Mark ${cartonIds.length} carton${cartonIds.length > 1 ? "s" : ""} as dispatched`}
      icon={Truck}
      open={open}
      onOpenChange={onOpenChange}
      isDirty={orderId !== ""}
    >
      <div className="space-y-6 py-4">
        <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
            {cartonIds.length} carton{cartonIds.length > 1 ? "s" : ""} will be dispatched.
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Only COMPLETE or SEALED cartons can be dispatched.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderId" className="text-xs font-bold uppercase tracking-wider">
            Dispatch Order / Invoice ID (optional)
          </Label>
          <Input
            id="orderId"
            placeholder="e.g. INV-2024-0123"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          />
        </div>

        <Button
          className="w-full font-bold uppercase tracking-wide bg-purple-600 hover:bg-purple-700"
          onClick={handleSubmit}
          disabled={mutation.isPending || cartonIds.length === 0}
        >
          {mutation.isPending ? "Dispatching…" : `Dispatch ${cartonIds.length} Carton${cartonIds.length > 1 ? "s" : ""}`}
        </Button>
      </div>
    </ResponsiveSheet>
  );
}