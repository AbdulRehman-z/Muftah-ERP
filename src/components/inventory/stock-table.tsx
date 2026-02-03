
import { FlaskConicalIcon, PackageIcon, Pencil, Plus, Trash2, Eye, Warehouse, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { InventoryDetailsDialog } from "./inventory-details-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GenericEmpty } from "../custom/empty";
import { useState, useMemo } from "react";
import { AddRawMaterialDialog } from "./add-raw-material-dialog";
import { AddPackagingMaterialDialog } from "./add-packaging-material-dialog";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useDeleteMaterial } from "@/hooks/inventory/use-material-actions";
import { EditMaterialDialog } from "./edit-material-dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../ui/alert-dialog";
import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

type StockItem = {
	id: string;
	quantity: string;
	createdAt: string | Date;
	updatedAt: string | Date;
	warehouse: {
		name: string;
		isActive: boolean;
	};
	chemical?: {
		id: string;
		name: string;
		unit: string;
		minimumStockLevel: string | number | null;
		costPerUnit: string | number | null;
		createdAt: string | Date;
		updatedAt: string | Date;
	} | null;
	packagingMaterial?: {
		id: string;
		name: string;
		type: string;
		unit: string;
		size?: string | null;
		minimumStockLevel: string | number | null;
		costPerUnit: string | number | null;
		createdAt: string | Date;
		updatedAt: string | Date;
	} | null;
};

type StockTableProps = {
	data: StockItem[];
	type: "chemical" | "packaging";
	warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
	preselectedWarehouse: string | undefined;
};

export const StockTable = ({
	data,
	type,
	warehouses,
	preselectedWarehouse,
}: StockTableProps) => {
	const [createDialogOpen, setCreateDialogOpen] = useState(false);
	const [editDialogOpen, setEditDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

	const deleteMutation = useDeleteMaterial();

	const isChemical = type === "chemical";
	const selectedWarehouseName = warehouses.find(w => w.id === preselectedWarehouse)?.name;

	const handleDelete = async () => {
		if (!selectedItem) return;
		const materialId = isChemical ? selectedItem.chemical?.id : selectedItem.packagingMaterial?.id;
		if (!materialId) return;

		await deleteMutation.mutateAsync({
			data: {
				id: materialId,
				type: type,
			},
		});
		setDeleteDialogOpen(false);
		setSelectedItem(null);
	};

	const columns = useMemo<ColumnDef<StockItem>[]>(() => [
		{
			id: "name",
			accessorFn: (row) => isChemical ? row.chemical?.name : row.packagingMaterial?.name,
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent"
					>
						Material Name
						<ArrowUpDown className="ml-2 h-3 w-3" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const material = isChemical ? row.original.chemical : row.original.packagingMaterial;
				return (
					<div className="font-bold text-foreground py-1">{material?.name}</div>
				);
			},
		},
		{
			id: "warehouse",
			accessorFn: (row) => row.warehouse.name,
			header: "WAREHOUSE",
			cell: ({ row }) => (
				<div className="flex items-center gap-1.5 opacity-80">
					<Warehouse className="size-3 text-muted-foreground" />
					<span className="text-xs font-medium">{row.original.warehouse.name}</span>
					{!row.original.warehouse.isActive && (
						<Badge variant="outline" className="text-[9px] h-3.5 px-1 text-muted-foreground uppercase">
							Inactive
						</Badge>
					)}
				</div>
			)
		},
		{
			id: "quantity",
			accessorFn: (row) => parseFloat(row.quantity),
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent"
					>
						Quantity
						<ArrowUpDown className="ml-2 h-3 w-3" />
					</Button>
				)
			},
			cell: ({ row }) => {
				const material = isChemical ? row.original.chemical : row.original.packagingMaterial;
				return (
					<div className="flex flex-col gap-1 py-1">
						<span className="font-bold text-sm tracking-tight">{parseFloat(row.original.quantity).toFixed(2)}</span>
						<span className="text-[9px] font-black px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit leading-none">
							{material?.unit?.toUpperCase() || (type === "packaging" ? "PCS" : "KG")}
						</span>
					</div>
				)
			}
		},
		{
			id: "price",
			header: "PRICE/UNIT",
			cell: ({ row }) => {
				const material = isChemical ? row.original.chemical : row.original.packagingMaterial;
				return (
					<span className="text-xs font-medium text-foreground opacity-90">
						PKR {parseFloat(material?.costPerUnit?.toString() || "0").toFixed(2)}
					</span>
				)
			}
		},
		{
			id: "status",
			header: "STATUS",
			cell: ({ row }) => {
				const material = isChemical ? row.original.chemical : row.original.packagingMaterial;
				if (!material) return null;
				const currentQty = parseFloat(row.original.quantity);
				const minLevel = typeof material.minimumStockLevel === "string"
					? parseFloat(material.minimumStockLevel)
					: material.minimumStockLevel || 0;
				const isLow = currentQty < minLevel;

				if (currentQty <= 0) {
					return (
						<Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-tighter">
							Out of Stock
						</Badge>
					);
				}

				return isLow ? (
					<Badge variant="destructive" className="h-5 text-[10px] uppercase tracking-tighter">Low Stock</Badge>
				) : (
					<Badge variant="outline" className="h-5 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50">Healthy</Badge>
				);
			}
		},
		{
			accessorKey: "updatedAt",
			header: "LAST UPDATED",
			cell: ({ row }) => (
				<div className="flex flex-col text-[10px] font-medium text-muted-foreground leading-tight">
					<span className="text-foreground/80">{format(new Date(row.original.updatedAt), "MMM d, yyyy")}</span>
					<span className="text-[9px] opacity-60 font-bold uppercase">{format(new Date(row.original.updatedAt), "p")}</span>
				</div>
			)
		},
		{
			id: "actions",
			cell: ({ row }) => (
				<div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
						onClick={() => {
							setSelectedItem(row.original);
							setDetailsOpen(true);
						}}
					>
						<Eye className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors"
						onClick={() => {
							setSelectedItem(row.original);
							setEditDialogOpen(true);
						}}
					>
						<Pencil className="size-3.5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
						onClick={() => {
							setSelectedItem(row.original);
							setDeleteDialogOpen(true);
						}}
					>
						<Trash2 className="size-3.5" />
					</Button>
				</div>
			)
		}
	], [isChemical, type]);

	const closeEditDialog = (open: boolean) => {
		setEditDialogOpen(open);
		if (!open) setSelectedItem(null);
	};

	if (data.length === 0) {
		const description = selectedWarehouseName
			? `${selectedWarehouseName} warehouse has no ${isChemical ? "Chemicals" : "packaging materials"}.`
			: `No ${isChemical ? "Chemicals" : "packaging material"} stock available.`;

		return (
			<>
				<GenericEmpty
					icon={isChemical ? FlaskConicalIcon : PackageIcon}
					title={`No ${isChemical ? "Chemicals" : "Packaging Material"} Stock`}
					description={description}
					ctaText={`Add ${isChemical ? "Chemicals" : "Packaging Material"}`}
					onAddChange={setCreateDialogOpen}
				/>

				{isChemical ? (
					<AddRawMaterialDialog
						open={createDialogOpen}
						onOpenChange={setCreateDialogOpen}
						warehouses={warehouses}
						preselectedWarehouse={preselectedWarehouse}
					/>
				) : (
					<AddPackagingMaterialDialog
						open={createDialogOpen}
						onOpenChange={setCreateDialogOpen}
						warehouses={warehouses}
						preselectedWarehouse={preselectedWarehouse}
					/>
				)}
			</>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-between items-center bg-muted/30 p-4 rounded-lg border border-border/50">
				<div>
					<h3 className="text-lg font-semibold tracking-tight">
						{isChemical ? "Chemicals Inventory" : "Packaging Materials"}
					</h3>
					<p className="text-sm text-muted-foreground">
						Manage and monitor your {isChemical ? "Chemicals" : "packaging"} stock levels.
					</p>
				</div>
				<Button
					onClick={() => setCreateDialogOpen(true)}
				>
					<Plus className="size-4" />
					Add {isChemical ? "Chemical" : "Packaging Material"}
				</Button>
			</div>

			<DataTable
				columns={columns}
				data={data}
				searchKey="name"
				searchPlaceholder={`Filter ${isChemical ? "chemicals" : "packaging"}...`}
			/>

			{/* Details Dialog */}
			{selectedItem && (
				<InventoryDetailsDialog
					open={detailsOpen}
					onOpenChange={setDetailsOpen}
					type={type}
					item={selectedItem}
				/>
			)}

			{/* Edit Dialog */}
			{selectedItem && (
				<EditMaterialDialog
					key={selectedItem.id}
					open={editDialogOpen}
					onOpenChange={closeEditDialog}
					type={type}
					item={selectedItem}
				/>
			)}

			{/* Delete Confirmation */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently delete the material and all its associated stock records across all warehouses.
							This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setSelectedItem(null)}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Add Dialogs */}
			{isChemical ? (
				<AddRawMaterialDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					warehouses={warehouses.filter(w => w.isActive)}
					preselectedWarehouse={preselectedWarehouse}
				/>
			) : (
				<AddPackagingMaterialDialog
					open={createDialogOpen}
					onOpenChange={setCreateDialogOpen}
					warehouses={warehouses.filter(w => w.isActive)}
					preselectedWarehouse={preselectedWarehouse}
				/>
			)}
		</div>
	);
};
