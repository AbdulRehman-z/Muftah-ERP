import { ResponsiveSheet } from "../custom/responsive-sheet";
import { CreateRecipeForm } from "./create-recipe-from";

type CreateRecipeSheetProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const CreateRecipeSheet = ({
    open,
    onOpenChange,
}: CreateRecipeSheetProps) => {




    return (
        <ResponsiveSheet
            title="Create Recipe"
            description="Define a production recipe with batch size, packaging, and formula details."
            open={open}
            onOpenChange={onOpenChange}
        >
            <CreateRecipeForm
                onOpenChange={onOpenChange}
            />
        </ResponsiveSheet>
    );
};
