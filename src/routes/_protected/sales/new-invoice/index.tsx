import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState, useCallback } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { invoicesKeys, useGetInvoices, useDeleteInvoice } from "@/hooks/sales/use-invoices";
import { getInvoicesFn, getInvoiceStatsFn } from "@/server-functions/sales/invoices-fn";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, ReceiptText, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InvoiceKpiCards } from "@/components/sales/invoice-kpi-cards";
import { InvoiceFilters, type InvoiceFilterState } from "@/components/sales/invoice-filters";
import { InvoicePagination } from "@/components/sales/invoice-pagination";
import { InvoiceDetailSheet } from "@/components/sales/invoice-detail-sheet";
import { InvoicePrintDialog } from "@/components/sales/invoice-print-dialog";
import { CreateInvoiceSheet } from "@/components/sales/create-invoice-sheet";
import { InvoiceActionsMenu } from "@/components/sales/invoice-actions-menu";
import { GenericEmpty } from "@/components/custom/empty";
import { InvoicesEmptyIllustration } from "@/components/illustrations/InvoicesEmptyIllustration";
import { SalesEmptyIllustration } from "@/components/illustrations/SalesEmptyIllustration";
import { useQueryClient } from "@tanstack/react-query";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

export const Route = createFileRoute("/_protected/sales/new-invoice/")({
  loader: async ({ context }) => {
    const defaultParams = { page: 1, limit: 10 };
    void context.queryClient.prefetchQuery({
      queryKey: invoicesKeys.list(defaultParams),
      queryFn: () => getInvoicesFn({ data: defaultParams }),
    });
    void context.queryClient.prefetchQuery({
      queryKey: invoicesKeys.stats(),
      queryFn: () => getInvoiceStatsFn(),
    });
  },
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sales Invoices</h2>
        <p className="text-muted-foreground mt-1">
          Manage sales, generate smart invoices, track revenue, and monitor outstanding balances.
        </p>
      </div>

      <Separator />

      <Suspense fallback={<GenericLoader title="Loading Invoices" description="Fetching sales data..." />}>
        <InvoicesContent />
      </Suspense>
    </div>
  );
}

function InvoicesContent() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filters, setFilters] = useState<InvoiceFilterState>({
    status: "all",
    customerType: "all",
  });
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [detailInvoiceId, setDetailInvoiceId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Delete confirmation state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteInvoice = useDeleteInvoice();

  const dateFrom = filters.dateFrom;
  const dateTo = filters.dateTo;

  const { data } = useGetInvoices({
    page,
    limit,
    dateFrom,
    dateTo,
    month: undefined,
    year: undefined,
    status: filters.status !== "all" ? filters.status : undefined,
    customerType: filters.customerType !== "all" ? filters.customerType : undefined,
    warehouseId: filters.warehouseId,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const invoices = data?.data || [];
  const pageCount = data?.pageCount || 1;
  const total = data?.total || 0;

  const hasFilters = !!(
    dateFrom || dateTo ||
    (filters.status && filters.status !== "all") ||
    (filters.customerType && filters.customerType !== "all") ||
    filters.warehouseId ||
    filters.amountMin !== undefined ||
    filters.amountMax !== undefined
  );

  // Stable handlers to prevent unnecessary re-renders in child components
  const handleView = useCallback((id: string) => {
    setDetailInvoiceId(id);
    setDetailSheetOpen(true);
  }, []);

  const handlePrint = useCallback((id: string) => {
    setPrintInvoiceId(id);
    setPrintOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await deleteInvoice.mutateAsync(deleteConfirmId);
      // Invalidate list so table refreshes
      queryClient.invalidateQueries({ queryKey: invoicesKeys.list({ page, limit }) });
      queryClient.invalidateQueries({ queryKey: invoicesKeys.stats() });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteInvoice, queryClient, page, limit]);

  const handleDetailPrint = useCallback((invId: string) => {
    setPrintInvoiceId(invId);
    setPrintOpen(true);
    setDetailSheetOpen(false);
  }, []);

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <InvoiceKpiCards
        filters={{
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
          status: filters.status !== "all" ? filters.status : undefined,
          customerType: filters.customerType !== "all" ? filters.customerType : undefined,
          warehouseId: filters.warehouseId,
          amountMin: filters.amountMin,
          amountMax: filters.amountMax,
        }}
      />

      {/* Filters */}
      <InvoiceFilters
        value={filters}
        onChange={setFilters}
      />

      {/* Header + Create button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ReceiptText className="size-4" />
          <span>
            {total} invoice{total !== 1 ? "s" : ""}
            {hasFilters && " (filtered)"}
          </span>
        </div>
        <Button onClick={() => setCreateSheetOpen(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {/* Empty state */}
      {total === 0 && !hasFilters ? (
        <GenericEmpty
          icon={InvoicesEmptyIllustration}
          title="No Invoices Found"
          description="You haven't generated any invoices yet. Create your first transaction."
          ctaText="Create Invoice"
          onAddChange={() => setCreateSheetOpen(true)}
        />
      ) : total === 0 && hasFilters ? (
        <GenericEmpty
          className="py-12"
          icon={SalesEmptyIllustration}
          title="No Results Found"
          description="Your filters didn't return any invoices. Try adjusting the filters."
          ctaText="Clear Filters"
          onAddChange={() => setFilters({ status: "all", customerType: "all" })}
        />
      ) : (
        <>
          {/* Table */}
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[11px]">Date</TableHead>
                  <TableHead className="text-[11px]">Customer</TableHead>
                  <TableHead className="text-[11px]">Type</TableHead>
                  <TableHead className="text-[11px]">Warehouse</TableHead>
                  <TableHead className="text-[11px] text-right">Total</TableHead>
                  <TableHead className="text-[11px] text-right">Cash</TableHead>
                  <TableHead className="text-[11px] text-right">Credit</TableHead>
                  <TableHead className="text-[11px]">Status</TableHead>
                  <TableHead className="text-[11px] w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <InvoiceRow
                    key={inv.id}
                    invoice={inv}
                    onView={handleView}
                    onPrint={handlePrint}
                    onDelete={handleDeleteRequest}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <InvoicePagination
            page={page}
            pageCount={pageCount}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        </>
      )}

      {/* Create Invoice Sheet */}
      <CreateInvoiceSheet open={createSheetOpen} onOpenChange={setCreateSheetOpen} />

      {/* Detail Sheet */}
      <InvoiceDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        invoiceId={detailInvoiceId}
        onPrint={() => {
          if (detailInvoiceId) handleDetailPrint(detailInvoiceId);
        }}
      />

      {/* Print Dialog */}
      <InvoicePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        invoiceId={printInvoiceId}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-destructive" />
              Delete Invoice?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the invoice and reverse all associated transactions,
              including customer ledger entries, wallet credits, and stock deductions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-1" />
                  Delete Invoice
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Memoized row component: prevents full table re-render on any state change ──
const InvoiceRow = ({
  invoice,
  onView,
  onPrint,
  onDelete,
}: {
  invoice: any;
  onView: (id: string) => void;
  onPrint: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const credit = Number(invoice.credit);
  const cash = Number(invoice.cash);

  let statusLabel: string;
  let statusVariant: "default" | "destructive" | "outline";

  if (credit === 0 && cash > 0) {
    statusLabel = "Paid";
    statusVariant = "default";
  } else if (cash === 0 && credit > 0) {
    statusLabel = "Credit";
    statusVariant = "destructive";
  } else if (cash > 0 && credit > 0) {
    statusLabel = "Partial";
    statusVariant = "outline";
  } else {
    statusLabel = "Unknown";
    statusVariant = "outline";
  }

  return (
    <TableRow className="group">
      <TableCell className="text-sm tabular-nums">
        {format(new Date(invoice.date), "dd MMM yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {invoice.customer?.name || "Cash / Walk-in"}
          </span>
          {invoice.customer?.mobileNumber && (
            <span className="text-[10px] text-muted-foreground">{invoice.customer.mobileNumber}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <Badge
          variant="outline"
          className={cn(
            "capitalize text-[10px]",
            invoice.customer?.customerType === "distributor"
              ? "border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/20"
              : "border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-950/20"
          )}
        >
          {invoice.customer?.customerType || "retailer"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {invoice.warehouse?.name || "—"}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right font-semibold">
        {PKR(Number(invoice.totalPrice))}
      </TableCell>
      <TableCell className={cn(
        "text-sm tabular-nums text-right",
        cash > 0 ? "text-green-600" : "text-muted-foreground"
      )}>
        {PKR(cash)}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right">
        {credit > 0 ? (
          <Badge variant="destructive" className="tabular-nums text-[10px] font-semibold">
            {PKR(credit)}
          </Badge>
        ) : (
          <span className="text-green-600 text-xs">Settled</span>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize text-[10px]">
          {statusLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <InvoiceActionsMenu
          onView={() => onView(invoice.id)}
          onPrint={() => onPrint(invoice.id)}
          onDelete={() => onDelete(invoice.id)}
        />
      </TableCell>
    </TableRow>
  );
};
