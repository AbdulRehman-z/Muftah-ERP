import { useNavigate } from "@tanstack/react-router";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2, HandCoins, AlertTriangle, ShieldAlert, Undo2, Ban } from "lucide-react";
import { DataTable } from "@/components/custom/data-table";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import {
  useDeleteEmployee,
  useApproveEmployeeDeletion,
  useCancelEmployeeDeletion
} from "@/hooks/hr/use-delete-employee";
import { RequestAdvanceDialog } from "@/components/hr/advances/request-advance-dialog";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";

type Employee = Awaited<ReturnType<typeof getEmployeesFn>>[0];

type Props = {
  data: Employee[];
};

export const EmployeesTable = ({ data }: Props) => {
  const navigate = useNavigate();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [advanceEmployeeId, setAdvanceEmployeeId] = useState<string | null>(null);

  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);
  const [approveConfirmationId, setApproveConfirmationId] = useState<string | null>(null);

  const deleteMutate = useDeleteEmployee();
  const approveMutate = useApproveEmployeeDeletion();
  const cancelMutate = useCancelEmployeeDeletion();

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
          | "resigned"
          | "pending_deletion";

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
          pending_deletion: {
            label: "Pending Deletion",
            class: "bg-rose-500/20 text-rose-600 border-rose-500/40 font-black animate-pulse",
          }
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
        const isPendingDeletion = employee.status === "pending_deletion";

        return (
          <div
            className="flex justify-end gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {!isPendingDeletion ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="View Highlights"
                  onClick={() => navigate({ to: `/hr/employees/${employee.id}` })}
                >
                  <Eye className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Request Advance"
                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/50"
                  onClick={() => setAdvanceEmployeeId(employee.id)}
                >
                  <HandCoins className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Edit Profile"
                  className="text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setEditingEmployee(employee)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Mark for Deletion"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirmationId(employee.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Approve Deletion"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/50"
                  onClick={() => setApproveConfirmationId(employee.id)}
                >
                  <ShieldAlert className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Cancel Deletion Request"
                  className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50"
                  onClick={() => cancelMutate.mutate({ data: { id: employee.id } })}
                >
                  <Undo2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const employeeToRequestDeletion = data.find(e => e.id === deleteConfirmationId);
  const employeeToApproveDeletion = data.find(e => e.id === approveConfirmationId);

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

      {!!advanceEmployeeId && (
        <RequestAdvanceDialog
          open={!!advanceEmployeeId}
          onOpenChange={(open) => !open && setAdvanceEmployeeId(null)}
          defaultEmployeeId={advanceEmployeeId}
        />
      )}

      {/* REQUEST DELETION DIALOG */}
      <ResponsiveDialog
        open={!!deleteConfirmationId}
        onOpenChange={(open) => !open && setDeleteConfirmationId(null)}
        title="Request Employee Deletion"
        description="Are you sure you want to request deletion for this employee? This will require administrative approval before data is removed."
        icon={Trash2}
      >
        <div className="space-y-6 pt-2">
          <div className="p-4 bg-muted border rounded-lg flex items-center gap-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <ShieldAlert className="size-6 text-destructive" />
            </div>
            <div>
              <p className="font-bold text-sm">{employeeToRequestDeletion?.firstName} {employeeToRequestDeletion?.lastName}</p>
              <p className="text-xs text-muted-foreground">{employeeToRequestDeletion?.designation}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold flex items-center gap-1.5 uppercase tracking-tight">
              <AlertTriangle className="size-3.5" /> Note
            </p>
            <p>This action marks the employee as "Pending Deletion". They will remain in the database until an admin approves the final removal of all records (Attendance, Payslips, Advances etc).</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setDeleteConfirmationId(null)} disabled={deleteMutate.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmationId && deleteMutate.mutate({ data: { id: deleteConfirmationId } }, { onSuccess: () => setDeleteConfirmationId(null) })}
              disabled={deleteMutate.isPending}
            >
              Request Deletion
            </Button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* APPROVE DELETION DIALOG (THE DESTRUCTIVE ONE) */}
      <ResponsiveDialog
        open={!!approveConfirmationId}
        onOpenChange={(open) => !open && setApproveConfirmationId(null)}
        title="Finalize Deletion"
        description="WARNING: This action is permanent and cannot be undone. All historical data including attendance, salary history, and advances will be wiped."
        icon={ShieldAlert}
        className="max-w-md"
      >
        <div className="space-y-6 pt-2 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-sm font-medium">You are about to permanently remove records for:</p>
            <p className="text-lg font-black text-rose-600 uppercase tabular-nums tracking-tight">
              {employeeToApproveDeletion?.firstName} {employeeToApproveDeletion?.lastName} ({employeeToApproveDeletion?.employeeCode})
            </p>
          </div>

          <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900 flex flex-col gap-2 text-rose-800 dark:text-rose-200">
            <p className="text-xs font-black uppercase flex items-center gap-2">
              <Ban className="size-4" /> Destructive Operation
            </p>
            <ul className="text-xs list-disc pl-4 space-y-1 text-left opacity-80">
              <li>Permanently deletes attendance history</li>
              <li>Wipes all past payslips and calculations</li>
              <li>Removes advance request history</li>
              <li>Cannot be reverted once confirmed</li>
            </ul>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pt-6">
            <Button
              variant="outline"
              className="flex-1 rounded-none h-11 font-bold order-2 md:order-1"
              onClick={() => setApproveConfirmationId(null)}
              disabled={approveMutate.isPending}
            >
              Go Back
            </Button>
            <Button
              variant="destructive"
              className="flex-[2] rounded-none h-11 font-black uppercase tracking-widest order-1 md:order-2"
              onClick={() => approveConfirmationId && approveMutate.mutate({ data: { id: approveConfirmationId } }, { onSuccess: () => setApproveConfirmationId(null) })}
              disabled={approveMutate.isPending}
            >
              {approveMutate.isPending ? "Removing..." : "Permanently Delete Data"}
            </Button>
          </div>
        </div>
      </ResponsiveDialog>
    </>
  );
};

