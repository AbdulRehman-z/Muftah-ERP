import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Banknote, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import { getMyCommissionFn } from "@/server-functions/sales/order-booker-self-service-fn";
import { format } from "date-fns";

export const Route = createFileRoute("/_protected/order-booker/commission/")({
  component: MyCommissionPage,
});

function MyCommissionPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-commission"],
    queryFn: () => getMyCommissionFn({ data: {} }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const records = data?.records || [];
  const summary = data?.summary || { totalAccrued: 0, totalPaid: 0, totalReversed: 0 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Commission</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <ArrowUpRight className="size-3.5 text-amber-600" />
              Accrued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums text-amber-700">{formatPKR(summary.totalAccrued)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Banknote className="size-3.5 text-emerald-600" />
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums text-emerald-700">{formatPKR(summary.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <ArrowDownRight className="size-3.5 text-rose-600" />
              Reversed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold tabular-nums text-rose-700">{formatPKR(summary.totalReversed)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Order</TableHead>
              <TableHead className="text-[11px]">Type</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!records.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  No commission records yet.
                </TableCell>
              </TableRow>
            ) : (
              records.map((record: any) => (
                <TableRow key={record.id}>
                  <TableCell className="text-sm">{format(new Date(record.createdAt), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm">
                    #{record.order?.billNumber || "—"} · {record.order?.shopkeeperName || "—"}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{record.commissionType.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <CommissionStatusBadge status={record.status} />
                  </TableCell>
                  <TableCell className="text-sm text-right font-semibold tabular-nums">
                    {formatPKR(Number(record.amount))}
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

function CommissionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    accrued: { variant: "outline", icon: <ArrowUpRight className="size-3 mr-1" />, color: "text-amber-600 border-amber-200" },
    paid: { variant: "default", icon: <Banknote className="size-3 mr-1" />, color: "" },
    reversed: { variant: "destructive", icon: <Minus className="size-3 mr-1" />, color: "" },
  };
  const v = variants[status] || variants.accrued;
  return (
    <Badge variant={v.variant} className={`text-[10px] gap-0.5 capitalize ${v.color}`}>
      {v.icon}
      {status}
    </Badge>
  );
}
