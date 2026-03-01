import { useNavigate } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { useDeleteEmployee } from "@/hooks/hr/use-delete-employee";
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

type Employee = Awaited<ReturnType<typeof getEmployeesFn>>[0];

type Props = {
  data: Employee[];
};

export const EmployeesTable = ({ data }: Props) => {
  const navigate = useNavigate();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const deleteMutate = useDeleteEmployee();

  const columns: ColumnDef<Employee>[] = [
    {
      accessorKey: "employeeCode",
      header: "Code",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.employeeCode}</span>
      ),
    },
    {
      accessorKey: "firstName",
      header: "Name",
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </span>
      ),
    },
    {
      accessorKey: "designation",
      header: "Job Title",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span>{row.original.designation}</span>
          <span className="text-xs text-muted-foreground">
            {row.original.department}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "standardSalary",
      header: "Standard Salary",
      cell: ({ row }) => (
        <span>
          PKR {parseFloat(row.original.standardSalary || "0").toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.original.status as
          | "active"
          | "on_leave"
          | "terminated"
          | "resigned";

        const statusStyles = {
          active: {
            label: "Active",
            class:
              "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 font-bold",
          },
          on_leave: {
            label: "On Leave",
            class:
              "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 font-bold",
          },
          terminated: {
            label: "Terminated",
            class: "bg-rose-500/15 text-rose-700 border-rose-500/30 font-bold",
          },
          resigned: {
            label: "Resigned",
            class:
              "bg-amber-500/15 text-amber-700 border-amber-500/30 font-bold",
          },
        };

        const config = statusStyles[status] || { label: status, class: "" };

        return (
          <Badge
            variant="outline"
            className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${config.class}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const employee = row.original;
        return (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate({ to: `/hr/employees/${employee.id}` })}
            >
              <Eye className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => setEditingEmployee(employee)}
            >
              <Pencil className="size-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the employee "
                    {employee.firstName} {employee.lastName}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() =>
                      deleteMutate.mutate({ data: { id: employee.id } })
                    }
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <DataTable
        pageSize={20}
        columns={columns}
        data={data}
        searchKey="firstName"
        searchPlaceholder="Filter employees..."
      />

      {editingEmployee && (
        <EditEmployeeDialog
          open={!!editingEmployee}
          onOpenChange={(open) => !open && setEditingEmployee(null)}
          employee={editingEmployee}
        />
      )}
    </>
  );
};
