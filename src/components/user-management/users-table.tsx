import { UserEditorDialog } from "./user-editor-dialog";
import { RoleEditorDialog } from "./role-editor-dialog";
import { ManagedUser, ManagedRole, PermissionDefinition, UserDialogState, RoleDialogState, LandingPathPill } from "./types";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  Eye,
  Landmark,
  Layers2,
  MonitorDot,
  Plus,
  Radar,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRoundPen,
  Users,
  Search,
  Activity,
  User
} from "lucide-react";
import { motion } from "framer-motion";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { DataTable } from "@/components/custom/data-table";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useUsers } from "@/hooks/use-users";
import { MODULE_PERMISSION_GROUPS } from "@/lib/rbac";
import { UserSessionsDialog } from "./user-sessions-dialog";

// ── Blueprint KPI Card ────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  theme: "blue" | "emerald" | "amber" | "sky";
  delay?: number;
}

function BlueprintStatCard({ title, value, sub, icon, theme, delay = 0 }: StatCardProps) {
  const styles = {
    blue: "border-t-blue-500 bg-blue-500/5 text-blue-500",
    emerald: "border-t-emerald-500 bg-emerald-500/5 text-emerald-500",
    amber: "border-t-amber-500 bg-amber-500/5 text-amber-500",
    sky: "border-t-sky-500 bg-sky-500/5 text-sky-500",
  }[theme];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={cn(
        "relative bg-card border border-border rounded-none p-5 shadow-none overflow-hidden flex flex-col justify-between h-[140px] hover:bg-muted/10 transition-colors",
        styles.split(" ")[0]
      )}
    >
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />
      <div className="relative z-10 flex justify-between items-start">
        <p className="text-[11px] font-bold text-muted-foreground uppercase">{title}</p>
        <div className={cn("p-1.5 rounded-none border border-current", styles.split(" ")[1], styles.split(" ")[2])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 mt-auto">
        <h3 className="text-3xl font-black text-foreground tabular-nums">{value}</h3>
        <p className="text-[10px] font-semibold text-muted-foreground mt-1 truncate uppercase">{sub}</p>
      </div>
    </motion.div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────
export const UsersTable = () => {
  const { data } = useSuspenseQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminGetUsersFn(),
  });
  const {
    archiveRole,
    banUser,
    deleteRole,
    removeUser,
    unbanUser,
  } = useUsers();

  const [activeTab, setActiveTab] = useState("users");
  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "restricted">("all");
  const [userDialog, setUserDialog] = useState<UserDialogState | null>(null);
  const [roleDialog, setRoleDialog] = useState<RoleDialogState | null>(null);
  const [sessionsUser, setSessionsUser] = useState<ManagedUser | null>(null);
  const [previewRoleId, setPreviewRoleId] = useState<string>(data.roles[0]?.id ?? "");
  const deferredUserSearch = useDeferredValue(userSearch);
  const deferredRoleSearch = useDeferredValue(roleSearch);

  const filteredUsers = useMemo(() => {
    return data.users.filter((user) => {
      const searchQuery = deferredUserSearch.toLowerCase();
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery) ||
        user.email.toLowerCase().includes(searchQuery) ||
        user.roleAssignment?.name.toLowerCase().includes(searchQuery);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && !user.banned) ||
        (statusFilter === "restricted" && user.banned);
      return matchesSearch && matchesStatus;
    });
  }, [data.users, deferredUserSearch, statusFilter]);

  const filteredRoles = useMemo(() => {
    return data.roles.filter((role) => {
      const query = deferredRoleSearch.toLowerCase();
      return (
        role.name.toLowerCase().includes(query) ||
        role.slug.toLowerCase().includes(query) ||
        role.description.toLowerCase().includes(query)
      );
    });
  }, [data.roles, deferredRoleSearch]);

  const previewRole = data.roles.find((role) => role.id === previewRoleId) ?? data.roles[0] ?? null;

  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Identity",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="size-8 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User className="size-4 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-[13px] text-foreground uppercase">{user.name}</p>
                <p className="text-[10px] font-mono text-muted-foreground">{user.email}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: "role",
        header: "Assigned Role",
        cell: ({ row }) => {
          const role = row.original.roleAssignment;
          return role ? (
            <Badge className={cn("h-6 rounded-none px-3 text-[9px] font-black uppercase shadow-none", role.toneClassName)}>
              {role.name}
              {role.isArchived ? " / archived" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-6 rounded-none px-3 text-[9px] font-bold uppercase shadow-none">
              Unassigned
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: "Network Status",
        cell: ({ row }) => (
          <Badge
            className={cn(
              "h-6 rounded-none px-3 text-[9px] font-black uppercase shadow-none",
              row.original.banned
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            )}
          >
            {row.original.banned ? "Restricted" : "Active"}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Onboarded",
        cell: ({ row }) => (
          <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
            {new Date(row.original.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none" onClick={() => setUserDialog({ mode: "edit", user })}>
                <UserRoundPen className="mr-2 size-3.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none" onClick={() => setSessionsUser(user)}>
                <MonitorDot className="mr-2 size-3.5" /> Sessions
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none"
                onClick={() => user.banned ? unbanUser.mutate({ userId: user.id }) : banUser.mutate({ userId: user.id, reason: "Restricted by super admin" })}
              >
                {user.banned ? <><ShieldCheck className="mr-2 size-3.5 text-emerald-500" /> Restore</> : <><ShieldAlert className="mr-2 size-3.5 text-rose-500" /> Restrict</>}
              </Button>
              {user.id !== data.currentUserId && (
                <Button variant="destructive" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none" onClick={() => removeUser.mutate({ userId: user.id })}>
                  <Trash2 className="mr-2 size-3.5" /> Delete
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [banUser, data.currentUserId, removeUser, unbanUser],
  );

  return (
    <>
      <div className="space-y-6 pb-8">

        {/* ── COMMAND HEADER: STRUCTURAL STYLE ── */}
        <div className="relative bg-card border border-border rounded-none shadow-none">
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between p-6 gap-8">
            <div className="flex items-center gap-6 w-full lg:w-auto">
              <div className="size-20 shrink-0 rounded-none bg-primary/10 border border-primary flex items-center justify-center relative group">
                <ShieldCheck className="size-10 text-primary relative z-10" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-black uppercase text-foreground">
                    Identity Command
                  </h1>
                  <Badge className="bg-primary/10 text-primary border-primary rounded-none px-3 py-1 text-[10px] font-black uppercase shadow-none">
                    <Activity className="size-3 mr-1 inline" /> Access Control
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground uppercase max-w-md leading-relaxed font-bold">
                  Manage network identities, blueprint dynamic roles, and monitor permission matrices from a centralized hub.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full lg:w-auto">
              <Button onClick={() => setRoleDialog({ mode: "create" })} className="w-full lg:w-[180px] h-10 font-black uppercase text-[11px] rounded-none shadow-none">
                <Blocks className="size-4 mr-2" /> New Role
              </Button>
              <Button variant="outline" onClick={() => setUserDialog({ mode: "create" })} className="w-full lg:w-[180px] h-10 font-black uppercase text-[11px] rounded-none shadow-none border-border">
                <UserPlus className="size-4 mr-2" /> Invite User
              </Button>
            </div>
          </div>
        </div>

        {/* ── BLUEPRINT KPI GRID ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BlueprintStatCard title="System Users" value={data.users.length} sub="Identities in RBAC plane" theme="blue" icon={<Users className="size-4" />} delay={0} />
          <BlueprintStatCard title="Active Roles" value={data.roles.filter((r) => !r.isArchived).length} sub="Live role blueprints" theme="emerald" icon={<Blocks className="size-4" />} delay={0.1} />
          <BlueprintStatCard title="Archived Roles" value={data.roles.filter((r) => r.isArchived).length} sub="Retired legacy roles" theme="amber" icon={<Archive className="size-4" />} delay={0.2} />
          <BlueprintStatCard title="Permission Nodes" value={data.permissions.length} sub="Configurable logic gates" theme="sky" icon={<Radar className="size-4" />} delay={0.3} />
        </div>

        {/* ── TABBED TELEMETRY DATA ── */}
        <div className="rounded-none border border-border bg-card/95 shadow-none relative">
          <div className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between p-2 bg-muted/20 border border-border gap-4 mb-4 rounded-none">
                <TabsList className="bg-background border border-border h-10 rounded-none p-1 shadow-none">
                  <TabsTrigger value="users" className="text-[11px] font-black uppercase px-6 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none">Users</TabsTrigger>
                  <TabsTrigger value="roles" className="text-[11px] font-black uppercase px-6 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none">Roles</TabsTrigger>
                  <TabsTrigger value="access" className="text-[11px] font-black uppercase px-6 rounded-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-none">Matrix</TabsTrigger>
                </TabsList>

                {/* Dynamic Filters based on Tab */}
                {activeTab === "users" && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="h-10 w-[140px] rounded-none border-border bg-background text-xs font-bold uppercase shadow-none">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent className="rounded-none border-border shadow-none">
                        <SelectItem value="all" className="text-xs font-bold uppercase rounded-none">All status</SelectItem>
                        <SelectItem value="active" className="text-xs font-bold uppercase text-emerald-500 rounded-none">Active</SelectItem>
                        <SelectItem value="restricted" className="text-xs font-bold uppercase text-rose-500 rounded-none">Restricted</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative w-full sm:w-[260px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search identity..." className="h-10 pl-9 rounded-none border-border bg-background text-xs shadow-none" />
                    </div>
                  </div>
                )}

                {activeTab === "roles" && (
                  <div className="relative w-full sm:w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} placeholder="Search blueprint or slug..." className="h-10 pl-9 rounded-none border-border bg-background text-xs shadow-none" />
                  </div>
                )}
              </div>

              {/* ── USERS TAB ── */}
              <TabsContent value="users" className="p-0 m-0 border border-border">
                <DataTable
                  columns={userColumns}
                  data={filteredUsers}
                  showSearch={false}
                  showViewOptions={false}
                  pageSize={8}
                  className="rounded-none border-none bg-background shadow-none"
                />
              </TabsContent>

              {/* ── ROLES TAB ── */}
              <TabsContent value="roles" className="p-0 m-0">
                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredRoles.map((role) => (
                    <div
                      key={role.id}
                      className="group rounded-none border border-border bg-card p-5 shadow-none transition-colors hover:bg-muted/5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("h-6 rounded-none px-3 text-[10px] font-black uppercase shadow-none", role.toneClassName)}>
                              {role.name}
                            </Badge>
                            {role.isSystem && (
                              <Badge variant="outline" className="h-6 rounded-none px-3 text-[10px] font-bold uppercase shadow-none border-border">System</Badge>
                            )}
                            {role.isArchived && (
                              <Badge variant="outline" className="h-6 rounded-none border-amber-500/20 bg-amber-500/10 px-3 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 shadow-none">
                                Archived
                              </Badge>
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase">{role.slug}</p>
                            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground min-h-[40px]">
                              {role.description || "No description provided."}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-1 text-right bg-muted/20 p-3 rounded-none border border-border">
                          <div className="text-[9px] font-black uppercase text-muted-foreground">Assignments</div>
                          <p className="text-2xl font-black text-foreground tabular-nums">{role.assignmentCount}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2 p-3 bg-muted/10 rounded-none border border-border">
                        <LandingPathPill path={role.defaultLandingPath} />
                        <Badge variant="outline" className="h-6 rounded-none px-3 text-[10px] font-mono shadow-none border-border">
                          {role.permissionKeys.includes("*") ? "[*] FULL_ACCESS" : `[${role.permissionKeys.length}] NODES`}
                        </Badge>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-border justify-end">
                        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none border-border" onClick={() => { setPreviewRoleId(role.id); setActiveTab("access"); }}>
                          <Eye className="mr-2 size-3.5" /> Inspect
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none border-border" onClick={() => setRoleDialog({ mode: "edit", role })}>
                          <UserRoundPen className="mr-2 size-3.5" /> Edit
                        </Button>
                        {!role.isSystem && (
                          <Button variant="outline" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none border-border" onClick={() => archiveRole.mutate({ roleId: role.id, isArchived: !role.isArchived })}>
                            {role.isArchived ? <><ArchiveRestore className="mr-2 size-3.5 text-emerald-500" /> Restore</> : <><Archive className="mr-2 size-3.5 text-amber-500" /> Archive</>}
                          </Button>
                        )}
                        {!role.isSystem && role.assignmentCount === 0 && (
                          <Button variant="destructive" size="sm" className="rounded-none h-8 text-[10px] font-bold uppercase shadow-none" onClick={() => deleteRole.mutate({ roleId: role.id })}>
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* ── ACCESS MATRIX TAB ── */}
              <TabsContent value="access" className="p-0 m-0">
                <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
                  {/* Left: Role Selector */}
                  <div className="rounded-none border border-border bg-muted/10 p-4 h-fit">
                    <div className="mb-4 border-b border-border pb-2">
                      <p className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2"><Radar className="size-3 text-primary" /> Target Blueprint</p>
                    </div>
                    <div className="space-y-2">
                      {data.roles.map((role) => (
                        <button
                          key={role.id}
                          onClick={() => setPreviewRoleId(role.id)}
                          className={cn(
                            "w-full rounded-none border px-4 py-3 text-left transition-colors flex items-center justify-between",
                            previewRole?.id === role.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <div>
                            <Badge className={cn("h-5 rounded-none px-2 text-[9px] font-black uppercase shadow-none", role.toneClassName)}>
                              {role.name}
                            </Badge>
                            <p className="mt-1.5 text-[10px] font-mono text-muted-foreground uppercase">{role.slug}</p>
                          </div>
                          <ArrowUpRight className={cn("size-3.5", previewRole?.id === role.id ? "text-primary" : "text-muted-foreground")} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: Matrix Preview */}
                  {previewRole && (
                    <div className="space-y-5">
                      <div className="rounded-none border border-border bg-card p-6 shadow-none relative overflow-hidden">
                        <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("h-6 rounded-none px-3 text-[10px] font-black uppercase shadow-none", previewRole.toneClassName)}>
                                {previewRole.name}
                              </Badge>
                              {previewRole.isSystem && <Badge variant="outline" className="h-6 rounded-none px-3 text-[10px] uppercase font-bold shadow-none border-border">System</Badge>}
                            </div>
                            <p className="max-w-xl text-[13px] leading-relaxed text-muted-foreground font-medium">
                              {previewRole.description || "No role description provided."}
                            </p>
                          </div>
                          <Button variant="outline" className="rounded-none shadow-none font-bold uppercase text-[11px] shrink-0 border-border" onClick={() => setRoleDialog({ mode: "edit", role: previewRole })}>
                            <UserRoundPen className="mr-2 size-3.5" /> Modify Blueprint
                          </Button>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                          <div className="rounded-none border border-border bg-muted/10 p-4">
                            <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 mb-3"><Landmark className="size-3 text-primary" /> Entry Vector</p>
                            <LandingPathPill path={previewRole.defaultLandingPath} />
                          </div>
                          <div className="rounded-none border border-border bg-muted/10 p-4">
                            <p className="text-[10px] font-black uppercase text-muted-foreground flex items-center gap-2 mb-3"><BadgeCheck className="size-3 text-primary" /> Accessible Surfaces</p>
                            <div className="flex flex-wrap gap-2">
                              {previewRole.accessiblePaths.map((path) => (
                                <Badge key={path} variant="outline" className="h-6 rounded-none bg-background px-2 text-[9px] font-mono shadow-none border-border">{path}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-none border border-border bg-card p-6 shadow-none">
                        <div className="mb-5 flex items-center justify-between border-b border-border pb-3">
                          <p className="text-[11px] font-black uppercase text-muted-foreground flex items-center gap-2"><Layers2 className="size-3 text-primary" /> Node Permissions</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {data.permissions.map((permission) => {
                            const enabled = previewRole.permissionKeys.includes("*") || previewRole.permissionKeys.includes(permission.key);
                            return (
                              <div
                                key={permission.key}
                                className={cn(
                                  "rounded-none border px-4 py-3 flex items-start gap-3",
                                  enabled ? "border-primary/50 bg-primary/5" : "border-border bg-muted/5 opacity-50 grayscale"
                                )}
                              >
                                <div className={cn("size-2.5 rounded-none mt-1 shrink-0 border", enabled ? "bg-primary border-primary" : "bg-transparent border-muted-foreground")} />
                                <div>
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[12px] font-bold text-foreground uppercase">{permission.label}</span>
                                    <Badge variant="outline" className="h-4 rounded-none bg-background px-1.5 text-[8px] font-mono border-border shadow-none">{permission.key}</Badge>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">{permission.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <UserEditorDialog dialogState={userDialog} open={!!userDialog} onOpenChange={(open) => !open && setUserDialog(null)} roles={data.roles} />
      <RoleEditorDialog dialogState={roleDialog} open={!!roleDialog} onOpenChange={(open) => !open && setRoleDialog(null)} permissions={data.permissions} landingPathOptions={data.landingPathOptions} />
      <UserSessionsDialog sessionsUser={sessionsUser} onOpenChange={(open) => !open && setSessionsUser(null)} />
    </>
  );
};