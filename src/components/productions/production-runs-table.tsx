
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
import { useState, useMemo } from "react";
import { ProductionDetailsDialog } from "./production-details-dialog";

type ProductionRunsTableProps = {
	runs: any[];
};

export const ProductionRunsTable = ({ runs }: ProductionRunsTableProps) => {
	const startProduction = useStartProduction();
	const completeProduction = useCompleteProduction();
	const [selectedRun, setSelectedRun] = useState<any>(null);
	const [detailsOpen, setDetailsOpen] = useState(false);

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
						className="-ml-4 font-bold uppercase tracking-widest"
					>
						Batch ID
						<ArrowUpDown className="ml-2 h-3 w-3" />
					</Button>
				)
			},
			cell: ({ row }) => (
				<span className="font-mono text-xs font-bold text-primary tracking-tighter">{row.getValue("batchId")}</span>
			)
		},
		{
			id: "recipe",
			accessorFn: (row) => row.recipe.name, // For filtering
			header: () => <span className="text-xs font-bold uppercase tracking-widest">Recipe</span>,
			cell: ({ row }) => (
				<div>
					<p className="font-bold text-sm tracking-tight">{row.original.recipe.name}</p>
					<p className="text-[10px] font-medium text-muted-foreground uppercase">
						{row.original.recipe.product.name}
					</p>
				</div>
			)
		},
		{
			accessorKey: "status",
			header: () => <span className="text-xs font-bold uppercase tracking-widest text-center block w-full">Status</span>,
			cell: ({ row }) => getStatusBadge(row.getValue("status"))
		},
		{
			id: "output",
			accessorKey: "containersProduced",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-4 font-bold uppercase tracking-widest"
				>
					Output
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="text-sm">
					<p className="font-bold">{row.original.containersProduced} <span className="text-[10px] font-medium text-muted-foreground uppercase">Pack(s)</span></p>
					{row.original.looseUnitsProduced > 0 && (
						<p className="text-[10px] text-muted-foreground font-bold uppercase leading-none">
							{row.original.cartonsProduced} cartons + {row.original.looseUnitsProduced} loose
						</p>
					)}
					{row.original.looseUnitsProduced === 0 && row.original.cartonsProduced > 0 && (
						<p className="text-[10px] text-muted-foreground font-bold uppercase leading-none">
							{row.original.cartonsProduced} Cartons
						</p>
					)}
				</div>
			)
		},
		{
			id: "totalCost",
			accessorKey: "totalProductionCost",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-4 font-bold uppercase tracking-widest"
				>
					Total Cost
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<div className="space-y-0.5">
					<p className="font-black text-sm tracking-tight">
						PKR {parseFloat(row.original.totalProductionCost || "0").toLocaleString()}
					</p>
					{row.original.totalChemicalCost && (
						<p className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
							<span className="text-blue-600/60">Chem: {parseFloat(row.original.totalChemicalCost).toFixed(0)}</span>
							<span className="text-muted-foreground/30">|</span>
							<span className="text-purple-600/60">Pkg: {parseFloat(row.original.totalPackagingCost).toFixed(0)}</span>
						</p>
					)}
				</div>
			)
		},
		{
			id: "costPerContainer",
			accessorKey: "costPerContainer",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-4 font-bold uppercase tracking-widest"
				>
					Cost/Unit
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<Badge variant="outline" className="font-bold text-green-600 border-green-200 bg-green-50/50">
					PKR {parseFloat(row.original.costPerContainer || "0").toFixed(2)}
				</Badge>
			)
		},
		{
			accessorKey: "createdAt",
			header: ({ column }) => (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					className="-ml-4 font-bold uppercase tracking-widest"
				>
					Created
					<ArrowUpDown className="ml-2 h-3 w-3" />
				</Button>
			),
			cell: ({ row }) => (
				<span className="text-xs font-medium text-muted-foreground">
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
										className="h-8 text-[10px] font-black uppercase tracking-wider"
										disabled={startProduction.isPending}
									>
										<Play className="size-3 mr-1.5" />
										Start Run
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
										className="h-8 text-[10px] font-black uppercase tracking-wider bg-green-600 hover:bg-green-700"
										disabled={completeProduction.isPending}
									>
										<NotebookPenIcon className="size-3 mr-1.5" />
										Finish Run
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

						<Button
							variant="ghost"
							size="icon"
							className="size-8 text-muted-foreground hover:text-primary transition-colors"
							onClick={() => {
								setSelectedRun(run);
								setDetailsOpen(true);
							}}
						>
							<Eye className="size-4" />
						</Button>
					</div>
				);
			}
		}
	], [startProduction, completeProduction]);

	return (
		<>
			<DataTable
				columns={columns}
				data={runs}
				showSearch={false}
				pageSize={6}
			/>
			<ProductionDetailsDialog
				open={detailsOpen}
				onOpenChange={setDetailsOpen}
				run={selectedRun}
			/>
		</>
	);
};
