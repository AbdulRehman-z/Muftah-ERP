import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/sales/customers/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/sales/customers/"!</div>
}
