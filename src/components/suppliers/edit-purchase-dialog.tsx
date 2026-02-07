import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { updatePurchaseRecordFn } from "@/server-functions/suppliers/update-purchase-record-fn";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    purchase: {
        id: string;
        quantity: string;
        cost: string;
        notes?: string | null;
        transactionId?: string | null;
        invoiceNumber?: string | null;
        paymentMethod?: string | null;
        materialType: string;
        chemical?: {
            id: string;
            name: string;
            unit: string;
            minimumStockLevel: string | null;
        } | null;
        packagingMaterial?: {
            id: string;
            name: string;
            type: string;
            capacity: string | null;
            capacityUnit: string | null;
            minimumStockLevel: number | null
        } | null;
    } | null;
};

export const EditPurchaseDialog = ({ open, onOpenChange, purchase }: Props) => {
    const queryClient = useQueryClient();

    const mutate = useMutation({
        mutationFn: updatePurchaseRecordFn,
        onSuccess: () => {
            toast.success("Purchase record updated successfully");
            queryClient.invalidateQueries({ queryKey: ["supplier"] });
            queryClient.invalidateQueries({ queryKey: ["inventory"] });
            onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || "Failed to update purchase record"),
    });

    const form = useForm({
        defaultValues: {
            quantity: purchase?.quantity || "",
            cost: purchase?.cost || "",
            notes: purchase?.notes || "",
            transactionId: purchase?.transactionId || "",
            invoiceNumber: purchase?.invoiceNumber || "",
            materialName: "",
            capacity: "",
            capacityUnit: "",
            minStock: "",
        },
        onSubmit: async ({ value }) => {
            if (!purchase) return;
            await mutate.mutateAsync({
                data: {
                    id: purchase.id,
                    quantity: value.quantity,
                    cost: value.cost,
                    notes: value.notes,
                    transactionId: value.transactionId,
                    invoiceNumber: value.invoiceNumber,
                    materialName: value.materialName,
                    capacity: value.capacity,
                    capacityUnit: value.capacityUnit,
                    minStock: value.minStock,
                }
            });
        },
    });

    // Reset form when purchase changes
    useEffect(() => {
        if (purchase) {
            form.setFieldValue("quantity", purchase.quantity);
            form.setFieldValue("cost", purchase.cost);
            form.setFieldValue("notes", purchase.notes || "");
            form.setFieldValue("transactionId", purchase.transactionId || "");
            form.setFieldValue("invoiceNumber", purchase.invoiceNumber || "");

            if (purchase.materialType === "packaging" && purchase.packagingMaterial) {
                form.setFieldValue("materialName", purchase.packagingMaterial.name);
                form.setFieldValue("capacity", purchase.packagingMaterial.capacity || "");
                form.setFieldValue("capacityUnit", purchase.packagingMaterial.capacityUnit || "");
                form.setFieldValue("minStock", purchase.packagingMaterial.minimumStockLevel?.toString() || "0");
            } else if (purchase.materialType === "chemical" && purchase.chemical) {
                form.setFieldValue("materialName", purchase.chemical.name);
                form.setFieldValue("minStock", purchase.chemical.minimumStockLevel || "0");
            }
        }
    }, [purchase, form]);

    if (!purchase) return null;

    const itemName = purchase.chemical?.name || purchase.packagingMaterial?.name || "Unknown Item";
    const paymentMethod = purchase.paymentMethod;
    const isChemical = purchase.materialType === "chemical";
    const isPackaging = purchase.materialType === "packaging";
    const pkgType = purchase.packagingMaterial?.type; // "primary" or "master"

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Edit Purchase Record"
            description={`Editing purchase for ${itemName}`}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-4"
            >
                {/* --- CHEMICAL FIELDS --- */}
                {isChemical && (
                    <>
                        <form.Field name="invoiceNumber">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Name / Invoice Number</FieldLabel>
                                    <Input
                                        value={field.state.value || ""}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="e.g. INV-123 or Name of record"
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        {paymentMethod !== "cash" && paymentMethod !== "pay_later" && (
                            <form.Field name="transactionId">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>{paymentMethod === "cheque" ? "Cheque Number" : "Transaction ID"}</FieldLabel>
                                        <Input
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder={paymentMethod === "cheque" ? "e.g. 123456" : "e.g. Bank Tx ID"}
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        )}
                    </>
                )}

                {/* --- PACKAGING FIELDS --- */}
                {isPackaging && (
                    <>
                        <form.Field name="materialName">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Material Name</FieldLabel>
                                    <Input
                                        value={field.state.value || ""}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="Enter material name"
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        <div className="grid grid-cols-2 gap-4">
                            <form.Field name="capacity">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>{pkgType === "master" ? "Units Per Carton" : "Fill capacity"}</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="e.g. 24 or 500"
                                        />
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>

                            <form.Field name="capacityUnit">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>{pkgType === "master" ? "Inner Item Content" : "Unit"}</FieldLabel>
                                        {pkgType === "master" ? (
                                            <Input
                                                value={field.state.value || ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="e.g. 500ml Bottles"
                                            />
                                        ) : (
                                            <Select
                                                value={field.state.value || "ml"}
                                                onValueChange={(val) => field.handleChange(val)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Unit" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="ml">ml (Volume)</SelectItem>
                                                    <SelectItem value="L">L (Volume)</SelectItem>
                                                    <SelectItem value="g">g (Mass)</SelectItem>
                                                    <SelectItem value="kg">kg (Mass)</SelectItem>
                                                    <SelectItem value="pcs">Pieces</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        </div>

                        <form.Field name="minStock">
                            {(field) => (
                                <Field>
                                    <FieldLabel>{pkgType === "master" ? "Min Stock Alert" : "Min stock"}</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value || ""}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="e.g. 100"
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    </>
                )}

                <form.Field name="notes">
                    {(field) => (
                        <Field>
                            <FieldLabel>Notes</FieldLabel>
                            <Textarea
                                value={field.state.value || ""}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="Add notes here..."
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={mutate.isPending}>
                        {mutate.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </ResponsiveDialog>
    );
};
