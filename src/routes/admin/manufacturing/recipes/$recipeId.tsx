
import { createFileRoute } from "@tanstack/react-router";
import { getRecipeFn } from "@/server-functions/inventory/recipes/get-single-recipe-fn";
import { CreateRecipeForm } from "@/components/recipes/create-recipe-from";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/manufacturing/recipes/$recipeId")({
    loader: async ({ context: { queryClient }, params: { recipeId } }) => {
        void queryClient.ensureQueryData({
            queryKey: ["recipe", recipeId],
            queryFn: () => getRecipeFn({ data: { id: recipeId } }),
        });
    },
    component: RecipeDetailComponent,
    errorComponent: () => <div className="p-8 text-center text-destructive">Failed to load recipe.</div>,
    pendingComponent: () => <div className="h-full flex items-center justify-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
});

function RecipeDetailComponent() {
    const recipe = Route.useLoaderData();
    // Re-use the form component for viewing/editing.
    // Ideally pass a "readOnly" prop, but for now Edit Mode is fine.
    // The user can just use this as the "Detailed Version".
    return (
        <CreateRecipeForm
            onOpenChange={() => window.history.back()}
            initialRecipe={recipe}
        />
    );
}
