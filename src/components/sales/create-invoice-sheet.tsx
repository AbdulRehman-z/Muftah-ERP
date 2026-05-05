import { useState } from "react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { CreateInvoiceForm } from "./create-invoice-form";
import { FilePlus, Truck } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerType?: "distributor" | "retailer" | "wholesaler";
  lockedCustomerType?: boolean;
};

export const CreateInvoiceSheet = ({ open, onOpenChange, defaultCustomerType, lockedCustomerType }: Props) => {
  const [isDirty, setIsDirty] = useState(false);

  const isDistributor = defaultCustomerType === "distributor" && lockedCustomerType;
  const title = isDistributor ? "Create Distributor Invoice" : "Create Smart Invoice";
  const description = isDistributor
    ? "Generate an invoice for a pre-configured distributor with automatic pricing rules."
    : "Generate a new invoice with built-in profitability checks.";
  const icon = isDistributor ? Truck : FilePlus;

  return (
    <ResponsiveSheet
      title={title}
      description={description}
      open={open}
      onOpenChange={onOpenChange}
      className="lg:min-w-[80vw]"
      icon={icon}
      isDirty={isDirty}
    >
      <CreateInvoiceForm
        onSuccess={() => { setIsDirty(false); onOpenChange(false); }}
        onCancel={() => onOpenChange(false)}
        onDirtyChange={setIsDirty}
        defaultCustomerType={defaultCustomerType}
        lockedCustomerType={lockedCustomerType}
      />
    </ResponsiveSheet>
  );
};