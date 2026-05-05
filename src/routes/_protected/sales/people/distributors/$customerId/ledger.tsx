import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { type DateRange } from "react-day-picker";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDistributorLedgerFn } from "@/server-functions/sales/ledger-fn";
import { useQuery } from "@tanstack/react-query";
import { PrintExportToolbar } from "@/components/sales/ledger-print-export";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

export const Route = createFileRoute("/_protected/sales/people/distributors/$customerId/ledger")({
  component: DistributorLedgerPage,
});

function DistributorLedgerPage() {
  const { customerId } = Route.useParams();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["distributor-ledger", customerId, dateFrom, dateTo],
    queryFn: () =>
      generateDistributorLedgerFn({
        data: { customerId, dateFrom, dateTo },
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {(error as any)?.message || "Failed to load ledger"}
        </p>
        <Button variant="outline" onClick={() => router.history.back()}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const { customer, entries, closingBalance, periodTotalSales, periodPayments } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight truncate">{customer.name}</h1>
            <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/20 text-xs">
              Distributor
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Distributor Ledger</p>
        </div>
        <PrintExportToolbar
          title="Distributor Ledger"
          subtitle={customer.name}
          periodLabel={`${dateFrom || "All"} to ${dateTo || "All"}`}
          entries={entries}
          summary={{
            periodTotalSales,
            periodPayments,
            closingBalance,
            invoiceCount: entries.length,
          }}
          columns={[
            { key: "date", label: "Date", format: (v: any) => format(new Date(v), "dd MMM yyyy") },
            { key: "type", label: "Type", format: (v: any, e: any) => v === "invoice" ? `Invoice #${e.slipNumber || ""}` : `Payment (${e.method})` },
            { key: "totalPrice", label: "Debit", format: (v: any, e: any) => e.type === "invoice" ? PKR(Number(v || 0)) : "—" },
            { key: "amount", label: "Credit", format: (v: any, e: any) => e.type === "payment" ? PKR(Number(v || 0)) : "—" },
            { key: "runningBalance", label: "Balance", format: (v: any) => PKR(Number(v || 0)) },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Filter Period</p>
          <DatePickerWithRange date={dateRange} onDateChange={(d) => setDateRange(d ?? { from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} className="w-64" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Period Sales</p>
          <p className="text-xl font-bold tabular-nums text-emerald-700">{PKR(periodTotalSales)}</p>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Period Payments</p>
          <p className="text-xl font-bold tabular-nums text-blue-700">{PKR(periodPayments)}</p>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Closing Balance</p>
          <p className={cn("text-xl font-bold tabular-nums", closingBalance > 0 ? "text-red-700" : "text-green-700")}>
            {PKR(closingBalance)}
          </p>
        </div>
        <div className="p-4 rounded-xl border bg-card">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Entries</p>
          <p className="text-xl font-bold tabular-nums text-violet-700">{entries.length}</p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Description</TableHead>
              <TableHead className="text-[11px] text-right">Debit</TableHead>
              <TableHead className="text-[11px] text-right">Credit</TableHead>
              <TableHead className="text-[11px] text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  No ledger entries for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm tabular-nums">
                    {format(new Date(entry.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.type === "invoice" ? (
                      <span>
                        Invoice <strong>#{entry.slipNumber || ""}</strong>
                        {entry.warehouseName && ` — ${entry.warehouseName}`}
                      </span>
                    ) : (
                      <span>
                        Payment <span className="capitalize">({entry.method})</span>
                        {entry.reference && ` — Ref: ${entry.reference}`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-right">
                    {entry.type === "invoice" ? PKR(entry.totalPrice) : "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-right text-green-600">
                    {entry.type === "payment" ? PKR(entry.amount) : "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-right font-semibold">
                    {PKR(entry.runningBalance)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
