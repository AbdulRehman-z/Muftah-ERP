import { useState } from "react";
import { DataTable } from "@/components/custom/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useGetInvoices } from "@/hooks/sales/use-invoices";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, ReceiptText, Plus, X, SlidersHorizontal,
} from "lucide-react";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { type DateRange } from "react-day-picker";
import { GenericEmpty } from "@/components/custom/empty";
import { cn } from "@/lib/utils";
import { SalesEmptyIllustration } from "@/components/illustrations/SalesEmptyIllustration";
import { InvoicesEmptyIllustration } from "../illustrations/InvoicesEmptyIllustration";

type Props = {
  sheetOpen?: boolean;
  onSheetOpenChange?: (open: boolean) => void;
};

const PKR = (v: number) => `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

export const InvoicesTable = ({ onSheetOpenChange }: Props) => {
  const [page, setPage] = useState(1);
  const limit = 7;

  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  // BUG FIX: use null to represent "no month selected" — undefined/0 was ambiguous
  // because month=0 (January) is falsy and was treated as "not set"
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | undefined>();

  const dateFrom = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const hasFilters = !!(dateFrom || dateTo || month !== null || year);

  const { data } = useGetInvoices({
    page,
    limit,
    dateFrom,
    dateTo,
    // Pass null-safe value — server function accepts null now
    month: month !== null ? month : undefined,
    year,
  });

  const invoices = data?.data || [];
  const pageCount = data?.pageCount || 1;
  const total = data?.total || 0;

  const clearFilters = () => {
    setDateRange(undefined);
    setMonth(null);
    setYear(undefined);
    setPage(1);
  };

  if (total === 0 && !hasFilters) {
    return (
      <GenericEmpty
        icon={InvoicesEmptyIllustration}
        title="No Invoices Found"
        description="You haven't generated any invoices yet. Start your first transaction."
        ctaText="Create Invoice"
        onAddChange={onSheetOpenChange}
      />
    );
  }

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {format(new Date(row.original.date), "dd MMM yyyy")}
        </span>
      ),
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-sm">
            {row.original.customer?.name || "Cash / Walk-in"}
          </span>
          {row.original.customer?.customerType && (
            <span className="text-[10px] text-muted-foreground capitalize">
              {row.original.customer.customerType}
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "totalPrice",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums text-sm">
          {PKR(Number(row.original.totalPrice))}
        </span>
      ),
    },
    {
      accessorKey: "cash",
      header: "Cash Paid",
      cell: ({ row }) => {
        const val = Number(row.original.cash);
        return (
          <span className={cn("tabular-nums text-sm font-medium", val > 0 ? "text-green-600" : "text-muted-foreground")}>
            {PKR(val)}
          </span>
        );
      },
    },
    {
      accessorKey: "credit",
      header: "Credit",
      cell: ({ row }) => {
        const val = Number(row.original.credit);
        return val > 0 ? (
          <Badge variant="destructive" className="tabular-nums font-semibold text-xs">
            {PKR(val)}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
            Settled
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ReceiptText className="size-4" />
          <span>
            {total} invoice{total !== 1 ? "s" : ""}
            {hasFilters && " (filtered)"}
          </span>
        </div>
        <Button onClick={() => onSheetOpenChange?.(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-muted/20 p-4 rounded-xl border">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground self-end mb-2">
          <SlidersHorizontal className="size-3.5" />
          Filters
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Date Range</Label>
          <DatePickerWithRange date={dateRange} onDateChange={(d) => { setDateRange(d); setPage(1); }} className="w-64" />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Month</Label>
          <Select
            // BUG FIX: use "all" sentinel string to distinguish from month=0
            value={month !== null ? month.toString() : "all"}
            onValueChange={(val) => {
              setMonth(val === "all" ? null : Number(val));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-32 h-9 text-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {Array.from({ length: 12 }).map((_, i) => (
                <SelectItem key={i} value={i.toString()}>
                  {format(new Date(2000, i, 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Year</Label>
          <Input
            type="number"
            placeholder={new Date().getFullYear().toString()}
            value={year || ""}
            onChange={(e) => { setYear(e.target.value ? Number(e.target.value) : undefined); setPage(1); }}
            className="w-24 h-9 text-sm"
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-muted-foreground hover:text-foreground h-9 self-end">
            <X className="size-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Empty state for filtered results */}
      {total === 0 && hasFilters ? (
        <GenericEmpty
          className="py-12"
          icon={SalesEmptyIllustration}
          title="No Results Found"
          description="Your filters didn't return any invoices. Try adjusting the date range or month."
          ctaText="Clear Filters"
          onAddChange={clearFilters}
        />
      ) : (
        <>
          <DataTable columns={columns} data={invoices} showSearch={false} showPagination={false} />

          {/* Pagination */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground tabular-nums">
              Page <strong>{page}</strong> of <strong>{pageCount}</strong>
              {total > 0 && ` · ${total} total`}
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="h-8 px-3">
                <ChevronLeft className="h-3.5 w-3.5 mr-0.5" /> Prev
              </Button>
              <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="h-8 px-3">
                Next <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};