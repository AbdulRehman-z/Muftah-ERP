import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCreateProductionRun } from "@/hooks/production/use-create-production-run";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useMemo } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { AlertCircle } from "lucide-react";

type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

type Props = {
    onOpenChange: (open: boolean) => void;
    preselectedRecipe?: Recipe;
};

export const InitiateProductionForm = ({ onOpenChange, preselectedRecipe }: Props) => {
    const createProductionMutation = useCreateProductionRun();

    const { data: recipes } = useSuspenseQuery({
        queryKey: ["recipes"],
        queryFn: getRecipesFn,
    }) as { data: Awaited<ReturnType<typeof getRecipesFn>> };

    const { data: warehouses } = useSuspenseQuery({
        queryKey: ["warehouses"],
        queryFn: getInventoryFn,
    }) as { data: Awaited<ReturnType<typeof getInventoryFn>> };

    const form = useForm({
        defaultValues: {
            recipeId: preselectedRecipe?.id || "",
            warehouseId: "",
            batchesProduced: 1,
            notes: "",
        },
        onSubmit: async ({ value }) => {
            try {
                await createProductionMutation.mutateAsync({
                    data: {
                        ...value,
                    },
                });
                toast.success("Production Scheduled Successfully", {
                    description: "You can now start the run from the production table.",
                });
                onOpenChange(false);
            } catch (error) {
                toast.error("Failed to schedule production");
            }
        },
    });

    // Reactive calculations are handled inside the form.Subscribe block in the JSX


    return (
        <form
            className="space-y-6 max-w-md"
            onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
            }}
        >
            <FieldGroup>
                <form.Field name="recipeId">
                    {(field) => (
                        <Field>
                            <FieldLabel>Recipe</FieldLabel>
                            <Select
                                value={field.state.value}
                                onValueChange={(value) => field.handleChange(value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select recipe" />
                                </SelectTrigger>
                                <SelectContent>
                                    {recipes.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                            <div className="flex flex-col">
                                                <span>{r.name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {r.batchSize} {r.batchUnit} batch
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="warehouseId">
                    {(field) => (
                        <Field>
                            <FieldLabel>Source Warehouse</FieldLabel>
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
                            <p className="text-xs text-muted-foreground mt-1">
                                Materials will be sourced from this warehouse
                            </p>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Field name="batchesProduced">
                    {(field) => (
                        <Field>
                            <FieldLabel>Number of Batches</FieldLabel>
                            <Input
                                type="number"
                                placeholder="1"
                                value={field.state.value.toString()}
                                onChange={(e) => field.handleChange(parseInt(e.target.value) || 1)}
                                min="1"
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Subscribe
                    selector={(state) => [state.values.recipeId, state.values.warehouseId, state.values.batchesProduced]}
                >
                    {([recipeId, warehouseId, batchesProduced]) => {
                        const currentRecipe = preselectedRecipe || recipes.find((r) => r.id === recipeId);
                        if (!currentRecipe || !warehouseId || !batchesProduced) return null;

                        const batches = Number(batchesProduced);
                        const warehouse = warehouses.find(w => w.id === warehouseId);
                        if (!warehouse) return null;

                        // Calculation Logic (same as before)
                        let totalChemicalCost = 0;
                        let totalPackagingCost = 0;
                        const insufficientStock: string[] = [];

                        // 1. Chemicals Calculation
                        currentRecipe.ingredients.forEach(ing => {
                            const requiredQty = Number(ing.quantityPerBatch || 0) * batches;
                            const costPerUnit = Number(ing.chemical.costPerUnit || 0);
                            totalChemicalCost += requiredQty * costPerUnit;

                            const stockItem = warehouse.materialStock.find(s =>
                                (s.chemicalId === ing.chemicalId) || (s.chemical?.id === ing.chemicalId)
                            );
                            const available = Number(stockItem?.quantity || 0);
                            if (available < requiredQty) {
                                insufficientStock.push(`${ing.chemical.name} (Need ${requiredQty.toFixed(1)}, Have ${available.toFixed(1)})`);
                            }
                        });

                        // 2. Output Calculation
                        const totalContainers = (currentRecipe.targetUnitsPerBatch || 0) * batches;
                        const containersPerCarton = currentRecipe.containersPerCarton || 0;
                        const totalCartons = containersPerCarton > 0 ? Math.floor(totalContainers / containersPerCarton) : 0;

                        // 3. Packaging Calculation
                        if (currentRecipe.containerPackaging) {
                            const required = totalContainers;
                            totalPackagingCost += required * Number(currentRecipe.containerPackaging.costPerUnit || 0);
                            const stock = warehouse.materialStock.find(s => s.packagingMaterialId === currentRecipe.containerPackagingId);
                            if (Number(stock?.quantity || 0) < required) insufficientStock.push(`${currentRecipe.containerPackaging.name} (Need ${required}, Have ${Number(stock?.quantity || 0).toFixed(0)})`);
                        }

                        if (currentRecipe.cartonPackaging && totalCartons > 0) {
                            totalPackagingCost += totalCartons * Number(currentRecipe.cartonPackaging.costPerUnit || 0);
                            const stock = warehouse.materialStock.find(s => s.packagingMaterialId === currentRecipe.cartonPackagingId);
                            if (Number(stock?.quantity || 0) < totalCartons) insufficientStock.push(`${currentRecipe.cartonPackaging.name} (Need ${totalCartons}, Have ${Number(stock?.quantity || 0).toFixed(0)})`);
                        }

                        currentRecipe.packaging.forEach(pkg => {
                            const required = (Number(pkg.quantityPerContainer) || 0) * totalContainers;
                            totalPackagingCost += required * Number(pkg.packagingMaterial.costPerUnit || 0);
                            const stock = warehouse.materialStock.find(s => s.packagingMaterialId === pkg.packagingMaterialId);
                            if (Number(stock?.quantity || 0) < required) insufficientStock.push(`${pkg.packagingMaterial.name} (Need ${required}, Have ${Number(stock?.quantity || 0).toFixed(0)})`);
                        });

                        const grandTotal = totalChemicalCost + totalPackagingCost;

                        return (
                            <div className="space-y-4">
                                <div className="border rounded-lg p-4 bg-muted/40 space-y-3">
                                    <h3 className="font-semibold text-sm text-primary">Production Estimates</h3>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Total Output</span>
                                            <span className="font-bold">{totalContainers.toLocaleString()} Units</span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[10px] uppercase font-bold">Batches</span>
                                            <span className="font-bold">{batches}</span>
                                        </div>
                                        {totalCartons > 0 && (
                                            <div>
                                                <span className="text-muted-foreground block text-[10px] uppercase font-bold">Cartons</span>
                                                <span className="font-bold">{totalCartons.toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t pt-2 space-y-1.5 text-sm">
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Chemical Cost</span>
                                            <span className="font-medium text-foreground">Rs. {totalChemicalCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex justify-between text-muted-foreground">
                                            <span>Packaging Cost</span>
                                            <span>Rs. {totalPackagingCost.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-primary pt-1.5 border-t border-dashed">
                                            <span>Estimated Total</span>
                                            <span className="text-lg">Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>
                                </div>

                                {insufficientStock.length > 0 && (
                                    <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                                        <AlertCircle className="size-4" />
                                        <AlertDescription>
                                            <span className="font-bold block mb-1">Insufficient Stock Warning:</span>
                                            <ul className="list-disc pl-4 text-xs space-y-1 font-medium">
                                                {insufficientStock.map((err, i) => (
                                                    <li key={i}>{err}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        );
                    }}
                </form.Subscribe>

                <form.Field name="notes">
                    {(field) => (
                        <Field>
                            <FieldLabel>Notes (Optional)</FieldLabel>
                            <Input
                                placeholder="Add any notes about this production run"
                                value={field.state.value}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <Alert>
                    <AlertCircle className="size-4" />
                    <AlertDescription>
                        Production will be scheduled. Click "Start" in the production runs table to begin and deduct materials.
                    </AlertDescription>
                </Alert>

                <div className="flex justify-end gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={createProductionMutation.isPending}
                    >
                        {createProductionMutation.isPending ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : null}
                        Schedule Production
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
};
