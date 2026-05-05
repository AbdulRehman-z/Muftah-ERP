import { useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, ShoppingCart, Store, User, Package, Layers } from "lucide-react";
import { formatPKR } from "@/lib/currency-format";
import { getProductsFn } from "@/server-functions/sales/sales-config-fn";
import { useCreateOrder } from "@/hooks/sales/use-orders";

const unitTypeOptions = [
  { value: "full_carton", label: "Full Carton", icon: <Package className="size-3" /> },
  { value: "half_carton", label: "Half Carton", icon: <Layers className="size-3" /> },
  { value: "pack", label: "Pack", icon: <Package className="size-3" /> },
  { value: "shopper", label: "Shopper", icon: <ShoppingCart className="size-3" /> },
] as const;

type OrderItemForm = {
  productId: string;
  unitType: typeof unitTypeOptions[number]["value"];
  quantity: number;
  rate: number;
};

function blankItem(): OrderItemForm {
  return { productId: "", unitType: "full_carton", quantity: 1, rate: 0 };
}

function lineAmount(item: OrderItemForm): number {
  return item.quantity * item.rate;
}

interface CreateOrderPadDialogProps {
  orderBookers: any[];
}

export function CreateOrderPadDialog({ orderBookers }: CreateOrderPadDialogProps) {
  const [open, setOpen] = useState(false);
  const create = useCreateOrder();
  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProductsFn(),
  });

  const form = useForm({
    defaultValues: {
      orderBookerId: "",
      shopkeeperName: "",
      shopkeeperMobile: "",
      shopkeeperAddress: "",
      notes: "",
      items: [blankItem()],
    },
    onSubmit: async ({ value }) => {
      if (!value.orderBookerId || !value.shopkeeperName) {
        toast.error("Order booker and shopkeeper name are required");
        return;
      }
      if (value.items.some((i) => !i.productId || i.quantity <= 0)) {
        toast.error("All items must have a product and positive quantity");
        return;
      }

      create.mutate(
        {
          data: {
            orderBookerId: value.orderBookerId,
            shopkeeperName: value.shopkeeperName,
            shopkeeperMobile: value.shopkeeperMobile || undefined,
            shopkeeperAddress: value.shopkeeperAddress || undefined,
            items: value.items.map((i) => ({
              productId: i.productId,
              unitType: i.unitType,
              quantity: i.quantity,
              rate: i.rate,
            })),
            notes: value.notes || undefined,
          },
        },
        {
          onSuccess: () => {
            setOpen(false);
            toast.success("Order created");
            form.reset();
          },
        },
      );
    },
  });

  const items = useStore(form.store, (state) => state.values.items);
  const totalAmount = items.reduce((sum, item) => sum + lineAmount(item), 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1.5" />
          New Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="size-5 text-primary" />
            Create Order
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-5 pt-2"
        >
          {/* ── Shopkeeper & Order Booker ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field
              name="orderBookerId"
              validators={{
                onChange: z.string().min(1, "Select order booker"),
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <User className="size-3" />
                    Order Booker
                  </Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v)}
                  >
                    <SelectTrigger className={field.state.meta.errors.length > 0 ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select order booker" />
                    </SelectTrigger>
                    <SelectContent>
                      {orderBookers.map((ob) => (
                        <SelectItem key={ob.id} value={ob.id}>
                          {ob.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            <form.Field
              name="shopkeeperName"
              validators={{
                onChange: z.string().min(1, "Shopkeeper name is required"),
              }}
            >
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Store className="size-3" />
                    Shopkeeper Name
                  </Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Enter shopkeeper name"
                    className={field.state.meta.errors.length > 0 ? "border-destructive" : ""}
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="shopkeeperMobile">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Mobile
                  </Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="shopkeeperAddress">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Address
                  </Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Shop address"
                  />
                </div>
              )}
            </form.Field>
          </div>

          {/* ── Line Items ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Order Items
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {items.length} line{items.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Desktop headers */}
            <div
              className="hidden md:grid items-center gap-2 px-3 pb-1 border-b"
              style={{ gridTemplateColumns: "2fr 1fr 0.8fr 1fr 1fr 32px" }}
            >
              {["Product", "Unit Type", "Qty", "Rate (PKR)", "Amount", ""].map((h) => (
                <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>

            <div className="divide-y divide-border/40 rounded-xl border bg-muted/10 overflow-hidden">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="px-3 py-3 transition-colors"
                >
                  {/* Desktop row */}
                  <div
                    className="hidden md:grid items-start gap-2"
                    style={{ gridTemplateColumns: "2fr 1fr 0.8fr 1fr 1fr 32px" }}
                  >
                    {/* Product */}
                    <form.Field
                      name={`items[${index}].productId`}
                      validators={{
                        onChange: z.string().min(1, "Select product"),
                      }}
                    >
                      {(sf) => (
                        <Select value={sf.state.value} onValueChange={(v) => sf.handleChange(v)}>
                          <SelectTrigger
                            className={`h-9 text-xs ${sf.state.meta.errors.length > 0 ? "border-destructive" : ""}`}
                          >
                            <SelectValue placeholder="Select product…" />
                          </SelectTrigger>
                          <SelectContent>
                            {(products || []).map((p: any) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </form.Field>

                    {/* Unit Type */}
                    <form.Field name={`items[${index}].unitType`}>
                      {(sf) => (
                        <Select value={sf.state.value} onValueChange={(v: any) => sf.handleChange(v)}>
                          <SelectTrigger className="h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {unitTypeOptions.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                <span className="flex items-center gap-1.5 text-xs">
                                  {u.icon} {u.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </form.Field>

                    {/* Quantity */}
                    <form.Field
                      name={`items[${index}].quantity`}
                      validators={{
                        onChange: z.number().min(1, "Min 1"),
                      }}
                    >
                      {(sf) => (
                        <Input
                          type="number"
                          min={1}
                          className={`h-9 text-xs ${sf.state.meta.errors.length > 0 ? "border-destructive" : ""}`}
                          value={sf.state.value}
                          onChange={(e) => sf.handleChange(Number(e.target.value))}
                        />
                      )}
                    </form.Field>

                    {/* Rate */}
                    <form.Field name={`items[${index}].rate`}>
                      {(sf) => (
                        <div className="relative">
                          <Input
                            type="number"
                            min={0}
                            className="h-9 text-xs pl-6"
                            value={sf.state.value}
                            onChange={(e) => sf.handleChange(Number(e.target.value))}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold pointer-events-none">
                            ₨
                          </span>
                        </div>
                      )}
                    </form.Field>

                    {/* Amount */}
                    <div className="pt-0.5">
                      <div className="font-bold text-sm text-right tabular-nums">
                        {formatPKR(lineAmount(item))}
                      </div>
                    </div>

                    {/* Remove */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const current = form.getFieldValue("items");
                        if (current.length > 1) {
                          form.setFieldValue(
                            "items",
                            current.filter((_, i) => i !== index)
                          );
                        }
                      }}
                      disabled={items.length === 1}
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-0.5"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {/* Mobile card */}
                  <div className="md:hidden space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Line #{index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const current = form.getFieldValue("items");
                          if (current.length > 1) {
                            form.setFieldValue(
                              "items",
                              current.filter((_, i) => i !== index)
                            );
                          }
                        }}
                        disabled={items.length === 1}
                        className="h-7 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <form.Field name={`items[${index}].productId`}>
                        {(sf) => (
                          <div>
                            <label className="text-xs font-semibold">Product</label>
                            <Select value={sf.state.value} onValueChange={(v) => sf.handleChange(v)}>
                              <SelectTrigger className="text-xs">
                                <SelectValue placeholder="Select…" />
                              </SelectTrigger>
                              <SelectContent>
                                {(products || []).map((p: any) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </form.Field>

                      <div className="grid grid-cols-3 gap-2">
                        <form.Field name={`items[${index}].unitType`}>
                          {(sf) => (
                            <div>
                              <label className="text-xs font-semibold">Type</label>
                              <Select value={sf.state.value} onValueChange={(v: any) => sf.handleChange(v)}>
                                <SelectTrigger className="text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {unitTypeOptions.map((u) => (
                                    <SelectItem key={u.value} value={u.value}>
                                      {u.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`items[${index}].quantity`}>
                          {(sf) => (
                            <div>
                              <label className="text-xs font-semibold">Qty</label>
                              <Input
                                type="number"
                                min={1}
                                className="text-xs"
                                value={sf.state.value}
                                onChange={(e) => sf.handleChange(Number(e.target.value))}
                              />
                            </div>
                          )}
                        </form.Field>

                        <form.Field name={`items[${index}].rate`}>
                          {(sf) => (
                            <div>
                              <label className="text-xs font-semibold">Rate</label>
                              <div className="relative">
                                <Input
                                  type="number"
                                  min={0}
                                  className="text-xs pl-5"
                                  value={sf.state.value}
                                  onChange={(e) => sf.handleChange(Number(e.target.value))}
                                />
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-semibold pointer-events-none">
                                  ₨
                                </span>
                              </div>
                            </div>
                          )}
                        </form.Field>
                      </div>

                      <div className="flex justify-between border-t pt-2">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-bold text-sm">{formatPKR(lineAmount(item))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add line */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const current = form.getFieldValue("items");
                form.setFieldValue("items", [...current, blankItem()]);
              }}
              className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary h-9"
            >
              <Plus className="size-4" /> Add Product Line
            </Button>

            {/* Running total */}
            {totalAmount > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-lg border border-primary/20">
                <span className="text-xs font-semibold text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                <span className="text-sm font-extrabold text-primary tabular-nums">
                  {formatPKR(totalAmount)}
                </span>
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <form.Field name="notes">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notes
                </Label>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Any special instructions..."
                />
              </div>
            )}
          </form.Field>

          {/* ── Submit ── */}
          <Button
            type="submit"
            className="w-full"
            disabled={create.isPending}
          >
            {create.isPending ? "Creating…" : `Create Order · ${formatPKR(totalAmount)}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
