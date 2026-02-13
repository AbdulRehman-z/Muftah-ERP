import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { AddSupplierDialog } from "./add-supplier-dialog"
import { SuppliersTable } from "./suppliers-table"
import { useSuspenseQuery } from "@tanstack/react-query"
import { GenericEmpty } from "../custom/empty";
import { BoxIcon, Plus, UsersIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";

export const SupplierContainer = () => {
    const [isAddOpen, setIsAddOpen] = useState(false);

    const { data: suppliers, isPending } = useSuspenseQuery({
        queryKey: ["suppliers"],
        queryFn: getSuppliersFn,
    });

    if (suppliers.length === 0) {
        return (
            <>
                <GenericEmpty
                    className="mt-30"
                    icon={BoxIcon}
                    title="No Suppliers Found"
                    description="You haven't added any suppliers yet. First, define a supplier then you can add transactions for it."
                    ctaText="Add Supplier"
                    onAddChange={setIsAddOpen}
                />
                <AddSupplierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
            </>
        );
    }

    return (
        <>
            <div className="flex flex-col">
                <Button onClick={() => setIsAddOpen(true)} className="w-fit justify-end ml-auto">
                    <Plus className="mr-2 size-4" />
                    Add Supplier
                </Button>
                <SuppliersTable data={suppliers} />
            </div>

            <AddSupplierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
        </>
    )
}