import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_protected/finance/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_protected/finance/"!</div>
}
