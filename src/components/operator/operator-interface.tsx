import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";
import { getWarehousesFn } from "@/server-functions/inventory/get-warehouses-fn";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
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
import { useCreateProductionRun } from "@/hooks/stock/use-create-production-run";

// Define Recipe type from server function result
type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

export const OperatorInterface = () => {
	const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
	const [showSuccess, setShowSuccess] = useState(false);

	const { data: recipes } = useSuspenseQuery({
		queryKey: ["recipes"],
		queryFn: getRecipesFn,
	});

	const { data: warehouses } = useSuspenseQuery({
		queryKey: ["warehouses"],
		queryFn: getWarehousesFn,
	});

	const factoryFloor = warehouses.find(w => w.type === 'factory_floor');

	const mutate = useCreateProductionRun();

	const form = useForm({
		defaultValues: {
			recipeId: "",
			cartonsProduced: 0,
			looseUnitsProduced: 0,
			notes: "",
		},
		onSubmit: async ({ value }) => {
			if (!factoryFloor) {
				// Handling this visually below, but safety check here
				return;
			}

			await mutate.mutateAsync(
				{
					data: {
						...value,
						warehouseId: factoryFloor.id,
						batchesProduced: 1, // Logic assumption: 1 batch per log entry for operator simplicity or add field if needed
					},
				},
				{
					onSuccess: () => {
						setShowSuccess(true);
						setTimeout(() => setShowSuccess(false), 3000);
						form.reset();
						setSelectedRecipe(null);
					},
				},
			);
		},
	});

	const cartonsInput = form.store.state.values.cartonsProduced;

	const totalContainers = selectedRecipe
		? cartonsInput * (selectedRecipe.containersPerCarton || 0) +
		form.store.state.values.looseUnitsProduced
		: 0;

	if (!factoryFloor) {
		return (
			<Card className="shadow-xl border-red-200">
				<CardHeader className="bg-red-50 text-red-900">
					<CardTitle className="flex items-center gap-2">
						<AlertTriangle className="size-6 text-red-600" />
						Configuration Error
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-lg mb-4">
						No "Factory Floor" warehouse detected. Please contact the administrator.
					</p>
					<p className="text-muted-foreground">
						Production cannot be logged until a warehouse with type "factory_floor" is created.
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<Card className="shadow-xl">
			<CardHeader className="bg-primary text-primary-foreground">
				<CardTitle className="text-2xl">Log Production Output</CardTitle>
			</CardHeader>

			<CardContent className="pt-6">
				{showSuccess && (
					<Alert className="mb-6 border-green-500 bg-green-50">
						<CheckCircle className="size-4 text-green-600" />
						<AlertDescription className="text-green-800">
							Production logged successfully!
						</AlertDescription>
					</Alert>
				)}

				<form
					className="space-y-6"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						{/* Recipe Selection */}
						<form.Field name="recipeId">
							{(field) => (
								<Field>
									<FieldLabel className="text-lg">Select Recipe</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) => {
											field.handleChange(value);
											// Ensure type safety when finding recipe
											const recipe = recipes.find((r) => r.id === value);
											setSelectedRecipe(recipe || null);
										}}
									>
										<SelectTrigger className="h-12 text-lg">
											<SelectValue placeholder="Choose a recipe..." />
										</SelectTrigger>
										<SelectContent>
											{recipes.map((r) => (
												<SelectItem key={r.id} value={r.id} className="text-lg">
													{r.name} ({r.product.name})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FieldError errors={field.state.meta.errors} />
								</Field>
							)}
						</form.Field>

						{/* Production Quantity */}
						{selectedRecipe && (
							<>
								<div className="grid grid-cols-2 gap-4">
									<form.Field name="cartonsProduced">
										{(field) => (
											<Field>
												<FieldLabel className="text-lg">
													Cartons Packed
												</FieldLabel>
												<Input
													type="number"
													min="0"
													step="1"
													className="h-12 text-lg"
													placeholder="0"
													value={field.state.value || ""}
													onChange={(e) =>
														field.handleChange(parseInt(e.target.value) || 0)
													}
												/>
												<p className="text-xs text-muted-foreground mt-1">
													{selectedRecipe.containersPerCarton || 0} units per carton
												</p>
												<FieldError errors={field.state.meta.errors} />
											</Field>
										)}
									</form.Field>

									<form.Field name="looseUnitsProduced">
										{(field) => (
											<Field>
												<FieldLabel className="text-lg">Loose Units</FieldLabel>
												<Input
													type="number"
													min="0"
													step="1"
													className="h-12 text-lg"
													placeholder="0"
													value={field.state.value || ""}
													onChange={(e) =>
														field.handleChange(parseInt(e.target.value) || 0)
													}
												/>
												<p className="text-xs text-muted-foreground mt-1">
													Units not in cartons
												</p>
												<FieldError errors={field.state.meta.errors} />
											</Field>
										)}
									</form.Field>
								</div>

								{/* Total Display */}
								{totalContainers > 0 && (
									<Alert>
										<AlertDescription className="text-lg">
											<strong>Total Production:</strong> {totalContainers.toFixed(0)}{" "}
											containers ({cartonsInput} cartons +{" "}
											{form.store.state.values.looseUnitsProduced}{" "}
											loose)
										</AlertDescription>
									</Alert>
								)}

								{/* Notes */}
								<form.Field name="notes">
									{(field) => (
										<Field>
											<FieldLabel>Notes (Optional)</FieldLabel>
											<Textarea
												placeholder="Any issues or observations..."
												value={field.state.value}
												onChange={(e) => field.handleChange(e.target.value)}
											/>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>
							</>
						)}

						<Button
							type="submit"
							disabled={form.state.isSubmitting || !selectedRecipe}
							size="lg"
							className="w-full text-lg h-14"
						>
							{form.state.isSubmitting ? (
								<>
									<Loader2 className="mr-2 size-5 animate-spin" />
									Logging Production...
								</>
							) : (
								"Log Production"
							)}
						</Button>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
};
