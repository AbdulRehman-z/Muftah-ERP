import { ResponsiveSheet } from "../custom/responsive-sheet";
import { InitiateProductionForm } from "./initiate-production-form";
import { getRecipesFn } from "@/server-functions/inventory/recipes/get-recipe-fn";

type Recipe = Awaited<ReturnType<typeof getRecipesFn>>[number];

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipe?: Recipe;
};

export const InitiateProductionSheet = ({ open, onOpenChange, recipe }: Props) => {
    return (
        <ResponsiveSheet
            title="Initiate Production Run"
            description={recipe
                ? `Start production for "${recipe.name}". Materials will be deducted when you start the run.`
                : "Schedule a new production run. Materials will be deducted when you start the run."
            }
            open={open}
            onOpenChange={onOpenChange}
        >
            <InitiateProductionForm onOpenChange={onOpenChange} preselectedRecipe={recipe} />
        </ResponsiveSheet>
    );
};
