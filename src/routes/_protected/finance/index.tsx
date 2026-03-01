import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { FinanceContainer } from "@/components/finance/finance-container";
import { getWalletsListFn, getTransactionsFn, getExpensesFn } from "@/server-functions/finance-fn";

export const Route = createFileRoute("/_protected/finance/")({
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["wallets"],
      queryFn: getWalletsListFn,
    });
    void context.queryClient.prefetchQuery({
      queryKey: ["transactions"],
      queryFn: () => getTransactionsFn({ data: { limit: 20 } }),
    });
    void context.queryClient.prefetchQuery({
      queryKey: ["expenses"],
      queryFn: () => getExpensesFn({ data: {} }),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col min-h-full p-8">
        <header className="border-b pb-8">
          <h1 className="font-bold text-3xl uppercase tracking-tighter">
            Finance
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage accounts, track expenses, and monitor cash flow across all
            payment sources.
          </p>
        </header>
        <div className="flex-1 py-8 flex flex-col">
          <Suspense
            fallback={
              <GenericLoader
                title="Loading finance"
                description="Please wait..."
              />
            }
          >
            <FinanceContainer />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
