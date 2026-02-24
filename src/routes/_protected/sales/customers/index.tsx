import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { customersKeys } from "@/hooks/sales/use-customers";
import { getCustomersFn } from "@/server-functions/sales/customers-fn";
import { CustomersContainer } from "@/components/sales/customers-container";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_protected/sales/customers/")({
  loader: async ({ context }) => {
    const defaultParams = { page: 1, limit: 7 };
    void context.queryClient.prefetchQuery({
      queryKey: customersKeys.list(defaultParams),
      queryFn: () => getCustomersFn({ data: defaultParams }),
    });
  },
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Customer Ledger</h2>
        <p className="text-muted-foreground">
          View and track distributors and retailers, their sales, and outstanding balances.
        </p>
      </div>

      <Separator />

      <Suspense
        fallback={
          <GenericLoader
            title="Loading Customers"
            description="Fetching ledger data..."
          />
        }
      >
        <CustomersContainer />
      </Suspense>
    </div>
  );
}
