import { useState, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getLeaveApprovalsFn } from "@/server-functions/hr/attendance/leave-approvals-fn";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { GenericEmpty } from "@/components/custom/empty";
import { HREmptyIllustration } from "@/components/illustrations/HREmptyIllustration";
import {
    CalendarX,
    Check,
    X,
    FileClock,
} from "lucide-react";
import { useProcessLeaveApproval } from "@/hooks/hr/use-process-leave-approval";
import { format, parseISO } from "date-fns";
import { DataTable } from "@/components/custom/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type FilterStatus = "pending" | "approved" | "rejected" | "all";

const LEAVE_TYPE_LABELS: Record<string, string> = {
    annual: "Annual Leave",
    sick: "Sick Leave",
    special: "Special Leave",
    casual: "Casual Leave",
    unpaid: "Unpaid Leave",
};

export function LeaveApprovalsContainer() {
    const [status, setStatus] = useState<FilterStatus>("pending");

    const { data } = useSuspenseQuery({
        queryKey: ["leave-approvals", status],
        queryFn: () => getLeaveApprovalsFn({ data: { status } }),
    });

    const { records, stats } = data;
    const mutation = useProcessLeaveApproval();

    const handleProcess = (
        id: string,
        newStatus: "approved" | "rejected" | "pending"
    ) => {
        mutation.mutate({ id, status: newStatus });
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
                accessorKey: "leaveType",
                header: "Leave Type",
                cell: ({ row }) => {
                    const lt = row.original.leaveType;
                    return (
                        <Badge
                            variant="outline"
                            className="text-[10px] font-bold uppercase"
                        >
                            {lt ? LEAVE_TYPE_LABELS[lt] || lt : "—"}
                        </Badge>
                    );
                },
            },
            {
                accessorKey: "notes",
                header: "Notes / Reason",
                cell: ({ row }) => (
                    <div className="max-w-[200px]">
                        <span
                            className="text-xs text-muted-foreground line-clamp-2"
                            title={row.original.notes}
                        >
                            {row.original.notes || "—"}
                        </span>
                    </div>
                ),
            },
            {
                id: "statusBadge",
                header: "Status",
                cell: ({ row }) => {
                    const s = row.original.leaveApprovalStatus;
                    if (s === "approved")
                        return (
                            <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 font-bold uppercase text-[10px]"
                            >
                                Approved
                            </Badge>
                        );
                    if (s === "rejected")
                        return (
                            <Badge
                                variant="outline"
                                className="bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20 font-bold uppercase text-[10px]"
                            >
                                Rejected
                            </Badge>
                        );
                    return (
                        <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 font-bold uppercase text-[10px] animate-pulse"
                        >
                            Pending
                        </Badge>
                    );
                },
            },
            {
                id: "actions",
                header: "Actions",
                cell: ({ row }) => {
                    const isPending =
                        row.original.leaveApprovalStatus === "pending";
                    return (
                        <div className="flex items-center gap-2 justify-end pr-2">
                            {isPending ? (
                                <>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30"
                                        onClick={() =>
                                            handleProcess(row.original.id, "approved")
                                        }
                                        disabled={mutation.isPending}
                                        title="Approve Leave (no deduction)"
                                    >
                                        <Check className="size-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 border-rose-500/30 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-rose-50/50 dark:bg-rose-950/20 dark:hover:bg-rose-900/30"
                                        onClick={() =>
                                            handleProcess(row.original.id, "rejected")
                                        }
                                        disabled={mutation.isPending}
                                        title="Reject Leave (deduction applies)"
                                    >
                                        <X className="size-4" />
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs font-semibold text-muted-foreground hover:text-primary"
                                    onClick={() =>
                                        handleProcess(row.original.id, "pending")
                                    }
                                    disabled={mutation.isPending}
                                >
                                    Reset to Pending
                                </Button>
                            )}
                        </div>
                    );
                },
            },
        ],
        [mutation.isPending] // eslint-disable-line react-hooks/exhaustive-deps
    );

    return (
        <div className="space-y-6">
            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: "Pending", count: stats.pendingCount, color: "amber" },
                    { label: "Approved", count: stats.approvedCount, color: "emerald" },
                    { label: "Rejected", count: stats.rejectedCount, color: "rose" },
                ].map((s) => (
                    <div
                        key={s.label}
                        className={cn(
                            "flex items-center justify-between p-3 rounded-xl border transition-all",
                            s.label.toLowerCase() === status
                                ? `ring-2 ring-${s.color}-500 ring-offset-1 dark:ring-offset-background`
                                : "border-border/60 hover:border-primary/30"
                        )}
                        onClick={() =>
                            setStatus(s.label.toLowerCase() as FilterStatus)
                        }
                        role="button"
                    >
                        <div>
                            <p className="text-2xl font-black tabular-nums">{s.count}</p>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                {s.label}
                            </p>
                        </div>
                        <CalendarX
                            className={cn(
                                "size-5",
                                s.color === "amber" && "text-amber-500",
                                s.color === "emerald" && "text-emerald-500",
                                s.color === "rose" && "text-rose-500"
                            )}
                        />
                    </div>
                ))}
            </div>

            <div className="bg-card border rounded-2xl p-4 shadow-sm">
                <Tabs
                    value={status}
                    onValueChange={(v) => setStatus(v as FilterStatus)}
                    className="w-full"
                >
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                        <TabsList className="bg-muted/50 p-1 border">
                            <TabsTrigger
                                value="pending"
                                className="text-xs font-bold uppercase tracking-wider px-4"
                            >
                                Pending
                            </TabsTrigger>
                            <TabsTrigger
                                value="approved"
                                className="text-xs font-bold uppercase tracking-wider px-4"
                            >
                                Approved
                            </TabsTrigger>
                            <TabsTrigger
                                value="rejected"
                                className="text-xs font-bold uppercase tracking-wider px-4"
                            >
                                Rejected
                            </TabsTrigger>
                            <TabsTrigger
                                value="all"
                                className="text-xs font-bold uppercase tracking-wider px-4"
                            >
                                All
                            </TabsTrigger>
                        </TabsList>
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                            <FileClock className="size-4" />
                            Showing <strong>{status.toUpperCase()}</strong> leave requests
                        </div>
                    </div>

                    <TabsContent value={status} className="mt-0 outline-none">
                        {records.length === 0 ? (
                            <div className="py-12 border rounded-xl bg-muted/20">
                                <GenericEmpty
                                    icon={HREmptyIllustration}
                                    title="All caught up!"
                                    description={`No ${status !== "all" ? status : ""} leave requests found.`}
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
