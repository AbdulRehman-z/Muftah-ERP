import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ShoppingCart, Truck, Banknote } from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import {
  getMyOrdersFn,
  getMyTripsFn,
  getMyCommissionFn,
} from "@/server-functions/sales/order-booker-self-service-fn";

export const Route = createFileRoute("/_protected/order-booker/")({
  component: OrderBookerDashboard,
});

function OrderBookerDashboard() {
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => getMyOrdersFn({ data: {} }),
  });
  const { data: trips, isLoading: tripsLoading } = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => getMyTripsFn({ data: {} }),
  });
  const { data: commissionData, isLoading: commissionLoading } = useQuery({
    queryKey: ["my-commission"],
    queryFn: () => getMyCommissionFn({ data: {} }),
  });

  const pendingOrders = orders?.filter((o: any) => o.status === "pending").length || 0;
  const totalOrders = orders?.length || 0;
  const totalTrips = trips?.length || 0;
  const accruedCommission = commissionData?.summary?.totalAccrued || 0;

  if (ordersLoading || tripsLoading || commissionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order Booker Portal</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <ShoppingCart className="size-3.5 text-emerald-600" />
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <AlertCircle className="size-3.5 text-amber-600" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pendingOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Truck className="size-3.5 text-blue-600" />
              Trips Logged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTrips}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-semibold uppercase text-muted-foreground flex items-center gap-1.5">
              <Banknote className="size-3.5 text-violet-600" />
              Accrued Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPKR(accruedCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {!orders?.length && !trips?.length && (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
          <ShoppingCart className="size-10 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm">Welcome to your portal</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            Start by creating orders or logging trips from the sidebar.
          </p>
        </div>
      )}
    </div>
  );
}
