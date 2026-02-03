import { useForm, useStore } from "@tanstack/react-form";
import {
    Loader2,
    Plus,
    Trash2,
    Package,
    Info,
    CheckCircle2,
    AlertTriangle,
    FlaskConical,
    X,
    Save,
    Calculator,
    RefreshCw,
    Scale,
    ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCreateRecipe } from "@/hooks/recipes/create-recipe-hook";
import { getProductsFn } from "@/server-functions/inventory/get-products-fn";
import { getMaterialsFn } from "@/server-functions/inventory/get-materials-fn";
import { useState, useMemo, useEffect } from "react";
import { getWarehousesFn } from "@/server-functions/inventory/get-warehouses-fn";
import { Badge } from "../ui/badge";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";
import { useUpdateRecipe } from "@/hooks/recipes/use-update-recipe-hook";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../ui/card";
import { Separator } from "../ui/separator";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import {
    createRecipeSchema,
    ingredientSelectionSchema,
    additionalPackagingItemSchema,
} from "@/lib/recipe-validators";

type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

type Props = {
    onOpenChange: (open: boolean) => void;
    initialRecipe?: Recipe;
};

// Unit Conversion Helpers
const convertToBase = (value: number, unit: string): { val: number, type: 'mass' | 'volume' } => {
    switch (unit) {
        case 'kg': return { val: value, type: 'mass' };
        case 'g': return { val: value / 1000, type: 'mass' };
        case 'liters':
        case 'L': return { val: value, type: 'volume' };
        case 'ml': return { val: value / 1000, type: 'volume' };
        default: return { val: value, type: 'mass' }; // Fallback
    }
};

// Formatting Helper - remove trailing zeros
const formatNumber = (num: number | string) => {
    if (!num) return "";
    return parseFloat(num.toString()).toString();
};

export const CreateRecipeForm = ({ onOpenChange, initialRecipe }: Props) => {
    const createRecipeMutation = useCreateRecipe();
    const updateRecipeMutation = useUpdateRecipe();

    const { data: products } = useSuspenseQuery({
        queryKey: ["products"],
        queryFn: getProductsFn,
    });

    const { data: materials } = useSuspenseQuery({
        queryKey: ["materials"],
        queryFn: getMaterialsFn,
    });

    const { data: warehouses } = useSuspenseQuery({
        queryKey: ["warehouses"],
        queryFn: getWarehousesFn,
    });

    const [tempMaterialId, setTempMaterialId] = useState<string>("");
    const [tempPackagingId, setTempPackagingId] = useState<string>("");

    // State for temporary quantities
    const [tempIngQty, setTempIngQty] = useState("");
    const [tempPkgQty, setTempPkgQty] = useState("1");

    // UI-only state to handle "Cartons Count" logic
    const [cartonsCount, setCartonsCount] = useState<number>(0);

    const form = useForm({
        defaultValues: {
            productId: initialRecipe?.productId || "",
            name: initialRecipe?.name || "",
            batchSize: initialRecipe?.batchSize ? formatNumber(initialRecipe.batchSize) : "",
            batchUnit: (initialRecipe?.batchUnit as "kg" | "liters") || "liters",
            fillAmount: initialRecipe?.fillAmount ? formatNumber(initialRecipe.fillAmount) : "",
            fillUnit: (initialRecipe?.fillUnit as "g" | "kg" | "ml" | "L") || (initialRecipe?.batchUnit === "kg" ? "g" : "ml"),
            containerType: (initialRecipe?.containerType as "bottle" | "sachet" | "bag") || "bottle",
            containerPackagingId: initialRecipe?.containerPackagingId || "",
            containersPerCarton: initialRecipe?.containersPerCarton || 0,
            cartonPackagingId: initialRecipe?.cartonPackagingId || "",
            producedUnits: initialRecipe?.targetUnitsPerBatch || 0,
            ingredients: initialRecipe?.ingredients.map(ing => ({
                chemicalId: ing.chemicalId,
                quantityPerBatch: formatNumber(ing.quantityPerBatch)
            })) || [],
            additionalPackaging: (initialRecipe?.packaging || []).map((pkg: any) => ({
                packagingMaterialId: pkg.packagingMaterialId,
                quantityPerContainer: Number(pkg.quantityPerContainer) || 1
            })) || [],
        },
        onSubmit: async ({ value }) => {
            try {
                const validationResult = createRecipeSchema.safeParse(value);
                if (!validationResult.success) {
                    const firstError = validationResult.error.issues[0];
                    toast.error(firstError?.message || "Validation failed");
                    return;
                }

                const recipeData = {
                    productId: value.productId,
                    name: value.name,
                    batchSize: value.batchSize,
                    batchUnit: value.batchUnit,
                    fillAmount: value.fillAmount,
                    fillUnit: value.fillUnit,
                    targetUnitsPerBatch: value.producedUnits,
                    containerType: value.containerType,
                    containerPackagingId: value.containerPackagingId,
                    containersPerCarton: value.containersPerCarton,
                    cartonPackagingId: value.cartonPackagingId || undefined,
                    ingredients: value.ingredients,
                    additionalPackaging: value.additionalPackaging,
                };

                if (initialRecipe) {
                    await updateRecipeMutation.mutateAsync({
                        data: {
                            ...recipeData,
                            id: initialRecipe.id,
                        },
                    });
                } else {
                    await createRecipeMutation.mutateAsync({
                        data: recipeData,
                    });
                }
                onOpenChange(false);
            } catch (error) {
                console.error("Recipe submission error:", error);
            }
        },
    });

    const values = useStore(form.store, (state) => state.values);

    // Filter Packaging Materials by Type
    const primaryPackagings = useMemo(() => materials.packagings.filter(p => !p.type || p.type === 'primary'), [materials.packagings]);
    const masterPackagings = useMemo(() => materials.packagings.filter(p => p.type === 'master'), [materials.packagings]);
    // Fallback if no type set yet (legacy data) -> assume primary if not explicitly master

    const selectedContainer = useMemo(() =>
        materials.packagings.find((c) => c.id === values.containerPackagingId),
        [values.containerPackagingId, materials.packagings]);

    const selectedCarton = useMemo(() =>
        materials.packagings.find((c) => c.id === values.cartonPackagingId),
        [values.cartonPackagingId, materials.packagings]);

    // Initialize cartons count from initial state if needed
    useEffect(() => {
        if (initialRecipe?.targetUnitsPerBatch && initialRecipe?.containersPerCarton) {
            setCartonsCount(Math.ceil(initialRecipe.targetUnitsPerBatch / initialRecipe.containersPerCarton));
        }
    }, [initialRecipe]);

    // Update form's `containersPerCarton` when `cartonsCount` or `producedUnits` changes
    // BUT only if we don't have a fixed capacity carton selected
    useEffect(() => {
        if (selectedCarton?.capacity) {
            form.setFieldValue("containersPerCarton", parseFloat(selectedCarton.capacity));
            return;
        }

        if (values.producedUnits > 0 && cartonsCount > 0) {
            const cap = Math.floor(values.producedUnits / cartonsCount);
            if (values.containersPerCarton !== cap) {
                form.setFieldValue("containersPerCarton", cap);
            }
        } else if (cartonsCount === 0) {
            form.setFieldValue("containersPerCarton", 0);
        }
    }, [cartonsCount, values.producedUnits, form, selectedCarton]);

    // Auto-populate Primary Container details
    useEffect(() => {
        if (selectedContainer) {
            if (selectedContainer.capacity) {
                form.setFieldValue("fillAmount", selectedContainer.capacity);
            }
            if (selectedContainer.capacityUnit) {
                form.setFieldValue("fillUnit", selectedContainer.capacityUnit as "ml" | "L" | "g" | "kg");
            }
        } else {
            // Reset if no container selected (or if user manually cleared it)
            // This ensures values don't linger when the source (container) is removed
            form.setFieldValue("fillAmount", "");
            form.setFieldValue("fillUnit", "ml"); // Default fallback
        }
    }, [selectedContainer, form]);

    // Handle Primary Container Qty Override
    // Usually matched 1:1 with producedUnits (Yield), but user wants to edit it.
    // However, if producedUnits (Yield) changes, primary qty should update?
    // Let's assume producedUnits IS the primary yield. Editing it updates producedUnits.
    // So the input for primaryContainerQty IS effectively producedUnits override specific to packaging section?
    // Or user wants to specify: "I produced 600 units (yield), but used 605 sachets (wastage)".
    // Currently schema doesn't support wastage on packaging directly, but we can just use additionalPackaging logic?
    // No, createRecipeSchema assumes 1 container per unit implicitly. 
    // Let's bind it to producedUnits for now, but editable.

    // --- CALCULATIONS & ANALYSIS ---

    // Mass Balance Check

    // Auto-populate Carton Capacity if defined in Master Packaging
    useEffect(() => {
        if (selectedCarton?.capacity && values.producedUnits > 0) {
            const definedCapacity = parseFloat(selectedCarton.capacity);
            // If defined capacity exists, we FORCE cartons count based on it
            const neededCartons = Math.ceil(values.producedUnits / definedCapacity);
            if (cartonsCount !== neededCartons) {
                setCartonsCount(neededCartons);
                toast.info(`Carton count adjusted to ${neededCartons} based on standard capacity (${definedCapacity}/box)`);
            }
        }
    }, [selectedCarton, values.producedUnits]);


    // Mass Balance Check
    const massBalance = useMemo(() => {
        const batchSize = parseFloat(values.batchSize) || 0;
        const fillAmount = parseFloat(values.fillAmount) || 0;
        const targetUnits = values.producedUnits || 0;

        if (!batchSize || !fillAmount || !targetUnits) return null;

        const batch = convertToBase(batchSize, values.batchUnit);
        const fill = convertToBase(fillAmount, values.fillUnit);

        const totalFillingMass = fill.val * targetUnits; // in base unit (kg or L)
        const discrepancy = batch.val - totalFillingMass;
        const efficiency = (totalFillingMass / batch.val) * 100;

        // Strict Check: 99% - 101% is OK. Outside is Warning.
        const isStrictlyBalanced = efficiency >= 99 && efficiency <= 101;

        // Detect "Grams vs Kg" mismatch (Factor of 1000)
        const isUnitMismatch = Math.abs(efficiency - 0.1) < 0.05;

        // Suggestions
        const suggestedPacks = Math.round(batch.val / fill.val);
        const suggestedFill = batch.val / targetUnits;
        const suggestedBatch = totalFillingMass;

        // Auto-convert suggestedFill back to input unit for display
        let displaySuggestedFill = suggestedFill;
        if (values.fillUnit === 'g' || values.fillUnit === 'ml') displaySuggestedFill *= 1000;

        // Auto-convert suggestedBatch to input unit
        const displaySuggestedBatch = suggestedBatch;
        // if (values.batchUnit === 'g' || values.batchUnit === 'ml') displaySuggestedBatch *= 1000; // Batch only allows kg/liters

        return {
            batchBase: batch.val,
            fillBase: fill.val,
            totalFillingMass,
            discrepancy,
            efficiency,
            matchType: batch.type === fill.type,
            suggestedPacks,
            suggestedFill: displaySuggestedFill,
            suggestedBatch: displaySuggestedBatch,
            isUnitMismatch,
            isStrictlyBalanced
        };
    }, [values.batchSize, values.batchUnit, values.fillAmount, values.fillUnit, values.producedUnits]);

    // Cost Calcs
    const ingredientsCost = useMemo(() => {
        return values.ingredients.reduce((total, ing) => {
            const material = materials.chemicals.find((m) => m.id === ing.chemicalId);
            if (!material) return total;
            const costPerUnit = parseFloat(material.costPerUnit?.toString() || "0");
            const quantity = parseFloat(ing.quantityPerBatch || "0");
            return total + costPerUnit * quantity;
        }, 0);
    }, [values.ingredients, materials.chemicals]);

    const containersCost = useMemo(() => {
        if (!selectedContainer) return 0;
        const costPerUnit = parseFloat(selectedContainer.costPerUnit?.toString() || "0");
        return (values.producedUnits || 0) * costPerUnit;
    }, [selectedContainer, values.producedUnits]);

    const cartonsCalculation = useMemo(() => {
        if (!selectedCarton) return { boxesNeeded: 0, cost: 0 };
        const costPerUnit = parseFloat(selectedCarton.costPerUnit?.toString() || "0");
        return {
            boxesNeeded: cartonsCount,
            cost: cartonsCount * costPerUnit
        };
    }, [selectedCarton, cartonsCount]);

    const additionalPackagingCost = useMemo(() => {
        return values.additionalPackaging.reduce((total, pkg) => {
            const material = materials.packagings.find((m) => m.id === pkg.packagingMaterialId);
            if (!material) return total;
            const costPerUnit = parseFloat(material.costPerUnit?.toString() || "0");
            const totalQty = pkg.quantityPerContainer * (values.producedUnits || 0);
            return total + costPerUnit * totalQty;
        }, 0);
    }, [values.additionalPackaging, materials.packagings, values.producedUnits]);

    const totalCost = ingredientsCost + containersCost + cartonsCalculation.cost + additionalPackagingCost;
    const costPerUnit = values.producedUnits > 0 ? totalCost / values.producedUnits : 0;

    // --- HANDLERS ---
    const handleAddIngredient = () => {
        if (!tempMaterialId || !tempIngQty) {
            toast.error("Please select an ingredient and enter a quantity");
            return;
        }
        const material = materials.chemicals.find(m => m.id === tempMaterialId);
        const validationResult = ingredientSelectionSchema.safeParse({
            chemicalId: tempMaterialId,
            quantityPerBatch: tempIngQty,
        });
        if (!validationResult.success) {
            toast.error(validationResult.error.issues[0].message);
            return;
        }
        if (values.ingredients.some(ing => ing.chemicalId === tempMaterialId)) {
            toast.error(`${material?.name} is already added. Update its quantity in the list.`);
            return;
        }
        form.setFieldValue("ingredients", [...values.ingredients, validationResult.data]);
        setTempMaterialId("");
        setTempIngQty("");
    };

    const handleUpdateIngredient = (index: number, quantity: string) => {
        const newIngredients = [...values.ingredients];
        newIngredients[index] = { ...newIngredients[index], quantityPerBatch: quantity };
        form.setFieldValue("ingredients", newIngredients);
    };

    const handleRemoveIngredient = (index: number) => {
        form.setFieldValue("ingredients", values.ingredients.filter((_, i) => i !== index));
    };

    const handleAddAdditionalPackaging = () => {
        if (!tempPackagingId || !tempPkgQty) return;
        const validationResult = additionalPackagingItemSchema.safeParse({
            packagingMaterialId: tempPackagingId,
            quantityPerContainer: parseInt(tempPkgQty),
        });
        if (!validationResult.success) {
            toast.error(validationResult.error.issues[0].message);
            return;
        }
        if (values.additionalPackaging.some(pkg => pkg.packagingMaterialId === tempPackagingId)) {
            toast.error("Item already added.");
            return;
        }
        form.setFieldValue("additionalPackaging", [...values.additionalPackaging, validationResult.data]);
        setTempPackagingId("");
        setTempPkgQty("1");
    };

    const handleRemoveAdditionalPackaging = (index: number) => {
        form.setFieldValue("additionalPackaging", values.additionalPackaging.filter((_, i) => i !== index));
    };

    const getStockStatus = (materialId: string, type: 'chemical' | 'packaging', neededQty: number) => {
        const material = type === 'chemical'
            ? materials.chemicals.find(m => m.id === materialId)
            : materials.packagings.find(m => m.id === materialId);

        if (!material) return { available: false, current: 0, remaining: 0 };

        const totalStock = material.stock?.reduce((sum, s) => {
            const wh = warehouses.find(w => w.id === s.warehouseId);
            return (wh?.isActive) ? sum + parseFloat(s.quantity.toString()) : sum;
        }, 0) || 0;

        return {
            available: totalStock >= neededQty,
            current: totalStock,
            remaining: totalStock - neededQty
        };
    };

    return (
        <div className="flex flex-col h-full bg-muted/5">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background sticky top-0 z-10 w-full">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <FlaskConical className="size-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold tracking-tight">
                            {initialRecipe ? "Update Recipe Configuration" : "New Recipe Formulation"}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Configure batch parameters, ingredients, and packaging.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                        <X className="size-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        // size="sm"
                        onClick={() => form.handleSubmit()}
                        disabled={createRecipeMutation.isPending || updateRecipeMutation.isPending}
                        className="min-w-[140px]"
                    >
                        {(createRecipeMutation.isPending || updateRecipeMutation.isPending) ? (
                            <Loader2 className="size-4 animate-spin mr-2" />
                        ) : (
                            <Save className="size-4 mr-2" />
                        )}
                        {initialRecipe ? "Save Changes" : "Create Recipe"}
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1 w-full">
                <div className="p-6 pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-[1600px] mx-auto">

                        {/* --- LEFT COLUMN: CONFIGURATION --- */}
                        <div className="space-y-6">

                            {/* 1. Basic Information & Mass Balance */}
                            <Card className="shadow-sm border-border/60">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Info className="size-4" />
                                            Batch Fundamentals
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* Mass Balance Check Notification */}
                                    {massBalance && (massBalance.discrepancy > 0.01 || massBalance.discrepancy < -0.01) && (
                                        <div className={cn(
                                            "rounded-lg border p-4 text-sm relative overflow-hidden transition-all duration-300",
                                            massBalance.isStrictlyBalanced
                                                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                                                : "bg-destructive/5 border-destructive/20 text-destructive"
                                        )}>
                                            <div className="flex items-center gap-2 font-semibold mb-3">
                                                <Scale className="size-4" />
                                                <span>Production Yield Analysis</span>
                                                <Badge variant="outline" className={cn(
                                                    "ml-auto border-black/10",
                                                    massBalance.isStrictlyBalanced ? "bg-emerald-100/50" : "bg-destructive/10"
                                                )}>
                                                    Eff: {formatNumber(massBalance.efficiency.toFixed(1))}%
                                                </Badge>
                                            </div>

                                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-xs">
                                                <div className="bg-white/40 p-2 rounded">
                                                    <span className="block uppercase text-[10px] font-bold opacity-60">Batch Input</span>
                                                    <span className="font-mono text-lg font-bold block">{formatNumber(massBalance.batchBase)} kg</span>
                                                </div>
                                                <div className="text-center opacity-50">
                                                    <ArrowRight className="size-4" />
                                                </div>
                                                <div className="bg-white/40 p-2 rounded">
                                                    <span className="block uppercase text-[10px] font-bold opacity-60">Packed Output</span>
                                                    <span className="font-mono text-lg font-bold block">{formatNumber(massBalance.totalFillingMass.toFixed(3))} kg</span>
                                                </div>
                                            </div>

                                            {(!massBalance.isStrictlyBalanced || massBalance.isUnitMismatch) && (
                                                <div className="mt-3 text-xs opacity-90 font-medium">
                                                    <p>
                                                        Yield is out of strict balance (99%-101%).
                                                        {massBalance.isUnitMismatch ? " Likely unit mismatch (g vs kg)." : " Please verify inputs."}
                                                    </p>
                                                    {massBalance.isUnitMismatch && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="mt-2 h-7 text-xs bg-white border-destructive/30 hover:bg-destructive/5"
                                                            onClick={() => {
                                                                form.setFieldValue("batchSize", formatNumber(massBalance.suggestedBatch));
                                                                toast.success("Batch Size corrected based on yield.");
                                                            }}
                                                        >
                                                            Fix Batch Size to {formatNumber(massBalance.suggestedBatch)} {values.batchUnit}
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Form Fields - Grid Layout */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        <form.Field name="productId">
                                            {(field) => (
                                                <Field className="space-y-1.5 flex flex-col justify-end">
                                                    <FieldLabel className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wide">Target Product</FieldLabel>
                                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                                        <SelectTrigger className={cn("h-11 bg-background/50", field.state.meta.errors.length && "border-destructive")}><SelectValue placeholder="Select Product" /></SelectTrigger>
                                                        <SelectContent>
                                                            {products.map(p => (
                                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FieldError errors={field.state.meta.errors} />
                                                </Field>
                                            )}
                                        </form.Field>

                                        <form.Field name="name">
                                            {(field) => (
                                                <Field className="space-y-1.5 flex flex-col justify-end">
                                                    <FieldLabel className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wide">Recipe Name</FieldLabel>
                                                    <Input {...field.state} value={field.state.value} onChange={e => field.handleChange(e.target.value)} placeholder="e.g. Standard Summer Batch" className={cn("h-11", field.state.meta.errors.length && "border-destructive")} />
                                                    <FieldError errors={field.state.meta.errors} />
                                                </Field>
                                            )}
                                        </form.Field>

                                        <div className="space-y-1.5 flex flex-col justify-end">
                                            <FieldLabel className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wide">Total Batch Size</FieldLabel>
                                            <div className="flex gap-2">
                                                <form.Field name="batchSize">
                                                    {(field) => (
                                                        <div className="flex-1">
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={field.state.value}
                                                                onChange={e => field.handleChange(e.target.value)}
                                                                className={cn("w-full h-11 font-bold text-lg", field.state.meta.errors.length && "border-destructive")}
                                                                step="0.01"
                                                            />
                                                        </div>
                                                    )}
                                                </form.Field>
                                                <form.Field name="batchUnit">
                                                    {(field) => (
                                                        <Select value={field.state.value} onValueChange={(val) => field.handleChange(val as "kg" | "liters")}>
                                                            <SelectTrigger className="w-24 h-11 bg-muted/20"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="liters">Liters</SelectItem>
                                                                <SelectItem value="kg">Kg</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </form.Field>
                                            </div>
                                        </div>

                                        <form.Field name="producedUnits">
                                            {(field) => (
                                                <Field className="space-y-1.5 flex flex-col justify-end">
                                                    <FieldLabel className="text-xs font-bold uppercase text-muted-foreground/80 tracking-wide">Target Packs (Yield)</FieldLabel>
                                                    <Input
                                                        type="number"
                                                        value={field.state.value}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            field.handleChange(val);
                                                        }}
                                                        className="h-11 font-bold text-lg"
                                                    />
                                                    <FieldError errors={field.state.meta.errors} />
                                                </Field>
                                            )}
                                        </form.Field>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 2. Ingredients */}
                            <Card className="shadow-sm border-border/60">
                                <CardHeader className="bg-muted/30 pb-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        <FlaskConical className="size-4" />
                                        Chemical Formulation
                                    </CardTitle>
                                    <Badge variant="secondary" className="font-mono">
                                        {values.ingredients.length} items
                                    </Badge>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* Add Ingredient Row */}
                                    <div className="flex gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                                        <Select value={tempMaterialId} onValueChange={setTempMaterialId}>
                                            <SelectTrigger className="flex-1 bg-background h-10">
                                                <SelectValue placeholder="Select Chemical..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {materials.chemicals
                                                    .filter(c => !values.ingredients.some(i => i.chemicalId === c.id))
                                                    .map(c => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            <div className="flex items-center justify-between w-full gap-4">
                                                                <span>{c.name}</span>
                                                                <span className="text-xs text-muted-foreground font-mono">PKR {c.costPerUnit}/{c.unit}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            placeholder="Qty"
                                            type="number"
                                            className="w-32 bg-background font-bold text-lg text-primary h-10"
                                            value={tempIngQty}
                                            onChange={e => setTempIngQty(e.target.value)}
                                            onKeyDown={e => e.key === "Enter" && handleAddIngredient()}
                                            step="0.01"
                                        />
                                        <Button onClick={handleAddIngredient} size="icon" className="shrink-0 h-10 w-10">
                                            <Plus className="size-5" />
                                        </Button>
                                    </div>

                                    {/* List */}
                                    <div className="space-y-2">
                                        {values.ingredients.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground text-sm italic border-2 border-dashed rounded-lg">
                                                No ingredients added yet.
                                            </div>
                                        )}
                                        {values.ingredients.map((ing, idx) => {
                                            const material = materials.chemicals.find(m => m.id === ing.chemicalId);
                                            const stock = getStockStatus(ing.chemicalId, 'chemical', parseFloat(ing.quantityPerBatch));

                                            return (
                                                <div key={`${ing.chemicalId}-${idx}`} className="group flex items-start gap-3 p-3 rounded-lg border hover:border-primary/30 hover:bg-muted/40 transition-all">
                                                    <div className="flex-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-medium text-sm">{material?.name}</span>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                {material?.costPerUnit}/u
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <Badge variant={stock.available ? "outline" : "destructive"} className="text-[10px] h-5 px-1.5">
                                                                Stock: {stock.current.toLocaleString()} {material?.unit}
                                                            </Badge>
                                                            <ArrowRight className="size-3 text-muted-foreground" />
                                                            <span className={cn("font-mono text-[10px]", stock.remaining < 0 ? "text-destructive font-bold" : "text-emerald-600")}>
                                                                Left: {stock.remaining.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1">
                                                        <div className="relative">
                                                            <Input
                                                                className="w-24 h-9 text-right pr-8 text-base font-bold text-primary"
                                                                value={ing.quantityPerBatch}
                                                                type="number"
                                                                onChange={(e) => handleUpdateIngredient(idx, e.target.value)}
                                                                step="0.01"
                                                            />
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                                                                {material?.unit}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveIngredient(idx)}
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 3. Packaging */}
                            <Card className="shadow-sm border-border/60">
                                <CardHeader className="bg-muted/30 pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                            <Package className="size-4" />
                                            Packaging & Distribution
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">

                                    {/* Primary Container */}
                                    <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30 dark:bg-blue-950/10 dark:border-blue-900/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="size-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</div>
                                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Primary Container</h4>
                                            </div>
                                            {selectedContainer && (
                                                <div className="text-[10px] text-blue-700 bg-blue-100/50 px-2 py-1 rounded border border-blue-200">
                                                    Price: {selectedContainer.costPerUnit} | Stock: {getStockStatus(selectedContainer.id, 'packaging', 0).current.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-[1fr_120px_100px_auto] gap-2 items-end">
                                            <form.Field name="containerPackagingId">
                                                {(field) => (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase">Material</span>
                                                        <Select value={field.state.value} onValueChange={field.handleChange}>
                                                            <SelectTrigger className={cn("bg-background h-10", field.state.meta.errors.length && "border-destructive")}><SelectValue placeholder="Select Container" /></SelectTrigger>
                                                            <SelectContent>
                                                                {primaryPackagings.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>
                                                                        {p.name} {p.capacity ? `(${p.capacity}${p.capacityUnit})` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </form.Field>

                                            <form.Field name="fillAmount">
                                                {(field) => (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase">Fill Amount</span>
                                                        <Input
                                                            {...field.state}
                                                            value={field.state.value}
                                                            onChange={e => field.handleChange(e.target.value)}
                                                            className={cn(
                                                                "h-10 font-bold text-center",
                                                                selectedContainer?.capacity ? "bg-muted/50 opacity-80" : "bg-background"
                                                            )}
                                                            placeholder="e.g. 500"
                                                            step="0.01"
                                                            readOnly={!!selectedContainer?.capacity}
                                                            disabled={!selectedContainer || !!selectedContainer.capacity}
                                                        />
                                                    </div>
                                                )}
                                            </form.Field>

                                            <form.Field name="fillUnit">
                                                {(field) => (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase">Unit</span>
                                                        <Select
                                                            value={field.state.value}
                                                            onValueChange={(val) => field.handleChange(val as "ml" | "L" | "g" | "kg")}
                                                            disabled={!selectedContainer || !!selectedContainer.capacityUnit}
                                                        >
                                                            <SelectTrigger className={cn(
                                                                "h-10",
                                                                selectedContainer?.capacityUnit ? "bg-muted/50 opacity-80" : "bg-background"
                                                            )}>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="ml">ml</SelectItem>
                                                                <SelectItem value="L">L</SelectItem>
                                                                <SelectItem value="g">g</SelectItem>
                                                                <SelectItem value="kg">kg</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </form.Field>

                                            {values.containerPackagingId && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-muted-foreground hover:text-destructive mb-0.5"
                                                    onClick={() => {
                                                        form.setFieldValue("containerPackagingId", "");
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Primary Container Quantity Edit */}
                                        <div className="mt-2 flex items-center justify-between gap-4 border-t border-blue-200/50 pt-2">
                                            <span className="text-xs text-blue-800 opacity-80">
                                                Container capacity matches fill amount?
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-blue-800 uppercase">Qty Needed:</span>
                                                <Input
                                                    className="w-20 h-7 text-xs font-bold text-right bg-white border-blue-200"
                                                    value={values.producedUnits || ""}
                                                    onChange={e => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val)) {
                                                            form.setFieldValue("producedUnits", val);
                                                        } else {
                                                            form.setFieldValue("producedUnits", 0);
                                                        }
                                                    }}
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Master Carton */}
                                    <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/30 dark:bg-amber-950/10 dark:border-amber-900/50">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="size-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">2</div>
                                                <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Master Carton (Optional)</h4>
                                            </div>
                                            {selectedCarton && (
                                                <div className="text-[10px] text-amber-800 bg-amber-100/50 px-2 py-1 rounded border border-amber-200">
                                                    Price: {selectedCarton.costPerUnit} | Stock: {getStockStatus(selectedCarton.id, 'packaging', 0).current.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                                            <form.Field name="cartonPackagingId">
                                                {(field) => (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase">Carton Type</span>
                                                        <Select value={field.state.value} onValueChange={field.handleChange}>
                                                            <SelectTrigger className="bg-background h-10"><SelectValue placeholder="No Carton (Loose)" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="_none" className="italic text-muted-foreground">No Carton (Loose Units)</SelectItem>
                                                                {masterPackagings.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>
                                                                        {p.name}
                                                                        {p.capacity ? ` -- ${formatNumber(p.capacity)} units/carton` : ''}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </form.Field>

                                            <div className="space-y-1.5">
                                                <span className="text-xs font-medium text-muted-foreground uppercase">T. Cartons</span>
                                                <Input
                                                    type="number"
                                                    value={cartonsCount}
                                                    onChange={e => setCartonsCount(parseInt(e.target.value) || 0)}
                                                    className="h-10 bg-background font-bold text-center"
                                                    disabled={!values.cartonPackagingId || values.cartonPackagingId === "_none"}
                                                    placeholder="QTY"
                                                />
                                            </div>

                                            {values.cartonPackagingId && values.cartonPackagingId !== "_none" && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-10 w-10 text-muted-foreground hover:text-destructive mb-0.5"
                                                    onClick={() => {
                                                        form.setFieldValue("cartonPackagingId", "");
                                                        setCartonsCount(0);
                                                    }}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Auto-populated Carton Details */}
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <form.Field name="containersPerCarton">
                                                {(field) => (
                                                    <div className="space-y-1.5">
                                                        <span className="text-xs font-medium text-muted-foreground uppercase">Units per Carton</span>
                                                        <Input
                                                            type="number"
                                                            value={field.state.value || ""}
                                                            readOnly
                                                            disabled
                                                            className="h-9 bg-muted/50 font-bold"
                                                            placeholder="Auto"
                                                        />
                                                    </div>
                                                )}
                                            </form.Field>

                                            <div className="space-y-1.5">
                                                <span className="text-xs font-medium text-muted-foreground uppercase">Inner Item Content</span>
                                                <Input
                                                    value={selectedCarton?.capacityUnit || "units"}
                                                    readOnly
                                                    disabled
                                                    className="h-9 bg-muted/50 font-bold"
                                                    placeholder="units"
                                                />
                                            </div>
                                        </div>

                                        {/* Helper Text for Capacity */}
                                        {selectedCarton?.capacity ? (
                                            <div className="mt-2 text-xs text-amber-800 text-right opacity-80 flex items-center justify-end gap-1">
                                                <CheckCircle2 className="size-3" />
                                                <span>Perfect fit: {formatNumber(selectedCarton.capacity)} units per carton</span>
                                            </div>
                                        ) : (
                                            cartonsCount > 0 && values.producedUnits > 0 && (
                                                <div className="mt-2 text-xs text-amber-800 text-right opacity-80">
                                                    <span>Approx {Math.floor(values.producedUnits / cartonsCount)} units per carton</span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {/* Additional Materials */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase text-muted-foreground">Additional Materials</h4>
                                        </div>

                                        {/* Add Row */}
                                        <div className="flex gap-2">
                                            <Select value={tempPackagingId} onValueChange={setTempPackagingId}>
                                                <SelectTrigger className="flex-1 h-9">
                                                    <SelectValue placeholder="Add Cap, Label, Sticker..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {materials.packagings
                                                        .filter(p => !p.type || p.type === 'primary') // Show generic/primary items here mainly
                                                        .filter(p => p.id !== values.containerPackagingId && p.id !== values.cartonPackagingId)
                                                        .filter(p => !values.additionalPackaging.some(ap => ap.packagingMaterialId === p.id))
                                                        .map(p => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name} <span className="text-muted-foreground opacity-70 ml-2">(PKR {p.costPerUnit})</span>
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                            <div className="relative w-20">
                                                <Input
                                                    placeholder="1"
                                                    type="number"
                                                    className="h-9 pr-6 font-bold"
                                                    value={tempPkgQty}
                                                    onChange={e => setTempPkgQty(e.target.value)}
                                                />
                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">/u</span>
                                            </div>
                                            <Button size="sm" onClick={handleAddAdditionalPackaging} className="h-9">Add</Button>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-2">
                                            {values.additionalPackaging.map((pkg, idx) => {
                                                const material = materials.packagings.find(m => m.id === pkg.packagingMaterialId);
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/20 border rounded-md text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="size-3.5 text-muted-foreground" />
                                                            <span>{material?.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex items-center border rounded bg-background">
                                                                <Input
                                                                    className="w-12 h-7 border-none text-center p-0 focus-visible:ring-0 font-bold"
                                                                    value={pkg.quantityPerContainer}
                                                                    onChange={e => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        const newPkg = [...values.additionalPackaging];
                                                                        newPkg[idx] = { ...newPkg[idx], quantityPerContainer: val };
                                                                        form.setFieldValue("additionalPackaging", newPkg);
                                                                    }}
                                                                />
                                                                <span className="text-[10px] text-muted-foreground pr-2 border-l pl-2 bg-muted/10 h-full flex items-center">/unit</span>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleRemoveAdditionalPackaging(idx)}
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                        </div>

                        {/* --- RIGHT COLUMN: LIVE ANALYSIS & METRICS --- */}
                        <div className="space-y-6">

                            {/* Live Analysis Card */}
                            <Card className="border-2 border-primary/10 shadow-lg shadow-primary/5 sticky top-24">
                                <CardHeader className="bg-primary/5 pb-4 border-b border-primary/5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-background rounded-lg border shadow-sm">
                                                <Calculator className="size-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold">Live Analysis</CardTitle>
                                                <CardDescription className="text-xs">
                                                    Real-time production cost estimation
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-background font-mono">
                                            PKR
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 pt-6">

                                    {/* Big Metric: Batch Cost */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                                            <p className="text-xs font-bold uppercase text-primary/70 mb-1">Total Batch Cost</p>
                                            <p className="text-2xl font-black tracking-tight text-primary">
                                                {totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Est. based on current inputs
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                                            <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Cost Per Unit</p>
                                            <p className="text-2xl font-black tracking-tight text-foreground">
                                                {costPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                For {values.producedUnits} units
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Cost Breakdown */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Cost Distribution</h4>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="size-3 rounded-full bg-emerald-500" />
                                                <span>Ingredients</span>
                                            </div>
                                            <span className="font-mono">{ingredientsCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="size-3 rounded-full bg-blue-500" />
                                                <span>Primary Packaging ({selectedContainer?.name || "None"})</span>
                                            </div>
                                            <span className="font-mono">{containersCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="size-3 rounded-full bg-amber-500" />
                                                <span>Master Cartons ({cartonsCalculation.boxesNeeded} boxes)</span>
                                            </div>
                                            <span className="font-mono">{cartonsCalculation.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="size-3 rounded-full bg-purple-500" />
                                                <span>Additional Materials</span>
                                            </div>
                                            <span className="font-mono">{additionalPackagingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>

                                    {/* Warnings / Alerts */}
                                    {(values.ingredients.length === 0) && (
                                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-3 text-amber-700">
                                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                            <p className="text-xs">Add ingredients to calculate formulation costs.</p>
                                        </div>
                                    )}

                                    {!selectedContainer && (
                                        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-blue-700">
                                            <Info className="size-4 shrink-0 mt-0.5" />
                                            <p className="text-xs">Select a primary container to include packaging costs.</p>
                                        </div>
                                    )}

                                </CardContent>
                                <CardFooter className="bg-muted/5 border-t py-3">
                                    <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
                                        <span>Last check: Just now</span>
                                        <RefreshCw className="size-3" />
                                    </div>
                                </CardFooter>
                            </Card>

                            {/* Info */}
                            <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border">
                                <p>
                                    <strong>Production Note:</strong> Ensure stock is available in the warehouse before initiating a Production Run based on this recipe. Costs are estimates based on standard moving average cost.
                                </p>
                            </div>

                        </div>

                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};
