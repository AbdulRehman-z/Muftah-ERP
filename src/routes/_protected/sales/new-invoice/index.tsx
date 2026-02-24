import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { invoicesKeys } from "@/hooks/sales/use-invoices";
import { getInvoicesFn } from "@/server-functions/sales/invoices-fn";
import { InvoicesContainer } from "@/components/sales/invoices-container";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_protected/sales/new-invoice/")({
  loader: async ({ context }) => {
    const defaultParams = { page: 1, limit: 7 };
    void context.queryClient.prefetchQuery({
      queryKey: invoicesKeys.list(defaultParams),
      queryFn: () => getInvoicesFn({ data: defaultParams }),
    });
  },
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Sales & Invoices</h2>
        <p className="text-muted-foreground">
          Manage sales, generate smart Invoices, and view ledgers.
        </p>
      </div>

      <Separator />

      <Suspense
        fallback={
          <GenericLoader
            title="Loading Invoices"
            description="Fetching sales data..."
          />
        }
      >
        <InvoicesContainer />
      </Suspense>
    </div>
  );
}
