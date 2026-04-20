import { useState } from "react";
import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { CreateInvoiceForm } from "./create-invoice-form";
import { FilePlus } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const CreateInvoiceSheet = ({ open, onOpenChange }: Props) => {
  const [isDirty, setIsDirty] = useState(false);

  return (
    <ResponsiveSheet
      title="Create Smart Invoice"
      description="Generate a new invoice with built-in profitability checks."
      open={open}
      onOpenChange={onOpenChange}
      className="lg:min-w-[80vw]"
      icon={FilePlus}
      isDirty={isDirty}
    >
      <CreateInvoiceForm
        onSuccess={() => { setIsDirty(false); onOpenChange(false); }}
        onCancel={() => onOpenChange(false)}
        onDirtyChange={setIsDirty}
      />
    </ResponsiveSheet>
  );
};
