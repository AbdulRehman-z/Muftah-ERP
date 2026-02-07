import { useSuspenseQuery } from "@tanstack/react-query";
import {
	ArrowRightLeft,
	BoxesIcon,
	PlusIcon,
	Pencil,
	Eye,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { GenericEmpty } from "../custom/empty";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AddWarehouseDialog } from "./add-warehouse-dialog";
import { ManageWarehouseStatusDialog } from "./manage-warehouse-status-dialog";
import { EditWarehouseDialog } from "./edit-warehouse-dialog";
import { WarehouseDetailsDialog } from "./warehouse-details-dialog";
import { FinishedGoodsTable } from "./finished-goods-table";
import { TransferStockDialog } from "./transfer-stock-dialog";
import { TooltipWrapper } from "../custom/tooltip-wrapper";

export const InventoryContainer = () => {
	const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
	const [isAddWarehouseOpen, setAddWarehouseOpen] = useState(false);
	const [isTransferOpen, setTransferOpen] = useState(false);
	const [isEditWarehouseOpen, setEditWarehouseOpen] = useState(false);
	const [isDetailsWarehouseOpen, setDetailsWarehouseOpen] = useState(false);

	const { data: warehouses } = useSuspenseQuery({
		queryKey: ["inventory"],
		queryFn: getInventoryFn,
		refetchInterval: 1000,
	});

	useEffect(() => {
		if (
			selectedWarehouse !== "all" &&
			!warehouses.find((w) => w.id === selectedWarehouse)
		) {
			setSelectedWarehouse("all");
		}
	}, [warehouses, selectedWarehouse]);

	if (warehouses.length === 0) {
		return (
			<>
				<GenericEmpty
					icon={BoxesIcon}
					title="Ready to store Stock?"
					description="Add a warehouse facility to start managing your finished goods inventory."
					ctaText="Add Warehouse"
					onAddChange={setAddWarehouseOpen}
				/>
				<AddWarehouseDialog
					onOpenChange={setAddWarehouseOpen}
					open={isAddWarehouseOpen}
					forcedType="storage"
				/>
			</>
		);
	}



	// Filtered data: Finished Goods (Always from Storage Warehouses)
	const storageWarehouses = warehouses.filter((w) => w.type === "storage");

	const finishedGoods = storageWarehouses.flatMap((w) =>
		(selectedWarehouse === "all" || w.id === selectedWarehouse
			? w.finishedGoodsStock || []
			: []
		).map((fg) => ({
			...fg,
			warehouse: { name: w.name, isActive: w.isActive }
		})),
	);

	return (
		<div className="space-y-6">
			{/* Header with Warehouse Selector */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Select
						value={selectedWarehouse}
						onValueChange={setSelectedWarehouse}
					>
						<SelectTrigger className="w-[250px]">
							<SelectValue placeholder="Select warehouse" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Warehouses</SelectItem>
							{storageWarehouses.map((w) => (
								<SelectItem key={w.id} value={w.id}>
									<div className="flex items-center gap-2">
										{w.name}
										{!w.isActive && (
											<Badge variant="outline" className="text-[10px] h-4 px-1 text-muted-foreground">
												Inactive
											</Badge>
										)}
									</div>
								</SelectItem>
							))}
						</SelectContent>

					</Select>

					{selectedWarehouse !== "all" && storageWarehouses.length > 0 && (
						<div className="flex items-center gap-1">
							<TooltipWrapper tooltipContent="View Warehouse Details">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setDetailsWarehouseOpen(true)}
									className="text-primary hover:bg-primary/10 hover:text-primary"
								>
									<Eye className="size-4" />
								</Button>
							</TooltipWrapper>
							<TooltipWrapper tooltipContent="Edit Warehouse Details">
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setEditWarehouseOpen(true)}
									className="text-muted-foreground hover:bg-muted/10 hover:text-foreground"
								>
									<Pencil className="size-4" />
								</Button>
							</TooltipWrapper>
							<ManageWarehouseStatusDialog
								warehouseId={selectedWarehouse}
								warehouseName={
									warehouses.find((w) => w.id === selectedWarehouse)?.name || ""
								}
								isActive={warehouses.find((w) => w.id === selectedWarehouse)?.isActive ?? true}
								otherWarehouses={warehouses.filter(
									(w) => w.id !== selectedWarehouse && w.isActive,
								)}
							/>
						</div>
					)}

				</div>

				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setAddWarehouseOpen(true)}
						size="sm"
					>
						<PlusIcon className="size-4 mr-2" />
						Warehouse
					</Button>

					<Button
						variant="outline"
						onClick={() => setTransferOpen(true)}
						size="sm"
					>
						<ArrowRightLeft className="size-4 mr-2" />
						Transfer
					</Button>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							Total Warehouses
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{storageWarehouses.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">
							Finished Goods
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{finishedGoods.length}</div>
					</CardContent>
				</Card>
			</div>

			{/* Stock Tables */}
			<Tabs defaultValue="finished" className="w-full">
				<TabsList>
					<TabsTrigger value="finished">Finished Goods</TabsTrigger>
				</TabsList>

				<TabsContent value="finished" className="mt-4">
					<FinishedGoodsTable
						data={finishedGoods}
						warehouses={warehouses}
						preselectedWarehouse={
							selectedWarehouse === "all" ? undefined : selectedWarehouse
						}
					/>
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<AddWarehouseDialog
				open={isAddWarehouseOpen}
				onOpenChange={setAddWarehouseOpen}
				forcedType="storage"
			/>

			<TransferStockDialog
				open={isTransferOpen}
				onOpenChange={setTransferOpen}
				warehouses={warehouses}
			/>

			{selectedWarehouse !== "all" && (
				(() => {
					const activeWarehouse = warehouses.find((w) => w.id === selectedWarehouse);
					if (!activeWarehouse) return null;

					return (
						<>
							<EditWarehouseDialog
								open={isEditWarehouseOpen}
								onOpenChange={setEditWarehouseOpen}
								warehouse={activeWarehouse as any}
							/>
							<WarehouseDetailsDialog
								open={isDetailsWarehouseOpen}
								onOpenChange={setDetailsWarehouseOpen}
								warehouse={activeWarehouse as any}
							/>
						</>
					);
				})()
			)}
		</div >
	);
};