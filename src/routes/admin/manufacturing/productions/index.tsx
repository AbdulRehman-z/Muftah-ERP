import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/manufacturing/productions/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/manufacturing/productions"!</div>
}
