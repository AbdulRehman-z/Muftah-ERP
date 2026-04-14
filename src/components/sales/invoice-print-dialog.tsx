import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, FileText } from "lucide-react";
import { DistributorInvoice, type DistributorInvoiceData } from "./distributor-invoice";
import { RetailerInvoice, type RetailerInvoiceData } from "./retailer-invoice";
import { format } from "date-fns";

interface InvoiceData {
  id: string;
  date: Date | string;
  customer: any;
  items: any[];
  totalPrice: string;
  cash: string;
  credit: string;
  expenses: string;
  warehouse?: any;
  remarks?: string;
  slipNumber?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceData | null;
}

export const InvoicePrintDialog = ({ open, onOpenChange, invoice }: Props) => {
  const [template, setTemplate] = useState<"distributor" | "retailer">("distributor");
  const printRef = useRef<HTMLDivElement>(null);

  if (!invoice) return null;

  const isDistributor = invoice.customer?.customerType === "distributor";
  const selectedTemplate = template || (isDistributor ? "distributor" : "retailer");

  // Build distributor invoice data
  const distributorData: DistributorInvoiceData = {
    partyName: invoice.customer?.name || "N/A",
    address: invoice.customer?.address || "N/A",
    city: invoice.customer?.city || "N/A",
    tel: invoice.customer?.mobileNumber || "N/A",
    mob: "",
    date: format(new Date(invoice.date), "dd MMM yyyy"),
    estNo: invoice.id.slice(-8).toUpperCase(),
    docNo: invoice.id.slice(-8).toUpperCase(),
    pvNo: "—",
    mBillNo: invoice.slipNumber || "—",
    transporter: invoice.warehouse?.name || "—",
    biltyNo: "—",
    items: invoice.items.map((item, i) => ({
      serialNo: i + 1,
      itemCode: item.recipeId?.slice(-6).toUpperCase() || "—",
      description: item.pack,
      cartonQty: item.numberOfCartons,
      schemeCarton: 0,
      cartonRate: Number(item.perCartonPrice),
      grossAmount: Number(item.amount),
      discount: Number(item.retailPrice) > 0 ? Number(item.retailPrice) - Number(item.perCartonPrice) / (item.numberOfCartons || 1) : 0,
      netAmount: Number(item.amount),
    })),
    comments: invoice.remarks || "—",
    freight: Number(invoice.expenses),
    previousBalance: Number(invoice.credit),
  };

  // Build retailer invoice data
  const retailerData: RetailerInvoiceData = {
    customerName: invoice.customer?.name || "N/A",
    address: invoice.customer?.address || "N/A",
    phone: invoice.customer?.mobileNumber || "N/A",
    invoiceNo: invoice.id.slice(-8).toUpperCase(),
    date: format(new Date(invoice.date), "dd MMM yyyy"),
    saleType: isDistributor ? "Wholesale" : "Retail",
    items: invoice.items.map((item, i) => ({
      serialNo: i + 1,
      productName: item.pack,
      hsnCode: item.hsnCode,
      gstRate: "0%",
      rate: Number(item.perCartonPrice),
      qty: item.numberOfCartons || item.quantity,
      grossAmount: Number(item.amount),
      netAmount: Number(item.amount),
    })),
    cgst: 0,
    sgst: 0,
    amountInWords: `PKR ${Number(invoice.totalPrice).toLocaleString("en-PK")} Only`,
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow || !printRef.current) return;

    const html = printRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice ${invoice.id.slice(-8)}</title>
          <style>
            body { margin: 0; padding: 20px; font-family: system-ui, sans-serif; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Print Invoice
          </DialogTitle>
          <DialogDescription>
            Preview and print invoice for {invoice.customer?.name}
          </DialogDescription>
        </DialogHeader>

        {/* Template selector */}
        <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
          <span className="text-xs text-muted-foreground font-medium mr-2">Template:</span>
          <Button
            variant={selectedTemplate === "distributor" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemplate("distributor")}
            className="text-xs h-7"
          >
            <FileText className="size-3 mr-1" />
            Distributor
          </Button>
          <Button
            variant={selectedTemplate === "retailer" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemplate("retailer")}
            className="text-xs h-7"
          >
            <FileText className="size-3 mr-1" />
            Retailer
          </Button>
          <Badge variant="outline" className="ml-auto text-xs capitalize">
            {invoice.customer?.customerType}
          </Badge>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto border rounded-lg bg-gray-50 p-4">
          <div ref={printRef}>
            {selectedTemplate === "distributor" ? (
              <DistributorInvoice data={distributorData} />
            ) : (
              <RetailerInvoice data={retailerData} />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="size-4" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
