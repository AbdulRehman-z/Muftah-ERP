import { useState, useRef, useMemo } from "react";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getInvoiceDetailFn } from "@/server-functions/sales/invoices-fn";
import {
  DistributorInvoiceView,
  type DistributorInvoiceData,
} from "./distributor-invoice";
import {
  RetailerInvoiceView,
  type RetailerInvoiceData,
} from "./retailer-invoice";
import { Printer, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string | null;
}

export const InvoicePrintDialog = ({ open, onOpenChange, invoiceId }: Props) => {
  return (
    <ResponsiveDialog
      title="Print Invoice"
      description="Preview and print the generated invoice"
      open={open}
      onOpenChange={onOpenChange}
      className="lg:min-w-[80vw]"
      icon={Printer}
      noScroll
    >
      {invoiceId ? (
        <InvoicePrintContent
          invoiceId={invoiceId}
          onClose={() => onOpenChange(false)}
        />
      ) : (
        <PrintLoadingSkeleton />
      )}
    </ResponsiveDialog>
  );
};

/* ─── Inner content: fetches, transforms, previews ─── */

const InvoicePrintContent = ({
  invoiceId,
  onClose,
}: {
  invoiceId: string;
  onClose: () => void;
}) => {
  const [template, setTemplate] = useState<"distributor" | "retailer" | "auto">("auto");
  const printRef = useRef<HTMLDivElement>(null);

  const {
    data: invoice,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["invoice-print", invoiceId],
    queryFn: () => getInvoiceDetailFn({ data: { id: invoiceId } }),
    enabled: !!invoiceId,
    staleTime: 1000 * 60,
  });

  const isDistributor = invoice?.customer?.customerType === "distributor";
  const resolvedTemplate: "distributor" | "retailer" = template === "auto"
    ? (isDistributor ? "distributor" : "retailer")
    : template;

  // Memoise transformed data so template switching doesn't recompute
  const distributorData = useMemo<DistributorInvoiceData | null>(() => {
    if (!invoice) return null;
    return buildDistributorData(invoice);
  }, [invoice]);

  const retailerData = useMemo<RetailerInvoiceData | null>(() => {
    if (!invoice) return null;
    return buildRetailerData(invoice);
  }, [invoice]);

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(
      `<!DOCTYPE html><html><head><title>Invoice ${invoiceId.slice(-8)}</title>` +
      `<style>body{margin:0;padding:20px;font-family:system-ui,sans-serif;}` +
      `@media print{body{padding:0}}</style></head>` +
      `<body>${el.innerHTML}</body></html>`,
    );
    win.document.close();
    win.print();
  };

  if (isLoading) return <PrintLoadingSkeleton />;

  if (isError || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertCircle className="size-12 text-destructive" />
        <p className="text-sm font-medium text-destructive">
          Failed to load invoice details
        </p>
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-1">
      {/* Controls bar */}
      <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg shrink-0">
        <span className="text-xs text-muted-foreground font-medium mr-1">
          Template:
        </span>
        <Button
          variant={resolvedTemplate === "distributor" ? "default" : "outline"}
          size="sm"
          onClick={() => setTemplate("distributor")}
          className="text-xs h-7"
        >
          <FileText className="size-3 mr-1" />
          Distributor
        </Button>
        <Button
          variant={resolvedTemplate === "retailer" ? "default" : "outline"}
          size="sm"
          onClick={() => setTemplate("retailer")}
          className="text-xs h-7"
        >
          <FileText className="size-3 mr-1" />
          Retailer
        </Button>
        <Badge variant="outline" className="ml-auto text-xs capitalize">
          {invoice.customer?.customerType ?? "retailer"}
        </Badge>
      </div>

      {/* Preview pane */}
      <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 dark:bg-zinc-900 p-4 min-h-[400px]">
        <div ref={printRef}>
          {resolvedTemplate === "distributor" && distributorData ? (
            <DistributorInvoiceView invoice={distributorData} showActions={false} />
          ) : retailerData ? (
            <RetailerInvoiceView invoice={retailerData} showActions={false} />
          ) : null}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t shrink-0">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="size-4" />
          Print
        </Button>
      </div>
    </div>
  );
};

/* ─── Data transformers ─── */

const fmtCartonQty = (n: number): string => `${n} - 0`;

const buildDistributorData = (inv: any): DistributorInvoiceData => ({
  companyName: "IIPL",
  docType: "Sales Estimate",
  party: {
    name: inv.customer?.name ?? "N/A",
    address: inv.customer?.address ?? "N/A",
    city: inv.customer?.city ?? "N/A",
    tel: inv.customer?.mobileNumber ?? "N/A",
    mob: "",
  },
  date: format(new Date(inv.date), "dd-MMM-yyyy"),
  estNo: inv.id.slice(-8).toUpperCase(),
  docNo: inv.id.slice(-8).toUpperCase(),
  pvNo: "—",
  mBillNo: inv.slipNumber ?? "—",
  transporter: inv.warehouse?.name ?? "—",
  biltyNo: "—",
  dispDate: "—",
  items: (inv.items ?? []).map((item: any, i: number) => ({
    serialNo: i + 1,
    itemCode: item.recipeId?.slice(-6).toUpperCase() ?? "—",
    itemDescription: item.pack,
    cartonQty: fmtCartonQty(item.numberOfCartons ?? 0),
    schemeCarton: "0 - 0",
    cartonRate: Number(item.perCartonPrice) || 0,
    grossAmount: Number(item.amount) || 0,
    discount: 0,
    netAmount: Number(item.amount) || 0,
  })),
  freight: Number(inv.expenses) || 0,
  previousBalance: Number(inv.credit) || 0,
  invoiceAmount: Number(inv.totalPrice) || 0,
});

const buildRetailerData = (inv: any): RetailerInvoiceData => {
  const isDist = inv.customer?.customerType === "distributor";
  return {
    invoiceNo: inv.id.slice(-8).toUpperCase(),
    date: format(new Date(inv.date), "dd-MMM-yyyy"),
    customer: {
      name: inv.customer?.name ?? "N/A",
      completeAddress: inv.customer?.address ?? "N/A",
      phoneNumber: inv.customer?.mobileNumber ?? "N/A",
    },
    saleType: isDist ? "Wholesale" : "Retail",
    items: (inv.items ?? []).map((item: any, i: number) => ({
      sNo: i + 1,
      productName: item.pack,
      hsnCode: item.hsnCode ?? "—",
      gstRate: 0,
      rate: Number(item.perCartonPrice) || 0,
      qty: item.numberOfCartons || item.quantity || 0,
      grossAmount: Number(item.amount) || 0,
      netAmount: Number(item.amount) || 0,
    })),
    cgstRate: 0,
    sgstRate: 0,
  };
};

/* ─── Skeleton ─── */

const PrintLoadingSkeleton = () => (
  <div className="space-y-4 p-1">
    <Skeleton className="h-10 w-full rounded-lg" />
    <Skeleton className="h-[400px] w-full rounded-lg" />
    <div className="flex justify-end gap-2">
      <Skeleton className="h-9 w-20 rounded-md" />
      <Skeleton className="h-9 w-24 rounded-md" />
    </div>
  </div>
);


