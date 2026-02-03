import { ArrowLeftFromLine } from "lucide-react";
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "../ui/sidebar";

export function NavUser() {
	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton
					size="lg"
					className="w-full justify-start gap-2 [&:hover_svg]:motion-preset-wobble [&:hover_svg]:motion-duration-1000 font-semibold text-base px-3 group-data-[collapsible=icon]:justify-center"
					onClick={() => { }}
				>
					<ArrowLeftFromLine className="size-5 shrink-0" />
					<span className="group-data-[collapsible=icon]:hidden">Sign out</span>
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
