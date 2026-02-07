import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { AddSupplierForm } from "./add-supplier-form";

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export const AddSupplierDialog = ({ open, onOpenChange }: Props) => {
    return (
        <ResponsiveDialog
            title="Add Supplier"
            description="Add a new supplier to your database."
            open={open}
            onOpenChange={onOpenChange}
        >
            <AddSupplierForm onSuccess={() => onOpenChange(false)} />
        </ResponsiveDialog>
    );
};
