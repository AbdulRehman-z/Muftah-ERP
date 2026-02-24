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
import { authClient } from "@/lib/auth-client";
import { ScrollArea } from "../ui/scroll-area";

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
          size="lg"
          tooltip={item.title}
          className={cn(
            "transition-all duration-300 relative group/btn",
            isActive
              ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
              : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
          )}
        >
          <Link
            to={item.url}
            className="flex items-center w-full group-data-[collapsible=icon]:justify-center"
          >
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_12px_rgba(var(--primary),0.8)] group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-0.5" />
            )}
            {item.icon && (
              <item.icon
                className={cn(
                  "size-[18px] shrink-0 transition-all duration-300",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover/btn:text-sidebar-foreground",
                )}
              />
            )}
            <span
              className={cn(
                "text-[15.5px] tracking-tight whitespace-nowrap group-data-[collapsible=icon]:hidden ml-2.5",
                isActive
                  ? "text-primary"
                  : "text-sidebar-foreground/70 group-hover/btn:text-sidebar-foreground",
              )}
            >
              {item.title}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        onClick={() => setIsOpen(!isOpen)}
        size="lg"
        tooltip={item.title}
        className={cn(
          "transition-all duration-300 relative group/btn",
          isItemOrChildActive(pathname, item)
            ? "bg-primary/5 text-primary font-semibold"
            : "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
        )}
      >
        {isItemOrChildActive(pathname, item) && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full group-data-[collapsible=icon]:h-4 group-data-[collapsible=icon]:w-0.5" />
        )}
        <div className="flex items-center w-full group-data-[collapsible=icon]:justify-center">
          {item.icon && (
            <item.icon
              className={cn(
                "size-[18px] shrink-0 transition-all duration-300",
                isItemOrChildActive(pathname, item)
                  ? "text-primary"
                  : "text-muted-foreground group-hover/btn:text-sidebar-foreground",
              )}
            />
          )}
          <span className="text-[15.5px] tracking-tight flex-1 text-left whitespace-nowrap group-data-[collapsible=icon]:hidden ml-2.5">
            {item.title}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 transition-transform duration-500 ease-in-out opacity-60 group-data-[collapsible=icon]:hidden",
              isOpen && "rotate-180 opacity-100",
            )}
          />
        </div>
      </SidebarMenuButton>

      {hasChildren && isOpen && (
        <SidebarMenuSub className="border-l border-primary/10 ml-5 pl-1.5 space-y-0.5 my-1">
          {item.items!.map((child) => (
            <SidebarMenuSubItem key={child.title}>
              <SidebarMenuSubButton
                asChild
                isActive={isPathActive(pathname, child.url)}
                className={cn(
                  "transition-all duration-200 h-9 px-4 relative group/sub",
                  isPathActive(pathname, child.url)
                    ? "text-foreground font-medium"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/30",
                )}
              >
                <Link to={child.url} preload="render">
                  <div
                    className={cn(
                      "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-0 transition-all duration-300 bg-primary/50 rounded-full",
                      isPathActive(pathname, child.url) && "h-4",
                    )}
                  />
                  {child.icon && (
                    <child.icon
                      className={cn(
                        "size-4 transition-colors",
                        isPathActive(pathname, child.url)
                          ? "text-primary"
                          : "text-muted-foreground group-hover/sub:text-sidebar-foreground",
                      )}
                    />
                  )}
                  <span className="text-[15px] group-data-[collapsible=icon]:hidden">
                    {child.title}
                  </span>
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

  const { data: session, isPending } = authClient.useSession();
  const userRole = session?.user?.role;

  if (isPending) {
    return (
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <div className="h-12 w-full animate-pulse bg-sidebar-accent/10 rounded-lg" />
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse bg-sidebar-accent/5 rounded-lg"
              />
            ))}
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  let visibleNavigations = navigations;

  if (userRole === "finance-manager") {
    visibleNavigations = navigations.filter((item) =>
      ["Sales", "Finance"].includes(item.title),
    );
  } else if (userRole === "operator") {
    visibleNavigations = navigations.filter((item) =>
      ["Operator Interface"].includes(item.title),
    );
  } else if (userRole === "admin") {
    visibleNavigations = navigations.filter(
      (item) => !["User Management", "Settings"].includes(item.title),
    );
  }

  const filteredNavigations = filterNavItems(visibleNavigations, searchQuery);
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
              <Link
                to="/dashboard"
                className="flex items-center w-full group-data-[collapsible=icon]:justify-center"
              >
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <ZapIcon className="size-5" />
                </div>
                <div className="flex flex-col gap-y-1 leading-none group-data-[collapsible=icon]:hidden ml-3">
                  <span className="font-semibold text-base whitespace-nowrap">
                    Titan Enterprise
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Management System
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {userRole !== "operator" && (
          <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
            <div className="relative group/search">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 transition-colors group-focus-within/search:text-primary" />
              <Input
                type="search"
                placeholder="Quick find..."
                className="h-9 w-full bg-muted/40 border-muted-foreground/10 pl-9 transition-all focus:bg-background focus:ring-1 focus:ring-primary/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
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
        </ScrollArea>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
};
