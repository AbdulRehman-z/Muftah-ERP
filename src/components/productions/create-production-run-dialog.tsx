import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Info, Loader2 } from "lucide-react";
import { useState } from "react";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";
import { getWarehousesFn } from "@/server-functions/inventory/get-warehouses-fn";
import { useCreateProductionRun } from "@/hooks/stock/use-create-production-run";
import { ResponsiveDialog } from "../custom/responsive-dialog";
import { Alert, AlertDescription } from "../ui/alert";
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
import { Textarea } from "../ui/textarea";

type CreateProductionRunDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const CreateProductionRunDialog = ({
    open,
    onOpenChange,
}: CreateProductionRunDialogProps) => {
    type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];
    const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

    const { data: recipes } = useSuspenseQuery({
        queryKey: ["recipes"],
        queryFn: getRecipesFn,
    });

    const { data: warehouses } = useSuspenseQuery({
        queryKey: ["warehouses"],
        queryFn: getWarehousesFn,
    });

    const mutation = useCreateProductionRun();

    const form = useForm({
        defaultValues: {
            recipeId: "",
            warehouseId: "",
            batchesProduced: 1,
            cartonsProduced: 0,
            looseUnitsProduced: 0,
            notes: "",
        },
        onSubmit: async ({ value }) => {
            await mutation.mutateAsync(
                { data: value },
                {
                    onSuccess: () => {
                        onOpenChange(false);
                        form.reset();
                        setSelectedRecipe(null);
                    },
                },
            );
        },
    });

    // Helper for container calculation
    const getContainersPerBatch = (recipe: Recipe) => {
        const batchSize = parseFloat(recipe.batchSize || "0");
        const capacity = parseFloat(recipe.containerPackaging?.capacity || "0");
        const capacityUnit = (recipe.containerPackaging?.capacityUnit || "").toLowerCase();

        if (capacity === 0) return 0;

        let capacityInBatchUnit = capacity;
        // Logic for unit conversion
        if (recipe.batchUnit === "liters" && (capacityUnit === "ml" || capacityUnit === "milliliters")) {
            capacityInBatchUnit = capacity / 1000;
        } else if (recipe.batchUnit === "kg" && (capacityUnit === "g" || capacityUnit === "grams")) {
            capacityInBatchUnit = capacity / 1000;
        }

        return Math.floor(batchSize / capacityInBatchUnit);
    };

    // Calculate production preview
    const batchesProduced = form.state.values.batchesProduced;
    const containersPerBatch = selectedRecipe ? getContainersPerBatch(selectedRecipe) : 0;
    const totalContainers = batchesProduced * containersPerBatch;
    const suggestedCartons = selectedRecipe && selectedRecipe.containersPerCarton
        ? Math.floor(totalContainers / selectedRecipe.containersPerCarton)
        : 0;

    // Sync cartons with batches
    const handleRecipeChange = (recipeId: string) => {
        const recipe = recipes.find((r) => r.id === recipeId);
        setSelectedRecipe(recipe || null);
        if (recipe) {
            const containers = form.state.values.batchesProduced * getContainersPerBatch(recipe);
            const cartons = recipe.containersPerCarton ? Math.floor(containers / recipe.containersPerCarton) : 0;
            form.setFieldValue("cartonsProduced", cartons);
        }
    };

    const handleBatchesChange = (batches: number) => {
        form.setFieldValue("batchesProduced", batches);
        if (selectedRecipe) {
            const containers = batches * getContainersPerBatch(selectedRecipe);
            const cartons = selectedRecipe.containersPerCarton ? Math.floor(containers / selectedRecipe.containersPerCarton) : 0;
            form.setFieldValue("cartonsProduced", cartons);
        }
    };

    const factoryFloor = warehouses.find((w) => w.type === "factory_floor");

    return (
        <ResponsiveDialog
            title="Create Production Run"
            description="Record a production batch. Materials will be automatically deducted."
            open={open}
            onOpenChange={onOpenChange}
        >
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
                                <FieldLabel>Production Warehouse</FieldLabel>
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
                                                {w.type === "factory_floor" ? " (Factory)" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {factoryFloor && !field.state.value && (
                                    <p className="text-xs text-muted-foreground">
                                        Tip: Select "{factoryFloor.name}" for production
                                    </p>
                                )}
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {/* Recipe Selection */}
                    <form.Field name="recipeId">
                        {(field) => (
                            <Field>
                                <FieldLabel>Recipe</FieldLabel>
                                <Select
                                    value={field.state.value}
                                    onValueChange={(value) => {
                                        field.handleChange(value);
                                        handleRecipeChange(value);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select recipe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recipes.map((r) => (
                                            <SelectItem key={r.id} value={r.id}>
                                                {r.name} ({r.batchSize}{r.batchUnit === "liters" ? "L" : "kg"} batch)
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {/* Batches Produced */}
                    <form.Field name="batchesProduced">
                        {(field) => (
                            <Field>
                                <FieldLabel>Batches Produced</FieldLabel>
                                <Input
                                    type="number"
                                    min="1"
                                    value={field.state.value.toString()}
                                    onChange={(e) =>
                                        handleBatchesChange(parseInt(e.target.value) || 1)
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Typically 1 batch per run. Each batch produces{" "}
                                    {selectedRecipe?.batchSize || "?"}
                                    {selectedRecipe?.batchUnit === "liters" ? "L" : "kg"} of product.
                                </p>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {/* Cartons Produced */}
                    <form.Field name="cartonsProduced">
                        {(field) => (
                            <Field>
                                <FieldLabel>Cartons Produced</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    value={field.state.value.toString()}
                                    onChange={(e) =>
                                        field.handleChange(parseInt(e.target.value) || 0)
                                    }
                                />
                                {selectedRecipe && (
                                    <p className="text-xs text-muted-foreground">
                                        Suggested: {suggestedCartons} cartons (
                                        {selectedRecipe.containersPerCarton || 0} containers each)
                                    </p>
                                )}
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {/* Loose Units */}
                    <form.Field name="looseUnitsProduced">
                        {(field) => (
                            <Field>
                                <FieldLabel>Loose Containers (Optional)</FieldLabel>
                                <Input
                                    type="number"
                                    min="0"
                                    value={field.state.value.toString()}
                                    onChange={(e) =>
                                        field.handleChange(parseInt(e.target.value) || 0)
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    Containers not packed into cartons
                                </p>
                                <FieldError errors={field.state.meta.errors} />
                            </Field>
                        )}
                    </form.Field>

                    {/* Production Preview */}
                    {selectedRecipe && batchesProduced > 0 && (
                        <Alert>
                            <Info className="size-4" />
                            <AlertDescription>
                                <div className="space-y-1 text-sm">
                                    <p>
                                        <strong>Production Preview:</strong>
                                    </p>
                                    <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                                        <li>
                                            Total Output: {batchesProduced * parseFloat(selectedRecipe.batchSize || "0")}
                                            {selectedRecipe.batchUnit === "liters" ? "L" : "kg"} (
                                            {batchesProduced} × {selectedRecipe.batchSize}
                                            {selectedRecipe.batchUnit === "liters" ? "L" : "kg"})
                                        </li>
                                        <li>
                                            Total Containers: {totalContainers.toFixed(0)} (
                                            {selectedRecipe.containerPackaging?.capacity}{selectedRecipe.containerPackaging?.capacityUnit})
                                        </li>
                                        <li>
                                            Materials to deduct:{" "}
                                            {selectedRecipe.ingredients.length} Chemicals,{" "}
                                            {selectedRecipe.packaging.length + 2} packaging items
                                        </li>
                                    </ul>
                                </div>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Notes */}
                    <form.Field name="notes">
                        {(field) => (
                            <Field>
                                <FieldLabel>Notes (Optional)</FieldLabel>
                                <Textarea
                                    placeholder="Any notes about this production run..."
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
                            disabled={mutation.isPending || !selectedRecipe}
                            className="flex-1"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Create Production Run
                        </Button>
                    </div>
                </FieldGroup>
            </form>
        </ResponsiveDialog>
    );
};
