import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/custom/auth-header";
import { CompanyName } from "@/components/custom/companyName";
import { requireNoAuthMiddleware } from "@/lib/middlewares";

export const Route = createFileRoute("/_authLayout")({
	// server: {
	// 	middleware: [requireNoAuthMiddleware],
	// },
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="grid min-h-screen lg:grid-cols-3">
			{/* Left side: Stunning Branding */}
			<CompanyName />

			{/* Right side: Header and Form content */}
			<div className="flex flex-col col-span-2">
				<header className="p-4 md:p-8">
					<Header />
				</header>
				<main className="flex flex-1 items-center justify-center p-4 md:p-8 ">
					<div className="w-full max-w-md ">
						<Outlet />
					</div>
				</main>
			</div>
		</div>
	);
}
