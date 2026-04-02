import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupplierDetailsFn } from "@/server-functions/suppliers/get-supplier-details-fn";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Beaker,
  BoxIcon,
  Banknote,
  ShoppingCart,
  CreditCard,
  XIcon,
  User,
  Hash,
  CalendarDays,
  Globe,
  StickyNote,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { AddRawMaterialDialog } from "@/components/inventory/add-raw-material-sheet";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import {
  PurchaseHistoryTable,
  PurchaseRecord,
} from "@/components/suppliers/purchase-history-table";
import { PaymentRecordsTable } from "@/components/suppliers/payment-records-table";
import { RecordPaymentDialog } from "@/components/suppliers/record-payment-dialog";
import { PurchaseDetailsDialog } from "@/components/suppliers/purchase-details-dialog";
import { DeletePurchaseDialog } from "@/components/suppliers/delete-purchase-dialog";
import { EditPurchaseDialog } from "@/components/suppliers/edit-purchase-dialog";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { AddPackagingMaterialSheet } from "@/components/inventory/add-packaging-material-sheet";
import { AddStockDialog } from "@/components/inventory/add-stock-dialog";
import { GenericLoader } from "@/components/custom/generic-loader";

export const Route = createFileRoute("/_protected/suppliers/$supplierId")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["supplier", params.supplierId],
        queryFn: () =>
          getSupplierDetailsFn({ data: { id: params.supplierId } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["inventory"],
        queryFn: getInventoryFn,
      }),
    ]);
  },
  pendingComponent: () => (
    <GenericLoader title="Loading Supplier" description="wait..." />
  ),
  component: SupplierDetailsPage,
});

// ── Stat Card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "danger";
}

function StatCard({ title, value, sub, icon, variant = "default" }: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all",
        variant === "danger" && "border-red-500/40 dark:border-red-500/30",
        variant === "success" && "border-emerald-500/40 dark:border-emerald-500/30",
      )}
    >
      {/* Accent bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px]",
          variant === "default" && "bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0",
          variant === "success" && "bg-gradient-to-r from-emerald-500/0 via-emerald-500/60 to-emerald-500/0",
          variant === "danger" && "bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0",
        )}
      />
      <CardHeader className="pb-2 pt-5 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-[12px] font-semibold uppercase tracking-widest text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "p-1.5 rounded-lg",
            variant === "default" && "bg-primary/8 text-primary",
            variant === "success" && "bg-emerald-500/10 text-emerald-600",
            variant === "danger" && "bg-red-500/10 text-red-500",
          )}
        >
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        <div
          className={cn(
            "text-[22px] font-bold tracking-tight",
            variant === "success" && "text-emerald-600 dark:text-emerald-400",
            variant === "danger" && "text-red-500 dark:text-red-400",
          )}
        >
          {value}
        </div>
        <p className="text-[11.5px] text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Contact Row ───────────────────────────────────────────────────────────────

function ContactRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 group">
      <div className="mt-0.5 size-7 shrink-0 flex items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">
          {label}
        </p>
        <p
          className={cn(
            "text-[13.5px] text-foreground break-words",
            mono && "font-mono text-[12px]",
            !value && "text-muted-foreground/50 italic",
          )}
        >
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SupplierDetailsPage() {
  const { supplierId } = Route.useParams();
  const [isAddChemicalOpen, setAddChemicalOpen] = useState(false);
  const [isAddPackagingOpen, setAddPackagingOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [isRestockOpen, setRestockOpen] = useState(false);
  const [itemToRestock, setItemToRestock] = useState<PurchaseRecord | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [paymentDefaults, setPaymentDefaults] = useState<{
    amount?: string;
    notes?: string;
    purchaseId?: string;
    remainingBalance?: number;
  }>({});

  const { data: supplier } = useSuspenseQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplierDetailsFn({ data: { id: supplierId } }),
  });

  const { data: warehouses } = useSuspenseQuery({
    queryKey: ["inventory"],
    queryFn: getInventoryFn,
  });

  const factoryFloor = warehouses.find((w) => w.type === "factory_floor");
  const balance = Number(supplier.balance);
  const isOverdue = balance > 0;

  const handleRecordPayment = (item: any) => {
    const total = parseFloat(item.cost);
    const paid = parseFloat(item.paidAmount || "0");
    const remaining = total - paid;
    setPaymentDefaults({
      amount: remaining.toString(),
      purchaseId: item.id,
      remainingBalance: remaining,
      notes: `Payment for Purchase ID: ${item.id} (${item.materialType})`,
    });
    setRecordPaymentOpen(true);
  };

  const handleRestock = (item: PurchaseRecord) => {
    setItemToRestock(item);
    setRestockOpen(true);
  };

  // Build location string
  const locationParts = [supplier.city, supplier.state].filter(Boolean);
  const fullLocation = [supplier.address, ...locationParts].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="size-14 shrink-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center ">
            <Building2 className="size-6 text-primary" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight leading-none">
                {supplier.supplierName}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "text-[11px] font-semibold px-2 py-0.5 rounded-md",
                  isOverdue
                    ? "border-red-500/40 bg-red-500/10 text-red-500"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
                )}
              >
                {isOverdue ? (
                  <><AlertCircle className="size-3 mr-1" />Balance Due</>
                ) : (
                  <><CheckCircle2 className="size-3 mr-1" />Fully Paid</>
                )}
              </Badge>
            </div>

            {supplier.supplierShopName && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {supplier.supplierShopName}
              </p>
            )}

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground/60 font-mono">
                <Hash className="size-3" />
                {supplier.id}
              </span>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1 text-[11.5px] text-muted-foreground/60">
                <CalendarDays className="size-3" />
                Since {format(new Date(supplier.createdAt), "PPP")}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* <Button
            onClick={() => setRecordPaymentOpen(true)}
            size="sm"
            variant="outline"
            className="text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500/60"
          >
            <Banknote className="size-3.5 mr-1.5" />
            Record Payment
          </Button> */}
          <Button
            onClick={() => setAddChemicalOpen(true)}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            <Beaker className="size-3.5 mr-1.5" />
            Add Chemical
          </Button>
          <Button
            onClick={() => setAddPackagingOpen(true)}
            size="sm"
            variant="outline"
          >
            <BoxIcon className="size-3.5 mr-1.5" />
            Add Packaging
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ── Contact Card ── */}
        <Card className="h-fit overflow-hidden">
          <CardHeader className="pb-3 pt-5 px-5">
            <CardTitle className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="divide-y divide-border/60">
              <ContactRow
                icon={<User className="size-3.5" />}
                label="Shop Name"
                value={supplier.supplierShopName}
              />
              <ContactRow
                icon={<Mail className="size-3.5" />}
                label="Email"
                value={supplier.email}
              />
              <ContactRow
                icon={<Phone className="size-3.5" />}
                label="Phone"
                value={supplier.phone}
              />
              <ContactRow
                icon={<Hash className="size-3.5" />}
                label="National ID"
                value={supplier.nationalId}
                mono
              />
              <ContactRow
                icon={<MapPin className="size-3.5" />}
                label="Address"
                value={supplier.address}
              />
              {/* City + State side by side */}
              <div className="flex gap-3 py-3">
                <div className="flex items-start gap-3 flex-1 group">
                  <div className="mt-0.5 size-7 shrink-0 flex items-center justify-center rounded-lg bg-muted/60 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    <Globe className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5">
                      City
                    </p>
                    <p className={cn("text-[13.5px]", !supplier.city && "text-muted-foreground/50 italic")}>
                      {supplier.city || "Not provided"}
                    </p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-0.5 mt-0.5">
                    State
                  </p>
                  <p className={cn("text-[13.5px]", !supplier.state && "text-muted-foreground/50 italic")}>
                    {supplier.state || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-2 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="size-3.5 text-muted-foreground/70" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Notes
                </p>
              </div>
              <p
                className={cn(
                  "text-[13px] bg-muted/40 rounded-lg p-3 min-h-[64px] leading-relaxed border border-border/40",
                  !supplier.notes && "text-muted-foreground/50 italic",
                )}
              >
                {supplier.notes || "No notes added."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Right Column ── */}
        <div className="space-y-5">

          {/* Stat Cards */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              title="Total Purchases"
              value={`PKR ${Number(supplier.totalPurchases).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              sub={`${supplier.purchases.length} orders placed`}
              icon={<ShoppingCart className="size-3.5" />}
              variant="default"
            />
            <StatCard
              title="Total Paid"
              value={`PKR ${Number(supplier.totalPayments).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              sub={`${supplier.payments.length} payments recorded`}
              icon={<Banknote className="size-3.5" />}
              variant="success"
            />
            <StatCard
              title="Outstanding Balance"
              value={`PKR ${Math.abs(Number(supplier.balance)).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
              sub={isOverdue ? "Payment due" : "Fully paid — no dues"}
              icon={<CreditCard className="size-3.5" />}
              variant={isOverdue ? "danger" : "success"}
            />
          </div>

          {/* Tabs + Filter */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/60">
              <Tabs defaultValue="purchases" className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="h-8">
                    <TabsTrigger value="purchases" className="text-[12.5px] h-6 px-3">
                      <TrendingUp className="size-3 mr-1.5" />
                      Purchase History
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="text-[12.5px] h-6 px-3">
                      <Banknote className="size-3 mr-1.5" />
                      Payment Records
                    </TabsTrigger>
                  </TabsList>

                  <div className="flex items-center gap-2">
                    <DatePickerWithRange
                      date={dateRange}
                      onDateChange={setDateRange}
                      className="w-[230px] h-8"
                    />
                    {dateRange?.from && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        onClick={() => setDateRange(undefined)}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <TabsContent value="purchases" className="mt-0">
                  <PurchaseHistoryTable
                    data={supplier.purchases as any}
                    setSelectedItem={setSelectedItem}
                    setDetailsOpen={setDetailsOpen}
                    setEditDialogOpen={setEditDialogOpen}
                    setDeleteDialogOpen={setDeleteDialogOpen}
                    onRecordPayment={handleRecordPayment}
                    onRestock={handleRestock}
                    dateRange={dateRange}
                  />
                </TabsContent>
                <TabsContent value="payments" className="mt-0">
                  <PaymentRecordsTable
                    data={supplier.payments as any}
                    dateRange={dateRange}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <AddRawMaterialDialog
        open={isAddChemicalOpen}
        onOpenChange={setAddChemicalOpen}
        warehouses={warehouses}
        preselectedWarehouse={factoryFloor?.id}
        preselectedSupplierId={supplier.id}
      />
      <AddPackagingMaterialSheet
        open={isAddPackagingOpen}
        onOpenChange={setAddPackagingOpen}
        warehouses={warehouses}
        preselectedWarehouse={factoryFloor?.id}
        preselectedSupplierId={supplier.id}
      />
      <RecordPaymentDialog
        open={isRecordPaymentOpen}
        onOpenChange={(open) => {
          setRecordPaymentOpen(open);
          if (!open) setPaymentDefaults({});
        }}
        supplierId={supplier.id}
        supplierName={supplier.supplierName}
        outstandingBalance={
          paymentDefaults.remainingBalance !== undefined
            ? paymentDefaults.remainingBalance
            : balance
        }
        purchaseId={paymentDefaults.purchaseId}
        defaultAmount={paymentDefaults.amount}
        defaultNotes={paymentDefaults.notes}
      />
      <PurchaseDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        purchase={selectedItem}
      />
      <DeletePurchaseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        purchase={selectedItem}
      />
      <EditPurchaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        purchase={selectedItem}
      />
      <AddStockDialog
        open={isRestockOpen}
        onOpenChange={setRestockOpen}
        warehouses={warehouses}
        preselectedWarehouse={factoryFloor?.id}
        itemToRestock={itemToRestock}
        preselectedSupplierId={supplier.id}
      />
    </div>
  );
}