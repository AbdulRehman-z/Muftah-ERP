import { useSuspenseQuery } from "@tanstack/react-query";
import { listSalaryAdvancesFn } from "@/server-functions/hr/advances/advances-fn";
import { useState, useMemo } from "react";
import {
    ColumnDef,
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    flexRender
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RequestAdvanceDialog } from "./request-advance-dialog";
import { ApproveAdvanceDialog } from "./approve-advance-dialog";
import { useRejectSalaryAdvance } from "@/hooks/hr/use-salary-advances";
import { Search, Wallet, CheckCircle2, Clock, XCircle, Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GenericEmpty } from "@/components/custom/empty";
import { format, parseISO } from "date-fns";

export function AdvancesContainer() {
    const [globalFilter, setGlobalFilter] = useState("");
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [approveId, setApproveId] = useState<string | null>(null);
    const [approveAmount, setApproveAmount] = useState<string | null>(null);

    const rejectMutate = useRejectSalaryAdvance();

    // Fetch advance requests
    const { data: advances } = useSuspenseQuery({
        queryKey: ["salary-advances"],
        queryFn: () => listSalaryAdvancesFn({ data: { limit: 100 } }),
    });

    // KPI data
    const pendingSum = advances.filter(a => a.status === "pending").reduce((s, a) => s + parseFloat(a.amount), 0);
    const approvedSum = advances.filter(a => a.status === "approved" || a.status === "deducted").reduce((s, a) => s + parseFloat(a.amount), 0);

    const columns: ColumnDef<any>[] = useMemo(() => [
        {
            accessorKey: "employee",
            header: "Employee",
            cell: ({ row }) => {
                const emp = row.original.employee;
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border-2 border-background">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {emp.firstName[0]}{emp.lastName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm leading-tight">{emp.firstName} {emp.lastName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-medium">{emp.employeeCode}</span>
                        </div>
                    </div>
                );
            }
        },
        {
            accessorKey: "date",
            header: "Request Date",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-medium text-sm">{format(parseISO(row.original.date), "dd MMM yyyy")}</span>
                    <span className="text-xs text-muted-foreground">{row.original.reason}</span>
                </div>
            )
        },
        {
            accessorKey: "amount",
            header: "Amount",
            cell: ({ row }) => <span className="font-bold text-sm">PKR {parseFloat(row.original.amount).toLocaleString()}</span>
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                const s = row.original.status;
                const colors: any = {
                    pending: "bg-amber-100 text-amber-800 border-amber-200",
                    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
                    deducted: "bg-indigo-100 text-indigo-800 border-indigo-200",
                    rejected: "bg-rose-100 text-rose-800 border-rose-200",
                };
                return (
                    <Badge variant="outline" className={colors[s] || ""}>
                        {s.toUpperCase()}
                    </Badge>
                );
            }
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                if (row.original.status !== "pending") return null;

                return (
                    <div className="flex items-center gap-2 justify-end">
                        <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                setApproveAmount(row.original.amount);
                                setApproveId(row.original.id);
                            }}
                        >
                            <CheckCircle2 className="size-3" /> Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 gap-2 px-3"
                            disabled={rejectMutate.isPending}
                            onClick={() => rejectMutate.mutate({ data: { advanceId: row.original.id } })}
                        >
                            <XCircle className="size-3" /> Reject
                        </Button>
                    </div>
                );
            }
        }
    ], [rejectMutate]);

    const table = useReactTable({
        data: advances,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: { globalFilter },
        onGlobalFilterChange: setGlobalFilter,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder="Search employee or code..."
                        value={globalFilter ?? ""}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        className="pl-10 h-11 bg-card shadow-xs border-muted-foreground/20 rounded-xl"
                    />
                </div>
                <Button className="h-11  font-semibold tracking-tight" onClick={() => setIsRequestOpen(true)}>
                    <Plus className="mr-2 size-4" /> Request Advance
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard title="Total Requested" value={advances.length.toString()} subtext="Advances in history" icon={Wallet} />
                <KPICard title="Pending Approval" value={`PKR ${pendingSum.toLocaleString()}`} subtext={`${advances.filter(a => a.status === "pending").length} requests waiting`} icon={Clock} color="text-amber-600" />
                <KPICard title="Total Paid Out" value={`PKR ${approvedSum.toLocaleString()}`} subtext="Deducted & Un-deducted" icon={CheckCircle2} color="text-emerald-600" />
            </div>

            <div className="border border-muted-foreground/10 rounded-2xl bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-muted-foreground/10">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 py-4 h-14 first:pl-6 last:pr-6">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors border-b border-muted-foreground/5 last:border-0">
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id} className="py-2.5 text-sm first:pl-6 last:pr-6">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64">
                                        <GenericEmpty
                                            icon={Search}
                                            title="No results found"
                                            description="No salary advances found or matching your search."
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <RequestAdvanceDialog open={isRequestOpen} onOpenChange={setIsRequestOpen} />
            <ApproveAdvanceDialog
                open={!!approveId}
                onOpenChange={(open) => !open && setApproveId(null)}
                advanceId={approveId}
                amount={approveAmount}
            />
        </div>
    );
}

function KPICard({ title, value, subtext, icon: Icon, color = "text-foreground" }: { title: string; value: string; subtext: string; icon: any, color?: string }) {
    return (
        <Card>
            <CardContent className="p-0">
                <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2.5 rounded-xl bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <Icon className="size-5 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</p>
                        <h3 className={`text-2xl font-black tracking-tight ${color}`}>{value}</h3>
                        <p className="text-xs font-semibold tracking-tight text-muted-foreground/70">{subtext}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
