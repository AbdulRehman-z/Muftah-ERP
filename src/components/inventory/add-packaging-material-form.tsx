
import { useForm } from "@tanstack/react-form";
import { Loader2, Box, Package, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useAddPackagingMaterial } from "@/hooks/inventory/use-add-packaging-material";
import { addPackagingMaterialSchema } from "@/lib/validators/validators";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { Textarea } from "../ui/textarea";

type Props = {
    onSuccess: () => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
    preselectedWarehouse: string | undefined;
    preselectedSupplierId?: string;
};

export const AddPackagingMaterialForm = ({ onSuccess, warehouses, preselectedWarehouse, preselectedSupplierId }: Props) => {
    const mutate = useAddPackagingMaterial();
    const [activeType, setActiveType] = useState<"primary" | "master" | "sticker">("primary");

    const { data: suppliers } = useSuspenseQuery({
        queryKey: ["suppliers"],
        queryFn: getSuppliersFn,
    });

    // Filter warehouses: Must be factory_floor
    const availableWarehouses = useMemo(() => {
        return warehouses.filter(w => w.type === "factory_floor");
    }, [warehouses]);

    const form = useForm({
        defaultValues: {
            name: "",
            warehouseId: preselectedWarehouse || availableWarehouses[0]?.id || "",
            quantity: "",
            costPerUnit: "",
            minimumStockLevel: 0,
            type: "primary" as "primary" | "master" | "sticker" | "extra",
            capacity: "",
            capacityUnit: "",
            weightPerPack: "",
            pricePerKg: "",
            associatedStickerId: "",
            stickerCost: "",
            supplierId: preselectedSupplierId || "",
            notes: "",
            paymentMethod: "cash" as "cash" | "bank_transfer" | "cheque" | "pay_later",
            paymentStatus: "paid_full" as "paid_full" | "credit",
            amountPaid: "",
            transactionId: "",
            bankName: "",
            paidBy: "",
        },
        validators: {
            onSubmit: addPackagingMaterialSchema,
        },
        onSubmit: async ({ value }) => {
            await mutate.mutateAsync({
                data: value as any
            });
            onSuccess();
        },
    });

    const isPreselectedInvalid = preselectedWarehouse && !availableWarehouses.find(w => w.id === preselectedWarehouse);

    return (
        <div className="space-y-4 w-full">
            {/* Type Switcher */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg border">
                <Button
                    type="button"
                    size={"lg"}
                    onClick={() => {
                        setActiveType("primary");
                        form.setFieldValue("type", "primary");
                        form.setFieldValue("capacityUnit", "ml");
                    }}
                    variant={activeType === "primary" ? "default" : "outline"}
                >
                    <Package className={cn("size-3.5", activeType === "primary" ? "text-white" : "text-muted-foreground")} />
                    Packing (Bag)
                </Button>
                <Button
                    size={"lg"}
                    type="button"
                    onClick={() => {
                        setActiveType("master");
                        form.setFieldValue("type", "master");
                        form.setFieldValue("capacityUnit", "units");
                    }}
                    variant={activeType === "master" ? "default" : "outline"}
                >
                    <Box className={cn("size-3.5", activeType === "master" ? "text-white" : "text-muted-foreground")} />
                    Plastic (Bucket)
                </Button>
                <Button
                    size={"lg"}
                    type="button"
                    onClick={() => {
                        setActiveType("sticker");
                        form.setFieldValue("type", "sticker");
                        form.setFieldValue("capacityUnit", "pcs");
                    }}
                    variant={activeType === "sticker" ? "default" : "outline"}
                >
                    <Info className={cn("size-3.5", activeType === "sticker" ? "text-white" : "text-muted-foreground")} />
                    Sticker
                </Button>
            </div>

            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                {isPreselectedInvalid && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-center gap-2">
                        <Info className="size-4" />
                        Selected facility is not a Factory Floor. Please select a valid facility.
                    </div>
                )}

                <FieldGroup>
                    {availableWarehouses.length === 0 && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-red-600 text-xs flex items-center gap-2">
                            <Info className="size-4" />
                            No Factory Floor configured. Please create one first.
                        </div>
                    )}

                    <form.Field name="name">
                        {(field) => (
                            <Field>
                                <FieldLabel>Material Name</FieldLabel>
                                <Input
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder={activeType === 'primary' ? "e.g. 100g Pack" : activeType === 'master' ? "e.g. 10kg Bucket" : "e.g. 10kg Bucket Sticker"}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {!preselectedSupplierId && (
                        <form.Field name="supplierId">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Supplier</FieldLabel>
                                    <Select
                                        value={field.state.value}
                                        onValueChange={(value) => field.handleChange(value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers?.map((s) => (
                                                <SelectItem key={s.id} value={s.id}>
                                                    {s.supplierName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    )}

                    {activeType !== 'sticker' && (
                        <div className="grid grid-cols-2 gap-4">
                            <form.Field name="capacity">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>
                                            {activeType === 'primary' ? "Fill Capacity" : "Units per Bucket"}
                                        </FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder={activeType === 'primary' ? "e.g. 500" : "e.g. 24"}
                                        />
                                        <FieldDescription>
                                            {activeType === 'primary' ? "Net content volume." : "Units inside one bucket."}
                                        </FieldDescription>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>

                            <form.Field name="capacityUnit">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>
                                            {activeType === 'primary' ? "Unit" : "Inner Item Content"}
                                        </FieldLabel>
                                        {activeType === 'primary' ? (
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
                                        ) : (
                                            <Input
                                                value={field.state.value || ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="e.g. 1kg Bags"
                                            />
                                        )}
                                        <FieldDescription>
                                            {activeType === 'primary' ? "Volume/Mass unit." : "What is inside the bucket?"}
                                        </FieldDescription>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        </div>
                    )}

                    {activeType === 'primary' && (
                        <div className="grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
                            <form.Field name="weightPerPack">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Weight / Pack (g)</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="e.g. 6.5"
                                        />
                                        <FieldDescription>Weight of the empty bottle/wrapper.</FieldDescription>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                            <form.Field name="pricePerKg">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Material Price / Kg (PKR)</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value || ""}
                                            onChange={(e) => field.handleChange(e.target.value)}
                                            placeholder="e.g. 980"
                                        />
                                        <FieldDescription>Purchase price per kg of the material (e.g., wrapper/film cost).</FieldDescription>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        </div>
                    )}

                    <form.Subscribe
                        selector={(state) => [state.values.weightPerPack, state.values.pricePerKg, state.values.type]}
                        children={([weight, price, type]) => {
                            if (type !== 'primary') return null;
                            if (!weight || !price) return null;

                            const w = parseFloat(weight || "0");
                            const p = parseFloat(price || "0");

                            if (w > 0 && p > 0) {
                                const exactCost = (p * (w / 1000));
                                const roundedCost = Math.round(exactCost);

                                return (
                                    <div className="flex flex-col gap-3 bg-primary/5 p-4 rounded-xl border border-primary/10 shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">The Golden Formula</div>
                                                <div className="text-sm font-medium text-primary">
                                                    {w}g × {p} PKR/kg = <span className="text-lg font-bold">PKR {exactCost.toFixed(2)}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 text-xs font-semibold px-4 hover:bg-primary hover:text-primary-foreground transition-all"
                                                    onClick={() => form.setFieldValue("costPerUnit", exactCost.toFixed(4))}
                                                >
                                                    Apply Exact
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    className="h-8 text-xs font-semibold px-4 shadow-md transition-all active:scale-95"
                                                    onClick={() => form.setFieldValue("costPerUnit", roundedCost.toString())}
                                                >
                                                    Apply Rounded ({roundedCost})
                                                </Button>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic border-t pt-2 border-primary/5">
                                            Matches the spreadsheet logic: {w}g is {(w / 1000).toFixed(3)}kg. Total = {(w / 1000).toFixed(3)} × {p} = {exactCost.toFixed(2)}.
                                        </p>
                                    </div>
                                )
                            }
                            return null;
                        }}
                    />



                    <div className="grid grid-cols-2 gap-4">
                        <form.Field name="quantity">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Initial Stock</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="0"
                                    />
                                    <FieldDescription>Current physical count.</FieldDescription>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        <form.Field name="costPerUnit">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Cost Per Unit (PKR)</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="0.00"
                                        step="0.01"
                                    />
                                    <FieldDescription>Purchase price per item.</FieldDescription>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <form.Field name="minimumStockLevel">
                        {(field) => (
                            <Field>
                                <FieldLabel>Min. Stock Alert</FieldLabel>
                                <Input
                                    type="number"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                    placeholder="100"
                                    step="1"
                                />
                                <FieldDescription>Notify when stock falls below this level.</FieldDescription>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="paymentMethod">
                        {(field) => (
                            <Field>
                                <FieldLabel>Payment Method</FieldLabel>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(val: any) => {
                                        field.handleChange(val)
                                        if (val === "pay_later") {
                                            form.setFieldValue("paymentStatus", "credit");
                                            form.setFieldValue("amountPaid", "");
                                        }
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">Cash</SelectItem>
                                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="cheque">Cheque</SelectItem>
                                        <SelectItem value="pay_later">Pay Later</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Subscribe
                        selector={(state) => state.values.paymentMethod}
                        children={(method) => (
                            <form.Field name="paymentStatus">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Payment Status</FieldLabel>
                                        <Select
                                            value={field.state.value}
                                            onValueChange={(val: any) => field.handleChange(val)}
                                            disabled={method === "pay_later"}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="paid_full">Paid Full</SelectItem>
                                                <SelectItem value="credit">Credit / Partial</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FieldError errors={field.state.meta.errors} />
                                    </Field>
                                )}
                            </form.Field>
                        )}
                    />

                    <form.Subscribe
                        selector={(state) => [state.values.paymentStatus, state.values.costPerUnit, state.values.quantity, state.values.amountPaid, state.values.paymentMethod]}
                        children={([status, cost, qty, paid, method]) => {
                            if (method === "pay_later") return null;
                            if (status !== "credit") return null;

                            const total = (parseFloat(cost || "0") || 0) * (parseFloat(qty || "0") || 0);
                            const paidAmount = parseFloat(paid || "0") || 0;
                            const remaining = total - paidAmount;

                            return (
                                <div className="col-span-2 space-y-2">
                                    <form.Field name="amountPaid">
                                        {(field) => (
                                            <Field>
                                                <FieldLabel>Amount Paid <span className="text-red-500">*</span></FieldLabel>
                                                <Input
                                                    type="number"
                                                    placeholder="0.00"
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                <FieldDescription>
                                                    Runnning Total: PKR {total.toLocaleString()}
                                                </FieldDescription>
                                                <FieldError errors={field.state.meta.errors} />
                                            </Field>
                                        )}
                                    </form.Field>

                                    <div className="text-sm font-medium border rounded-md p-3 bg-muted/30 flex justify-between items-center">
                                        <span className="text-muted-foreground">Remaining Balance:</span>
                                        <span className={remaining > 0 ? "text-red-500" : "text-green-600"}>
                                            PKR {remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            );
                        }}
                    />

                    <form.Subscribe
                        selector={(state) => state.values.paymentMethod}
                        children={(paymentMethod) => {
                            if (paymentMethod !== "bank_transfer" && paymentMethod !== "cheque") return null;
                            return (
                                <div className="col-span-2 space-y-4 pt-2">
                                    <form.Field name="bankName">
                                        {(field) => (
                                            <Field>
                                                <FieldLabel>Bank Name</FieldLabel>
                                                <Input
                                                    placeholder="e.g. HBL, Meezan, etc."
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                <FieldError errors={field.state.meta.errors} />
                                            </Field>
                                        )}
                                    </form.Field>

                                    <form.Field name="transactionId">
                                        {(field) => (
                                            <Field>
                                                <FieldLabel>{paymentMethod === "cheque" ? "Cheque Number" : "Transaction ID"}</FieldLabel>
                                                <Input
                                                    placeholder={paymentMethod === "cheque" ? "Enter cheque number" : "Enter transaction ID"}
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                                <FieldError errors={field.state.meta.errors} />
                                            </Field>
                                        )}
                                    </form.Field>
                                </div>
                            );
                        }}
                    />

                    <form.Subscribe
                        selector={(state) => state.values.paymentMethod}
                        children={(method) => {
                            if (method === "pay_later") return null;
                            return (
                                <form.Field name="paidBy">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Paid By</FieldLabel>
                                            <Input
                                                placeholder="Person who made the payment"
                                                value={field.state.value || ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                            <FieldError errors={field.state.meta.errors} />
                                        </Field>
                                    )}
                                </form.Field>
                            );
                        }}
                    />
                </FieldGroup>

                <form.Field name="notes">
                    {(field) => (
                        <Field>
                            <FieldLabel>Notes (Optional)</FieldLabel>
                            <Textarea
                                placeholder="Any additional details..."
                                value={field.state.value || ""}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={mutate.status === "pending"} className="w-full sm:w-auto">
                        {mutate.status === "pending" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Material
                    </Button>
                </div>
            </form>
        </div>
    );
};
