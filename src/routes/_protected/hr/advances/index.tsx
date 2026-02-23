import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { listSalaryAdvancesFn } from "@/server-functions/hr/advances/advances-fn";
import { AdvancesContainer } from "@/components/hr/advances/advances-container";

export const Route = createFileRoute("/_protected/hr/advances/")({
    loader: async ({ context: { queryClient } }) => {
        void queryClient.prefetchQuery({
            queryKey: ["salary-advances"],
            queryFn: () => listSalaryAdvancesFn({ data: { limit: 100 } }),
        });
    },
    component: AdvancesPage,
});

function AdvancesPage() {
    return (
        <main className="flex-1 overflow-y-auto">
            <div className="flex flex-col min-h-full p-8">
                <header className="border-b pb-8">
                    <h1 className="font-bold text-3xl uppercase tracking-tighter">
                        Salary Advances
                    </h1>
                    <p className="mt-2 text-muted-foreground">
                        Manage and approve employee salary advances and record finance ledger payouts.
                    </p>
                </header>
                <div className="flex-1 py-8 flex flex-col">
                    <Suspense
                        fallback={<GenericLoader title="Loading..." description="Please wait..." />}
                    >
                        <AdvancesContainer />
                    </Suspense>
                </div>
            </div>
        </main>
    );
}
