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
import { ChevronLeft, AlertCircle, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDistributorLedgerFn } from "@/server-functions/sales/ledger-fn";
import { useQuery } from "@tanstack/react-query";

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

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = `
      <html>
        <head>
          <title>Distributor Ledger - ${data?.customer?.name || ""}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f5f5f5; }
            .text-right { text-align: right; }
            .header { margin-bottom: 16px; }
            .header h2 { margin: 0; font-size: 18px; }
            .meta { color: #666; font-size: 12px; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Distributor Ledger</h2>
            <div class="meta">
              ${data?.customer?.name || ""} | Period: ${dateFrom || "All"} to ${dateTo || "All"}
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="text-right">Debit</th>
                <th class="text-right">Credit</th>
                <th class="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${data?.entries
                ?.map(
                  (entry: any) => `
                <tr>
                  <td>${format(new Date(entry.date), "dd MMM yyyy")}</td>
                  <td>
                    ${entry.type === "invoice" ? `Invoice #${entry.slipNumber || ""}` : `Payment (${entry.method})`}
                    ${entry.warehouseName ? ` — ${entry.warehouseName}` : ""}
                  </td>
                  <td class="text-right">${entry.type === "invoice" ? PKR(entry.totalPrice) : "—"}</td>
                  <td class="text-right">${entry.type === "payment" ? PKR(entry.amount) : "—"}</td>
                  <td class="text-right">${PKR(entry.runningBalance)}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <div style="margin-top: 16px; font-size: 12px; color: #666;">
            Closing Balance: ${PKR(data?.closingBalance || 0)}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

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
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint}>
            <Printer className="size-4 mr-1.5" />
            Print
          </Button>
        </div>
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
