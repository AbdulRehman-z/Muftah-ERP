
import { BoxesIcon, Eye, Warehouse, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { InventoryDetailsDialog } from "./inventory-details-dialog";
import { useState, useMemo } from "react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { GenericEmpty } from "../custom/empty";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

type FinishedGood = {
	id: string;
	quantityCartons: number;
	quantityContainers: number;
	createdAt: string | Date;
	updatedAt: string | Date;
	warehouse: {
		name: string;
		isActive: boolean;
	};
	recipe: {
		id: string;
		name: string;
		containersPerCarton: number | null;
		estimatedCostPerContainer: string | null;
		batchUnit: string;
		createdAt: string | Date;
		updatedAt: string | Date;
		product: {
			name: string;
		};
	};
}

interface FinishedGoodsTableProps {
	data: FinishedGood[];
	warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
	preselectedWarehouse: string | undefined;
}

export const FinishedGoodsTable = ({ data, warehouses, preselectedWarehouse }: FinishedGoodsTableProps) => {
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<FinishedGood | null>(null);

	const columns = useMemo<ColumnDef<FinishedGood>[]>(() => [
		{
			id: "product",
			accessorFn: (row) => row.recipe.product.name,
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Product & Variant
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<div className="flex flex-col">
					<span className="font-bold text-foreground">{row.original.recipe.product.name}</span>
					<span className="text-xs text-muted-foreground">{row.original.recipe.name}</span>
				</div>
			)
		},
		{
			id: "warehouse",
			accessorFn: (row) => row.warehouse.name,
			header: "Warehouse",
			cell: ({ row }) => (
				<div className="flex items-center gap-2">
					<Warehouse className="size-3 text-muted-foreground" />
					<span className="text-sm font-medium">{row.original.warehouse.name}</span>
					{!row.original.warehouse.isActive && (
						<Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground whitespace-nowrap">
							Inactive
						</Badge>
					)}
				</div>
			)
		},
		{
			accessorKey: "quantityCartons",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Cartons
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className="font-mono font-bold">{row.getValue("quantityCartons")}</span>
			)
		},
		{
			id: "totalUnits",
			header: "Total Units",
			cell: ({ row }) => {
				const fg = row.original;
				return (
					<div className="flex flex-col">
						<span className="font-mono font-bold">
							{(fg.quantityCartons * (fg.recipe.containersPerCarton || 0)) + fg.quantityContainers}
						</span>
						<span className="text-[10px] uppercase text-muted-foreground">Loose: {fg.quantityContainers}</span>
					</div>
				)
			}
		},
		{
			id: "status",
			header: "Status",
			cell: ({ row }) => {
				const fg = row.original;
				const totalUnits = (fg.quantityCartons * (fg.recipe.containersPerCarton || 0)) + fg.quantityContainers;

				if (totalUnits <= 0) {
					return (
						<Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-tighter bg-red-600 hover:bg-red-700">
							Out of Stock
						</Badge>
					);
				}

				return (
					<Badge variant="outline" className="h-5 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50">
						Healthy
					</Badge>
				);
			}
		},
		{
			accessorKey: "updatedAt",
			header: "Last Updated",
			cell: ({ row }) => (
				<div className="flex flex-col text-[11px] text-muted-foreground">
					<span className="font-medium text-foreground/70">{format(new Date(row.getValue("updatedAt")), "MMM d, yyyy")}</span>
					<span>{format(new Date(row.getValue("updatedAt")), "p")}</span>
				</div>
			)
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<div className="flex justify-end">
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-primary hover:bg-primary/5 hover:text-primary"
						onClick={() => {
							setSelectedItem(row.original);
							setDetailsOpen(true);
						}}
					>
						<Eye className="size-3.5" />
					</Button>
				</div>
			)
		}
	], []);

	if (data.length === 0) {
		const selectedWarehouseName = warehouses.find(w => w.id === preselectedWarehouse)?.name;
		const description = selectedWarehouseName
			? `${selectedWarehouseName} warehouse has no finished goods in stock.`
			: "No finished goods available in inventory.";

		return (
			<GenericEmpty
				icon={BoxesIcon}
				title="No Finished Goods"
				description={description}
			/>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
				<div>
					<h3 className="text-lg font-semibold tracking-tight">
						Finished Goods Inventory
					</h3>
					<p className="text-sm text-muted-foreground">
						Manage and monitor your finished goods stock levels.
					</p>
				</div>
				<div>
					{/* TODO: Some logic here */}
				</div>
			</div>

			<DataTable
				columns={columns}
				data={data}
				searchKey="product"
				searchPlaceholder="Filter finished goods..."
			/>

			{/* Details Dialog */}
			{selectedItem && (
				<InventoryDetailsDialog
					open={detailsOpen}
					onOpenChange={setDetailsOpen}
					type="finished"
					item={selectedItem}
				/>
			)}
		</div>
	);
};
