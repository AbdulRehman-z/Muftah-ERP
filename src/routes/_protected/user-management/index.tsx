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

        {/* ── Command Header ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden border border-border/50 bg-card"
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />
          
          {/* Decorative grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
            }}
          />

          <div className="relative z-10 flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between lg:p-8">
            <div className="flex items-start gap-4 md:items-center">
              {/* Icon container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex shrink-0 items-center justify-center  bg-gradient-to-br from-primary/10 to-primary/5 p-3 ring-1 ring-primary/10"
              >
                <Shield className="size-6 text-primary" />
              </motion.div>

              <div className="space-y-1">
                <motion.h1
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="text-2xl font-bold tracking-tight text-foreground md:text-3xl"
                >
                  User Management
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-sm text-muted-foreground md:text-base"
                >
                  Manage system users, assign roles, and control access permissions
                </motion.p>
              </div>
            </div>

            {/* Quick stats pills */}
            <Suspense fallback={null}>
              <QuickStats />
            </Suspense>
          </div>
        </motion.div>

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

// Quick stats component shown in the header
function QuickStats() {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminGetUsersFn(),
  });

  const stats = [
    {
      icon: Users,
      value: data.users.length,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-500/10",
      ring: "ring-blue-500/10",
    },
    {
      icon: UserCheck,
      value: data.users.filter((u) => !u.banned).length,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-500/10",
      ring: "ring-emerald-500/10",
    },
    {
      icon: Layers,
      value: data.roles.filter((r) => !r.isArchived).length,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-500/10",
      ring: "ring-violet-500/10",
    },
    {
      icon: Activity,
      value: data.permissions.length,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
      ring: "ring-amber-500/10",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.value}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.25 + index * 0.05,
            ease: [0.16, 1, 0.3, 1],
          }}
          className={`flex items-center gap-2.5 border border-border/40 ${stat.bg} ${stat.ring} px-3 py-2 ring-1 transition-colors hover:bg-opacity-80`}
        >
          <stat.icon className={`size-4 ${stat.color}`} />
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {stat.value}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}