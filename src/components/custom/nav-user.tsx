import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";
import { ArrowLeftFromLine, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";

export function NavUser() {
	const { data: session, isPending } = authClient.useSession();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						toast.success("Signed out successfully");
						window.location.href = "/login";
					},
					onError: (ctx) => {
						toast.error(ctx.error.message || "Failed to sign out");
						setIsLoggingOut(false);
					},
				},
			});
		} catch (error: any) {
			toast.error(error.message || "An unexpected error occurred");
			setIsLoggingOut(false);
		}
	};

	if (isPending) {
		return (
			<div className="flex items-center gap-3 px-3 py-2">
				<div className="size-9 rounded-xl bg-muted animate-pulse" />
				<div className="flex-1 space-y-2">
					<div className="h-3 w-20 bg-muted animate-pulse rounded" />
					<div className="h-2 w-32 bg-muted animate-pulse rounded" />
				</div>
			</div>
		);
	}

	if (!session) return null;

	const { user } = session;

	return (
		<SidebarMenu className="gap-2">
			<SidebarMenuItem>
				<div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/20 border border-muted-foreground/5 mb-1 group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-0 transition-all duration-300">
					<Avatar className="h-9 w-9 border-2 border-background  rounded-xl shrink-0">
						<AvatarImage src={user.image || ""} alt={user.name} />
						<AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
							{user.name.charAt(0).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
						<span className="text-[13px] font-bold tracking-tight truncate">
							{user.name}
						</span>
						<span className="text-[11px] text-muted-foreground truncate leading-none mt-0.5">
							{user.email}
						</span>
						<div className="mt-1 group-data-[collapsible=icon]:hidden">
							<Badge variant="outline" className="h-4 text-[9px] uppercase tracking-wider font-bold bg-primary/5 text-primary/70 border-primary/10">
								{user.role}
							</Badge>
						</div>
					</div>
				</div>
			</SidebarMenuItem>

			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					disabled={isLoggingOut}
					className="w-full h-11 justify-start gap-3 [&:hover_svg]:motion-preset-wobble [&:hover_svg]:motion-duration-1000 font-bold text-[13px] px-3 group-data-[collapsible=icon]:justify-center hover:bg-destructive/10 hover:text-destructive group/logout rounded-xl border border-transparent hover:border-destructive/10 transition-all uppercase tracking-widest"
					onClick={handleLogout}
				>
					{isLoggingOut ? (
						<Loader2 className="size-5 shrink-0 animate-spin" />
					) : (
						<ArrowLeftFromLine className="size-5 shrink-0 text-muted-foreground group-hover/logout:text-destructive transition-colors" />
					)}
					<span className="group-data-[collapsible=icon]:hidden">
						{isLoggingOut ? "Logging out..." : "Logout"}
					</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
