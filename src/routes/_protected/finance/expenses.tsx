import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { getExpensesFn } from "@/server-functions/finance-fn";
import { ExpensesContainer } from "@/components/finance/expenses-container";

export const Route = createFileRoute("/_protected/finance/expenses")({
  loader: async ({ context }) => {
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
            Expenses
          </h1>
          <p className="mt-2 text-muted-foreground">
            View and track all recorded expenses across accounts.
          </p>
        </header>
        <div className="flex-1 py-8 flex flex-col">
          <Suspense
            fallback={
              <GenericLoader
                title="Loading expenses"
                description="Please wait..."
              />
            }
          >
            <ExpensesContainer />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
