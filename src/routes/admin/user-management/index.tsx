import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/user-management/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/user-management/"!</div>
}
