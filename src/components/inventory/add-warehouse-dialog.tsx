import { ResponsiveDialog } from "../custom/responsive-dialog";
import { AddWarehouseForm } from "./add-warehouse-form";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export const AddWarehouseDialog = ({ open, onOpenChange }: Props) => {
	return (
		<ResponsiveDialog
			title="Add Warehouse"
			description="Add a new warehouse by entering its name and location."
			open={open}
			onOpenChange={onOpenChange}
		>
			<AddWarehouseForm />
		</ResponsiveDialog>
	);
};
