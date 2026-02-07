import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSupplierDetailsFn } from "@/server-functions/suppliers/get-supplier-details-fn";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Phone, Mail, MapPin, Building2, Calendar, Package, User, Plus, Beaker, BoxIcon, WalletCards, CreditCard, Banknote, ShoppingCart, XIcon, CardSimIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddRawMaterialDialog } from "@/components/inventory/add-raw-material-dialog";
import { AddPackagingMaterialDialog } from "@/components/inventory/add-packaging-material-dialog";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { PurchaseHistoryTable } from "@/components/suppliers/purchase-history-table";
import { PaymentRecordsTable } from "@/components/suppliers/payment-records-table";
import { RecordPaymentDialog } from "@/components/suppliers/record-payment-dialog";
import { PurchaseDetailsDialog } from "@/components/suppliers/purchase-details-dialog";
import { DeletePurchaseDialog } from "@/components/suppliers/delete-purchase-dialog";
import { EditPurchaseDialog } from "@/components/suppliers/edit-purchase-dialog";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { AddPackagingMaterialSheet } from "@/components/inventory/add-packaging-material-sheet";

export const Route = createFileRoute("/admin/suppliers/$supplierId")({
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["supplier", params.supplierId],
        queryFn: () => getSupplierDetailsFn({ data: { id: params.supplierId } }),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["inventory"],
        queryFn: getInventoryFn,
      }),
    ]);
  },
  component: SupplierDetailsPage,
});

function SupplierDetailsPage() {
  const { supplierId } = Route.useParams();
  const [isAddChemicalOpen, setAddChemicalOpen] = useState(false);
  const [isAddPackagingOpen, setAddPackagingOpen] = useState(false);
  const [isRecordPaymentOpen, setRecordPaymentOpen] = useState(false);

  // State for Purchase History Actions
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // State for Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // State for Defaults
  const [paymentDefaults, setPaymentDefaults] = useState<{ amount?: string; notes?: string; purchaseId?: string; remainingBalance?: number }>({});

  const { data: supplier } = useSuspenseQuery({
    queryKey: ["supplier", supplierId],
    queryFn: () => getSupplierDetailsFn({ data: { id: supplierId } }),
  });

  const { data: warehouses } = useSuspenseQuery({
    queryKey: ["inventory"],
    queryFn: getInventoryFn,
  });

  const factoryFloor = warehouses.find(w => w.type === "factory_floor");

  const totalPurchases = supplier.purchases.reduce((acc, curr) => acc + parseFloat(curr.cost), 0);
  const totalPayments = supplier.payments.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
  const balance = totalPurchases - totalPayments;

  const handleRecordPayment = (item: any) => {
    const total = parseFloat(item.cost);
    const paid = parseFloat(item.paidAmount || "0");
    const remaining = total - paid;

    setPaymentDefaults({
      amount: remaining.toString(),
      purchaseId: item.id,
      remainingBalance: remaining,
      notes: `Payment for Purchase ID: ${item.id} (${item.materialType})`
    });
    setRecordPaymentOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Building2 className="size-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{supplier.supplierName}</h2>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span className="font-mono text-xs opacity-50">ID: {supplier.id}</span>
              <span>•</span>
              <span>Added {format(new Date(supplier.createdAt), "PPP")}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAddChemicalOpen(true)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Beaker className="size-4 mr-2" />
            Add Chemical
          </Button>
          <Button
            onClick={() => setAddPackagingOpen(true)}
            size="sm"
            variant="outline"
          >
            <BoxIcon className="size-4 mr-2" />
            Add Packaging
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Card */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="size-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Shop Name</p>
                <p className="text-sm text-muted-foreground">{supplier.supplierShopName || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Mail className="size-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{supplier.email || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <Phone className="size-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{supplier.phone || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <CardSimIcon className="size-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">National ID</p>
                <p className="text-sm text-muted-foreground">{supplier.nationalId || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-start gap-3">
              <MapPin className="size-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{supplier.address || "N/A"}</p>
              </div>
            </div>
            <Separator />
            <div className="pt-2">
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-md min-h-[60px]">
                {supplier.notes || "No notes"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats & History */}
        <div className="md:col-span-2 space-y-6">
          {/* Date Range Picker */}
          <div className="flex items-center justify-end gap-2">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-[260px]"
            />
            {dateRange?.from && (
              <Button variant="outline" size="icon" onClick={() => setDateRange(undefined)}>
                <XIcon className="size-4" />
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchases</CardTitle>
                <ShoppingCart className="size-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">PKR {Number(supplier.totalPurchases).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">{supplier.purchases.length} total orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                <Banknote className="size-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">PKR {Number(supplier.totalPayments).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">{supplier.payments.length} payments recorded</p>
              </CardContent>
            </Card>
            <Card className={cn(supplier.balance > 0 ? "border-red-500/50 bg-red-50/10" : "border-green-500/50 bg-green-50/10")}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">Outstanding Balance</CardTitle>
                <CreditCard className="size-4 text-muted-foreground opacity-50" />
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", supplier.balance > 0 ? "text-red-500" : "text-green-600")}>
                  PKR {Math.abs(Number(supplier.balance)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  <span className="text-xs font-normal text-muted-foreground ml-2">
                    {supplier.balance > 0 ? "(Due)" : "(Advance)"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {supplier.balance > 0 ? "Payment Due" : "Fully Paid"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="purchases">
            <TabsList>
              <TabsTrigger value="purchases">Purchase History</TabsTrigger>
              <TabsTrigger value="payments">Payment Records</TabsTrigger>
            </TabsList>
            <TabsContent value="purchases" className="mt-4">
              <PurchaseHistoryTable
                data={supplier.purchases as any}
                setSelectedItem={setSelectedItem}
                setDetailsOpen={setDetailsOpen}
                setEditDialogOpen={setEditDialogOpen}
                setDeleteDialogOpen={setDeleteDialogOpen}
                onRecordPayment={handleRecordPayment}
                dateRange={dateRange}
              />
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
              <PaymentRecordsTable
                data={supplier.payments as any}
                dateRange={dateRange}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
          if (!open) setPaymentDefaults({}); // Reset on close
        }}
        supplierId={supplier.id}
        supplierName={supplier.supplierName}
        outstandingBalance={paymentDefaults.remainingBalance !== undefined ? paymentDefaults.remainingBalance : balance}
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
    </div>
  );
}
