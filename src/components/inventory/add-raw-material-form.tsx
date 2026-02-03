import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { addChemicalSchema } from "@/lib/validators/validators";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useAddChemical } from "@/hooks/inventory/use-add-raw-material";
import { Badge } from "../ui/badge";

type Props = {
    onSuccess: () => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
    preselectedWarehouse: string | undefined;
};

export const AddRawMaterialForm = ({ onSuccess, warehouses, preselectedWarehouse }: Props) => {
    const mutate = useAddChemical();

    const form = useForm({
        defaultValues: {
            name: "",
            warehouseId: preselectedWarehouse || "",
            quantity: "",
            costPerUnit: "",
            unit: "kg" as "kg" | "liters",
            minimumStockLevel: "0",
        },
        validators: {
            onSubmit: addChemicalSchema,
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
        <form
            className="space-y-4 max-w-md"
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
                            <FieldLabel>Chemical Name</FieldLabel>
                            <Input
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                                placeholder="e.g. Caustic Soda"
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="warehouseId">
                    {(field) => (
                        <Field>
                            <div className="flex items-center justify-between">
                                <FieldLabel>Warehouse</FieldLabel>
                                {preselectedWarehouse && (
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium bg-primary/10 text-primary border-primary/20">
                                        Current Warehouse
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
                                            {warehouse.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <div className="grid grid-cols-2 gap-4">
                    <form.Field name="quantity">
                        {(field) => (
                            <Field>
                                <FieldLabel>Quantity</FieldLabel>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    min={0}
                                    step={0.01}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="unit">
                        {(field) => (
                            <Field>
                                <FieldLabel>Unit</FieldLabel>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(val) => field.handleChange(val as "kg" | "liters")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                        <SelectItem value="liters">Liters (l)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="costPerUnit">
                        {(field) => (
                            <Field>
                                <FieldLabel>Cost Per Unit</FieldLabel>
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    min={0}
                                    step={0.01}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    <form.Field name="minimumStockLevel">
                        {(field) => (
                            <Field>
                                <FieldLabel>Min Stock Level</FieldLabel>
                                <Input
                                    type="number"
                                    placeholder="0"
                                    value={field.state.value}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    min={0}
                                />
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>
                </div>

                <Button
                    disabled={form.state.isSubmitting}
                    type="submit"
                    className="w-full"
                >
                    {form.state.isSubmitting ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                        "Add Chemical"
                    )}
                </Button>
            </FieldGroup>
        </form>
    );
};
