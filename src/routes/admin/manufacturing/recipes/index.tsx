import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/manufacturing/recipes/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/manufacturing/recipes"!</div>
}
