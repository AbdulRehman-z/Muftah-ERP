import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/custom/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { requireAdminMiddleware, requireAuthMiddleware } from "@/lib/middlewares";

export const Route = createFileRoute("/_protected")({
	server: {
		middleware: [requireAuthMiddleware],
	},
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<SidebarProvider defaultOpen>
			<AppSidebar />
			<SidebarInset className="relative px-10 py-7 ">
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	)
}
