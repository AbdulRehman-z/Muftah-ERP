import { Button } from "../ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Loader2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAddStock } from "@/hooks/stock/use-add-stock";
import { getMaterialsFn } from "@/server-functions/inventory/get-materials-fn";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";

type Props = {
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    preselectedWarehouse: string | undefined
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>
}

export const AddStockForm = ({ onOpenChange, onSuccess, preselectedWarehouse, warehouses }: Props) => {

    const [materialType, setMaterialType] = useState<"chemical" | "packaging">("chemical");
    const { data: materials } = useSuspenseQuery({
        queryKey: ["materials"],
        queryFn: getMaterialsFn,
    });

    const mutate = useAddStock();

    const form = useForm({
        defaultValues: {
            warehouseId: preselectedWarehouse || "",
            materialType: "chemical" as "chemical" | "packaging",
            materialId: "",
            quantity: "",
        },
        onSubmit: async ({ value }) => {
            await mutate.mutateAsync(
                { data: value },
                {
                    onSuccess: () => {
                        onSuccess()
                        form.reset();
                    },
                },
            );
        },
    });

    const availableMaterials =
        materialType === "chemical" ? materials.chemicals : materials.packagings;


    return (
        <form
            className="space-y-4"
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldGroup>
                {/* Warehouse Selection */}
                <form.Field name="warehouseId">
                    {(field) => (
                        <Field>
                            <FieldLabel>Warehouse</FieldLabel>
                            <Select
                                value={field.state.value}
                                onValueChange={(value) => field.handleChange(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select warehouse" />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                {/* Material Type */}
                <form.Field name="materialType">
                    {(field) => (
                        <Field>
                            <FieldLabel>Material Type</FieldLabel>
                            <Select
                                value={field.state.value}
                                onValueChange={(value: "chemical" | "packaging") => {
                                    field.handleChange(value);
                                    setMaterialType(value);
                                    form.setFieldValue("materialId", "");
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="chemical">Chemical</SelectItem>
                                    <SelectItem value="packaging">Packaging</SelectItem>
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                {/* Material Selection */}
                <form.Field name="materialId">
                    {(field) => (
                        <Field>
                            <FieldLabel>Material</FieldLabel>
                            <Select
                                value={field.state.value}
                                onValueChange={(value) => field.handleChange(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableMaterials.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            {m.name} ({m.unit})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                {/* Quantity */}
                <form.Field name="quantity">
                    {(field) => (
                        <Field>
                            <FieldLabel>Quantity</FieldLabel>
                            <Input
                                type="number"
                                step="0.001"
                                placeholder="Enter quantity"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <div className="flex gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.state.isSubmitting}
                        className="flex-1"
                    >
                        {form.state.isSubmitting ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        Add Stock
                    </Button>
                </div>
            </FieldGroup>
        </form>
    )
}