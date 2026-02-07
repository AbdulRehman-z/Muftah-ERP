import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { ResponsiveSheet } from "../custom/responsive-sheet";
import { AddPackagingMaterialForm } from "./add-packaging-material-form";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouses: Awaited<ReturnType<typeof getInventoryFn>>
    preselectedWarehouse: string | undefined
    preselectedSupplierId?: string
}


export const AddPackagingMaterialSheet = ({
    open,
    onOpenChange,
    warehouses,
    preselectedWarehouse,
    preselectedSupplierId,
}: Props) => {

    return (
        <ResponsiveSheet
            title="Add Packaging Material"
            description="Add packaging materials to warehouse inventory"
            open={open}
            onOpenChange={onOpenChange}
        >
            <AddPackagingMaterialForm onSuccess={() => onOpenChange(false)} warehouses={warehouses} preselectedWarehouse={preselectedWarehouse} preselectedSupplierId={preselectedSupplierId} />
        </ResponsiveSheet>
    );
};

