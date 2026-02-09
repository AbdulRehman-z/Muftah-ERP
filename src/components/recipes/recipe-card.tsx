import { useNavigate } from "@tanstack/react-router";
import { Eye, PlayIcon, Trash2, Edit } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useState } from "react";
import { InitiateProductionSheet } from "../productions/initiate-production-sheet";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { useDeleteRecipe } from "@/hooks/recipes/use-delete-recipe";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";

type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

type RecipeCardProps = {
	recipe: Recipe;
	onEdit?: () => void;
}

export const RecipeCard = ({ recipe, onEdit }: RecipeCardProps) => {
	const navigate = useNavigate();
	const [initiateOpen, setInitiateOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const deleteRecipeMutation = useDeleteRecipe();

	// Use targetUnitsPerBatch from the recipe (direct user input)
	const totalContainers = recipe.targetUnitsPerBatch || 0;

	const handleDelete = async () => {
		await deleteRecipeMutation.mutateAsync({ data: { id: recipe.id } });
		setDeleteDialogOpen(false);
	};

	return (
		<>
			<Card className="hover:shadow-sm transition-shadow flex flex-col justify-between h-full group">
				<div>
					<CardHeader>
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<CardTitle className="text-lg line-clamp-1">
									{recipe.name}
								</CardTitle>
								<p className="text-sm text-muted-foreground mt-1 text-ellipsis overflow-hidden whitespace-nowrap">
									{recipe.product.name}
								</p>
							</div>
							<Badge variant="outline">{recipe.fillAmount && recipe.fillUnit ? `${recipe.fillAmount}${recipe.fillUnit}` : recipe.containerPackaging?.name || "Loose"}</Badge>
						</div>
					</CardHeader>

					<CardContent className="space-y-4">
						{/* Production Info */}
						<div className="grid grid-cols-2 gap-2 text-sm">
							<div>
								<p className="text-muted-foreground">Batch Size</p>
								<p className="font-medium">
									{recipe.batchSize}
									{recipe.batchUnit === "liters" ? "L" : "kg"}
								</p>
							</div>
							<div>
								<p className="text-muted-foreground">Units</p>
								<p className="font-medium">{totalContainers.toFixed(0)}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Per Carton</p>
								<p className="font-medium">{recipe.containersPerCarton || "Loose"}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Total Cartons</p>
								<p className="font-medium">
									{recipe.containersPerCarton ? Math.floor(totalContainers / recipe.containersPerCarton) : 0}
								</p>
							</div>
						</div>

						{/* Cost Info */}
						{recipe.estimatedCostPerContainer && (
							<div className="pt-2 border-t">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Est. Cost/Unit
									</span>
									<span className="font-semibold text-green-600">
										PKR {parseFloat(recipe.estimatedCostPerContainer).toFixed(2)}
									</span>
								</div>
								{recipe.estimatedCostPerBatch && (
									<div className="flex items-center justify-between mt-1">
										<span className="text-sm text-muted-foreground">
											Est. Batch Cost
										</span>
										<span className="font-semibold">
											PKR {parseFloat(recipe.estimatedCostPerBatch).toFixed(2)}
										</span>
									</div>
								)}
							</div>
						)}

						{/* Ingredients Summary */}
						<div className="text-xs text-muted-foreground">
							{recipe.ingredients.length} ingredients •{" "}
							{recipe.packaging.length + 2} packaging items
						</div>
					</CardContent>
				</div>

				<div className="p-4 pt-0 space-y-3">
					<Button
						onClick={() => setInitiateOpen(true)}
						className="w-full"
					>
						<PlayIcon className="size-4 mr-2" />
						Initiate Production
					</Button>

					{/* Secondary Actions */}
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={onEdit}
						>
							<Edit className="size-4 mr-2" />
							Edit
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1"
							onClick={() => navigate({ to: `/admin/manufacturing/recipes/${recipe.id}` })}
						>
							<Eye className="size-4 mr-2" />
							View
						</Button>
						<Button
							variant="outline"
							size="sm"
							className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={() => setDeleteDialogOpen(true)}
						>
							<Trash2 className="size-4 mr-2" />
							Delete
						</Button>
					</div>
				</div>
			</Card>

			<InitiateProductionSheet
				open={initiateOpen}
				onOpenChange={setInitiateOpen}
				recipe={recipe}
			/>


			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete the
							recipe <strong>{recipe.name}</strong> and remove it from the database.
							Associated production history will remain but the recipe will no longer be usable.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};
