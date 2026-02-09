import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { EditSupplierForm } from "./edit-supplier-form";

type Supplier = {
    id: string;
    supplierName: string;
    supplierShopName: string | null;
    email: string | null;
    nationalId: string | null;
    phone: string | null;
    address: string | null;
    notes: string | null;
};

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: Supplier;
};

export const EditSupplierDialog = ({ open, onOpenChange, supplier }: Props) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Supplier Profile</DialogTitle>
                </DialogHeader>
                <EditSupplierForm
                    supplier={supplier}
                    onSuccess={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
};
