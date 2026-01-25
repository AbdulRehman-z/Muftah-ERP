import { useSuspenseQuery } from "@tanstack/react-query";
import { BoxesIcon } from "lucide-react";
import { useState } from "react";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { GenericEmpty } from "../custom/empty";
import { GenericLoader } from "../custom/generic-loader";
import { AddWarehouseDialog } from "./add-warehouse-dialog";

export const InventoryContainer = () => {
	const [isAddWarehouseDialogOpen, setAddWarehouseDialogOpen] = useState(false);

	const { data, isPending, error } = useSuspenseQuery({
		queryKey: ["inventory"],
		queryFn: getInventoryFn,
	});

	if (isPending) {
		<GenericLoader title="Loading..." />;
	}

	if (data.length === 0) {
		return (
			<>
				<GenericEmpty
					icon={BoxesIcon}
					title="Empty Inventory"
					description="Nothing in the inventory yet, add warehouse and manage inventory."
					ctaText="Add warehouse"
					onAddChange={setAddWarehouseDialogOpen}
				/>
				<AddWarehouseDialog
					open={isAddWarehouseDialogOpen}
					onOpenChange={() => setAddWarehouseDialogOpen(false)}
				/>
			</>
		);
	}

	return <div>Inventory</div>;
};
