import { createFileRoute } from '@tanstack/react-router'
import { getEmployeeFn } from '@/server-functions/hr/employees/get-employee-fn'
import { EmployeeDetailView } from '@/components/hr/employees/employee-detail-view'
import { GenericLoader } from '@/components/custom/generic-loader'

export const Route = createFileRoute('/_protected/hr/employees/$employeeId')({
  loader: ({ params }) => getEmployeeFn({ data: { id: params.employeeId } }),
  pendingComponent: () => <div className="flex items-center justify-center h-screen">
    <GenericLoader
      title="Loading Employee"
      description="Please wait while we load the employee details."
    />
  </div>,
  component: RouteComponent,
})

function RouteComponent() {
  const employee = Route.useLoaderData()
  return <EmployeeDetailView employee={employee} />
}
