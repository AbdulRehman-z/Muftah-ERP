import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { type DateRange } from "react-day-picker";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import {
  ChevronLeft,
  AlertCircle,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Package,
  Store,
} from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import { generateSalesmanLedgerFn } from "@/server-functions/sales/ledger-fn";
import { PrintExportToolbar } from "@/components/sales/ledger-print-export";

export const Route = createFileRoute("/_protected/sales/people/salesmen/$salesmanId/ledger")({
  component: SalesmanLedgerPage,
});

function SalesmanLedgerPage() {
  const { salesmanId } = Route.useParams();
  const router = useRouter();

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const dateFrom = dateRange.from ? format(dateRange.from, "yyyy-MM-dd") : undefined;
  const dateTo = dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : undefined;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["salesman-ledger", salesmanId, dateFrom, dateTo],
    queryFn: () =>
      generateSalesmanLedgerFn({
        data: { salesmanId, dateFrom, dateTo },
      }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full rounded-lg" />
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

  const { salesman, entries, closingBalance, periodTotalSales, periodTotalCredit, periodTotalCash, periodPayments, invoiceCount } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => router.history.back()}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{salesman.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Salesman Ledger · {invoiceCount} invoice{invoiceCount !== 1 ? "s" : ""}
          </p>
        </div>
        <PrintExportToolbar
          title="Salesman Ledger"
          subtitle={salesman.name}
          periodLabel={`${dateFrom || "All"} to ${dateTo || "All"}`}
          entries={entries}
          summary={{
            periodTotalSales,
            periodTotalCash,
            periodTotalCredit,
            periodPayments,
            closingBalance,
            invoiceCount,
          }}
          columns={[
            { key: "date", label: "Date", format: (v: any) => format(new Date(v), "dd MMM yyyy") },
            { key: "type", label: "Type", format: (v: any) => v === "invoice" ? "Invoice" : "Payment" },
            { key: "slipNumber", label: "Reference", format: (v: any, e: any) => e.type === "invoice" ? `Inv #${v || "—"}` : `${e.method}${v ? ` — ${v}` : ""}` },
            { key: "customerName", label: "Customer", format: (v: any) => v || "—" },
            { key: "totalPrice", label: "Debit", format: (v: any, e: any) => e.type === "invoice" ? formatPKR(Number(v || 0), false) : "—" },
            { key: "amount", label: "Credit", format: (v: any, e: any) => e.type === "payment" ? formatPKR(Number(v || 0), false) : "—" },
            { key: "runningBalance", label: "Balance", format: (v: any) => formatPKR(Number(v || 0), false) },
          ]}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Period</p>
          <DatePickerWithRange date={dateRange} onDateChange={(d) => setDateRange(d ?? { from: startOfMonth(new Date()), to: endOfMonth(new Date()) })} className="w-64" />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Total Sales</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold tabular-nums text-emerald-700">{formatPKR(periodTotalSales, false)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Cash</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold tabular-nums text-blue-700">{formatPKR(periodTotalCash, false)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Credit</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold tabular-nums text-rose-700">{formatPKR(periodTotalCredit, false)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground">Closing Balance</CardTitle></CardHeader>
          <CardContent><p className={`text-xl font-bold tabular-nums ${closingBalance > 0 ? "text-red-700" : "text-green-700"}`}>{formatPKR(closingBalance, false)}</p></CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Type</TableHead>
              <TableHead className="text-[11px]">Reference</TableHead>
              <TableHead className="text-[11px]">Customer</TableHead>
              <TableHead className="text-[11px] text-right">Debit</TableHead>
              <TableHead className="text-[11px] text-right">Credit</TableHead>
              <TableHead className="text-[11px] text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10 text-sm">
                  No ledger entries for the selected period.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry: any, i: number) => (
                <TableRow key={i}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(entry.date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>
                    {entry.type === "invoice" ? (
                      <Badge variant="default" className="text-[10px] gap-1">
                        <FileText className="size-3" /> Invoice
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-600 border-emerald-200">
                        <Wallet className="size-3" /> Payment
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {entry.type === "invoice" ? (
                      <span className="flex items-center gap-1">
                        <Package className="size-3 text-muted-foreground" />
                        {entry.slipNumber || "—"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <ArrowDownLeft className="size-3 text-emerald-500" />
                        {entry.reference || entry.method}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1">
                      <Store className="size-3 text-muted-foreground" />
                      {entry.customerName || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {entry.type === "invoice" ? (
                      <span className="text-rose-600 font-medium flex items-center justify-end gap-1">
                        <ArrowUpRight className="size-3" />
                        {formatPKR(entry.credit, false)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right tabular-nums">
                    {entry.type === "payment" ? (
                      <span className="text-emerald-600 font-medium flex items-center justify-end gap-1">
                        <ArrowDownLeft className="size-3" />
                        {formatPKR(entry.amount, false)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-right font-bold tabular-nums">
                    {formatPKR(entry.runningBalance, false)}
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
