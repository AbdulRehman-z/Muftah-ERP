import {
    Calendar,
    Clock,
    Warehouse,
    Info,
    History,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

type DetailsProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "chemical" | "packaging" | "finished";
    item: any;
};

export const InventoryDetailsDialog = ({ open, onOpenChange, type, item }: DetailsProps) => {
    if (!item) return null;

    const material = type === "chemical" ? item.chemical : type === "packaging" ? item.packagingMaterial : item.recipe;
    const isFinished = type === "finished";

    const createdAt = new Date(item.createdAt);
    const updatedAt = new Date(item.updatedAt);

    const currentQty = isFinished ? (item.quantityCartons * (item.recipe.containersPerCarton || 0)) + item.quantityContainers : parseFloat(item.quantity);
    const minLevel = isFinished ? 0 : parseFloat(material.minimumStockLevel?.toString() || "0");
    const isLow = !isFinished && currentQty < minLevel;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden border-none shadow-md">
                <div className="bg-primary/5 p-6 border-b border-primary/10">
                    <DialogHeader className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 uppercase text-[10px] font-bold tracking-widest">
                                {type.replace("_", " ")} Details
                            </Badge>
                            {isLow && (
                                <Badge variant="destructive" className="animate-pulse text-[10px] font-bold uppercase tracking-widest">
                                    Low Stock Warning
                                </Badge>
                            )}
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight text-foreground flex items-center gap-3">
                            {isFinished ? material.product.name : material.name}
                            {isFinished && (
                                <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    {material.name}
                                </span>
                            )}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground flex items-center gap-4 pt-1">
                            <span className="flex items-center gap-1.5">
                                <Warehouse className="size-3.5" />
                                <span className="font-semibold text-foreground">{item.warehouse.name}</span>
                            </span>
                            <span className="size-1 rounded-full bg-muted-foreground/30" />
                            <span className="flex items-center gap-1.5">
                                <Calendar className="size-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Inventory Audit Record</span>
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="bg-background shadow-xs min-h-[110px] flex flex-col">
                                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Stock</p>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-3xl font-black text-foreground leading-none tracking-tighter">
                                            {isFinished ? item.quantityCartons : currentQty.toFixed(0)}
                                        </span>
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 uppercase w-fit">
                                            {isFinished ? "Cartons" : material.unit || (type === "packaging" ? "pcs" : "kg")}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-background shadow-xs min-h-[110px] flex flex-col">
                                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Value / Unit</p>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-3xl font-black text-foreground leading-none tracking-tighter">
                                                {isFinished ? parseFloat(material.estimatedCostPerContainer).toFixed(0) : parseFloat(material.costPerUnit).toFixed(0)}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-md border border-primary/20 uppercase tracking-widest w-fit">PKR</span>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-background shadow-xs min-h-[110px] flex flex-col">
                                <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Threshold</p>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-3xl font-black text-foreground leading-none tracking-tighter">
                                            {isFinished ? "N/A" : minLevel.toFixed(0)}
                                        </span>
                                        {!isFinished && (
                                            <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md border border-border uppercase w-fit">
                                                {material.unit || (type === "packaging" ? "pcs" : "kg")}
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Inventory Timeline */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                <History className="size-3.5" />
                                <span>Lifecycle Traceability</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border border-dashed bg-muted/20 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="size-3.5" />
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">Initial Registration</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-base text-foreground">{format(createdAt, "PPP")}</p>
                                        <p className="text-[11px] font-mono text-muted-foreground/60">{format(createdAt, "pp")}</p>
                                    </div>
                                </div>
                                <div className="p-5 rounded-2xl border border-dashed bg-muted/20 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Clock className="size-3.5" />
                                        <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">Last Modification</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-base text-foreground">{format(updatedAt, "PPP")}</p>
                                        <p className="text-[11px] font-mono text-muted-foreground/60">{format(updatedAt, "pp")}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Classification Info */}
                        <div className="space-y-4 pt-2">
                            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-widest">
                                <Info className="size-3.5" />
                                <span>Attribute Profile</span>
                            </div>
                            <div className="bg-muted/10 border rounded-2xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr className="border-b border-muted/20 last:border-0 hover:bg-muted/5 transition-colors">
                                            <td className="p-5 font-bold text-muted-foreground/80 bg-muted/20 w-1/3 text-xs uppercase tracking-widest">Classification</td>
                                            <td className="p-5 font-semibold text-foreground text-sm">
                                                {type === "chemical" ? "Chemical" : type === "packaging" ? "Packaging Material" : "Finished Manufactured Good"}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-muted/20 last:border-0 hover:bg-muted/5 transition-colors">
                                            <td className="p-5 font-bold text-muted-foreground/80 bg-muted/20 text-xs uppercase tracking-widest">Health Status</td>
                                            <td className="p-5">
                                                {isLow ? (
                                                    <span className="flex items-center gap-2 text-destructive font-black text-xs uppercase">
                                                        <AlertCircle className="size-4 animate-pulse" />
                                                        Critically Low Levels
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase">
                                                        <CheckCircle2 className="size-4" />
                                                        Inventory Healthy
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                        <tr className="border-b border-muted/20 last:border-0 hover:bg-muted/5 transition-colors">
                                            <td className="p-5 font-bold text-muted-foreground/80 bg-muted/20 text-xs uppercase tracking-widest">Locality</td>
                                            <td className="p-5">
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-background text-foreground border-border px-3 py-1 font-bold text-xs tracking-tight shadow-sm">
                                                        {item.warehouse.name}
                                                    </Badge>
                                                    {!item.warehouse.isActive && (
                                                        <span className="text-[10px] font-black text-destructive uppercase tracking-widest animate-pulse italic">(Inactive)</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-4 bg-muted/30 border-t flex justify-end">
                    <button
                        onClick={() => onOpenChange(false)}
                        className="px-6 py-2 bg-foreground text-background font-bold rounded-xl text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm"
                    >
                        Close Details
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
