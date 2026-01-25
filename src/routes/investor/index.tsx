import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/investor/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/investor/dashboard"!</div>
}
