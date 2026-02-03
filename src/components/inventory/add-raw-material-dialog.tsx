import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { ResponsiveDialog } from "../custom/responsive-dialog";
import { AddRawMaterialForm } from "./add-raw-material-form";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>
    preselectedWarehouse: string | undefined
}


export const AddRawMaterialDialog = ({
    open,
    onOpenChange,
    warehouses,
    preselectedWarehouse,
}: Props) => {

    return (
        <ResponsiveDialog
            title="Add Chemical"
            description="Add Chemicals to warehouse inventory"
            open={open}
            onOpenChange={onOpenChange}
        >
            <AddRawMaterialForm onSuccess={() => onOpenChange(false)} warehouses={warehouses} preselectedWarehouse={preselectedWarehouse} />
        </ResponsiveDialog>
    );
};

