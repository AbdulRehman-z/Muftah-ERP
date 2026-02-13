import { useSuspenseQuery } from "@tanstack/react-query";
import { FlaskConical, PackageIcon, PlusIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";
import { getProductsFn } from "@/server-functions/inventory/get-products-fn";
import { GenericEmpty } from "../custom/empty";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { RecipeCard } from "./recipe-card";
import { CreateRecipeForm } from "./create-recipe-from";
import { AddProductDialog } from "./add-product-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { ProductsTable } from "./products-table";
import { getRouteApi } from "@tanstack/react-router";

const route = getRouteApi("/_protected/manufacturing/recipes/");

type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

export const RecipesContainer = () => {
	const search = route.useSearch();
	const navigate = route.useNavigate();
	const [activeTab, setActiveTab] = useState("recipes");
	const [isCreating, setIsCreating] = useState(false);
	const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
	const [isAddProductOpen, setAddProductOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const { data: recipes } = useSuspenseQuery({
		queryKey: ["recipes"],
		queryFn: getRecipesFn,
	});

	useEffect(() => {
		if (search.edit) {
			const recipe = recipes.find(r => r.id === search.edit);
			if (recipe) {
				setEditingRecipe(recipe);
			}
		}
	}, [search.edit, recipes]);

	const { data: products } = useSuspenseQuery({
		queryKey: ["products"],
		queryFn: getProductsFn,
	});

	// Handle View Transitions
	if (isCreating || editingRecipe) {
		return (
			<div className="animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
				<div className="flex-1 min-h-0">
					<CreateRecipeForm
						onOpenChange={(open) => {
							if (!open) {
								setIsCreating(false);
								setEditingRecipe(null);
								navigate({ to: ".", search: (prev) => ({ ...prev, edit: undefined }) });
							}
						}}
						initialRecipe={editingRecipe || undefined}
					/>
				</div>
			</div>
		);
	}

	// State 1: No Products
	if (products.length === 0) {
		return (
			<>
				<GenericEmpty
					icon={PackageIcon}
					title="No Products Found"
					description="You haven't added any products yet. First, define a product (e.g., 'Dish Wash Liquid'), then you can create a recipe for it."
					ctaText="Add Product"
					onAddChange={setAddProductOpen}
				/>
				<AddProductDialog
					open={isAddProductOpen}
					onOpenChange={setAddProductOpen}
				/>
			</>
		);
	}

	// Filter based on search query
	const filteredRecipes = recipes.filter((recipe) =>
		recipe.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);



	return (
		<div className="space-y-6 h-full flex flex-col">
			<Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
				{/* Fixed Header Section - prevents layout shift */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 min-h-[44px]">
					<TabsList className="bg-muted/50 p-1 rounded-xl h-11 shrink-0">
						<TabsTrigger value="recipes" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold transition-all">Recipes</TabsTrigger>
						<TabsTrigger value="products" className="rounded-lg px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm font-bold transition-all">Products</TabsTrigger>
					</TabsList>

					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:ml-auto">
						{activeTab === "recipes" && (
							<>
								<div className="relative group shrink-0">
									<Input
										placeholder={`Search ${activeTab}...`}
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className="h-11 w-full sm:w-[280px] bg-muted/30 border-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl pl-10 transition-all"
									/>
									<div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 group-focus-within:text-primary transition-colors">
										<svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
										</svg>
									</div>
								</div>
								<Button
									onClick={() => setIsCreating(true)}
								// className="h-11 rounded-xl font-black uppercase tracking-widest text-[11px] gap-2 shadow-lg shadow-primary/10 transition-all active:scale-95 shrink-0"
								>
									<PlusIcon className="size-4" />
									Create Recipe
								</Button>
							</>
						)}
					</div>
				</div>

				<TabsContent value="recipes" className="border-none p-0 mt-0 focus-visible:ring-0">
					{recipes.length === 0 ? (
						<div className="flex flex-col items-center justify-center w-full py-32 text-center bg-muted/10 rounded-[32px] border-2 border-dashed border-border/50">
							<GenericEmpty
								icon={FlaskConical}
								title="No Recipes Yet"
								description="Your products are ready, but they need recipes! Create a recipe to define ingredients, packaging, and costs."
								ctaText="Create First Recipe"
								onAddChange={() => setIsCreating(true)}
							/>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{filteredRecipes.map((recipe) => (
								<RecipeCard
									key={recipe.id}
									recipe={recipe}
									onEdit={() => setEditingRecipe(recipe)}
								/>
							))}
						</div>
					)}
				</TabsContent>

				<TabsContent value="products" className="border-none p-0 mt-0 focus-visible:ring-0">
					<ProductsTable products={products as any} />
				</TabsContent>
			</Tabs>

			<AddProductDialog
				open={isAddProductOpen}
				onOpenChange={setAddProductOpen}
			/>
		</div>
	);
};
