import { useState } from "react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerPagination } from "./customer-pagination";
import { useGetCustomerLedger } from "@/hooks/sales/use-customers";
import {
  User,
  Phone,
  MapPin,
  CreditCard,
  DollarSign,
  Scale,
  FileText,
  Building2,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
}

export const CustomerDetailSheet = ({ open, onOpenChange, customerId }: Props) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  if (!customerId) {
    return (
      <ResponsiveSheet
        title="Customer Ledger"
        description="Loading customer information..."
        open={open}
        onOpenChange={onOpenChange}
        className="lg:min-w-[70vw]"
        icon={User}
      >
        <div className="space-y-4 py-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full" />
        </div>
      </ResponsiveSheet>
    );
  }

  return (
    <ResponsiveSheet
      title="Customer Ledger"
      description="Customer profile, sales history, and outstanding balance"
      open={open}
      onOpenChange={onOpenChange}
      className="lg:min-w-[70vw]"
      icon={User}
    >
      <CustomerDetailContent
        customerId={customerId}
        page={page}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(l) => { setLimit(l); setPage(1); }}
      />
    </ResponsiveSheet>
  );
};

const CustomerDetailContent = ({
  customerId,
  page,
  limit,
  onPageChange,
  onLimitChange,
}: {
  customerId: string;
  page: number;
  limit: number;
  onPageChange: (p: number) => void;
  onLimitChange: (l: number) => void;
}) => {
  const { data, isLoading, isError, error } = useGetCustomerLedger(customerId, { page, limit });

  if (isLoading) {
    return (
      <div className="space-y-5 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          {error?.message || "Failed to load customer details"}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { customer, invoices, total, pageCount } = data;

  return (
    <div className="space-y-5 py-4">
      {/* Customer profile */}
      <div className="rounded-lg border border-border/60 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            <User className="size-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{customer.name}</h3>
            <p className="text-[11px] text-muted-foreground capitalize">{customer.customerType}</p>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {customer.mobileNumber && (
              <div className="flex items-center gap-2">
                <Phone className="size-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Mobile</p>
                  <p className="text-sm font-medium">{customer.mobileNumber}</p>
                </div>
              </div>
            )}
            {customer.city && (
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">City</p>
                  <p className="text-sm font-medium">{customer.city}</p>
                </div>
              </div>
            )}
            {customer.bankAccount && (
              <div className="flex items-center gap-2">
                <Building2 className="size-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Bank</p>
                  <p className="text-sm font-medium">{customer.bankAccount}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="size-3.5 text-emerald-600" />
            <p className="text-[10px] text-emerald-600 uppercase font-medium">Total Sales</p>
          </div>
          <p className="text-lg font-bold text-emerald-700 tabular-nums">{PKR(Number(customer.totalSale))}</p>
        </div>
        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className="size-3.5 text-blue-600" />
            <p className="text-[10px] text-blue-600 uppercase font-medium">Total Paid</p>
          </div>
          <p className="text-lg font-bold text-blue-700 tabular-nums">{PKR(Number(customer.payment))}</p>
        </div>
        <div className={cn(
          "p-3 rounded-lg border",
          Number(customer.credit) > 0
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        )}>
          <div className="flex items-center gap-1.5 mb-1">
            <CreditCard className={cn("size-3.5", Number(customer.credit) > 0 ? "text-red-600" : "text-green-600")} />
            <p className={cn("text-[10px] uppercase font-medium", Number(customer.credit) > 0 ? "text-red-600" : "text-green-600")}>Outstanding</p>
          </div>
          <p className={cn("text-lg font-bold tabular-nums", Number(customer.credit) > 0 ? "text-red-700" : "text-green-700")}>
            {PKR(Number(customer.credit))}
          </p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5 mb-1">
            <Scale className="size-3.5 text-amber-600" />
            <p className="text-[10px] text-amber-600 uppercase font-medium">Weight Sold</p>
          </div>
          <p className="text-lg font-bold text-amber-700 tabular-nums">{Number(customer.weightSaleKg).toFixed(1)} kg</p>
        </div>
      </div>

      {/* Invoice history */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Invoice History ({total})</h3>
        </div>
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px]">Date</TableHead>
                <TableHead className="text-[11px]">Warehouse</TableHead>
                <TableHead className="text-[11px] text-right">Total</TableHead>
                <TableHead className="text-[11px] text-right">Cash</TableHead>
                <TableHead className="text-[11px] text-right">Credit</TableHead>
                <TableHead className="text-[11px] text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No invoices found for this customer.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <InvoiceHistoryRow key={inv.id} invoice={inv} />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <CustomerPagination
        page={page}
        pageCount={pageCount}
        total={total}
        limit={limit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
      />
    </div>
  );
};

// ── Memoized row: computes running balance internally ──
const InvoiceHistoryRow = ({ invoice }: { invoice: any }) => {
  const cash = Number(invoice.cash);
  const credit = Number(invoice.credit);
  const totalVal = Number(invoice.totalPrice);
  const balance = credit - cash; // per-invoice net

  return (
    <TableRow>
      <TableCell className="text-sm tabular-nums">
        {format(new Date(invoice.date), "dd MMM yyyy")}
      </TableCell>
      <TableCell className="text-sm">{invoice.warehouse?.name || "—"}</TableCell>
      <TableCell className="text-sm tabular-nums text-right font-semibold">
        {PKR(totalVal)}
      </TableCell>
      <TableCell className={cn("text-sm tabular-nums text-right", cash > 0 ? "text-green-600" : "text-muted-foreground")}>
        {PKR(cash)}
      </TableCell>
      <TableCell className="text-sm tabular-nums text-right">
        {credit > 0 ? (
          <Badge variant="destructive" className="text-[10px]">{PKR(credit)}</Badge>
        ) : (
          <span className="text-green-600 text-xs">—</span>
        )}
      </TableCell>
      <TableCell className={cn("text-sm tabular-nums text-right font-semibold", balance > 0 ? "text-red-600" : "text-green-600")}>
        {PKR(balance)}
      </TableCell>
    </TableRow>
  );
};
