import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState, useMemo, useCallback } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { customersKeys, useGetCustomers } from "@/hooks/sales/use-customers";
import { getCustomersFn, getCustomerStatsFn } from "@/server-functions/sales/customers-fn";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, MoreVertical, FileText, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomerKpiCards } from "@/components/sales/customer-kpi-cards";
import { CustomerFilters, type CustomerFilterState } from "@/components/sales/customer-filters";
import { CustomerPagination } from "@/components/sales/customer-pagination";
import { CustomerDetailSheet } from "@/components/sales/customer-detail-sheet";
import { GenericEmpty } from "@/components/custom/empty";
import { CustomersEmptyIllustration } from "@/components/illustrations/CustomersEmptyIllustration";
import { SalesEmptyIllustration } from "@/components/illustrations/SalesEmptyIllustration";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

export const Route = createFileRoute("/_protected/sales/customers/")({
  loader: async ({ context }) => {
    const defaultParams = { page: 1, limit: 10 };
    void context.queryClient.prefetchQuery({
      queryKey: customersKeys.list(defaultParams),
      queryFn: () => getCustomersFn({ data: defaultParams }),
    });
    void context.queryClient.prefetchQuery({
      queryKey: customersKeys.stats(),
      queryFn: () => getCustomerStatsFn(),
    });
  },
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customer Ledger</h2>
        <p className="text-muted-foreground mt-1">
          View and track distributors and retailers, their sales history, and outstanding balances.
        </p>
      </div>

      <Separator />

      <Suspense fallback={<GenericLoader title="Loading Customers" description="Fetching ledger data..." />}>
        <CustomersContent />
      </Suspense>
    </div>
  );
}

function CustomersContent() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<CustomerFilterState>({
    customerType: "all",
    outstandingOnly: false,
  });
  const [detailCustomerId, setDetailCustomerId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data } = useGetCustomers({
    page,
    limit,
    search: filters.search,
    customerType: filters.customerType !== "all" ? filters.customerType : undefined,
    city: filters.city,
    outstandingOnly: filters.outstandingOnly,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const customers = data?.data || [];
  const pageCount = data?.pageCount || 1;
  const total = data?.total || 0;

  const hasFilters = !!(
    filters.search ||
    (filters.customerType && filters.customerType !== "all") ||
    filters.city ||
    filters.outstandingOnly
  );

  // Extract unique cities from current page data for filter dropdown
  // NOTE: In a production system with many pages, this should be a separate
  // server-side DISTINCT query. For typical ERP sizes (<500 customers), this
  // is acceptable as users typically filter first, then see the full list.
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    for (let i = 0; i < customers.length; i++) {
      const city = customers[i].city;
      if (city) citySet.add(city);
    }
    return Array.from(citySet).sort();
  }, [customers]);

  // Stable handlers
  const handleViewLedger = useCallback((id: string) => {
    setDetailCustomerId(id);
    setDetailSheetOpen(true);
  }, []);

  const handleFilterChange = useCallback((v: CustomerFilterState) => {
    setFilters(v);
    setPage(1);
  }, []);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <CustomerKpiCards />

      {/* Filters */}
      <CustomerFilters
        value={filters}
        onChange={handleFilterChange}
        cities={cities}
      />

      {/* Header + count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>
            {total} customer{total !== 1 ? "s" : ""}
            {hasFilters && " (filtered)"}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {total === 0 && !hasFilters ? (
        <GenericEmpty
          className="mt-30"
          icon={CustomersEmptyIllustration}
          title="No Customers Yet"
          description="Customers are created automatically when you generate invoices."
          ctaText="Create First Invoice"
          onAddChange={() => navigate({ to: "/sales/new-invoice" })}
        />
      ) : total === 0 && hasFilters ? (
        <GenericEmpty
          className="py-12"
          icon={SalesEmptyIllustration}
          title="No Match Found"
          description="No customers match your current filters. Try adjusting them."
          ctaText="Clear Filters"
          onAddChange={() => { setFilters({ customerType: "all", outstandingOnly: false }); setPage(1); }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Customer</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px]">Mobile</TableHead>
                  <TableHead className="text-[11px]">City</TableHead>
                  <TableHead className="text-[11px] text-right">Total Sales</TableHead>
                  <TableHead className="text-[11px] text-right">Total Paid</TableHead>
                  <TableHead className="text-[11px] text-right">Outstanding</TableHead>
                  <TableHead className="text-[11px] text-right">Avg/Kg</TableHead>
                  <TableHead className="text-[11px] w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((cust: any) => (
                  <CustomerRow
                    key={cust.id}
                    customer={cust}
                    onViewLedger={handleViewLedger}
                    onCreateInvoice={() => navigate({ to: "/sales/new-invoice" })}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <CustomerPagination
            page={page}
            pageCount={pageCount}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        </>
      )}

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        customerId={detailCustomerId}
      />
    </div>
  );
}

// ── Memoized row component: prevents full table re-render ──
const CustomerRow = ({
  customer,
  onViewLedger,
  onCreateInvoice,
}: {
  customer: any;
  onViewLedger: (id: string) => void;
  onCreateInvoice: () => void;
}) => {
  const outstanding = Number(customer.credit);
  const avgPerKg = Number(customer.weightSaleKg) > 0
    ? Number(customer.totalSale) / Number(customer.weightSaleKg)
    : 0;

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{customer.name}</span>
          {customer.cnic && (
            <span className="text-[10px] text-muted-foreground font-mono">{customer.cnic}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "capitalize text-[10px]",
            customer.customerType === "distributor"
              ? "border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/20"
              : "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          {customer.customerType}
        </Badge>
      </TableCell>
      <TableCell className="text-sm tabular-nums">
        {customer.mobileNumber || "—"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {customer.city || "—"}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right font-medium">
        {PKR(Number(customer.totalSale))}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right text-green-600">
        {PKR(Number(customer.payment))}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right">
        {outstanding > 0 ? (
          <Badge variant="destructive" className="tabular-nums text-[10px] font-semibold">
            {PKR(outstanding)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-200 dark:border-green-800 text-[10px]">
            Clear
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right text-muted-foreground">
        {avgPerKg > 0 ? PKR(avgPerKg) : "—"}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 p-0 hover:bg-muted/50">
              <MoreVertical className="size-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={() => onViewLedger(customer.id)}
              className="gap-2"
            >
              <Eye className="size-3.5" />
              View Ledger
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCreateInvoice}
              className="gap-2"
            >
              <FileText className="size-3.5" />
              Create Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};
