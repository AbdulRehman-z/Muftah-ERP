import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { ResponsiveDialog } from "../custom/responsive-dialog";
import { AddPackagingMaterialForm } from "./add-packaging-material-form";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>
    preselectedWarehouse: string | undefined
}


export const AddPackagingMaterialDialog = ({
    open,
    onOpenChange,
    warehouses,
    preselectedWarehouse,
}: Props) => {

    return (
        <ResponsiveDialog
            title="Add Packaging Material"
            description="Add packaging materials to warehouse inventory"
            open={open}
            onOpenChange={onOpenChange}
        >
            <AddPackagingMaterialForm onSuccess={() => onOpenChange(false)} warehouses={warehouses} preselectedWarehouse={preselectedWarehouse} />
        </ResponsiveDialog>
    );
};

