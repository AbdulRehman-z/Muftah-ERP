import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, Search, ZapIcon } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { type NavigationItem, navigations } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";

/**
 * Checks if the current path matches or is contained within a navigation item's path
 */
const isPathActive = (pathname: string, itemPath: string): boolean => {
	return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

/**
 * Recursively checks if any nested item or the parent item is active
 */
const isItemOrChildActive = (
	pathname: string,
	item: NavigationItem,
): boolean => {
	if (isPathActive(pathname, item.url)) return true;
	if (item.items?.length) {
		return item.items.some((child) => isItemOrChildActive(pathname, child));
	}
	return false;
};

/**
 * Recursively filters navigation items based on search query
 */
const filterNavItems = (
	items: NavigationItem[],
	query: string,
): NavigationItem[] => {
	if (!query.trim()) return items;

	const lowerQuery = query.toLowerCase();

	return items.reduce((acc: NavigationItem[], item) => {
		const titleMatch = item.title.toLowerCase().includes(lowerQuery);
		const filteredChildren = item.items
			? filterNavItems(item.items, lowerQuery)
			: [];

		if (titleMatch || filteredChildren.length > 0) {
			acc.push({
				...item,
				items: filteredChildren.length > 0 ? filteredChildren : item.items,
			});
		}

		return acc;
	}, []);
};

interface NavItemProps {
	item: NavigationItem;
	pathname: string;
	searchActive?: boolean;
}

/**
 * Recursive navigation item component with support for nested items
 */
const NavItem = ({ item, pathname, searchActive = false }: NavItemProps) => {
	const [isOpen, setIsOpen] = useState(() =>
		item.items?.length
			? isItemOrChildActive(pathname, item) || searchActive
			: false,
	);
	const isActive = isPathActive(pathname, item.url);
	const hasChildren = item.items && item.items.length > 0;

	// Auto-expand when searching
	useState(() => {
		if (searchActive && hasChildren) {
			setIsOpen(true);
		}
	});

	if (!hasChildren) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					isActive={isActive}
					tooltip={item.title}
					className={cn(
						"transition-colors duration-200",
						isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
					)}
				>
					<Link to={item.url} preload="render">
						{item.icon && (
							<item.icon className={cn("size-4", isActive && "text-primary")} />
						)}
						<span className={cn(isActive && "text-primary")}>{item.title}</span>
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				onClick={() => setIsOpen(!isOpen)}
				className={cn(
					"transition-colors duration-200",
					isItemOrChildActive(pathname, item) &&
						"bg-sidebar-accent text-sidebar-accent-foreground",
				)}
				tooltip={item.title}
			>
				{item.icon && (
					<item.icon
						className={cn(
							"size-4",
							isItemOrChildActive(pathname, item) && "text-primary",
						)}
					/>
				)}
				<span
					className={cn(isItemOrChildActive(pathname, item) && "text-primary")}
				>
					{item.title}
				</span>
				<ChevronDown
					className={cn(
						"ml-auto size-4 transition-transform duration-200",
						isOpen && "rotate-180",
					)}
				/>
			</SidebarMenuButton>

			{hasChildren && isOpen && (
				<SidebarMenuSub>
					{item.items!.map((child) => (
						<SidebarMenuSubItem key={child.title}>
							<SidebarMenuSubButton
								asChild
								isActive={isPathActive(pathname, child.url)}
								className={cn(
									"transition-colors duration-200",
									isPathActive(pathname, child.url) &&
										"bg-sidebar-accent text-sidebar-accent-foreground",
								)}
							>
								<Link to={child.url} preload="render">
									{child.icon && <child.icon className="size-4" />}
									<span>{child.title}</span>
								</Link>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
					))}
				</SidebarMenuSub>
			)}
		</SidebarMenuItem>
	);
};

export const AppSidebar = () => {
	const router = useRouterState();
	const pathname = router.location.pathname;
	const [searchQuery, setSearchQuery] = useState("");

	const filteredNavigations = filterNavItems(navigations, searchQuery);
	const hasSearchQuery = searchQuery.trim().length > 0;

	return (
		<Sidebar collapsible="icon" variant="floating">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							asChild
							className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
						>
							<Link to="/admin/dashboard">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<ZapIcon className="size-4" />
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-semibold">Titan Enterprise</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>

				<div className="px-2 py-2">
					<div className="relative">
						<Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search navigation..."
							className="h-9 w-full bg-background pl-8"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						{filteredNavigations.length > 0 ? (
							filteredNavigations.map((item) => (
								<NavItem
									key={item.title}
									item={item}
									pathname={pathname}
									searchActive={hasSearchQuery}
								/>
							))
						) : (
							<div className="px-2 py-8 text-center">
								<p className="text-sm text-muted-foreground">
									No results found
								</p>
								<p className="mt-1 text-xs text-muted-foreground">
									Try a different search term
								</p>
							</div>
						)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
		</Sidebar>
	);
};
