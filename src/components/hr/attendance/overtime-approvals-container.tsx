import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getOvertimeApprovalsFn } from "@/server-functions/hr/attendance/get-overtime-approvals-fn";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { GenericEmpty } from "@/components/custom/empty";
import { HREmptyIllustration } from "@/components/illustrations/HREmptyIllustration";
import { Clock, Check, X, AlertCircle, FileClock, ShieldCheck } from "lucide-react";
import { useProcessOvertime } from "@/hooks/hr/use-process-overtime";
import { format, parseISO } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export function OvertimeApprovalsContainer() {
    const [status, setStatus] = useState<FilterStatus>("pending");

    const { data } = useSuspenseQuery({
        queryKey: ["overtime-approvals", status],
        queryFn: () => getOvertimeApprovalsFn({ data: { status } }),
    });

    const { records, stats } = data;
    const mutateOT = useProcessOvertime();

    const handleProcess = (id: string, newStatus: "approved" | "rejected" | "pending") => {
        mutateOT.mutate({ id, status: newStatus });
    };

    const columns = useMemo<ColumnDef<any>[]>(
        () => [
            {
                accessorKey: "employeeCode",
                header: "Code",
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {row.original.employeeCode}
                    </span>
                ),
            },
            {
                id: "employee",
                accessorFn: (row) => `${row.firstName} ${row.lastName}`,
                header: "Employee",
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">
                            {row.original.firstName} {row.original.lastName}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                            {row.original.designation}
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "date",
                header: "Date",
                cell: ({ row }) => (
                    <span className="text-xs font-medium">
                        {format(parseISO(row.original.date), "dd MMM yyyy")}
                    </span>
                ),
            },
            {
                id: "hours",
                header: "Hours",
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground font-semibold tabular-nums">
                            Duty: {row.original.dutyHours}h
                        </span>
                        <span
                            className={cn(
                                "text-xs font-black tabular-nums tracking-tight",
                                row.original.overtimeStatus === "approved"
                                    ? "text-emerald-500"
                                    : row.original.overtimeStatus === "rejected"
                                        ? "text-rose-500 line-through opacity-70"
                                        : "text-amber-500"
                            )}
                        >
                            OT: +{row.original.overtimeHours}h
                        </span>
                    </div>
                ),
            },
            {
                accessorKey: "overtimeRemarks",
                header: "Operator Remarks",
                cell: ({ row }) => (
                    <div className="max-w-[220px]">
                        <span
                            className="text-xs text-muted-foreground line-clamp-2"
                            title={row.original.overtimeRemarks}
                        >
                            {row.original.overtimeRemarks || "No reason provided"}
                        </span>
                    </div>
                ),
            },
            {
                id: "statusBadge",
                header: "Status",
                cell: ({ row }) => {
                    const s = row.original.overtimeStatus;
                    if (s === "approved") {
                        return (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold uppercase text-[10px]">
                                Approved
                            </Badge>
                        );
                    }
                    if (s === "rejected") {
                        return (
                            <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-bold uppercase text-[10px]">
                                Rejected
                            </Badge>
                        );
                    }
                    return (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold uppercase text-[10px] animate-pulse">
                            Pending
                        </Badge>
                    );
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    // Provide undo capabilities if already approved/rejected,
                    // or quick actions if pending
                    const isPending = row.original.overtimeStatus === "pending";

                    return (
                        <div className="flex items-center gap-2 justify-end pr-2">
                            {isPending ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30"
                                        onClick={() => handleProcess(row.original.id, "approved")}
                                        disabled={mutateOT.isPending}
                                        title="Approve OT"
                                    >
                                        <Check className="size-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 border-rose-500/30 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-rose-50/50 dark:bg-rose-950/20 dark:hover:bg-rose-900/30"
                                        onClick={() => handleProcess(row.original.id, "rejected")}
                                        disabled={mutateOT.isPending}
                                        title="Reject OT"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs font-semibold text-muted-foreground hover:text-primary"
                                    onClick={() => handleProcess(row.original.id, "pending")}
                                    disabled={mutateOT.isPending}
                                >
                                    Reset to Pending
                                </Button>
                            )}
                        </div>
                    );
                },
            },
        ],
        [mutateOT.isPending] // eslint-disable-line react-hooks/exhaustive-deps
    );

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    title="Pending Requests"
                    value={stats.pendingRequests}
                    subValue={`${stats.pendingHours.toFixed(1)} hrs pending`}
                    icon={Clock}
                    color="amber"
                    active={status === "pending"}
                    onClick={() => setStatus("pending")}
                />
                <KPICard
                    title="Approved (Cycle)"
                    value={stats.approvedRequests}
                    subValue={`${stats.approvedHours.toFixed(1)} hrs approved`}
                    icon={ShieldCheck}
                    color="emerald"
                    active={status === "approved"}
                    onClick={() => setStatus("approved")}
                />
                <KPICard
                    title="Rejected (Cycle)"
                    value={stats.rejectedRequests}
                    subValue={`${stats.rejectedHours.toFixed(1)} hrs rejected`}
                    icon={AlertCircle}
                    color="rose"
                    active={status === "rejected"}
                    onClick={() => setStatus("rejected")}
                />
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <Tabs value={status} onValueChange={(v) => setStatus(v as FilterStatus)} className="w-full">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                        <TabsList className="bg-muted/50 p-1 border">
                            <TabsTrigger value="pending" className="text-xs font-bold uppercase tracking-wider px-4">Pending</TabsTrigger>
                            <TabsTrigger value="approved" className="text-xs font-bold uppercase tracking-wider px-4">Approved</TabsTrigger>
                            <TabsTrigger value="rejected" className="text-xs font-bold uppercase tracking-wider px-4">Rejected</TabsTrigger>
                            <TabsTrigger value="all" className="text-xs font-bold uppercase tracking-wider px-4">All History</TabsTrigger>
                        </TabsList>

                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <FileClock className="size-4" />
                            Showing <strong>{status.toUpperCase()}</strong> requests
                        </div>
                    </div>

                    <TabsContent value={status} className="mt-0 outline-none">
                        {records.length === 0 ? (
                            <div className="py-12 border rounded-xl bg-muted/20">
                                <GenericEmpty
                                    icon={HREmptyIllustration}
                                    title="All caught up!"
                                    description={`No ${status !== "all" ? status : ""} overtime requests found in this view.`}
                                />
                            </div>
                        ) : (
                            <DataTable
                                columns={columns}
                                data={records}
                                searchKey="employee"
                                searchPlaceholder="Search by employee name..."
                                pageSize={10}
                                className="border-none shadow-none"
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// Sub-component for KPI Cards
function KPICard({
    title,
    value,
    subValue,
    icon: Icon,
    color,
    active,
    onClick,
}: {
    title: string;
    value: number;
    subValue: string;
    icon: any;
    color: "amber" | "emerald" | "rose";
    active: boolean;
    onClick: () => void;
}) {
    const colorMap = {
        amber: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800",
        emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800",
        rose: "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800",
    };

    const textMap = {
        amber: "text-amber-600 dark:text-amber-400",
        emerald: "text-emerald-600 dark:text-emerald-400",
        rose: "text-rose-600 dark:text-rose-400",
    };

    const ringMap = {
        amber: "ring-2 ring-offset-1 ring-amber-500 dark:ring-offset-background border-transparent text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30",
        emerald: "ring-2 ring-offset-1 ring-emerald-500 dark:ring-offset-background border-transparent text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30",
        rose: "ring-2 ring-offset-1 ring-rose-500 dark:ring-offset-background border-transparent text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/30",
    };

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all hover:shadow-md border",
                active ? ringMap[color] : "border-border/60 hover:border-primary/30"
            )}
            onClick={onClick}
        >
            <CardContent className="p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <div className={cn("p-2 rounded-xl", colorMap[color].split(' ')[2], colorMap[color].split(' ')[3])}>
                        <Icon className={cn("size-5", textMap[color])} />
                    </div>
                    {active && <Badge variant="secondary" className="text-[9px] uppercase font-black">Active View</Badge>}
                </div>
                <div>
                    <p className="text-2xl font-black tabular-nums tracking-tighter">{value}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</p>
                </div>
                <div className={cn("text-xs font-semibold mt-1", textMap[color])}>
                    {subValue}
                </div>
            </CardContent>
        </Card>
    );
}
