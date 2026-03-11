import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { SuppliersTable } from "./suppliers-table";
import { useSuspenseQuery } from "@tanstack/react-query";
import { GenericEmpty } from "../custom/empty";
import { SupplierEmptyIllustration } from "../illustrations/SupplierEmptyIllustration";
import {
  Plus,
  Search,
  Users,
  Wallet,
  Activity,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Card, CardContent } from "../ui/card";
import {
  isToday,
  isThisMonth,
  subDays,
  isAfter,
  startOfDay,
  subMonths,
} from "date-fns";

export const SupplierContainer = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");

  const { data: suppliers } = useSuspenseQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliersFn,
  });

  if (suppliers.length === 0) {
    return (
      <>
        <GenericEmpty
          className="mt"
          icon={SupplierEmptyIllustration}
          title="No Suppliers Found"
          description="You haven't added any suppliers yet. First, define a supplier then you can add transactions for it."
          ctaText="Add Supplier"
          onAddChange={setIsAddOpen}
        />
        <AddSupplierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
      </>
    );
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    // Search Filter
    const matchesSearch =
      supplier.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.supplierShopName || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      (supplier.phone || "").toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Date Filter
    if (dateFilter !== "all") {
      const createdAt = new Date(supplier.createdAt);
      if (dateFilter === "today" && !isToday(createdAt)) return false;
      if (dateFilter === "this_month" && !isThisMonth(createdAt)) return false;
      if (
        dateFilter === "last_7_days" &&
        !isAfter(createdAt, startOfDay(subDays(new Date(), 7)))
      )
        return false;
      if (
        dateFilter === "last_30_days" &&
        !isAfter(createdAt, startOfDay(subDays(new Date(), 30)))
      )
        return false;
    }

    return true;
  });

  // KPI Calculations
  const totalOutstanding = filteredSuppliers.reduce(
    (sum, s) => sum + s.balance,
    0,
  );
  const activeSuppliers = filteredSuppliers.filter(
    (s) => s.totalPurchases > 0,
  ).length;
  const recentlyAdded = filteredSuppliers.filter((s) =>
    isAfter(new Date(s.createdAt), startOfDays(subMonths(new Date(), 1))),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, shop, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Date Added" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="last_30_days">Last 30 Days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto">
          <Plus className="size-4 mr-2" />
          Add Supplier
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Suppliers"
          value={filteredSuppliers.length.toString()}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-50 dark:bg-blue-950/20"
        />
        <KPICard
          label="Total Outstanding"
          value={`₨ ${totalOutstanding.toLocaleString()}`}
          icon={Wallet}
          color="text-rose-600"
          bgColor="bg-rose-50 dark:bg-rose-950/20"
        />
        <KPICard
          label="Active Suppliers"
          value={activeSuppliers.toString()}
          icon={Activity}
          color="text-emerald-600"
          bgColor="bg-emerald-50 dark:bg-emerald-950/20"
          subtext="Suppliers with purchases"
        />
        <KPICard
          label="New This Month"
          value={recentlyAdded.toString()}
          icon={CalendarDays}
          color="text-violet-600"
          bgColor="bg-violet-50 dark:bg-violet-950/20"
          subtext="Added in last 30 days"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <SuppliersTable data={filteredSuppliers} />
      </div>

      <AddSupplierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
};

// Internal KPI Card component for consistent premium look
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  subtext,
}: {
  label: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
  subtext?: string;
}) {
  return (
    <Card className="overflow-hidden border-none shadow-sm bg-card/50 backdrop-blur-sm border-muted-foreground/5">
      <CardContent className="p-0">
        <div className="p-5 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className={`p-2 rounded-xl ${bgColor}`}>
              <Icon className={`size-5 ${color}`} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {label}
            </p>
            <h3 className={`text-2xl font-black tracking-tight ${color}`}>
              {value}
            </h3>
            {subtext && (
              <p className="text-[10px] font-semibold tracking-tight text-muted-foreground/70">
                {subtext}
              </p>
            )}
          </div>
          {/* Decorative subtle background element */}
          <div
            className={`absolute -bottom-2 -right-2 size-16 rounded-full opacity-10 ${bgColor}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

const startOfDays = (date: Date) => startOfDay(date);
