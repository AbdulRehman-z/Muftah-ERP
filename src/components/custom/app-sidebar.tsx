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
  useSidebar,
} from "@/components/ui/sidebar";
import { type NavigationItem, navigations } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { NavUser } from "./nav-user";
import { authClient } from "@/lib/auth-client";
import { ScrollArea } from "../ui/scroll-area";

// ── Path helpers ────────────────────────────────────────────────────────────

/**
 * Exact OR prefix match — only for leaf items (no children).
 * For parent items we use isChildExactlyActive instead.
 */
const isLeafActive = (pathname: string, itemPath: string, exact?: boolean): boolean =>
  pathname === itemPath || (!exact && pathname.startsWith(`${itemPath}/`));

/**
 * Returns true only if a CHILD of this group is the currently active route.
 * Never returns true for the parent itself being active — that's the fix for
 * the double-highlight bug (parent url === child url scenario).
 */
const isChildExactlyActive = (
  pathname: string,
  item: NavigationItem,
): boolean => {
  if (!item.items?.length) return false;
  return item.items.some((child) =>
    child.items?.length
      ? isChildExactlyActive(pathname, child)
      : isLeafActive(pathname, child.url, child.exact),
  );
};

/**
 * Used to auto-open a parent group on load.
 */
const isItemOrChildActive = (
  pathname: string,
  item: NavigationItem,
): boolean => {
  if (isLeafActive(pathname, item.url, item.exact)) return true;
  if (item.items?.length) {
    return item.items.some((child) => isItemOrChildActive(pathname, child));
  }
  return false;
};

// ── Search filter ────────────────────────────────────────────────────────────

const filterNavItems = (
  items: NavigationItem[],
  query: string,
): NavigationItem[] => {
  if (!query.trim()) return items;
  const q = query.toLowerCase();
  return items.reduce((acc: NavigationItem[], item) => {
    const titleMatch = item.title.toLowerCase().includes(q);
    const filteredChildren = item.items ? filterNavItems(item.items, q) : [];
    if (titleMatch || filteredChildren.length > 0) {
      acc.push({
        ...item,
        items: filteredChildren.length > 0 ? filteredChildren : item.items,
      });
    }
    return acc;
  }, []);
};

// ── NavItem ──────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: NavigationItem;
  pathname: string;
  searchActive?: boolean;
}

const NavItem = ({ item, pathname, searchActive = false }: NavItemProps) => {
  const { state, setOpen } = useSidebar();
  const hasChildren = !!(item.items && item.items.length > 0);

  // For parent items: active = any child is active
  // For leaf items: active = exact or prefix match
  const isActive = hasChildren
    ? isChildExactlyActive(pathname, item)
    : isLeafActive(pathname, item.url, item.exact);

  const [isOpen, setIsOpen] = useState(
    () => isActive || (hasChildren && isItemOrChildActive(pathname, item)) || searchActive,
  );

  // ── Leaf item ──────────────────────────────────────────────────────────
  if (!hasChildren) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          asChild
          isActive={isActive}
          tooltip={item.title}
          className={cn(
            "relative group/btn rounded-xl px-3 transition-all duration-200",
            isActive
              ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15 shadow-sm"
              : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
          )}
        >
          <Link
            to={item.url}
            className="flex items-center w-full gap-3 group-data-[collapsible=icon]:justify-center"
          >
            {/* Active left indicator bar */}
            {isActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full shadow-[0_0_8px_rgba(124,58,237,0.6)] group-data-[collapsible=icon]:hidden" />
            )}
            {item.icon && (
              <item.icon
                className={cn(
                  "size-[17px] shrink-0 transition-colors duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover/btn:text-sidebar-foreground",
                )}
              />
            )}
            <span
              className={cn(
                "text-[14.5px] font-medium tracking-tight whitespace-nowrap group-data-[collapsible=icon]:hidden",
                isActive ? "text-primary" : "",
              )}
            >
              {item.title}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  // ── Parent / group item ─────────────────────────────────────────────────
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        size="lg"
        onClick={() => {
          if (state === "collapsed") {
            setOpen(true);
            setIsOpen(true);
          } else {
            setIsOpen(!isOpen);
          }
        }}
        tooltip={item.title}
        className={cn(
          "relative group/btn rounded-xl px-3 transition-all duration-200",
          isActive
            ? "bg-primary/5 text-primary font-semibold hover:bg-primary/10"
            : "text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        )}
      >
        {/* Subtle left indicator when a child is active */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary/60 rounded-r-full group-data-[collapsible=icon]:hidden" />
        )}
        <div className="flex items-center w-full gap-3 group-data-[collapsible=icon]:justify-center">
          {item.icon && (
            <item.icon
              className={cn(
                "size-[17px] shrink-0 transition-colors duration-200",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground group-hover/btn:text-sidebar-foreground",
              )}
            />
          )}
          <span className="text-[14.5px] font-medium tracking-tight flex-1 text-left whitespace-nowrap group-data-[collapsible=icon]:hidden">
            {item.title}
          </span>
          <ChevronDown
            className={cn(
              "ml-auto size-4 transition-transform duration-300 ease-in-out opacity-50 group-data-[collapsible=icon]:hidden",
              isOpen && "rotate-180 opacity-80",
            )}
          />
        </div>
      </SidebarMenuButton>

      {/* Children */}
      {isOpen && (
        <SidebarMenuSub
          className={cn(
            "ml-5 pl-2 border-l my-0.5 space-y-0.5",
            isActive ? "border-primary/20" : "border-border/50",
          )}
        >
          {item.items!.map((child) => {
            const childActive = isLeafActive(pathname, child.url, child.exact);
            return (
              <SidebarMenuSubItem key={child.title}>
                <SidebarMenuSubButton
                  asChild
                  isActive={childActive}
                  className={cn(
                    "relative group/sub h-9 rounded-lg px-3 transition-all duration-200 text-[13px]",
                    childActive
                      ? "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                      : "text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                  )}
                >
                  <Link to={child.url} preload={false}>
                    {/* Sub-item active dot */}
                    {childActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3.5 bg-primary rounded-r-full" />
                    )}
                    {child.icon && (
                      <child.icon
                        className={cn(
                          "size-4 shrink-0 transition-colors",
                          childActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover/sub:text-sidebar-foreground",
                        )}
                      />
                    )}
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            );
          })}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
};

// ── AppSidebar ───────────────────────────────────────────────────────────────

export const AppSidebar = () => {
  const router = useRouterState();
  const pathname = router.location.pathname;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: session, isPending } = authClient.useSession();
  const userRole = session?.user?.role;

  if (isPending) {
    return (
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader className="p-3">
          <div className="h-11 w-full animate-pulse bg-sidebar-accent/20 rounded-xl" />
        </SidebarHeader>
        <SidebarContent>
          <div className="space-y-1.5 p-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-10 w-full animate-pulse bg-sidebar-accent/10 rounded-xl"
                style={{ animationDelay: `${i * 80}ms` }}
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
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <SidebarHeader className="px-3 pt-3 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-11 rounded-xl hover:bg-primary/5 transition-all duration-200 group/logo"
            >
              <Link
                to="/dashboard"
                className="flex items-center w-full gap-3 group-data-[collapsible=icon]:justify-center"
              >
                {/* Logo mark */}
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20 transition-all group-hover/logo:shadow-md group-hover/logo:scale-105">
                  <ZapIcon className="size-4" />
                </div>
                <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
                  <span className="font-bold text-[14px] tracking-tight">
                    Titan Enterprise
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium mt-0.5">
                    Management System
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Search */}
        {userRole !== "operator" && (
          <div className="relative group/search group-data-[collapsible=icon]:hidden mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 transition-colors group-focus-within/search:text-primary" />
            <Input
              type="search"
              placeholder="Quick find..."
              className="h-9 w-full bg-muted/40 border-border/40 pl-8 text-[13px] rounded-xl placeholder:text-muted-foreground/40 transition-all focus:bg-background focus:border-primary/30 focus:ring-1 focus:ring-primary/20 shadow-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </SidebarHeader>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="mx-3 h-px bg-border/40 group-data-[collapsible=icon]:mx-2" />

      {/* ── Nav items ──────────────────────────────────────────────────── */}
      <SidebarContent className="overflow-hidden">
        <ScrollArea className="h-full">
          <SidebarGroup className="px-2 py-2">
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
                <div className="px-3 py-10 text-center">
                  <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <Search className="size-4 text-muted-foreground/40" />
                  </div>
                  <p className="text-[13px] font-medium text-muted-foreground">
                    No results found
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground/60">
                    Try a different keyword
                  </p>
                </div>
              )}
            </SidebarMenu>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <div className="mx-3 h-px bg-border/40 group-data-[collapsible=icon]:mx-2" />

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <SidebarFooter className="px-3 py-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
};
