import { createFileRoute } from '@tanstack/react-router'
import { getEmployeeFn } from '@/server-functions/hr/employees/get-employee-fn'
import { EmployeeDetailView } from '@/components/hr/employees/employee-detail-view'
import { Suspense } from 'react'
import { GenericLoader } from '@/components/custom/generic-loader'

export const Route = createFileRoute('/_protected/hr/employees/$employeeId')({
  loader: ({ params, context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ['employee', params.employeeId],
      queryFn: () => getEmployeeFn({ data: { id: params.employeeId } }),
      staleTime: 2 * 60 * 1000,

    })
  },

  component: RouteComponent,
})

function RouteComponent() {
  return <>
    <Suspense fallback={<GenericLoader />}>
      <EmployeeDetailView />
    </Suspense>
  </>
}
