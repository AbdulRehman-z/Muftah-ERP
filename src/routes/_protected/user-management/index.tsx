import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { UsersTable } from "@/components/user-management/users-table";
import { GenericLoader } from "@/components/custom/generic-loader";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";

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
      <div className="flex flex-col min-h-full p-8">
        <header className="border-b pb-8">
          <h1 className="font-bold text-4xl uppercase tracking-tighter">
            User Management
          </h1>
          <p className="mt-2 text-muted-foreground">
            Manage users, roles, and permissions. Create new users, assign
            roles, and manage permissions.
          </p>
        </header>
        <div className="flex-1 py-8 flex flex-col">
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
      </div>
    </main>
  );
}
