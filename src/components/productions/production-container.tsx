import { useSuspenseQuery } from "@tanstack/react-query";
import { PlusIcon, Search } from "lucide-react";
import { useState } from "react";
import { getPaginatedProductionRunsFn } from "@/server-functions/inventory/production/get-paginated-production-runs-fn";
import { GenericEmpty } from "../custom/empty";
import { InventoryEmptyIllustration } from "@/components/illustrations/InventoryEmptyIllustration";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { ProductionRunsTable } from "./production-runs-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { InitiateProductionSheet } from "./initiate-production-sheet";
import { useProductionRunsSync } from "@/hooks/production/use-production-runs-sync";

export const ProductionRunsContainer = () => {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const { data } = useSuspenseQuery({
    queryKey: [
      "production-runs",
      {
        search: searchQuery,
        dateFilter,
        statusFilter,
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
      },
    ],
    queryFn: () =>
      getPaginatedProductionRunsFn({
        data: {
          search: searchQuery,
          dateFilter,
          statusFilter,
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
        },
      }),
  });

  const { runs, totalCount, metrics } = data;

  // Smart polling — invalidates "production-runs" prefix, which matches this queryKey
  useProductionRunsSync();

  const isFilterActive =
    searchQuery !== "" || dateFilter !== "all" || statusFilter !== "all";

  if (totalCount === 0 && !isFilterActive) {
    return (
      <>
        <GenericEmpty
          icon={InventoryEmptyIllustration}
          title="No Production Runs Yet"
          description="Start your first production run to begin manufacturing. The system will automatically calculate costs and deduct materials."
          ctaText="Start Production Run"
          onAddChange={setCreateDialogOpen}
        />
        <InitiateProductionSheet
          open={isCreateDialogOpen}
          onOpenChange={setCreateDialogOpen}
        />
      </>
    );
  }

  // Helper to reset pagination when filters change
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleDateFilterChange = (val: string) => {
    setDateFilter(val);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by batch ID..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={handleDateFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Date Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last_7_days">Last 7 Days</SelectItem>
                <SelectItem value="this_month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="w-full sm:w-auto"
        >
          <PlusIcon className="size-4 mr-2" />
          New Production Run
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeRuns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Production Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              PKR {Number(metrics.totalCost || 0).toLocaleString("en-PK")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Packs Produced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Number(metrics.packsProduced || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Runs Table */}
      <ProductionRunsTable
        runs={runs}
        manualPagination={true}
        pageCount={Math.ceil(totalCount / pagination.pageSize)}
        pagination={pagination}
        onPaginationChange={setPagination}
        totalRecords={totalCount}
      />

      <InitiateProductionSheet
        open={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};
