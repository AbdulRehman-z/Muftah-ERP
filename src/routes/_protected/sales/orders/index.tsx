import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Plus, Search, CheckCircle } from "lucide-react";
import { useGetOrders, useCreateOrder, useFulfillOrder } from "@/hooks/sales/use-orders";
import { useGetSalesmen } from "@/hooks/sales/use-sales-people";
import { useGetOrderBookers } from "@/hooks/sales/use-sales-people";
import { getProductsFn } from "@/server-functions/sales/sales-config-fn";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DateRange } from "react-day-picker";

export const Route = createFileRoute("/_protected/sales/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  const [status, setStatus] = useState<string>("__all__");
  const [orderBookerId, setOrderBookerId] = useState<string>("__all__");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [search, setSearch] = useState("");

  const { data: orders } = useGetOrders({
    status: status === "__all__" ? undefined : status,
    orderBookerId: orderBookerId === "__all__" ? undefined : orderBookerId,
    fromDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    toDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  const { data: orderBookers } = useGetOrderBookers();
  const { data: salesmen } = useGetSalesmen();

  const filteredOrders = orders?.filter((o: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      o.shopkeeperName?.toLowerCase().includes(term) ||
      String(o.billNumber).includes(term)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <CreateOrderDialog orderBookers={orderBookers || []} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Order Booker</Label>
          <Select value={orderBookerId} onValueChange={setOrderBookerId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              {(orderBookers || []).map((ob: any) => (
                <SelectItem key={ob.id} value={ob.id}>{ob.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Date Range</Label>
          <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-[11px] text-muted-foreground">Search</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Bill # or shopkeeper..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filteredOrders?.length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filteredOrders?.filter((o: any) => o.status === "pending").length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{filteredOrders?.filter((o: any) => o.status === "delivered").length || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">
            PKR {filteredOrders?.reduce((sum: number, o: any) => sum + (o.items?.reduce((s: number, i: any) => s + Number(i.amount), 0) || 0), 0).toFixed(2)}
          </p></CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Bill #</TableHead>
              <TableHead className="text-[11px]">Date</TableHead>
              <TableHead className="text-[11px]">Shopkeeper</TableHead>
              <TableHead className="text-[11px]">Order Booker</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px] text-right">Amount</TableHead>
              <TableHead className="text-[11px] w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!filteredOrders?.length ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-10 text-sm">No orders found.</TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order: any) => (
                <OrderRow key={order.id} order={order} salesmen={salesmen || []} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function OrderRow({ order, salesmen }: { order: any; salesmen: any[] }) {
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const fulfill = useFulfillOrder();
  const totalAmount = order.items?.reduce((sum: number, item: any) => sum + Number(item.amount), 0) || 0;
  const [fulfilledBySalesmanId, setFulfilledBySalesmanId] = useState("");
  const [fulfilledAmount, setFulfilledAmount] = useState(String(totalAmount));

  const handleFulfill = () => {
    fulfill.mutate(
      {
        data: {
          id: order.id,
          fulfilledBySalesmanId,
          fulfilledAmount: Number(fulfilledAmount) || totalAmount,
        },
      },
      {
        onSuccess: () => {
          setFulfillOpen(false);
          toast.success("Order fulfilled and commission calculated");
        },
      },
    );
  };

  return (
    <TableRow>
      <TableCell className="text-sm font-medium">#{order.billNumber}</TableCell>
      <TableCell className="text-sm">{format(new Date(order.createdAt), "dd MMM yyyy")}</TableCell>
      <TableCell className="text-sm">{order.shopkeeperName}</TableCell>
      <TableCell className="text-sm">{order.orderBooker?.name || "—"}</TableCell>
      <TableCell>
        <Badge variant={order.status === "delivered" ? "default" : order.status === "pending" ? "outline" : "secondary"} className="text-[10px] capitalize">
          {order.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-right tabular-nums">PKR {totalAmount.toFixed(2)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {order.status !== "delivered" && (
            <Dialog open={fulfillOpen} onOpenChange={setFulfillOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1"><CheckCircle className="size-3" />Fulfill</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>Fulfill Order #{order.billNumber}</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <Label>Fulfilled By Salesman</Label>
                    <Select value={fulfilledBySalesmanId} onValueChange={setFulfilledBySalesmanId}>
                      <SelectTrigger><SelectValue placeholder="Select salesman" /></SelectTrigger>
                      <SelectContent>
                        {salesmen.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Fulfilled Amount (PKR)</Label>
                    <Input type="number" value={fulfilledAmount} onChange={(e) => setFulfilledAmount(e.target.value)} />
                  </div>
                  <Button className="w-full" onClick={handleFulfill} disabled={!fulfilledBySalesmanId || fulfill.isPending}>
                    Confirm Fulfillment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateOrderDialog({ orderBookers }: { orderBookers: any[] }) {
  const [open, setOpen] = useState(false);
  const create = useCreateOrder();
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => getProductsFn({ data: {} }) });
  const [form, setForm] = useState({
    orderBookerId: "",
    shopkeeperName: "",
    shopkeeperMobile: "",
    shopkeeperAddress: "",
    productId: "",
    quantity: "",
    rate: "",
    notes: "",
  });

  const handleSubmit = () => {
    if (!form.orderBookerId || !form.shopkeeperName) {
      toast.error("Order booker and shopkeeper name are required");
      return;
    }
    if (!form.productId || !form.quantity || !form.rate) {
      toast.error("Product, quantity, and rate are required");
      return;
    }
    create.mutate(
      {
        data: {
          orderBookerId: form.orderBookerId,
          shopkeeperName: form.shopkeeperName,
          shopkeeperMobile: form.shopkeeperMobile || undefined,
          shopkeeperAddress: form.shopkeeperAddress || undefined,
          items: [
            {
              productId: form.productId,
              unitType: "full_carton" as const,
              quantity: Number(form.quantity),
              rate: Number(form.rate),
            },
          ],
          notes: form.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Order created");
          setForm({ orderBookerId: "", shopkeeperName: "", shopkeeperMobile: "", shopkeeperAddress: "", productId: "", quantity: "", rate: "", notes: "" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4 mr-1.5" />New Order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Order</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Order Booker</Label>
            <Select value={form.orderBookerId} onValueChange={(v) => setForm((f) => ({ ...f, orderBookerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select order booker" /></SelectTrigger>
              <SelectContent>
                {orderBookers.map((ob) => (
                  <SelectItem key={ob.id} value={ob.id}>{ob.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Shopkeeper Name</Label>
            <Input value={form.shopkeeperName} onChange={(e) => setForm((f) => ({ ...f, shopkeeperName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Mobile</Label>
              <Input value={form.shopkeeperMobile} onChange={(e) => setForm((f) => ({ ...f, shopkeeperMobile: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.shopkeeperAddress} onChange={(e) => setForm((f) => ({ ...f, shopkeeperAddress: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {(products || []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Rate (PKR)</Label>
              <Input type="number" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={create.isPending}>Create Order</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
