import {
	Banknote,
	Factory,
	LayoutDashboard,
	type LucideIcon,
	PackageSearch,
	ScrollText,
	Settings,
	ShoppingCart,
	Users,
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
			},
			{
				title: "Recipes / BOM",
				url: "/admin/manufacturing/recipes",
			},
		],
	},
	{
		title: "Inventory Management",
		url: "/admin/inventory",
		icon: PackageSearch,
		// items: [
		// 	{
		// 		title: "Stoc",
		// 		url: "/admin/inventory/dashboard",
		// 	},
		// 	// {
		// 	// 	title: "Transfers",
		// 	// 	url: "/admin/inventory/transfers",
		// 	// 	icon: ArrowRightLeft,
		// 	// },
		// ],
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
];
