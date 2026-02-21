import { useSuspenseQuery } from "@tanstack/react-query";
import { getMonthlyPayrollTableFn } from "@/server-functions/hr/payroll/dashboard-fn";
import { format, startOfMonth } from "date-fns";
import { useState, useMemo } from "react";
import { DatePicker } from "@/components/custom/date-picker";
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
import { SalaryCalculatorSheet } from "@/components/hr/payroll/salary-calculator-sheet";
import { Calculator, Search, Eye, Edit, UserIcon, CheckCircle2, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "@tanstack/react-router";
import { GenericEmpty } from "../../custom/empty";

export type EmployeePayrollRow = {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation: string;
    department: string | null;
    joiningDate: string;
    basicSalary: string;
    standardSalary: string | null;
    hasPayslip: boolean;
    payslipId: string;
    netSalary: string;
    status: string;
    isEligible: boolean;
};

export function PayrollContainer() {
    // Default to today
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const month = format(selectedDate, "yyyy-MM");
    const [pageIndex, setPageIndex] = useState(0);

    const limit = 7;
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");

    // Fetch Table Data
    const { data } = useSuspenseQuery({
        queryKey: ["payroll-dashboard", month, pageIndex],
        queryFn: () => getMonthlyPayrollTableFn({ data: { month, limit, offset: pageIndex * limit } }),
    });

    const employees = data.employees as (EmployeePayrollRow & { missedLastMonth: boolean })[];

    if (employees.length === 0 && pageIndex === 0 && !globalFilter) {
        return (
            <GenericEmpty
                icon={UserIcon}
                title="No Employees Found"
                description="There are no active employees to process payroll for this month. Ensure employees are added and active in the system."
                ctaText="Go to Employees"
                onAddChange={() => { /* Navigate to employees or handle logic */ }}
            />
        );
    }

    const columns: ColumnDef<EmployeePayrollRow & { missedLastMonth: boolean }>[] = useMemo(() => [
        {
            accessorKey: "employeeCode",
            header: "Code",
            cell: ({ row }) => <span className="font-medium text-xs text-muted-foreground">{row.original.employeeCode}</span>,
        },
        {
            id: "name",
            accessorFn: row => `${row.firstName} ${row.lastName}`,
            header: "Employee",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border-2 border-background ">
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                            {row.original.firstName[0]}{row.original.lastName[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">{row.original.firstName} {row.original.lastName}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-tighter font-medium">{row.original.designation}</span>
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "standardSalary",
            header: "Standard Salary",
            cell: ({ row }) => (
                <span className="font-bold text-sm">
                    PKR {Math.round(parseFloat(row.original.standardSalary || "0")).toLocaleString()}
                </span>
            ),
        },
        {
            accessorKey: "isEligible",
            header: "Eligibility",
            cell: ({ row }) => (
                row.original.isEligible ? (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-emerald-50 text-emerald-700 border-emerald-200">Eligible</Badge>
                ) : (
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 bg-rose-50 text-rose-700 border-rose-200">Ineligible</Badge>
                )
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => {
                if (row.original.hasPayslip) {
                    return (
                        <div className="flex flex-col gap-1">
                            <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider">
                                Generated
                            </Badge>
                            <span className="text-[10px] font-bold text-emerald-600 ml-1">
                                PKR {Math.round(parseFloat(row.original.netSalary)).toLocaleString()}
                            </span>
                        </div>
                    );
                }
                return (
                    <div className="flex flex-col gap-1">
                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted border-none text-[10px] px-2 py-0.5 h-5 font-bold uppercase tracking-wider">
                            Pending
                        </Badge>
                        {row.original.missedLastMonth && (
                            <Badge variant="outline" className="text-[9px] px-1 h-4 bg-amber-50 text-amber-700 border-amber-200 border-dashed animate-pulse">Arrears Potential</Badge>
                        )}
                    </div>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const emp = row.original;
                return (
                    <div className="flex items-center gap-2 justify-end">
                        {emp.isEligible && (
                            <Button
                                size="sm"
                                variant={emp.hasPayslip ? "outline" : "default"}
                                className="h-8 gap-2 px-3"
                                onClick={() => {
                                    setSelectedEmployeeId(emp.id);
                                    setIsCalculatorOpen(true);
                                }}
                            >
                                {emp.hasPayslip ? (
                                    <>
                                        <Edit className="size-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Revise</span>
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="size-3" />
                                        <span className="text-[10px] font-bold uppercase tracking-tight">Process</span>
                                    </>
                                )}
                            </Button>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors" asChild title="View History">
                            <Link to={`/hr/payroll/employee/$employeeId`} params={{ employeeId: emp.id }}>
                                <Eye className="size-4" />
                            </Link>
                        </Button>
                    </div>
                );
            },
        },
    ], []);

    const table = useReactTable({
        data: employees,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        state: {
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
    });

    const totalPages = Math.ceil(data.totalEmployees / limit);

    return (
        <div className="space-y-6">
            {/* Toolbar */}
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
                <DatePicker
                    date={selectedDate}
                    onChange={(date) => {
                        if (date) {
                            setSelectedDate(date);
                            setPageIndex(0);
                        }
                    }}
                    placeholder="Select month"
                    className="w-[180px]"
                    formatStr="MMMM yyyy"
                />
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard
                    title="Total Budget"
                    value={`PKR ${Math.round(parseFloat(data.totalSalaryBudget)).toLocaleString()}`}
                    subtext="Expected monthly gross"
                    icon={Calculator}
                />
                <KPICard
                    title="Net Processed"
                    value={`PKR ${Math.round(parseFloat(data.totalNetProcessed)).toLocaleString()}`}
                    subtext={`${data.payslipsGeneratedCount} slips generated`}
                    icon={CheckCircle2}
                    color="text-emerald-600"
                />
                <KPICard
                    title="Remaining"
                    value={`PKR ${Math.round(parseFloat(data.totalSalaryBudget) - parseFloat(data.totalNetProcessed)).toLocaleString()}`}
                    subtext="To be processed"
                    icon={Clock}
                    color="text-amber-600"
                />
                <KPICard
                    title="Active Force"
                    value={data.activeCount.toString()}
                    subtext="Total eligible staff"
                    icon={UserIcon}
                />
            </div>

            {/* Table */}
            <div className="border border-muted-foreground/10 rounded-2xl bg-card  overflow-hidden">
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
                                            <TableCell key={cell.id} className="py-4 text-sm first:pl-6 last:pr-6">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64">
                                        <GenericEmpty
                                            icon={Search}
                                            title="No results found"
                                            description="Try adjusting your search or filters to find what you're looking for."
                                        />
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-muted-foreground/10 bg-muted/10">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Page {pageIndex + 1} of {Math.max(1, totalPages)} <span className="mx-2">•</span> {data.totalEmployees} Total Staff
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex(p => Math.max(0, p - 1))}
                            disabled={pageIndex === 0}
                            className="h-9 px-4 rounded-lg bg-card text-[10px] uppercase font-black tracking-widest hover:bg-primary/5 hover:text-primary transition-all shadow-xs"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPageIndex(p => p + 1)}
                            disabled={pageIndex >= totalPages - 1}
                            className="h-9 px-4 rounded-lg bg-card text-[10px] uppercase font-black tracking-widest hover:bg-primary/5 hover:text-primary transition-all shadow-xs"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>

            {/* Slide-over Calculator */}
            <SalaryCalculatorSheet
                isOpen={isCalculatorOpen}
                onClose={() => {
                    setIsCalculatorOpen(false);
                    setSelectedEmployeeId(null);
                }}
                employeeId={selectedEmployeeId}
                month={month}
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
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {title}
                        </p>
                        <h3 className={`text-2xl font-black tracking-tight ${color}`}>
                            {value}
                        </h3>
                        <p className="text-[10px] font-medium text-muted-foreground/70">
                            {subtext}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
