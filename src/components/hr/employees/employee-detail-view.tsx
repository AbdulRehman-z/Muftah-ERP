import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import { getEmployeeFn } from "@/server-functions/hr/employees/get-employee-fn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Edit, Trash2, User, Building2, MapPin, Phone, CreditCard, Banknote, Briefcase, CalendarClock, LayoutDashboard } from "lucide-react";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { useDeleteEmployee } from "@/hooks/hr/use-delete-employee";
import { EmployeeAttendanceLog } from "@/components/hr/attendance/employee-attendance-log";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "@/components/ui/alert-dialog";

type Employee = Awaited<ReturnType<typeof getEmployeeFn>>;

interface Props {
    employee: Employee;
}

const statusStyles = {
    active: { label: "Active", class: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-bold" },
    on_leave: { label: "On Leave", class: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 font-bold" },
    terminated: { label: "Terminated", class: "bg-rose-500/15 text-rose-700 border-rose-500/30 font-bold" },
    resigned: { label: "Resigned", class: "bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold" },
};

export const EmployeeDetailView = ({ employee }: Props) => {
    const navigate = useNavigate();
    const [editOpen, setEditOpen] = useState(false);
    const deleteMutate = useDeleteEmployee();

    // Helper to sum up allowances for display
    const totalAllowances = [
        employee.houseRentAllowance,
        employee.utilitiesAllowance,
        employee.conveyanceAllowance,
        employee.bikeMaintenanceAllowance,
        employee.mobileAllowance,
        employee.fuelAllowance,
        employee.specialAllowance
    ].reduce((acc, curr) => acc + (parseFloat(curr || "0") || 0), 0);

    const grossSalary = (parseFloat(employee.basicSalary || "0") || 0) + totalAllowances;

    const handleDelete = () => {
        deleteMutate.mutate({ data: { id: employee.id } }, {
            onSuccess: () => navigate({ to: "/hr/employees" })
        });
    };

    const statusConfig = statusStyles[employee.status as keyof typeof statusStyles] || { label: employee.status, class: "" };

    return (
        <div className="space-y-6 pb-10 container mx-auto max-w-7xl">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate({ to: "/hr/employees" })}
                        className="rounded-full"
                    >
                        <ChevronLeft className="size-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-extrabold tracking-tight">{employee.firstName} {employee.lastName}</h1>
                            <Badge variant="outline" className={`px-2.5 py-0.5 text-xs uppercase tracking-wider ${statusConfig.class}`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Briefcase className="size-4" />
                            {employee.designation}
                            <span className="mx-1 opacity-30">•</span>
                            <span className="text-xs">
                                {employee.department}
                            </span>
                            <span className="mx-1 opacity-30">•</span>
                            <span className="text-xs italic bg-muted px-1.5 py-0.5 rounded font-mono">
                                {employee.employeeCode}
                            </span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setEditOpen(true)}
                    >
                        <Edit className="size-4 mr-2" />
                        Edit Profile
                    </Button>

                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon">
                                <Trash2 className="size-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the record for {employee.firstName} {employee.lastName}.
                                    This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={handleDelete}
                                >
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <LayoutDashboard className="size-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex items-center gap-2">
                        <CalendarClock className="size-4" />
                        Attendance
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-8 mt-6">
                    {/* Financial Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-primary/5 border-primary/20">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs uppercase font-bold tracking-wider text-primary/70">Basic Salary</CardDescription>
                                <CardTitle className="text-2xl font-bold text-primary">PKR {parseFloat(employee.basicSalary).toLocaleString()}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Total Allowances</CardDescription>
                                <CardTitle className="text-2xl font-bold">PKR {totalAllowances.toLocaleString()}</CardTitle>
                            </CardHeader>
                        </Card>
                        <Card className="bg-emerald-50/50 border-emerald-200">
                            <CardHeader className="pb-2">
                                <CardDescription className="text-xs uppercase font-bold tracking-wider text-emerald-700">Gross Monthly (Est.)</CardDescription>
                                <CardTitle className="text-2xl font-bold text-emerald-700">PKR {grossSalary.toLocaleString()}</CardTitle>
                            </CardHeader>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content Area */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Identity & Contact */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <User className="size-5 text-muted-foreground" />
                                        Personal Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Full Name</h4>
                                        <p className="text-base font-medium">{employee.firstName} {employee.lastName}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Employee Code</h4>
                                        <p className="text-base font-mono">{employee.employeeCode}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">CNIC</h4>
                                        <p className="text-base font-medium">{employee.cnic || "-"}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Phone</h4>
                                        <div className="flex items-center gap-2">
                                            <Phone className="size-4 text-muted-foreground" />
                                            <p className="text-base font-medium">{employee.phone || "-"}</p>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Address</h4>
                                        <div className="flex items-start gap-2">
                                            <MapPin className="size-4 text-muted-foreground mt-1" />
                                            <p className="text-base font-medium">{employee.address || "-"}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Compensation Structure */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-base">
                                        <Banknote className="size-5 text-muted-foreground" />
                                        Compensation Breakdown
                                    </CardTitle>
                                    <CardDescription>Detailed breakdown of salary and allowances.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Standard Components</h4>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                            <div className="p-3 border rounded-lg bg-muted/20">
                                                <p className="text-xs text-muted-foreground mb-1">Basic Salary</p>
                                                <p className="font-bold">PKR {parseFloat(employee.basicSalary).toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 border rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1">House Rent</p>
                                                <p className="font-semibold">PKR {parseFloat(employee.houseRentAllowance || "0").toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 border rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1">Utilities</p>
                                                <p className="font-semibold">PKR {parseFloat(employee.utilitiesAllowance || "0").toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 border rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1">Conveyance</p>
                                                <p className="font-semibold">PKR {parseFloat(employee.conveyanceAllowance || "0").toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {(employee.bikeMaintenanceAllowance || employee.mobileAllowance || employee.fuelAllowance) && (
                                        <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Field Allowances</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                <div className="p-3 border rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Bike Maintenance</p>
                                                    <p className="font-semibold">PKR {parseFloat(employee.bikeMaintenanceAllowance || "0").toLocaleString()}</p>
                                                </div>
                                                <div className="p-3 border rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Mobile Allowance</p>
                                                    <p className="font-semibold">PKR {parseFloat(employee.mobileAllowance || "0").toLocaleString()}</p>
                                                </div>
                                                <div className="p-3 border rounded-lg">
                                                    <p className="text-xs text-muted-foreground mb-1">Fuel Allowance</p>
                                                    <p className="font-semibold">PKR {parseFloat(employee.fuelAllowance || "0").toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {(employee.specialAllowance || employee.incentivePercentage) && (
                                        <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Incentives & Special</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                {employee.incentivePercentage && (
                                                    <div className="p-3 border border-amber-200 bg-amber-50 rounded-lg">
                                                        <p className="text-xs text-amber-700 font-medium mb-1">Sales Incentive</p>
                                                        <p className="font-bold text-amber-800">{employee.incentivePercentage}%</p>
                                                    </div>
                                                )}
                                                {employee.specialAllowance && (
                                                    <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-lg">
                                                        <p className="text-xs text-indigo-700 font-medium mb-1">Special Allowance</p>
                                                        <p className="font-bold text-indigo-800">PKR {parseFloat(employee.specialAllowance).toLocaleString()}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar Info */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Building2 className="size-4 text-muted-foreground" />
                                        Employment Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-sm text-muted-foreground">Employment Type</span>
                                        <Badge variant="secondary" className="font-medium capitalize">{employee.employmentType.replace("_", " ")}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-sm text-muted-foreground">Shift Type</span>
                                        <span className="font-medium">{employee.standardDutyHours} Hours</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b">
                                        <span className="text-sm text-muted-foreground">Operator Role</span>
                                        <Badge variant={employee.isOperator ? "default" : "outline"}>
                                            {employee.isOperator ? "Yes" : "No"}
                                        </Badge>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-muted-foreground">Joined On</span>
                                        <span className="font-medium">{format(new Date(employee.joiningDate), "MMM dd, yyyy")}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/30 border-dashed">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Quick Actions</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <Button variant="outline" className="w-full justify-start" onClick={() => navigate({ to: `/hr/details/${employee.id}/payslips` } as any)} disabled>
                                        <CreditCard className="mr-2 size-4" /> View Payslips (Coming Soon)
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="attendance" className="mt-6">
                    <EmployeeAttendanceLog employeeId={employee.id} showHeader={false} />
                </TabsContent>
            </Tabs>

            <EditEmployeeDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                employee={employee as any}
            />
        </div>
    );
};
