import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { AddRawMaterialForm } from "./add-raw-material-form";
import { ResponsiveSheet } from "../custom/responsive-sheet";
import { FlaskConical } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
  preselectedWarehouse: string | undefined;
  preselectedSupplierId?: string;
};

export const AddRawMaterialDialog = ({
  open,
  onOpenChange,
  warehouses,
  preselectedWarehouse,
  preselectedSupplierId,
}: Props) => {
  return (
    <ResponsiveSheet
      title="Add Chemical"
      description="Add Chemicals to factory floor"
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
      icon={FlaskConical}
    >
      <AddRawMaterialForm
        onSuccess={() => onOpenChange(false)}
        warehouses={warehouses}
        preselectedWarehouse={preselectedWarehouse}
        preselectedSupplierId={preselectedSupplierId}
      />
    </ResponsiveSheet>
  );
};
