import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "@/components/custom/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
	server: {
		middleware: [],
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
	);
}
