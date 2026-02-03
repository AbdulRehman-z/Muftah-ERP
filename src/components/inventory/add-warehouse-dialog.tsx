import { ResponsiveDialog } from "../custom/responsive-dialog";
import { AddWarehouseForm } from "./add-warehouse-form";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

export const AddWarehouseDialog = ({ open, onOpenChange }: Props) => {
	return (
		<ResponsiveDialog
			title="Add Facility"
			description="Add a new facility (e.g. warehouse, factory-floor, etc.) by entering its name and location."
			open={open}
			onOpenChange={onOpenChange}
		>
			<AddWarehouseForm onSuccess={() => onOpenChange(false)} />
		</ResponsiveDialog>
	);
};
