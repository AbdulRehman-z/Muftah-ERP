
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProductionRunsFn } from "@/server-functions/inventory/production/get-production-run-fn";
import { logProductionProgressFn } from "@/server-functions/inventory/production/log-production-progress-fn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, Save, CheckCircle, Package, Zap, Box, AlertTriangle, Lock, PartyPopper, ArrowRight, TrendingUp, Calendar, Clock, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useFailProduction } from "@/hooks/production/use-fail-production";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_protected/operator/$runId")({
    component: ProductionRunManagePage,
});

function ProductionRunManagePage() {
    const { runId } = Route.useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [cartonsInput, setCartonsInput] = useState("");

    const { data: runs } = useSuspenseQuery({
        queryKey: ["production-run", runId],
        queryFn: () => getProductionRunsFn({ data: { runId: runId } }),
    });

    const run = runs[0];

    const logProgressMutation = useMutation({
        mutationFn: logProductionProgressFn,
        onSuccess: (result) => {
            if (result.autoCompleted) {
                toast.success("🎉 Production Complete!", {
                    description: "Target reached — run has been automatically completed.",
                    duration: 5000,
                });
            } else {
                toast.success("Progress logged successfully");
            }
            setCartonsInput("");
            queryClient.invalidateQueries({ queryKey: ["production-run", runId] });
            queryClient.invalidateQueries({ queryKey: ["production-runs"] });
            queryClient.invalidateQueries({ queryKey: ["finished-goods"] });
            queryClient.invalidateQueries({ queryKey: ["factory-floor"] });
        },
        onError: (err) => {
            toast.error(err.message || "Failed to log progress");
        },
    });

    const [failureReason, setFailureReason] = useState("");
    const [failDialogOpen, setFailDialogOpen] = useState(false);

    const failProductionMutation = useFailProduction();

    const handleFailProduction = () => {
        if (!failureReason.trim()) {
            toast.error("Please provide a reason for marking this production as failed");
            return;
        }

        failProductionMutation.mutate(
            {
                data: {
                    productionRunId: run.id,
                    reason: failureReason,
                },
            },
            {
                onSuccess: () => {
                    toast.success("Production marked as failed", {
                        description: "The production run has been marked as failed and logged.",
                    });
                    setFailDialogOpen(false);
                    setFailureReason("");
                    queryClient.invalidateQueries({ queryKey: ["production-run", runId] });
                    queryClient.invalidateQueries({ queryKey: ["production-runs"] });
                },
                onError: (err) => {
                    toast.error("Failed to mark production as failed", {
                        description: err.message,
                    });
                },
            }
        );
    };

    if (!run) {
        return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Production run not found</div>;
    }

    // Success View for Completed Runs
    if (run.status === "completed") {
        return <CompletedRunSuccessView run={run} navigate={navigate} />;
    }

    const { recipe } = run;
    const completed = run.completedUnits || 0;
    const target = run.containersProduced || 0;
    const progress = target > 0 ? (completed / target) * 100 : 0;
    const remaining = Math.max(0, target - completed);
    const fillContent = `${recipe.fillAmount ?? 0}${recipe.fillUnit ?? ""}`;

    // Carton info
    const perCarton = Number(recipe.containersPerCarton) || 0;
    const hasCartonPackaging = !!recipe.cartonPackagingId && perCarton > 0;
    const remainingCartons = hasCartonPackaging ? Math.floor(remaining / perCarton) : 0;
    const completedCartons = hasCartonPackaging ? Math.floor(completed / perCarton) : 0;

    const isCancelled = run.status === "cancelled" || run.status === "failed";

    const handleLogProgress = (e: React.FormEvent) => {
        e.preventDefault();

        const cartonsCount = parseInt(cartonsInput) || 0;

        if (cartonsCount <= 0) {
            toast.error("Please enter a valid number.");
            return;
        }

        if (hasCartonPackaging) {
            // Enforce full cartons — units = cartons * perCarton
            const totalUnits = cartonsCount * perCarton;

            if (totalUnits > remaining) {
                toast.error(`Cannot produce ${cartonsCount} cartons (${totalUnits} units). Only ${remaining} units (${remainingCartons} cartons) remaining.`);
                return;
            }

            logProgressMutation.mutate({
                data: {
                    productionRunId: run.id,
                    unitsProduced: totalUnits,
                },
            });
        } else {
            // No carton packaging — units mode
            if (cartonsCount > remaining) {
                toast.error(`Cannot produce ${cartonsCount} units. Only ${remaining} units remaining.`);
                return;
            }

            logProgressMutation.mutate({
                data: {
                    productionRunId: run.id,
                    unitsProduced: cartonsCount,
                },
            });
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    onClick={() => navigate({ to: "/operator" })}
                    className="mb-2 pl-0 hover:bg-transparent hover:text-primary gap-2"
                >
                    <ChevronLeft className="size-4" />
                    Back to Runs
                </Button>

                {!isCancelled && run.status === "in_progress" && (
                    <AlertDialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="gap-2"
                            >
                                <XCircle className="size-4" />
                                Mark as Failed
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                    <AlertCircle className="size-5 text-destructive" />
                                    Mark Production as Failed
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently mark this production run as failed. Please provide a detailed reason for the failure.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="space-y-2 py-4">
                                <label className="text-sm font-medium">Failure Reason</label>
                                <Textarea
                                    placeholder="e.g., Equipment malfunction, quality issues, material shortage..."
                                    value={failureReason}
                                    onChange={(e) => setFailureReason(e.target.value)}
                                    className="min-h-[100px]"
                                />
                            </div>
                            <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setFailureReason("")}>
                                    Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleFailProduction}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    disabled={failProductionMutation.isPending}
                                >
                                    {failProductionMutation.isPending ? "Marking..." : "Mark as Failed"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{recipe.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-muted-foreground">
                        <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">Batch #{run.batchId}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-sm font-medium">
                            <Box className="size-3.5" />
                            {fillContent}/unit
                        </span>
                    </div>
                </div>
                <Badge
                    variant="outline"
                    className={`px-3 py-1 text-sm uppercase tracking-widest font-bold ${isCancelled
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                >
                    {isCancelled ? "CANCELLED" : "IN PROGRESS"}
                </Badge>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Left Column: Progress & Logging */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-border/50  relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-1 h-full ${isCancelled ? "bg-red-500" : "bg-primary"}`} />
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Package className="size-5 text-primary" />
                                Production Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm font-medium">
                                    <span>Completion</span>
                                    <span className={progress >= 100 ? "text-emerald-600 font-bold" : ""}>{Math.round(progress)}%</span>
                                </div>
                                <Progress
                                    value={Math.min(progress, 100)}
                                    className={`h-3 rounded-full ${progress >= 100 ? "bg-emerald-100" : "bg-secondary"}`}
                                    indicatorClassName={progress >= 100 ? "bg-emerald-500" : ""}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-muted/30 rounded-lg border text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Target</p>
                                    <p className="text-2xl font-bold mt-1 tracking-tight">{target.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1 lowercase">
                                        {hasCartonPackaging ? `${Math.ceil(target / perCarton)} cartons` : "units"}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-lg border text-center ${completed >= target ? "bg-emerald-50/50 border-emerald-100" : "bg-muted/30"}`}>
                                    <p className={`text-xs uppercase tracking-wide font-bold ${completed >= target ? "text-emerald-700" : "text-foreground"}`}>Completed</p>
                                    <p className={`text-2xl font-bold mt-1 tracking-tight ${completed >= target ? "text-emerald-700" : "text-foreground"}`}>{completed.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground mt-1 lowercase">
                                        {hasCartonPackaging ? `${Math.floor(completed / perCarton)} cartons` : "units"}
                                    </p>
                                </div>
                            </div>

                            {/* Remaining indicator */}
                            {remaining > 0 && !isCancelled && (
                                <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 text-sm text-blue-700 flex items-center gap-2">
                                    <AlertTriangle className="size-4 shrink-0" />
                                    <span>
                                        <strong>{remaining.toLocaleString()} units</strong> remaining
                                        {hasCartonPackaging && <> ({remainingCartons} cartons)</>}
                                    </span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 ">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Zap className="size-5 text-yellow-600" />
                                Log Output
                            </CardTitle>
                            <CardDescription>
                                {isCancelled
                                    ? "This production run has ended. No more entries can be logged."
                                    : hasCartonPackaging
                                        ? `Enter the number of FULL cartons produced. Each carton = ${perCarton} units.`
                                        : "Enter the number of units produced."
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isCancelled ? (
                                <div className="flex items-center justify-center gap-3 p-6 bg-muted/20 rounded-lg border border-dashed">
                                    <Lock className="size-5 text-muted-foreground" />
                                    <span className="text-muted-foreground font-medium">Logging is disabled for {run.status} runs.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleLogProgress} className="space-y-4">
                                    {hasCartonPackaging && (
                                        <div className="bg-muted/30 p-3 rounded-lg border text-xs text-muted-foreground">
                                            <strong>Carton Mode Enforced:</strong> This recipe requires all units to be packed in full cartons of {perCarton}.
                                            No loose units are allowed.
                                        </div>
                                    )}

                                    <div className="flex gap-4 items-end">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-sm font-medium leading-none">
                                                {hasCartonPackaging ? "Cartons Produced" : "Units Produced"}
                                            </label>
                                            <Input
                                                type="number"
                                                placeholder={hasCartonPackaging ? `Cartons (max ${remainingCartons})` : `Units (max ${remaining})`}
                                                value={cartonsInput}
                                                onChange={(e) => setCartonsInput(e.target.value)}
                                                className="text-lg h-12 font-mono"
                                                min={1}
                                                max={hasCartonPackaging ? remainingCartons : remaining}
                                            />
                                            {hasCartonPackaging && cartonsInput && (
                                                <p className="text-xs text-muted-foreground">
                                                    {parseInt(cartonsInput) || 0} cartons × {perCarton} = <span className="font-bold text-foreground">
                                                        {(parseInt(cartonsInput) || 0) * perCarton} units
                                                    </span>
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            className="h-12 px-8 font-bold"
                                            disabled={logProgressMutation.isPending}
                                        >
                                            {logProgressMutation.isPending ? "Saving..." : (
                                                <>
                                                    <Save className="mr-2 size-4" />
                                                    Log
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Recipe Details */}
                <div className="space-y-6">
                    <Card className="h-full border-border/50 bg-muted/10">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold">Production Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3 flex items-center gap-2">
                                    <Box className="size-3" /> Packaging Materials
                                </h4>
                                <ul className="space-y-3">
                                    {recipe.containerPackaging && (
                                        <li className="text-sm border-l-2 border-primary pl-3 py-1 bg-background rounded-r-md">
                                            <span className="font-medium text-foreground block">{recipe.containerPackaging.name}</span>
                                            <span className="text-xs text-muted-foreground">Primary Container</span>
                                        </li>
                                    )}
                                    {recipe.cartonPackaging && (
                                        <li className="text-sm border-l-2 border-orange-400 pl-3 py-1 bg-background rounded-r-md">
                                            <span className="font-medium text-foreground block">{recipe.cartonPackaging.name}</span>
                                            <span className="text-xs text-muted-foreground">Carton ({recipe.containersPerCarton} units/carton)</span>
                                        </li>
                                    )}
                                    {recipe.packaging?.map((pkg: any) => (
                                        <li key={pkg.id} className="text-sm border-l-2 border-blue-400 pl-3 py-1 bg-background rounded-r-md">
                                            <span className="font-medium text-foreground block">{pkg.packagingMaterial?.name}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {pkg.packagingMaterial.type === 'sticker' && hasCartonPackaging
                                                    ? "Per Carton (Sticker)"
                                                    : `Additional (${pkg.quantityPerContainer} per unit)`
                                                }
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// Sub-component for Success View
function CompletedRunSuccessView({ run, navigate }: { run: any, navigate: any }) {
    const { recipe } = run;
    const completed = run.completedUnits || 0;
    const target = run.containersProduced || 0;
    const perCarton = Number(recipe.containersPerCarton) || 0;
    const hasCartonPackaging = !!recipe.cartonPackagingId && perCarton > 0;
    const completedCartons = hasCartonPackaging ? Math.floor(completed / perCarton) : 0;

    return (
        <div className="max-w-3xl mx-auto p-8 pt-12 space-y-8 animate-in fade-in duration-700">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4  ring-8 ring-emerald-50">
                    <PartyPopper className="size-10" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Production Completed!</h1>
                <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                    Great job! The production target has been reached and the run is now finalized.
                </p>
                <div className="flex items-center justify-center gap-2 mt-2">
                    <Badge variant="outline" className="text-sm uppercase tracking-widest bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1">
                        Batch #{run.batchId}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm font-medium text-muted-foreground">{format(new Date(), "PP")}</span>
                </div>
            </div>

            <Card className="border-emerald-100 bg-gradient-to-br from-white to-emerald-50/20 ">
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Total Produced</p>
                            <p className="text-4xl font-bold text-foreground">{completed}</p>
                            <p className="text-sm text-muted-foreground">Units</p>
                        </div>

                        <div className="text-center space-y-1 border-x border-border/50">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Packaging</p>
                            <p className="text-4xl font-bold text-foreground">
                                {hasCartonPackaging ? completedCartons : "-"}
                            </p>
                            <p className="text-sm text-muted-foreground">Cartons Filled</p>
                        </div>

                        <div className="text-center space-y-1">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Efficiency</p>
                            <p className="text-4xl font-bold text-foreground">100%</p>
                            <p className="text-sm text-muted-foreground">Target Met</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-emerald-50/50 border-t border-emerald-100 p-4 flex flex-col md:flex-row gap-4 justify-between items-center text-sm text-emerald-800">
                    <div className="flex items-center gap-2">
                        <Clock className="size-4" />
                        <span>Started: {run.actualStartDate ? format(new Date(run.actualStartDate), "p") : "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="size-4" />
                        <span>Completed: {run.actualCompletionDate ? format(new Date(run.actualCompletionDate), "p") : "Now"}</span>
                    </div>
                </CardFooter>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                <Card className="">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="size-4 text-muted-foreground" />
                            Material Consumption
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-sm text-muted-foreground">Chemical Cost</span>
                            <span className="font-mono font-medium">PKR {Number(run.totalChemicalCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-dashed">
                            <span className="text-sm text-muted-foreground">Packaging Cost</span>
                            <span className="font-mono font-medium">PKR {Number(run.totalPackagingCost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 pt-4">
                            <span className="font-bold">Total Cost</span>
                            <span className="font-mono font-bold text-lg">PKR {Number(run.totalProductionCost).toFixed(2)}</span>
                        </div>
                        <div className="bg-muted rounded p-3 text-center">
                            <p className="text-xs text-muted-foreground uppercase">Cost Per Unit</p>
                            <p className="font-mono font-bold">PKR {Number(run.costPerContainer).toFixed(2)}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4">
                    <Card className="flex-1 flex flex-col justify-center items-center p-6 text-center ">
                        <p className="text-muted-foreground mb-4">The production run has been finalized and stock has been updated automatically.</p>
                        <Button
                            onClick={() => navigate({ to: "/operator" })}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12"
                        >
                            Back to Dashboard
                            <ArrowRight className="ml-2 size-4" />
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}
