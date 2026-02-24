import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { PayrollContainer } from "@/components/hr/payroll/payroll-container";
import { getMonthlyPayrollTableFn } from "@/server-functions/hr/payroll/dashboard-fn";
import { format } from "date-fns";

export const Route = createFileRoute("/_protected/hr/payroll/")({
  loader: async ({ context: { queryClient } }) => {
    const month = format(new Date(), "yyyy-MM");
    void queryClient.prefetchQuery({
      queryKey: ["payroll-dashboard", month],
      queryFn: () => getMonthlyPayrollTableFn({ data: { month } }),
    });
  },
  component: PayrollPage,
});

function PayrollPage() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col min-h-full p-8">
        <header className="border-b pb-8">
          <h1 className="font-bold text-3xl uppercase tracking-tighter">
            Payroll Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage monthly salary processing, approvals, and history.
          </p>
        </header>
        <div className="flex-1 py-8 flex flex-col">
          <Suspense
            fallback={
              <GenericLoader
                title="Loading payroll"
                description="Please wait..."
              />
            }
          >
            <PayrollContainer />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
