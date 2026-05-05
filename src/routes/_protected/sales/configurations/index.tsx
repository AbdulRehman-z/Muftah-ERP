import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  useGetCustomerPriceAgreements,
  useCreateCustomerPriceAgreement,
  useDeleteCustomerPriceAgreement,
  useGetPromotionalRules,
  useCreatePromotionalRule,
  useDeletePromotionalRule,
} from "@/hooks/sales/use-sales-config";
import {
  useGetCommissionTiers,
  useCreateCommissionTier,
  useDeleteCommissionTier,
} from "@/hooks/sales/use-order-booker-commission";
import {
  getCustomerDiscountRulesFn,
  deactivateCustomerDiscountRuleFn,
} from "@/server-functions/sales/customer-discount-rules-fn";
import {
  getActiveTadaRateFn,
  listTadaRatesFn,
  setTadaRateFn,
} from "@/server-functions/hr/rates/tada-rates-fn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetAllCustomers } from "@/hooks/sales/use-customers";
import { getProductsFn } from "@/server-functions/sales/sales-config-fn";
import { format } from "date-fns";
import { Trash2, Plus, Settings, Car } from "lucide-react";
import { toast } from "sonner";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;

export const Route = createFileRoute("/_protected/sales/configurations/")({
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["active-tada-rate"],
      queryFn: () => getActiveTadaRateFn(),
    });
    void context.queryClient.prefetchQuery({
      queryKey: ["tada-rate-history"],
      queryFn: () => listTadaRatesFn(),
    });
  },
  component: SalesConfigurationsPage,
});

function SalesConfigurationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sales Configurations</h2>
        <p className="text-muted-foreground mt-1">
          Manage pricing, promotional rules, discount rules, and TADA rates.
        </p>
      </div>
      <Separator />
      <Suspense fallback={<GenericLoader title="Loading Configurations" description="Fetching settings..." />}>
        <ConfigurationsContent />
      </Suspense>
    </div>
  );
}

function ConfigurationsContent() {
  return (
    <Tabs defaultValue="pricing" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="pricing">Distributor Pricing</TabsTrigger>
        <TabsTrigger value="promotions">Promotional Rules</TabsTrigger>
        <TabsTrigger value="discounts">Discount Rules</TabsTrigger>
        <TabsTrigger value="tada">TADA Rate</TabsTrigger>
        <TabsTrigger value="commissions">Commission Tiers</TabsTrigger>
      </TabsList>

      <TabsContent value="pricing">
        <PriceAgreementsTab />
      </TabsContent>

      <TabsContent value="promotions">
        <PromotionalRulesTab />
      </TabsContent>

      <TabsContent value="discounts">
        <DiscountRulesTab />
      </TabsContent>

      <TabsContent value="tada">
        <TadaRateTab />
      </TabsContent>

      <TabsContent value="commissions">
        <CommissionTiersTab />
      </TabsContent>
    </Tabs>
  );
}

// ── Price Agreements Tab ──
function PriceAgreementsTab() {
  const { data: agreements } = useGetCustomerPriceAgreements();
  const deleteMutation = useDeleteCustomerPriceAgreement();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Price Agreements</h3>
        <AddPriceAgreementDialog />
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Customer</TableHead>
              <TableHead className="text-[11px]">Product</TableHead>
              <TableHead className="text-[11px]">Type</TableHead>
              <TableHead className="text-[11px] text-right">Value</TableHead>
              <TableHead className="text-[11px]">Effective</TableHead>
              <TableHead className="text-[11px] w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!agreements?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                  No price agreements configured.
                </TableCell>
              </TableRow>
            ) : (
              agreements.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{a.customer?.name}</span>
                      <Badge variant="outline" className="w-fit text-[10px] mt-0.5">
                        {a.customer?.customerType}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{a.product?.name}</TableCell>
                  <TableCell className="text-sm capitalize">{a.pricingType.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm tabular-nums text-right font-medium">
                    {PKR(Number(a.agreedValue))}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(a.effectiveFrom), "dd MMM yyyy")}
                    {a.effectiveTo && ` → ${format(new Date(a.effectiveTo), "dd MMM yyyy")}`}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => deleteMutation.mutate({ data: { id: a.id } })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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

function AddPriceAgreementDialog() {
  const [open, setOpen] = useState(false);
  const { data: customers } = useGetAllCustomers();
  const createMutation = useCreateCustomerPriceAgreement();
  const [form, setForm] = useState({
    customerId: "",
    productId: "",
    pricingType: "fixed" as "fixed" | "margin_off_tp" | "flat_discount",
    agreedValue: "",
    tpBaseline: "",
  });

  const { data: productsList } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => getProductsFn(),
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        data: {
          customerId: form.customerId,
          productId: form.productId,
          pricingType: form.pricingType,
          agreedValue: Number(form.agreedValue),
          tpBaseline: form.tpBaseline ? Number(form.tpBaseline) : undefined,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Price agreement created");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1.5" />
          Add Agreement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Price Agreement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <Select value={form.customerId} onValueChange={(v) => setForm((f) => ({ ...f, customerId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.customerType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {productsList?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pricing Type</Label>
            <Select value={form.pricingType} onValueChange={(v: any) => setForm((f) => ({ ...f, pricingType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed Price</SelectItem>
                <SelectItem value="margin_off_tp">Margin off TP</SelectItem>
                <SelectItem value="flat_discount">Flat Discount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Agreed Value {form.pricingType === "margin_off_tp" ? "(margin %)" : "(PKR)"}</Label>
            <Input
              type="number"
              value={form.agreedValue}
              onChange={(e) => setForm((f) => ({ ...f, agreedValue: e.target.value }))}
            />
          </div>
          {form.pricingType === "margin_off_tp" && (
            <div className="space-y-1.5">
              <Label>TP Baseline (PKR)</Label>
              <Input
                type="number"
                value={form.tpBaseline}
                onChange={(e) => setForm((f) => ({ ...f, tpBaseline: e.target.value }))}
              />
            </div>
          )}
          <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
            Create Agreement
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Promotional Rules Tab ──
function PromotionalRulesTab() {
  const { data: rules } = useGetPromotionalRules();
  const deleteMutation = useDeletePromotionalRule();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Promotional Rules</h3>
        <AddPromotionalRuleDialog />
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Product</TableHead>
              <TableHead className="text-[11px]">Rule</TableHead>
              <TableHead className="text-[11px]">Eligible</TableHead>
              <TableHead className="text-[11px]">Active Period</TableHead>
              <TableHead className="text-[11px] w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rules?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">
                  No promotional rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.product?.name}</TableCell>
                  <TableCell className="text-sm">
                    Buy <strong>{r.buyQty}</strong> get <strong>{r.freeQty}</strong> free
                  </TableCell>
                  <TableCell className="text-sm capitalize">{r.eligibleCustomerType}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(r.activeFrom), "dd MMM yyyy")}
                    {r.activeTo && ` → ${format(new Date(r.activeTo), "dd MMM yyyy")}`}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => deleteMutation.mutate({ data: { id: r.id } })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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

function AddPromotionalRuleDialog() {
  const [open, setOpen] = useState(false);
  const createMutation = useCreatePromotionalRule();
  const [form, setForm] = useState({
    productId: "",
    buyQty: "",
    freeQty: "",
    eligibleCustomerType: "all" as "shopkeeper" | "distributor" | "retailer" | "wholesaler" | "all",
  });

  const { data: productsList } = useQuery({
    queryKey: ["all-products"],
    queryFn: () => getProductsFn(),
  });

  const handleSubmit = () => {
    createMutation.mutate(
      {
        data: {
          productId: form.productId,
          buyQty: Number(form.buyQty),
          freeQty: Number(form.freeQty),
          eligibleCustomerType: form.eligibleCustomerType,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Promotional rule created");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-1.5" />
          Add Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Promotional Rule</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                {productsList?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Buy Qty</Label>
              <Input type="number" value={form.buyQty} onChange={(e) => setForm((f) => ({ ...f, buyQty: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Free Qty</Label>
              <Input type="number" value={form.freeQty} onChange={(e) => setForm((f) => ({ ...f, freeQty: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Eligible Customer Type</Label>
            <Select value={form.eligibleCustomerType} onValueChange={(v: any) => setForm((f) => ({ ...f, eligibleCustomerType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="retailer">Retailer</SelectItem>
                <SelectItem value="shopkeeper">Shopkeeper</SelectItem>
                <SelectItem value="wholesaler">Wholesaler</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={createMutation.isPending}>
            Create Rule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Discount Rules Tab ──
function DiscountRulesTab() {
  const { data: rules } = useQuery({
    queryKey: ["customer-discount-rules"],
    queryFn: () => getCustomerDiscountRulesFn({ data: {} }),
  });

  const qc = useQueryClient();
  const deactivateMutation = useMutation({
    mutationFn: deactivateCustomerDiscountRuleFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customer-discount-rules"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Customer Discount Rules</h3>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Customer</TableHead>
              <TableHead className="text-[11px]">Product</TableHead>
              <TableHead className="text-[11px]">Threshold</TableHead>
              <TableHead className="text-[11px]">Discount</TableHead>
              <TableHead className="text-[11px]">Eligible</TableHead>
              <TableHead className="text-[11px] w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!rules?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10 text-sm">
                  No discount rules configured.
                </TableCell>
              </TableRow>
            ) : (
              rules.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium">{r.customer?.name}</TableCell>
                  <TableCell className="text-sm">{r.product?.name}</TableCell>
                  <TableCell className="text-sm">{r.volumeThreshold} cartons</TableCell>
                  <TableCell className="text-sm">
                    {r.discountType === "percentage" && `${r.discountValue}%`}
                    {r.discountType === "fixed_amount" && PKR(Number(r.discountValue))}
                    {r.discountType === "carton_equivalent" && `${r.discountValue} cartons`}
                  </TableCell>
                  <TableCell className="text-sm capitalize">{r.eligibleCustomerType}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => deactivateMutation.mutate({ data: { id: r.id } })}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
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

// ── TADA Rate Tab ──
function TadaRateTab() {
  const { data: activeRate } = useQuery({
    queryKey: ["active-tada-rate"],
    queryFn: () => getActiveTadaRateFn(),
  });

  const { data: history } = useQuery({
    queryKey: ["tada-rate-history"],
    queryFn: () => listTadaRatesFn(),
  });

  const [open, setOpen] = useState(false);
  const [ratePerKm, setRatePerKm] = useState("");
  const qc = useQueryClient();
  const setRateMutation = useMutation({
    mutationFn: setTadaRateFn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["active-tada-rate"] });
      qc.invalidateQueries({ queryKey: ["tada-rate-history"] });
      setOpen(false);
      toast.success("TADA rate updated");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">TA/DA Rate Configuration</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Settings className="size-4 mr-1.5" />
              Set Rate
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set New TA/DA Rate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Rate per KM (PKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={ratePerKm}
                  onChange={(e) => setRatePerKm(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                onClick={() =>
                  setRateMutation.mutate({
                    data: {
                      ratePerKm: Number(ratePerKm),
                      effectiveFrom: format(new Date(), "yyyy-MM-dd"),
                    },
                  })
                }
                disabled={setRateMutation.isPending}
              >
                Save Rate
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-1.5 mb-2">
            <Car className="size-3.5 text-emerald-600" />
            <p className="text-[10px] font-semibold uppercase text-muted-foreground">Current Active Rate</p>
          </div>
          <p className="text-2xl font-bold tabular-nums text-emerald-700">
            {activeRate ? PKR(Number(activeRate.ratePerKm)) : "Not Set"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Effective from {activeRate ? format(new Date(activeRate.effectiveFrom), "dd MMM yyyy") : "—"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Rate</TableHead>
              <TableHead className="text-[11px]">Effective From</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px]">Set By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!history?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-10 text-sm">
                  No rate history.
                </TableCell>
              </TableRow>
            ) : (
              history.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm font-medium tabular-nums">{PKR(Number(r.ratePerKm))}</TableCell>
                  <TableCell className="text-sm">{format(new Date(r.effectiveFrom), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "outline"} className="text-[10px]">
                      {r.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.setter?.name || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Commission Tiers Tab ──
function CommissionTiersTab() {
  const { data: tiers } = useGetCommissionTiers();
  const createTier = useCreateCommissionTier();
  const deleteTier = useDeleteCommissionTier();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ minAmount: "", maxAmount: "", rate: "" });

  const handleSubmit = () => {
    createTier.mutate(
      {
        data: {
          minAmount: Number(form.minAmount) || 0,
          maxAmount: form.maxAmount ? Number(form.maxAmount) : null,
          rate: Number(form.rate) || 0,
        },
      },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success("Commission tier created");
          setForm({ minAmount: "", maxAmount: "", rate: "" });
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Commission Tiers</h3>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="size-4 mr-1.5" />Add Tier</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>New Commission Tier</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Min Amount (PKR)</Label>
                  <Input type="number" value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Amount (PKR)</Label>
                  <Input type="number" value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: e.target.value }))} placeholder="Unlimited" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={createTier.isPending}>Create Tier</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[11px]">Min Amount</TableHead>
              <TableHead className="text-[11px]">Max Amount</TableHead>
              <TableHead className="text-[11px] text-right">Rate</TableHead>
              <TableHead className="text-[11px]">Status</TableHead>
              <TableHead className="text-[11px] w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!tiers?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10 text-sm">No commission tiers found.</TableCell>
              </TableRow>
            ) : (
              tiers.map((tier: any) => (
                <TableRow key={tier.id}>
                  <TableCell className="text-sm">PKR {tier.minAmount}</TableCell>
                  <TableCell className="text-sm">{tier.maxAmount ? `PKR ${tier.maxAmount}` : "Unlimited"}</TableCell>
                  <TableCell className="text-sm text-right tabular-nums">{tier.rate}%</TableCell>
                  <TableCell>
                    <Badge variant={tier.isActive ? "default" : "outline"} className="text-[10px]">{tier.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-rose-500" onClick={() => deleteTier.mutate({ data: { id: tier.id } })}>
                      Delete
                    </Button>
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
