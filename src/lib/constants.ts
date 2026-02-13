import {
	ArrowRightLeftIcon,
	Banknote,
	ClipboardListIcon,
	CookingPotIcon,
	Factory,
	LayoutDashboard,
	type LucideIcon,
	NewspaperIcon,
	PackageSearch,
	ScrollText,
	Settings,
	ShoppingCart,
	ToolCaseIcon,
	UserCog,
	UserCogIcon,
	Users,
	UsersIcon,
	WarehouseIcon,
} from "lucide-react";

export interface NavigationItem {
	title: string;
	url: string;
	icon?: LucideIcon | React.ComponentType<any>;
	items?: NavigationItem[];
}

export const navigations: NavigationItem[] = [
	{
		title: "Dashboard",
		url: "/dashboard",
		icon: LayoutDashboard,
	},
	{
		title: "Manufacturing",
		url: "/manufacturing", // Assuming this exists or is the manufacturing dashboard
		icon: Factory,
		items: [
			{
				title: "Production Run",
				url: "/manufacturing/productions",
				icon: ClipboardListIcon,
			},
			{
				title: "Recipes",
				url: "/manufacturing/recipes",
				icon: CookingPotIcon
			},
		],
	},
	{
		title: "Inventory Management",
		url: "/inventory",
		icon: PackageSearch,
		items: [
			{
				title: "Warehouses",
				url: "/inventory/warehouses",
				icon: WarehouseIcon
			},
			{
				title: "Factory-Floor",
				url: "/inventory/factory-floor",
				icon: ArrowRightLeftIcon,
			},
		],
	},
	{
		title: "Suppliers",
		url: "/suppliers",
		icon: UserCogIcon,
	},
	{
		title: "Sales",
		url: "/sales/new-invoice",
		icon: ShoppingCart,
		items: [
			{
				title: "New Invoice",
				url: "/sales/new-invoice",
				icon: ScrollText,
			},
			{
				title: "Customers",
				url: "/sales/customers",
				icon: UsersIcon
			},
		],
	},
	{
		title: "Utilities",
		url: "/utilities",
		icon: NewspaperIcon,
	},
	{
		title: "HR & Payroll",
		url: "/hr",
		icon: Users,
	},
	{
		title: "Operator Interface",
		url: "/operator",
		icon: ToolCaseIcon,
	},
	{
		title: "User Management",
		url: "/user-management",
		icon: Users,
	},
	{
		title: "Settings",
		url: "/settings",
		icon: Settings,
	},
];
