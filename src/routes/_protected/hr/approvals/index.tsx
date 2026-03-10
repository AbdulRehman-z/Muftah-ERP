import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { GenericLoader } from "@/components/custom/generic-loader";
import { OvertimeApprovalsContainer } from "@/components/hr/attendance/overtime-approvals-container";
import { LeaveApprovalsContainer } from "@/components/hr/attendance/leave-approvals-container";
import { AdvancesContainer } from "@/components/hr/advances/advances-container";
import { getOvertimeApprovalsFn } from "@/server-functions/hr/attendance/get-overtime-approvals-fn";
import { getLeaveApprovalsFn } from "@/server-functions/hr/attendance/leave-approvals-fn";
import { listSalaryAdvancesFn } from "@/server-functions/hr/advances/advances-fn";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, CalendarX, Banknote, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_protected/hr/approvals/")({
  loader: async ({ context: { queryClient } }) => {
    void queryClient.prefetchQuery({
      queryKey: ["overtime-approvals", "pending"],
      queryFn: () => getOvertimeApprovalsFn({ data: { status: "pending" } }),
    });
    void queryClient.prefetchQuery({
      queryKey: ["leave-approvals", "pending"],
      queryFn: () => getLeaveApprovalsFn({ data: { status: "pending" } }),
    });
    void queryClient.prefetchQuery({
      queryKey: ["salary-advances"],
      queryFn: () => listSalaryAdvancesFn({ data: { limit: 50 } }),
    });
  },
  component: ApprovalsPage,
});

type ApprovalTab = "overtime" | "leave" | "advances";

function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<ApprovalTab>("overtime");

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col min-h-full p-8 animate-in fade-in duration-500">
        <header className="border-b pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-3xl uppercase tracking-tighter">
                Approval Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Review and manage overtime, leave, and salary advance requests.
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 py-6 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as ApprovalTab)}
            className="w-full"
          >
            <TabsList className="bg-muted/50 p-1 border mb-6 w-full sm:w-auto">
              <TabsTrigger
                value="overtime"
                className="text-xs font-bold uppercase tracking-wider px-5 gap-2"
              >
                <Clock className="size-3.5" />
                Overtime
              </TabsTrigger>
              <TabsTrigger
                value="leave"
                className="text-xs font-bold uppercase tracking-wider px-5 gap-2"
              >
                <CalendarX className="size-3.5" />
                Leave
              </TabsTrigger>
              <TabsTrigger
                value="advances"
                className="text-xs font-bold uppercase tracking-wider px-5 gap-2"
              >
                <Banknote className="size-3.5" />
                Advances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overtime" className="mt-0 outline-none">
              <Suspense
                fallback={
                  <GenericLoader
                    title="Loading overtime approvals"
                    description="Fetching pending requests..."
                  />
                }
              >
                <OvertimeApprovalsContainer />
              </Suspense>
            </TabsContent>

            <TabsContent value="leave" className="mt-0 outline-none">
              <Suspense
                fallback={
                  <GenericLoader
                    title="Loading leave approvals"
                    description="Fetching pending requests..."
                  />
                }
              >
                <LeaveApprovalsContainer />
              </Suspense>
            </TabsContent>

            <TabsContent value="advances" className="mt-0 outline-none">
              <Suspense
                fallback={
                  <GenericLoader
                    title="Loading advance approvals"
                    description="Fetching pending requests..."
                  />
                }
              >
                <AdvancesContainer />
              </Suspense>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
