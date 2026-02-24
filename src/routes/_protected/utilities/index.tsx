import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/utilities/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/utilities/dashboard"!</div>;
}
