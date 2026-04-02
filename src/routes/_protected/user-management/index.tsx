import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { UsersTable } from "@/components/user-management/users-table";
import { GenericLoader } from "@/components/custom/generic-loader";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { Users } from "lucide-react";
import { motion } from "framer-motion";

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
    <main className="flex-1 overflow-y-auto bg-background font-sans antialiased">
      <div className="flex flex-col min-h-full p-4 md:p-8 space-y-6">

        {/* ── Sharp Header Block ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative flex items-center gap-5 p-6 border border-border bg-card rounded-none shadow-none overflow-hidden"
        >
          {/* Technical Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`, backgroundSize: "8px 8px" }}
          />

          <div className="relative z-10 p-3 bg-primary/10 border border-primary/20 rounded-none shrink-0">
            <Users className="size-6 text-primary" />
          </div>
          <div className="relative z-10">
            <h1 className="text-2xl font-black tracking-tight leading-none text-foreground uppercase">
              User Management
            </h1>
            <p className="mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Manage system users, assign roles, and control account access
            </p>
          </div>
        </motion.div>

        {/* ── Data Table Area ───────────────────────────────────────────── */}
        <Suspense
          fallback={
            <div className="border border-border bg-card p-12 rounded-none shadow-none">
              <GenericLoader
                title="Loading Directory"
                description="Fetching user data and access logs..."
              />
            </div>
          }
        >
          <UsersTable />
        </Suspense>
      </div>
    </main>
  );
}