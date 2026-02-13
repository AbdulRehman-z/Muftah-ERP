import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { useAdjustStock } from "@/hooks/stock/use-adjust-stock";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { AlertTriangle, Plus, Minus } from "lucide-react";

type AdjustStockDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    materialType: "chemical" | "packaging";
    materialId: string;
    materialName: string;
    currentStock: number;
    unit: string;
};

export const AdjustStockDialog = ({
    open,
    onOpenChange,
    materialType,
    materialId,
    materialName,
    currentStock,
    unit,
}: AdjustStockDialogProps) => {
    const [mode, setMode] = useState<"add" | "remove">("add");
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const adjustStock = useAdjustStock();

    const handleSubmit = () => {
        const qty = parseFloat(amount);
        if (isNaN(qty) || qty <= 0) {
            toast.error("Please enter a valid positive quantity");
            return;
        }
        if (!reason.trim()) {
            toast.error("A reason is required for manual adjustments");
            return;
        }

        const adjustment = mode === "add" ? qty : -qty;

        if (mode === "remove" && qty > currentStock) {
            toast.error(`Cannot remove ${qty} ${unit}. Only ${currentStock.toFixed(2)} ${unit} available.`);
            return;
        }

        adjustStock.mutate({
            data: {
                materialType,
                materialId,
                adjustment,
                reason: reason.trim(),
            }
        }, {
            onSuccess: (result) => {
                toast.success(
                    `Stock adjusted: ${materialName} ${mode === "add" ? "+" : "-"}${qty} ${unit}. New stock: ${result.newQty.toFixed(2)} ${unit}`
                );
                setAmount("");
                setReason("");
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-amber-500" />
                        Manual Stock Adjustment
                    </DialogTitle>
                    <DialogDescription>
                        Adjust stock for <strong>{materialName}</strong> on the factory floor.
                        This is for disaster recovery (machine breakdown, spillage, etc.).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Current Stock */}
                    <div className="bg-muted/30 p-3 rounded-lg border flex justify-between items-center">
                        <span className="text-sm text-muted-foreground font-medium">Current Stock</span>
                        <span className="font-bold text-lg tabular-nums">
                            {currentStock.toFixed(2)} <span className="text-xs text-muted-foreground">{unit}</span>
                        </span>
                    </div>

                    {/* Mode Toggle */}
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={mode === "add" ? "default" : "outline"}
                            className={`flex-1 ${mode === "add" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                            onClick={() => setMode("add")}
                        >
                            <Plus className="size-4 mr-1" />
                            Add Back to Stock
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "remove" ? "default" : "outline"}
                            className={`flex-1 ${mode === "remove" ? "bg-red-600 hover:bg-red-700" : ""}`}
                            onClick={() => setMode("remove")}
                        >
                            <Minus className="size-4 mr-1" />
                            Remove from Stock
                        </Button>
                    </div>

                    {/* Amount */}
                    <div className="space-y-2">
                        <Label>Quantity ({unit})</Label>
                        <Input
                            type="number"
                            placeholder={`Enter ${unit} to ${mode}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            step="any"
                            min="0"
                            className="text-lg h-11 font-mono"
                        />
                        {amount && (
                            <p className="text-xs text-muted-foreground">
                                New stock will be:{" "}
                                <strong className={mode === "add" ? "text-emerald-600" : "text-red-600"}>
                                    {(currentStock + (mode === "add" ? parseFloat(amount) || 0 : -(parseFloat(amount) || 0))).toFixed(2)} {unit}
                                </strong>
                            </p>
                        )}
                    </div>

                    {/* Reason */}
                    <div className="space-y-2">
                        <Label>Reason <Badge variant="destructive" className="ml-1 text-[9px]">Required</Badge></Label>
                        <Textarea
                            placeholder="e.g., Machine breakdown during run #B-2024-001, salvaged unused chemicals back to stock"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="text-xs text-muted-foreground p-3 bg-amber-50/50 border border-amber-100 rounded-md">
                        ⚠️ All manual adjustments are <strong>permanently logged</strong> in the audit trail with your name and reason.
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!amount || !reason.trim() || adjustStock.isPending}
                        className={mode === "add" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                    >
                        {adjustStock.isPending ? "Adjusting..." : `${mode === "add" ? "Add" : "Remove"} Stock`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
