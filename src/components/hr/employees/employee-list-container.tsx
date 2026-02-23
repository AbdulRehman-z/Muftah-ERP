import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmployeesTable } from "./employees-table";
import { AddEmployeeSheet } from "./add-employee-sheet";

export const EmployeeListContainer = () => {
    const [openAddSheet, setOpenAddSheet] = useState(false);

    const { data: employees } = useSuspenseQuery({
        queryKey: ["employees"],
        queryFn: getEmployeesFn,
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                    {/* Filter buttons can be added here if needed, or DataTable actions prop */}
                </div>
                <Button onClick={() => setOpenAddSheet(true)} className="w-full sm:w-auto">
                    <PlusIcon className="mr-2 size-4" />
                    Add New Employee
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employees.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {employees.filter(e => e.status === 'active').length} Active
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">New Hires (This Month)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {employees.filter(e => new Date(e.joiningDate).getMonth() === new Date().getMonth()).length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Recently joined</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll Cost (Est.)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            PKR {employees
                                .filter(e => e.status === 'active')
                                .reduce((acc, curr) => acc + (parseFloat(curr.standardSalary || "0")), 0) // Roughly 2x basic is total comp based on ratio
                                .toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Monthly estimated cost</p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee Directory</CardTitle>
                    <CardDescription>Manage your team, roles, and compensation details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <EmployeesTable data={employees} />
                </CardContent>
            </Card>

            <AddEmployeeSheet open={openAddSheet} onOpenChange={setOpenAddSheet} />
        </div>
    );
};
