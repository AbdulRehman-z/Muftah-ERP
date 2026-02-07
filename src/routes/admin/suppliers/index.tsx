import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AddSupplierDialog } from "@/components/suppliers/add-supplier-dialog";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/suppliers/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["suppliers"],
      queryFn: getSuppliersFn,
    });
  },
  component: SuppliersPage,
});

function SuppliersPage() {
  const { data: suppliers } = useSuspenseQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliersFn,
  });

  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Suppliers</h2>
          <p className="text-muted-foreground">
            Manage your raw material suppliers and view transaction history.
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Supplier
        </Button>
      </div>
      <Separator />
      <SuppliersTable data={suppliers} />
      <AddSupplierDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
