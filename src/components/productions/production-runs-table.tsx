
import { formatDistanceToNow } from "date-fns";
import { Eye, Play, CheckCircle2, ArrowUpDown, NotebookPenIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import { useStartProduction } from "@/hooks/production/use-start-production";
import { useCompleteProduction } from "@/hooks/production/use-complete-production";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "../ui/alert-dialog";
import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";

type ProductionRunsTableProps = {
	runs: any[];
};

export const ProductionRunsTable = ({ runs }: ProductionRunsTableProps) => {
	const startProduction = useStartProduction();
	const completeProduction = useCompleteProduction();

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "scheduled":
				return <Badge variant="secondary">Scheduled</Badge>;
			case "in_progress":
				return <Badge variant="default" className="bg-blue-600">In Progress</Badge>;
			case "completed":
				return <Badge variant="default" className="bg-green-600">Completed</Badge>;
			case "cancelled":
				return <Badge variant="destructive">Cancelled</Badge>;
			default:
				return <Badge variant="outline">{status}</Badge>;
		}
	};

	const columns = useMemo<ColumnDef<any>[]>(() => [
		{
			accessorKey: "batchId",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Batch ID
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className="font-mono text-sm">{row.getValue("batchId")}</span>
			)
		},
		{
			id: "recipe",
			accessorFn: (row) => row.recipe.name, // For filtering
			header: "Recipe",
			cell: ({ row }) => (
				<div>
					<p className="font-medium">{row.original.recipe.name}</p>
					<p className="text-xs text-muted-foreground">
						{row.original.recipe.product.name}
					</p>
				</div>
			)
		},
		{
			accessorKey: "status",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Status
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => getStatusBadge(row.getValue("status"))
		},
		{
			id: "output",
			header: "Production Output",
			cell: ({ row }) => (
				<div className="text-sm">
					<p>{row.original.containersProduced} Pack(s)</p>
					{row.original.looseUnitsProduced > 0 && (
						<p className="text-xs text-muted-foreground">
							{row.original.cartonsProduced} cartons + {row.original.looseUnitsProduced} loose
						</p>
					)}
					{row.original.looseUnitsProduced === 0 && row.original.cartonsProduced > 0 && (
						<p className="text-xs text-muted-foreground">
							{row.original.cartonsProduced} Cartons
						</p>
					)}
				</div>
			)
		},
		{
			id: "totalCost",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Total Cost
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<div>
					<p className="font-semibold">
						PKR {parseFloat(row.original.totalProductionCost || "0").toFixed(2)}
					</p>
					{row.original.totalChemicalCost && (
						<p className="text-xs text-muted-foreground">
							Chem: {parseFloat(row.original.totalChemicalCost).toFixed(0)} | Pkg:{" "}
							{parseFloat(row.original.totalPackagingCost).toFixed(0)}
						</p>
					)}
				</div>
			)
		},
		{
			id: "costPerContainer",
			header: "Cost/Container",
			cell: ({ row }) => (
				<span className="font-semibold text-green-600">
					PKR {parseFloat(row.original.costPerContainer || "0").toFixed(2)}
				</span>
			)
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => {
				return (
					<Button
						variant="ghost"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						className="-ml-4"
					>
						Date
						<ArrowUpDown className="ml-2 h-4 w-4" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className="text-sm text-muted-foreground">
					{formatDistanceToNow(new Date(row.getValue("createdAt")), {
						addSuffix: true,
					})}
				</span>
			)
		},
		{
			id: "actions",
			cell: ({ row }) => {
				const run = row.original;
				return (
					<div className="flex justify-end gap-2">
						{run.status === "scheduled" && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="default"
										size="sm"
										disabled={startProduction.isPending}
									>
										<Play className="size-4 mr-1" />
										Start
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Start Production?</AlertDialogTitle>
										<AlertDialogDescription>
											This will deduct Chemicals and packaging from the warehouse. This action cannot be easily undone. Are you sure?
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() =>
												startProduction.mutate({
													data: { productionRunId: run.id },
												}, {
													onSuccess: () => {
														toast.success("Production Started", {
															description: "Materials deducted. Status set to In Progress."
														});
													},
													onError: (err) => {
														toast.error("Failed to start production", {
															description: err.message
														});
													}
												})
											}
										>
											Start Production
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}

						{run.status === "in_progress" && (
							<AlertDialog>
								<AlertDialogTrigger asChild>
									<Button
										variant="default"
										size="sm"
										className="bg-green-600 hover:bg-green-700"
										disabled={completeProduction.isPending}
									>
										<NotebookPenIcon className="size-4 mr-1" />
										Set as Completed
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Complete Production?</AlertDialogTitle>
										<AlertDialogDescription>
											This will create finished goods in the warehouse. You can transfer them to other warehouses afterwards.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() =>
												completeProduction.mutate({
													data: { productionRunId: run.id },
												}, {
													onSuccess: () => {
														toast.success("Production Completed", {
															description: "Finished goods added to inventory."
														});
													},
													onError: (err) => {
														toast.error("Failed to complete production", {
															description: err.message
														});
													}
												})
											}
										>
											Complete Production
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						)}

						<Button variant="ghost" size="sm">
							<Eye className="size-4" />
						</Button>
					</div>
				);
			}
		}
	], [startProduction, completeProduction]);

	return (
		<DataTable
			columns={columns}
			data={runs}
			showSearch={false}
			pageSize={6}
		/>
	);
};
