
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Loader2, Box, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useAddPackagingMaterial } from "@/hooks/inventory/use-add-packaging-material";
import { addPackagingMaterialSchema } from "@/lib/validators/validators";
import { useState } from "react";
import { cn } from "@/lib/utils";

import { Badge } from "../ui/badge";

type Props = {
    onSuccess: () => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
    preselectedWarehouse: string | undefined;
};

export const AddPackagingMaterialForm = ({ onSuccess, warehouses, preselectedWarehouse }: Props) => {
    const mutate = useAddPackagingMaterial();
    const [activeType, setActiveType] = useState<"primary" | "master">("primary");

    const form = useForm({
        defaultValues: {
            name: "",
            warehouseId: preselectedWarehouse || "",
            quantity: "",
            costPerUnit: "",
            minimumStockLevel: 0,
            type: "primary" as "primary" | "master",
            capacity: "",
            capacityUnit: "",
        },
        validators: {
            onSubmit: addPackagingMaterialSchema,
        },
        onSubmit: async ({ value }) => {
            await mutate.mutateAsync({
                data: {
                    ...value
                }
            });
            onSuccess();
        },
    });

    return (
        <div className="space-y-4 max-w-md">
            {/* Type Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg border">
                <button
                    type="button"
                    onClick={() => {
                        setActiveType("primary");
                        form.setFieldValue("type", "primary");
                        form.setFieldValue("capacityUnit", "ml");
                    }}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                        activeType === "primary"
                            ? "bg-background shadow-sm text-primary ring-1 ring-black/5"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                >
                    <Package className={cn("size-4", activeType === "primary" ? "text-primary" : "text-muted-foreground")} />
                    Primary (Unit)
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setActiveType("master");
                        form.setFieldValue("type", "master");
                        form.setFieldValue("capacityUnit", "units");
                    }}
                    className={cn(
                        "flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                        activeType === "master"
                            ? "bg-background shadow-sm text-primary ring-1 ring-black/5"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                >
                    <Box className={cn("size-4", activeType === "master" ? "text-primary" : "text-muted-foreground")} />
                    Master (Carton)
                </button>
            </div>

            <form
                className="space-y-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <FieldGroup>
                    <form.Field name="name">
                        {(field) => (
                            <Field>
                                <FieldLabel>Material Name</FieldLabel>
                                <Input
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    placeholder={activeType === 'primary' ? "e.g. 500ml Clear Bottle" : "e.g. 24x 500ml Carton"}
                                />
                                <FieldDescription>The display name for this item in your inventory.</FieldDescription>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <div className="grid grid-cols-2 gap-4">
                        <form.Field name="capacity">
                            {(field) => (
                                <Field>
                                    <FieldLabel>
                                        {activeType === 'primary' ? "Fill Capacity" : "Units per Carton"}
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value || ""}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder={activeType === 'primary' ? "e.g. 500" : "e.g. 24"}
                                    />
                                    <FieldDescription>
                                        {activeType === 'primary' ? "Net content volume." : "Units inside one box."}
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
                                            placeholder="e.g. 500ml Bottles"
                                        />
                                    )}
                                    <FieldDescription>
                                        {activeType === 'primary' ? "Volume/Mass unit." : "What is inside the box?"}
                                    </FieldDescription>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <form.Field name="warehouseId">
                        {(field) => (
                            <Field>
                                <div className="flex items-center justify-between">
                                    <FieldLabel>Warehouse</FieldLabel>
                                    {preselectedWarehouse && (
                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">
                                            Current
                                        </Badge>
                                    )}
                                </div>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(val) => field.handleChange(val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((warehouse) => (
                                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                                <div className="flex items-center gap-2">
                                                    {warehouse.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldDescription>Storage location for this batch.</FieldDescription>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

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
                </FieldGroup>

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
