import { formatDistanceToNow } from "date-fns";
import { Eye, Play, NotebookPenIcon, ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
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
} from "../ui/alert-dialog";
import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

type ProductionRunsTableProps = {
  runs: any[];
};

/**
 * Fix: AlertDialogs are controlled via lifted state outside of tanstack-table columns.
 * Previously, the dialog was defined inside the column cell renderer inside useMemo.
 * When background polling invalidates ["production-runs"] and the table re-renders,
 * the column useMemo re-computed, unmounting and remounting the AlertDialogContent —
 * which caused the dialog to close itself every ~3 seconds.
 *
 * The fix is to keep ONE AlertDialog per action type outside the table,
 * and only pass the target run id into it via state.
 */
export const ProductionRunsTable = ({ runs }: ProductionRunsTableProps) => {
  const startProduction = useStartProduction();
  const completeProduction = useCompleteProduction();

  // Lifted dialog state — prevents re-renders from closing open dialogs
  const [startDialogRunId, setStartDialogRunId] = useState<string | null>(null);
  const [finishDialogRunId, setFinishDialogRunId] = useState<string | null>(
    null,
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "in_progress":
        return (
          <Badge variant="default" className="bg-blue-600">
            In Progress
          </Badge>
        );
      case "completed":
        return (
          <Badge variant="default" className="bg-green-600">
            Completed
          </Badge>
        );
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "failed":
        return (
          <Badge variant="destructive" className="bg-destructive/10">
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "batchId",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-3 h-auto py-1 uppercase text-[10px] font-bold tracking-tight"
            >
              Batch ID
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <span className="font-mono text-xs font-bold text-primary tracking-tighter">
            {row.getValue("batchId")}
          </span>
        ),
      },
      {
        id: "recipe",
        accessorFn: (row) => row.recipe.name,
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wide">
            Recipe
          </span>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-bold text-sm tracking-tight">
              {row.original.recipe.name}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase">
              {row.original.recipe.product.name}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-tight text-center block w-full">
            Status
          </span>
        ),
        cell: ({ row }) => getStatusBadge(row.getValue("status")),
      },
      {
        id: "progress",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wide text-center block w-full">
            Progress
          </span>
        ),
        cell: ({ row }) => {
          const run = row.original;
          const progress =
            run.containersProduced > 0
              ? ((run.completedUnits || 0) / run.containersProduced) * 100
              : 0;

          if (run.status !== "in_progress")
            return (
              <span className="text-xs text-muted-foreground text-center block">
                -
              </span>
            );

          return (
            <div className="w-[80px] space-y-1 mx-auto">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-center font-medium text-muted-foreground">
                {Math.round(progress)}%
              </p>
            </div>
          );
        },
      },
      {
        id: "target",
        accessorKey: "containersProduced",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-auto py-1 uppercase text-[10px] font-bold tracking-wide"
          >
            Target
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="font-bold">
              {row.original.containersProduced}{" "}
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Units
              </span>
            </p>
            {row.original.recipe.containersPerCarton > 0 && (
              <p className="text-[10px] text-muted-foreground font-bold uppercase leading-none">
                {Math.floor(
                  row.original.containersProduced /
                    row.original.recipe.containersPerCarton,
                )}{" "}
                Cartons
              </p>
            )}
          </div>
        ),
      },
      {
        id: "produced",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wide text-center block w-full">
            Produced
          </span>
        ),
        cell: ({ row }) => {
          const run = row.original;
          const produced = run.completedUnits || 0;
          const perCarton = run.recipe.containersPerCarton || 0;
          const cartons = perCarton > 0 ? Math.floor(produced / perCarton) : 0;
          const loose = perCarton > 0 ? produced % perCarton : produced;

          if (run.status === "scheduled")
            return (
              <span className="text-xs text-muted-foreground text-center block">
                -
              </span>
            );

          return (
            <div className="text-sm text-center">
              <p className="font-bold text-green-700">
                {produced.toLocaleString()}{" "}
                <span className="text-[10px] font-medium text-green-600/70 uppercase">
                  Units
                </span>
              </p>
              {perCarton > 0 && produced > 0 && (
                <p className="text-[10px] text-muted-foreground font-bold uppercase leading-none">
                  {cartons > 0 ? `${cartons} Cartons ` : ""}
                  {loose > 0 ? `+ ${loose} Loose` : ""}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "totalCost",
        accessorKey: "totalProductionCost",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-auto py-1 uppercase text-[10px] font-bold tracking-wide"
          >
            Total Cost
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <p className="font-black text-sm tracking-tight">
              PKR{" "}
              {parseFloat(
                row.original.totalProductionCost || "0",
              ).toLocaleString()}
            </p>
            {row.original.totalChemicalCost && (
              <p className="text-[10px] text-muted-foreground font-black uppercase flex items-center gap-1">
                <span className="text-blue-600/60">
                  Chem: {parseFloat(row.original.totalChemicalCost).toFixed(0)}
                </span>
                <span className="text-muted-foreground/30">|</span>
                <span className="text-purple-600/60">
                  Pkg: {parseFloat(row.original.totalPackagingCost).toFixed(0)}
                </span>
              </p>
            )}
          </div>
        ),
      },
      {
        id: "costPerContainer",
        accessorKey: "costPerContainer",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-auto py-1 uppercase text-[10px] font-bold tracking-wide"
          >
            Cost/Unit
            <ArrowUpDown className="ml-2 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-bold text-green-600 border-green-200 bg-green-50/50"
          >
            PKR {parseFloat(row.original.costPerContainer || "0").toFixed(2)}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-3 h-auto py-1 uppercase text-[10px] font-bold tracking-wide"
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
        ),
      },
      {
        id: "actions",
        header: () => (
          <span className="text-[10px] font-bold uppercase tracking-wide text-center block w-full">
            Actions
          </span>
        ),
        cell: ({ row }) => {
          const run = row.original;
          return (
            <div className="flex justify-end gap-2">
              {run.status === "scheduled" && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-wider"
                  disabled={startProduction.isPending}
                  onClick={() => setStartDialogRunId(run.id)}
                >
                  <Play className="size-3 mr-1.5" />
                  Start Run
                </Button>
              )}

              {run.status === "in_progress" && (
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 text-[10px] font-black uppercase tracking-wider bg-green-600 hover:bg-green-700"
                  disabled={completeProduction.isPending}
                  onClick={() => setFinishDialogRunId(run.id)}
                >
                  <NotebookPenIcon className="size-3 mr-1.5" />
                  Finish Run
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                asChild
              >
                <Link
                  to={`/manufacturing/productions/$runId`}
                  params={{ runId: run.id }}
                >
                  <Eye className="size-4" />
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [startProduction.isPending, completeProduction.isPending],
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={runs}
        showSearch={false}
        pageSize={6}
      />

      {/* Start Run Confirmation Dialog — lifted outside table to survive re-renders */}
      <AlertDialog
        open={!!startDialogRunId}
        onOpenChange={(open) => !open && setStartDialogRunId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start Production?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deduct Chemicals and packaging from the warehouse. This
              action cannot be easily undone. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!startDialogRunId) return;
                startProduction.mutate(
                  {
                    data: { productionRunId: startDialogRunId },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Production Started", {
                        description:
                          "Materials deducted. Status set to In Progress.",
                      });
                      setStartDialogRunId(null);
                    },
                    onError: (err) => {
                      toast.error("Failed to start production", {
                        description: err.message,
                      });
                    },
                  },
                );
              }}
            >
              Start Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Finish Run Confirmation Dialog — lifted outside table to survive re-renders */}
      <AlertDialog
        open={!!finishDialogRunId}
        onOpenChange={(open) => !open && setFinishDialogRunId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Production?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create finished goods in the warehouse. You can transfer
              them to other warehouses afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!finishDialogRunId) return;
                completeProduction.mutate(
                  {
                    data: { productionRunId: finishDialogRunId },
                  },
                  {
                    onSuccess: () => {
                      toast.success("Production Completed", {
                        description: "Finished goods added to inventory.",
                      });
                      setFinishDialogRunId(null);
                    },
                    onError: (err) => {
                      toast.error("Failed to complete production", {
                        description: err.message,
                      });
                    },
                  },
                );
              }}
            >
              Complete Production
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
