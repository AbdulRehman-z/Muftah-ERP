import {
	ArrowRightLeftIcon,
	Banknote,
	ClipboardListIcon,
	CookingPotIcon,
	Factory,
	LayoutDashboard,
	type LucideIcon,
	PackageSearch,
	ScrollText,
	Settings,
	ShoppingCart,
	Users,
	UsersIcon,
	WarehouseIcon,
} from "lucide-react";

export interface NavigationItem {
	title: string;
	url: string;
	icon?: LucideIcon;
	items?: NavigationItem[];
}

export const navigations: NavigationItem[] = [
	{
		title: "Dashboard",
		url: "/admin/dashboard",
		icon: LayoutDashboard,
	},
	{
		title: "Manufacturing",
		url: "/admin/manufacturing", // Assuming this exists or is the manufacturing dashboard
		icon: Factory,
		items: [
			{
				title: "Production Run",
				url: "/admin/manufacturing/productions",
				icon: ClipboardListIcon,
			},
			{
				title: "Recipes",
				url: "/admin/manufacturing/recipes",
				icon: CookingPotIcon
			},
		],
	},
	{
		title: "Inventory Management",
		url: "/admin/inventory",
		icon: PackageSearch,
		items: [
			{
				title: "Warehouses",
				url: "/admin/inventory/warehouses",
				icon: WarehouseIcon
			},
			{
				title: "Factory-Floor",
				url: "/admin/inventory/factory-floor",
				icon: ArrowRightLeftIcon,
			},
		],
	},
	{
		title: "Sales",
		url: "/admin/sales/new-invoice",
		icon: ShoppingCart,
		items: [
			{
				title: "New Invoice",
				url: "/admin/sales/new-invoice",
				icon: ScrollText,
			},
			{
				title: "Customers",
				url: "/admin/sales/customers",
				icon: UsersIcon
			},
		],
	},
	{
		title: "Finance",
		url: "/admin/finance/dashboard",
		icon: Banknote,
		items: [
			{
				title: "Overview",
				url: "/admin/finance/dashboard",
			},
			{
				title: "Expenses",
				url: "/admin/finance/expenses",
			},
		],
	},
	{
		title: "HR & Payroll",
		url: "/admin/hr",
		icon: Users,
	},
	{
		title: "Settings",
		url: "/admin/settings",
		icon: Settings,
	},
	{
		title: "User Management",
		url: "/admin/user-management",
		icon: Users,
	},
];
