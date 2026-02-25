import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { CreateInvoiceForm } from "./create-invoice-form";
import { FilePlus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateInvoiceSheet = ({ open, onOpenChange }: Props) => {
  return (
    <ResponsiveSheet
      title="Create Smart Invoice"
      description="Generate a new invoice with built-in profitability checks."
      open={open}
      onOpenChange={onOpenChange}
      className="lg:min-w-[80vw]"
      icon={FilePlus}
    >
      <CreateInvoiceForm
        onSuccess={() => onOpenChange(false)}
        onCancel={() => onOpenChange(false)}
      />
    </ResponsiveSheet>
  );
};
