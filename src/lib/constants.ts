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
  UserCogIcon,
  Users,
  UsersIcon,
  WarehouseIcon,
  WalletIcon,
  ReceiptIcon,
  BookOpenIcon,
  LandmarkIcon,
} from "lucide-react";

export interface NavigationItem {
  title: string;
  url: string;
  icon?: LucideIcon | React.ComponentType<any>;
  items?: NavigationItem[];
  exact?: boolean;
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
        icon: CookingPotIcon,
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
        icon: WarehouseIcon,
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
        exact: true,
      },
      {
        title: "Customers",
        url: "/sales/customers",
        icon: UsersIcon,
      },
    ],
  },
  {
    title: "Finance",
    url: "/finance",
    icon: LandmarkIcon,
    items: [
      {
        title: "Accounts",
        url: "/finance",
        icon: WalletIcon,
        exact: true,
      },
      {
        title: "Expenses",
        url: "/finance/expenses",
        icon: ReceiptIcon,
      },
      {
        title: "Ledger",
        url: "/finance/ledger",
        icon: BookOpenIcon,
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
    items: [
      {
        title: "Employees",
        url: "/hr/employees",
        icon: UsersIcon,
      },
      {
        title: "Attendance",
        url: "/hr/attendance",
        icon: ClipboardListIcon,
      },
      {
        title: "Approval Center",
        url: "/hr/approvals",
        icon: ClipboardListIcon,
      },
      {
        title: "Payroll",
        url: "/hr/payroll",
        icon: Banknote,
      },
    ],
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
