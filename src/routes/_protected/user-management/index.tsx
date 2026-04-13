import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { UsersTable } from "@/components/user-management/users-table";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { Shield, Users, UserCheck, Layers, Activity } from "lucide-react";
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

function PageSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="relative overflow-hidden border border-border/50 bg-card p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse  bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-7 w-48 animate-pulse bg-muted" />
            <div className="h-4 w-72 animate-pulse bg-muted" />
          </div>
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className=" border border-border/50 bg-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse bg-muted" />
              <div className="h-10 w-10 animate-pulse bg-muted" />
            </div>
            <div className="h-8 w-16 animate-pulse bg-muted" />
            <div className="h-3 w-full animate-pulse bg-muted" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className=" border border-border/50 bg-card">
        <div className="border-b border-border/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse bg-muted" />
            <div className="flex gap-2">
              <div className="h-9 w-24 animate-pulse bg-muted" />
              <div className="h-9 w-28 animate-pulse bg-muted" />
            </div>
          </div>
          <div className="h-9 w-full max-w-sm animate-pulse bg-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse bg-muted" />
                <div className="h-3 w-48 animate-pulse bg-muted" />
              </div>
              <div className="h-6 w-20 animate-pulse-full bg-muted" />
              <div className="h-6 w-16 animate-pulse-full bg-muted" />
              <div className="h-4 w-24 animate-pulse bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RouteComponent() {
  return (
    <main className="flex-1 overflow-y-auto bg-background font-sans antialiased">
      <div className="mx-auto w-full max-w-[1600px] p-4 md:p-8 space-y-6">

        {/* ── Data Table Area ─────────────────────────────────────────── */}
        <Suspense fallback={<PageSkeleton />}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <UsersTable />
          </motion.div>
        </Suspense>
      </div>
    </main>
  );
}

