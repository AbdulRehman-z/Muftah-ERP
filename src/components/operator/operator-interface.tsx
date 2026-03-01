import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Play,
  AlertTriangle,
  Package2,
  ClipboardList,
  Info,
  Loader2Icon,
  CheckCircle2Icon,
  Settings,
} from "lucide-react";
import { getProductionRunsFn } from "@/server-functions/inventory/production/get-production-run-fn";
import { GenericEmpty } from "../custom/empty";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { useCompleteProduction } from "@/hooks/production/use-complete-production";
import { toast } from "sonner";
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
import { useProductionRunsSync } from "@/hooks/production/use-production-runs-sync";

export const OperatorInterface = () => {
  const navigate = useNavigate();
  const completeProduction = useCompleteProduction();

  const { data: allRuns } = useSuspenseQuery({
    queryKey: ["production-runs"],
    queryFn: getProductionRunsFn,
  });

  // Smart polling
  useProductionRunsSync();

  // Filter for runs that are currently active (In Progress)
  const activeRuns = allRuns.filter((run) => run.status === "in_progress");

  if (activeRuns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <GenericEmpty
          icon={ClipboardList}
          title="No Active Production"
          description="There are currently no production runs in progress. Check back later or contact your supervisor."
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {activeRuns.map((run) => (
        <Card
          key={run.id}
          className="overflow-hidden border-border/50 hover: transition-shadow"
        >
          <div className="h-1.5 bg-blue-600 w-full" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold font-mono">
                {run.batchId}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Package2 className="size-3" />
                {run.recipe.product.name}
              </CardDescription>
            </div>
            <Badge variant="default" className="bg-blue-600">
              In Progress
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="p-2 rounded-md border border-border/50">
                    <ClipboardList className="size-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">
                      Recipe Name
                    </p>
                    <p className="font-semibold text-sm">{run.recipe.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="p-2 rounded-md border border-border/50">
                    <CheckCircle2 className="size-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">
                      Target Output
                    </p>
                    <p className="font-semibold text-sm">
                      {run.containersProduced} Pack(s)
                    </p>
                    {run.recipe.containersPerCarton && run.recipe.containersPerCarton > 0 && run.recipe.cartonPackagingId && (() => {
                      const perCarton = run.recipe.containersPerCarton!;
                      const total = run.containersProduced;
                      const fullCartons = Math.floor(total / perCarton);
                      const loose = total % perCarton;
                      return (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {loose > 0 ? (
                            <>{fullCartons} full carton{fullCartons !== 1 ? "s" : ""} + <span className="text-amber-700 font-medium">1 partial ({loose} units)</span></>
                          ) : (
                            <>{fullCartons} carton{fullCartons !== 1 ? "s" : ""}</>
                          )}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center p-4 rounded-xl border border-dashed border-border">
                <div className="flex items-start gap-2 text-muted-foreground mb-2">
                  <Info className="size-4 mt-0.5" />
                  <p className="text-xs italic leading-snug">
                    Ensure all quality checks are passed for this batch before
                    marking as completed.
                  </p>
                </div>
                {run.notes && (
                  <div className="mt-2 text-xs">
                    <span className="font-bold">Supervisor Notes: </span>
                    {run.notes}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-12 px-6 border-blue-200 hover:bg-blue-50 text-blue-700"
                onClick={() => navigate({ to: `/operator/${run.id}` })}
              >
                <Settings className="mr-2 size-4" />
                Manage Production Run
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-8"
                    disabled={completeProduction.isPending}
                  >
                    {completeProduction.isPending ? (
                      <Loader2Icon className="mr-2 size-5 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="mr-2 size-5" />
                    )}
                    Mark as Completed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl">
                      Complete Production Run?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg">
                      By clicking confirm, you certify that the production of{" "}
                      <span className="font-bold text-foreground">
                        {run.containersProduced} units
                      </span>{" "}
                      for batch{" "}
                      <span className="font-mono text-foreground font-bold">
                        {run.batchId}
                      </span>{" "}
                      is finished and ready for stock.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-2 sm:gap-0">
                    <AlertDialogCancel className="h-11">
                      Go Back
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-green-600 hover:bg-green-700 h-11 px-6"
                      onClick={() => {
                        completeProduction.mutate(
                          {
                            data: { productionRunId: run.id },
                          },
                          {
                            onSuccess: () => {
                              toast.success("Production Completed", {
                                description: `Batch ${run.batchId} has been added to finished goods.`,
                              });
                            },
                            onError: (error) => {
                              toast.error("Failed to complete production", {
                                description: error.message,
                              });
                            },
                          },
                        );
                      }}
                    >
                      Yes, Set as Completed
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
