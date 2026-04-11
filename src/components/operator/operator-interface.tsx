import { useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
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
import { OperationEmptyIllustration } from "../illustrations/OperationEmptyIllustration";

export const OperatorInterface = () => {
  const navigate = useNavigate();
  const completeProduction = useCompleteProduction();

  const { data: allRuns } = useSuspenseQuery({
    queryKey: ["operator-production-runs"],
    queryFn: () => getProductionRunsFn({ data: { filter: "active" } }),
  });

  // Smart polling
  useProductionRunsSync();

  // Filter for runs that are currently active (In Progress)
  const activeRuns = allRuns.filter((run) => run.status === "in_progress");

  if (activeRuns.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] animate-in fade-in duration-500">
        <GenericEmpty
          title="No Active Runs"
          description="The system has no active production runs. The floor is at standby mode and will show active runs as soon as they are assigned."
          icon={OperationEmptyIllustration}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      {activeRuns.map((run) => (
        <Card
          key={run.id}
          className="overflow-hidden border-border/60 "
        >
          {/* Refined Header Block */}
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 px-5 bg-muted/20 border-b border-border/50">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <span className="font-mono text-sm bg-background border border-border/50 px-2 py-0.5 rounded-md text-muted-foreground">
                    {run.batchId}
                  </span>
                </CardTitle>
                <Badge
                  variant="secondary"
                  className="bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 font-medium"
                >
                  In Progress
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground font-medium pt-0.5">
                <Package2 className="size-3.5" />
                {run.recipe.product.name}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

              {/* Sleek Data Metrics */}
              <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-background ">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                  <ClipboardList className="size-4" />
                  <span className="text-[12.5px] font-medium uppercase tracking-wide">Recipe Assigned</span>
                </div>
                <p className="font-semibold text-[15px] text-foreground">
                  {run.recipe.name}
                </p>
              </div>

              <div className="flex flex-col p-4 rounded-xl border border-border/60 bg-background ">
                <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-500" />
                  <span className="text-[12.5px] font-medium uppercase tracking-wide">Target Output</span>
                </div>
                <div className="flex flex-col">
                  <p className="font-semibold text-[15px] text-foreground leading-none">
                    {run.containersProduced} Pack(s)
                  </p>
                  {run.recipe.containersPerCarton && run.recipe.containersPerCarton > 0 && run.recipe.cartonPackagingId && (() => {
                    const perCarton = run.recipe.containersPerCarton!;
                    const total = run.containersProduced;
                    const fullCartons = Math.floor(total / perCarton);
                    const loose = total % perCarton;
                    return (
                      <p className="text-[12px] text-muted-foreground mt-1.5 font-medium">
                        {loose > 0 ? (
                          <>{fullCartons} full carton{fullCartons !== 1 ? "s" : ""} + <span className="text-amber-600 dark:text-amber-500">1 partial ({loose} units)</span></>
                        ) : (
                          <>{fullCartons} carton{fullCartons !== 1 ? "s" : ""}</>
                        )}
                      </p>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Combined Info & Notes Block */}
            <div className="bg-muted/40 border border-border/50 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="space-y-1.5 w-full">
                  <p className="text-[13px] font-medium text-foreground">Quality Assurance</p>
                  <p className="text-[13px] text-muted-foreground leading-relaxed">
                    Ensure all quality checks are verified for this batch before marking it as completed.
                  </p>
                  {run.notes && (
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <p className="text-[13px] text-foreground/80 leading-relaxed">
                        <span className="font-semibold text-foreground">Supervisor Notes: </span>
                        {run.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <Button
                variant="outline"
                className="h-10 px-5 text-[13px] font-medium border-border/60 bg-background hover:bg-muted/50 transition-colors"
                onClick={() => navigate({ to: `/operator/${run.id}` })}
              >
                <Settings className="mr-2 size-3.5 text-muted-foreground" />
                Manage Production Run
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="h-10 px-6 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white  transition-transform active:scale-[0.98]"
                    disabled={completeProduction.isPending}
                  >
                    {completeProduction.isPending ? (
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2Icon className="mr-2 size-4" />
                    )}
                    Mark as Completed
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[450px]">
                  <AlertDialogHeader className="space-y-2.5">
                    <AlertDialogTitle className="text-lg font-semibold">
                      Complete Production Run?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-[14px] leading-relaxed space-y-2">
                      <p>
                        By confirming, you certify that the production of batch{" "}
                        <span className="font-mono font-medium text-foreground">
                          {run.batchId}
                        </span>{" "}
                        is finished and ready to be transferred to stock.
                      </p>
                      {run.completedUnits === 0 && (
                        <div className="bg-amber-500/10 text-amber-600 border border-amber-500/20 p-3 rounded-md text-xs font-medium">
                          <span className="font-bold uppercase tracking-wider block mb-1">Notice:</span>
                          You haven't logged any produced units yet. Clicking confirm will automatically log this run as successful with the full target output of{" "}
                          <span className="font-bold">{run.containersProduced} Pack(s)</span> and deduct the required packaging materials.
                        </div>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
                    <AlertDialogCancel className="h-9 text-[13px] font-medium">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="h-9 px-5 text-[13px] font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={(e) => {
                        e.preventDefault(); // Prevent modal from closing if mutation fails
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
                          }
                        );
                      }}
                    >
                      {completeProduction.isPending ? "Completing..." : "Confirm Completion"}
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
