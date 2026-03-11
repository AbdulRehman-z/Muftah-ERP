import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { UsersTable } from "@/components/user-management/users-table";
import { GenericLoader } from "@/components/custom/generic-loader";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { Users } from "lucide-react";

export const Route = createFileRoute("/_protected/user-management/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    void context.queryClient.prefetchQuery({
      queryKey: ["admin-users"],
      queryFn: () => adminGetUsersFn(),
      staleTime: Infinity,
    });
  },
});

function RouteComponent() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="flex flex-col min-h-full p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-4 pb-6 border-b border-border/60">
          <div className="size-11 shrink-0 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none">
              User Management
            </h1>
            <p className="mt-1.5 text-[13.5px] text-muted-foreground">
              Manage system users, assign roles, and control account access.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <GenericLoader
              title="Loading Users"
              description="Fetching user data..."
            />
          }
        >
          <UsersTable />
        </Suspense>
      </div>
    </main>
  );
}