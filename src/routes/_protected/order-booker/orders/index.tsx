import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Plus, ShoppingCart, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import { getMyOrdersFn, createMyOrderFn } from "@/server-functions/sales/order-booker-self-service-fn";
import { getProductsFn } from "@/server-functions/sales/sales-config-fn";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_protected/order-booker/orders/")({
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => getMyOrdersFn({ data: {} }),
  });

  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-1.5" />
          New Order
        </Button>
      </div>

      {createOpen && (
        <CreateOrderForm onSuccess={() => setCreateOpen(false)} onCancel={() => setCreateOpen(false)} />
      )}

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Bill #</TableHead>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Shopkeeper</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px] text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!orders?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order: any) => {
                const totalAmount = order.items?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0;
                return (
                  <TableRow key={order.id}>
                    <TableCell className="text-sm font-medium">#{order.billNumber}</TableCell>
                    <TableCell className="text-sm">{format(new Date(order.createdAt), "dd MMM yyyy")}</TableCell>
                    <TableCell className="text-sm">{order.shopkeeperName}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{formatPKR(totalAmount)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: React.ReactNode; variant: any }> = {
    pending: { icon: <Clock className="size-3 mr-1" />, variant: "outline" },
    confirmed: { icon: <CheckCircle2 className="size-3 mr-1" />, variant: "secondary" },
    delivered: { icon: <CheckCircle2 className="size-3 mr-1" />, variant: "default" },
    returned: { icon: <AlertCircle className="size-3 mr-1" />, variant: "destructive" },
  };
  const c = config[status] || config.pending;
  return (
    <Badge variant={c.variant} className="text-[10px] gap-0.5 capitalize">
      {c.icon}
      {status}
    </Badge>
  );
}

function CreateOrderForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProductsFn(),
  });

  const [shopkeeperName, setShopkeeperName] = useState("");
  const [shopkeeperMobile, setShopkeeperMobile] = useState("");
  const [shopkeeperAddress, setShopkeeperAddress] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [rate, setRate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!shopkeeperName || !productId || !quantity || !rate) {
      toast.error("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createMyOrderFn({
        data: {
          orderBookerId: "", // server will override this
          shopkeeperName,
          shopkeeperMobile: shopkeeperMobile || undefined,
          shopkeeperAddress: shopkeeperAddress || undefined,
          items: [
            {
              productId,
              unitType: "full_carton",
              quantity: Number(quantity),
              rate: Number(rate),
            },
          ],
          notes: notes || undefined,
        },
      });
      toast.success("Order created");
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-bold">Create Order</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Shopkeeper Name *</label>
            <input className="w-full h-9 px-2 text-sm rounded-md border" value={shopkeeperName} onChange={(e) => setShopkeeperName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Mobile</label>
            <input className="w-full h-9 px-2 text-sm rounded-md border" value={shopkeeperMobile} onChange={(e) => setShopkeeperMobile(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Address</label>
          <input className="w-full h-9 px-2 text-sm rounded-md border" value={shopkeeperAddress} onChange={(e) => setShopkeeperAddress(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold">Product *</label>
            <select className="w-full h-9 px-2 text-sm rounded-md border bg-background" value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">Select…</option>
              {(products || []).map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Qty *</label>
            <input type="number" min={1} className="w-full h-9 px-2 text-sm rounded-md border" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold">Rate (PKR) *</label>
            <input type="number" min={0} className="w-full h-9 px-2 text-sm rounded-md border" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold">Notes</label>
          <input className="w-full h-9 px-2 text-sm rounded-md border" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            <ShoppingCart className="size-4 mr-1.5" />
            {submitting ? "Creating…" : "Create Order"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
