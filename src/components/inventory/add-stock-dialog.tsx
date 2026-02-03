import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { ResponsiveDialog } from "../custom/responsive-dialog";
import { AddStockForm } from "./add-stock-dialog-form";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	warehouses: Awaited<ReturnType<typeof getInventoryFn>>
	preselectedWarehouse: string | undefined
}


export const AddStockDialog = ({
	open,
	onOpenChange,
	warehouses,
	preselectedWarehouse,
}: Props) => {

	return (
		<ResponsiveDialog
			title="Add Stock"
			description="Add raw or packaging materials to warehouse inventory"
			open={open}
			onOpenChange={onOpenChange}
		>
			<AddStockForm onOpenChange={onOpenChange} warehouses={warehouses} onSuccess={() => onOpenChange(true)} preselectedWarehouse={preselectedWarehouse} />
		</ResponsiveDialog>
	);
};
