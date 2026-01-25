import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertTriangle,
	Boxes,
	Loader2,
	PlusIcon,
	Warehouse,
} from "lucide-react";
import { Suspense, useState } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { AddWarehouseDialog } from "@/components/inventory/add-warehouse-dialog";
import { InventoryContainer } from "@/components/inventory/inventory-container";
import { WarehouseSwitcher } from "@/components/inventory/warehouse-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
export const Route = createFileRoute("/admin/inventory/")({
	loader: async ({ context }) => {
		void context.queryClient.prefetchQuery({
			queryKey: ["inventory"],
			queryFn: getInventoryFn,
		});
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<main className="flex-1 overflow-y-auto">
			<div className="flex flex-col min-h-full p-8">
				<header className="border-b pb-8">
					<h1 className="font-bold text-3xl uppercase tracking-tighter">
						Manage Inventory
					</h1>
					<p className="mt-2 text-muted-foreground">
						Create warehouses, manage low stock warnings, add, remove or update
						current stock accross warehouses.
					</p>
				</header>
				<div className="flex-1 py-8 flex flex-col">
					<Suspense
						fallback={
							<GenericLoader
								title="Loading inventory"
								description="Please hold by..."
							/>
						}
					>
						<InventoryContainer />
						{/*<UsersTable />*/}
					</Suspense>
				</div>
			</div>
		</main>
	);

	// const [isAddWarehouseOpen, setIsAddWarehouseOpen] = useState(false);
	// const { data, isLoading, error } = useQuery({
	// 	queryKey: ["inventory-overview"],
	// 	queryFn: async () => {
	// 		const res = await fetch(`${BACKEND_URL}/inventory/overview`);
	// 		if (!res.ok) throw new Error("Failed to fetch inventory");
	// 		return res.json();
	// 	},
	// });

	// if (isLoading)
	// 	return (
	// 		<div className="flex justify-center p-20">
	// 			<Loader2 className="animate-spin size-8" />
	// 		</div>
	// 	);
	// if (error)
	// 	return (
	// 		<div className="p-10 text-destructive text-center">
	// 			<AlertTriangle className="mx-auto mb-2" /> Error loading inventory
	// 		</div>
	// 	);

	// const data = {
	// 	stock: [
	// 		{
	// 			id: "1",
	// 			warehouse: { name: "Main Warehouse" },
	// 			rawMaterial: {
	// 				name: "High-Gluten Flour",
	// 				unit: "kg",
	// 				minimumStockLevel: 500,
	// 			},
	// 			quantity: "1250.00",
	// 		},
	// 		{
	// 			id: "2",
	// 			warehouse: { name: "Main Warehouse" },
	// 			packagingMaterial: {
	// 				name: "Eco-Friendly Wraps",
	// 				unit: "units",
	// 				minimumStockLevel: 2000,
	// 			},
	// 			quantity: "1800.00",
	// 		},
	// 		{
	// 			id: "3",
	// 			warehouse: { name: "North Side Facility" },
	// 			rawMaterial: {
	// 				name: "Dry Yeast",
	// 				unit: "kg",
	// 				minimumStockLevel: 50,
	// 			},
	// 			quantity: "15.00",
	// 		},
	// 		{
	// 			id: "4",
	// 			warehouse: { name: "East Side Hub" },
	// 			packagingMaterial: {
	// 				name: "Delivery Boxes",
	// 				unit: "units",
	// 				minimumStockLevel: 300,
	// 			},
	// 			quantity: "450.00",
	// 		},
	// 	],
	// 	variants: [
	// 		{
	// 			id: "v1",
	// 			product: { name: "Sourdough Bread" },
	// 			name: "Classic Large",
	// 			stockQuantityCartons: 150,
	// 			retailPrice: "450",
	// 			packsPerCarton: 1,
	// 		},
	// 		{
	// 			id: "v2",
	// 			product: { name: "Chocolate Croissant" },
	// 			name: "Pack of 4",
	// 			stockQuantityCartons: 85,
	// 			retailPrice: "320",
	// 			packsPerCarton: 6,
	// 		},
	// 		{
	// 			id: "v3",
	// 			product: { name: "Whole Grain Loaf" },
	// 			name: "Sliced Standard",
	// 			stockQuantityCartons: 210,
	// 			retailPrice: "180",
	// 			packsPerCarton: 10,
	// 		},
	// 	],
	// };

	// const { stock, variants } = data;

	// return (
	// 	<div className="container mx-auto p-6 space-y-6">
	// 		<div className="flex justify-between items-center">
	// 			<div>
	// 				<h1 className="text-2xl font-bold tracking-tight">
	// 					Inventory Overview
	// 				</h1>
	// 				<p className="text-muted-foreground">
	// 					Professional stock management across all warehouses.
	// 				</p>
	// 			</div>
	// 		</div>

	// 		<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	// 			<Card className="bg-primary/5 border-primary/20">
	// 				<CardHeader className="pb-2">
	// 					<CardTitle className="text-sm font-medium flex items-center gap-2">
	// 						<Warehouse className="size-4" /> Total Warehouses
	// 					</CardTitle>
	// 				</CardHeader>
	// 				<CardContent>
	// 					<div className="text-2xl font-bold">3</div>
	// 				</CardContent>
	// 			</Card>
	// 			<Card className="bg-orange-500/5 border-orange-500/20">
	// 				<CardHeader className="pb-2">
	// 					<CardTitle className="text-sm font-medium flex items-center gap-2">
	// 						<AlertTriangle className="size-4 text-orange-500" /> Low Stock
	// 						Alerts
	// 					</CardTitle>
	// 				</CardHeader>
	// 				<CardContent>
	// 					<div className="text-2xl font-bold text-orange-500">29</div>
	// 				</CardContent>
	// 			</Card>
	// 			<Card className="bg-green-500/5 border-green-500/20">
	// 				<CardHeader className="pb-2">
	// 					<CardTitle className="text-sm font-medium flex items-center gap-2">
	// 						<Boxes className="size-4 text-green-500" /> Active SKUs
	// 					</CardTitle>
	// 				</CardHeader>
	// 				<CardContent>
	// 					<div className="text-2xl font-bold text-green-500">2</div>
	// 				</CardContent>
	// 			</Card>
	// 		</div>

	// 		<div className="flex items-center justify-between">
	// 			<WarehouseSwitcher />
	// 			<AddWarehouseDialog
	// 				open={isAddWarehouseOpen}
	// 				onOpenChange={setIsAddWarehouseOpen}
	// 			/>
	// 			<Button onClick={() => setIsAddWarehouseOpen(true)}>
	// 				<PlusIcon className="size-4" />
	// 				Add Warehouse
	// 			</Button>
	// 		</div>
	// 	</div>
	// );
}
