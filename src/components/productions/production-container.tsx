import { useSuspenseQuery } from "@tanstack/react-query";
import { Factory, PlusIcon, Search } from "lucide-react";
import { useState } from "react";
import { getProductionRunsFn } from "@/server-functions/inventory/production/get-production-run-fn";
import { GenericEmpty } from "../custom/empty";
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
import {
  isToday,
  isThisMonth,
  subDays,
  isAfter,
  startOfDay,
  parseISO,
} from "date-fns";
import { InitiateProductionSheet } from "./initiate-production-sheet";
import { useProductionRunsSync } from "@/hooks/production/use-production-runs-sync";

export const ProductionRunsContainer = () => {
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: runs } = useSuspenseQuery({
    queryKey: ["production-runs"],
    queryFn: getProductionRunsFn,
  });

  // Smart polling
  useProductionRunsSync();

  if (runs.length === 0) {
    return (
      <>
        <GenericEmpty
          icon={Factory}
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

  const filteredRuns = runs.filter((run) => {
    // Search Filter
    const matchesSearch =
      run.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      run.recipe.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Date Filter
    if (dateFilter !== "all") {
      const runDate = new Date(run.createdAt);
      if (dateFilter === "today" && !isToday(runDate)) return false;
      if (dateFilter === "this_month" && !isThisMonth(runDate)) return false;
      if (
        dateFilter === "last_7_days" &&
        !isAfter(runDate, startOfDay(subDays(new Date(), 7)))
      )
        return false;
    }

    // Status Filter
    if (statusFilter !== "all" && run.status !== statusFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 w-full">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by batch ID or recipe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <div className="text-2xl font-bold">
              {filteredRuns.filter((r) => r.status === "in_progress").length}
            </div>
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
              PKR{" "}
              {filteredRuns
                .filter((r) => r.status === "completed")
                .reduce(
                  (sum, r) => sum + parseFloat(r.totalProductionCost || "0"),
                  0,
                )
                .toLocaleString("en-PK")}
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
              {filteredRuns
                .filter((r) => r.status === "completed")
                .reduce((sum, r) => sum + r.containersProduced, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production Runs Table */}
      <ProductionRunsTable runs={filteredRuns} />

      <InitiateProductionSheet
        open={isCreateDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
};
