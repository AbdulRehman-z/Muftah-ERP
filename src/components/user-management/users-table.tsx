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
import { UserSessionsList } from "./user-sessions-list";

type OverviewData = Awaited<ReturnType<typeof adminGetUsersFn>>;
type ManagedUser = OverviewData["users"][number];
type ManagedRole = OverviewData["roles"][number];
type PermissionDefinition = OverviewData["permissions"][number];

type UserDialogState =
  | {
      mode: "create";
      user?: undefined;
    }
  | {
      mode: "edit";
      user: ManagedUser;
    };

type RoleDialogState =
  | {
      mode: "create";
      role?: undefined;
    }
  | {
      mode: "edit";
      role: ManagedRole;
    };

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  manufacturing: "Manufacturing",
  inventory: "Inventory",
  suppliers: "Suppliers",
  sales: "Sales",
  finance: "Finance",
  hr: "HR & Payroll",
  operator: "Operator",
  "user-management": "User Management",
  rbac: "Role Governance",
};

const StatCard = ({
  title,
  value,
  description,
  accentClassName,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  accentClassName: string;
  icon: typeof Sparkles;
}) => (
  <div className="relative overflow-hidden rounded-[28px] border border-border/60 bg-card/90 p-5 shadow-[0_20px_60px_-36px_rgba(15,23,42,0.55)]">
    <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-gradient-to-b from-white/20 via-white/10 to-transparent" />
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-muted-foreground">
          {title}
        </p>
        <p className="text-3xl font-black tracking-tight text-foreground">{value}</p>
        <p className="max-w-[18rem] text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-2xl border text-white shadow-lg",
          accentClassName,
        )}
      >
        <Icon className="size-5" />
      </div>
    </div>
  </div>
);

const LandingPathPill = ({ path }: { path: string }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground/80">
    <Landmark className="size-3.5 text-primary" />
    {path}
  </span>
);

function UserEditorDialog({
  dialogState,
  open,
  onOpenChange,
  roles,
}: {
  dialogState: UserDialogState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: ManagedRole[];
}) {
  const { createUser, setRole, setUserPassword, updateUser } = useUsers();
  const isEditing = dialogState?.mode === "edit";
  const availableRoles = roles.filter(
    (role) => !role.isArchived || role.slug === dialogState?.user?.roleAssignment?.slug,
  );

  const [formState, setFormState] = useState(() => ({
    name: dialogState?.mode === "edit" ? dialogState.user.name : "",
    email: dialogState?.mode === "edit" ? dialogState.user.email : "",
    password: "",
    roleSlug:
      dialogState?.mode === "edit"
        ? dialogState.user.roleAssignment?.slug ?? availableRoles[0]?.slug ?? "operator"
        : availableRoles[0]?.slug ?? "operator",
  }));

  const submitting =
    createUser.isPending ||
    setRole.isPending ||
    setUserPassword.isPending ||
    updateUser.isPending;

  const syncFormState = () => {
    setFormState({
      name: dialogState?.mode === "edit" ? dialogState.user.name : "",
      email: dialogState?.mode === "edit" ? dialogState.user.email : "",
      password: "",
      roleSlug:
        dialogState?.mode === "edit"
          ? dialogState.user.roleAssignment?.slug ?? availableRoles[0]?.slug ?? "operator"
          : availableRoles[0]?.slug ?? "operator",
    });
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      syncFormState();
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    syncFormState();
  }, [dialogState]);

  const handleSubmit = async () => {
    if (!formState.name.trim() || !formState.email.trim()) {
      return;
    }

    if (!isEditing) {
      await createUser.mutateAsync({
        name: formState.name.trim(),
        email: formState.email.trim().toLowerCase(),
        password: formState.password,
        roleSlug: formState.roleSlug,
      });
      close(false);
      return;
    }

    const promises: Promise<unknown>[] = [];

    if (
      formState.name.trim() !== dialogState.user.name ||
      formState.email.trim().toLowerCase() !== dialogState.user.email
    ) {
      promises.push(
        updateUser.mutateAsync({
          userId: dialogState.user.id,
          name: formState.name.trim(),
          email: formState.email.trim().toLowerCase(),
        }),
      );
    }

    if (formState.roleSlug !== dialogState.user.roleAssignment?.slug) {
      promises.push(
        setRole.mutateAsync({
          userId: dialogState.user.id,
          roleSlug: formState.roleSlug,
        }),
      );
    }

    if (formState.password.trim()) {
      promises.push(
        setUserPassword.mutateAsync({
          userId: dialogState.user.id,
          password: formState.password,
        }),
      );
    }

    await Promise.all(promises);
    close(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={isEditing ? "Refine User Access" : "Create Managed User"}
      description={
        isEditing
          ? "Update identity, access, and recovery settings without leaving the control center."
          : "Create an account and attach it to an active RBAC role in a single flow."
      }
      className="sm:max-w-2xl border-border/60 bg-card/95 p-0 shadow-[0_30px_80px_-45px_rgba(15,23,42,0.7)]"
      icon={isEditing ? UserRoundPen : UserPlus}
    >
      <div className="grid gap-6 p-6 md:grid-cols-[1.2fr_0.9fr]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Full Name
              </span>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Abdul Rehman"
                className="h-11 rounded-2xl border-border/60 bg-background/80 text-sm"
              />
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Email
              </span>
              <Input
                type="email"
                value={formState.email}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="operator@company.com"
                className="h-11 rounded-2xl border-border/60 bg-background/80 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Role Assignment
              </span>
              <Select
                value={formState.roleSlug}
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    roleSlug: value,
                  }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/80 px-4 text-sm">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.slug}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                {isEditing ? "Rotate Password" : "Initial Password"}
              </span>
              <Input
                type="password"
                value={formState.password}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={isEditing ? "Leave blank to keep current" : "Minimum 8 characters"}
                className="h-11 rounded-2xl border-border/60 bg-background/80 text-sm"
              />
            </label>
          </div>
        </div>

        <div className="rounded-[24px] border border-border/60 bg-linear-to-br from-primary/10 via-background to-background p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Access Snapshot</p>
              <p className="text-xs text-muted-foreground">
                Preview the operating lane this user will enter after sign-in.
              </p>
            </div>
          </div>

          {roles
            .filter((role) => role.slug === formState.roleSlug)
            .map((role) => (
              <div key={role.id} className="mt-5 space-y-4">
                <Badge className={cn("h-6 rounded-full px-3 text-[10px] font-bold uppercase", role.toneClassName)}>
                  {role.name}
                </Badge>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {role.description || "No role description has been written yet."}
                </p>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    Landing
                  </p>
                  <LandingPathPill path={role.defaultLandingPath} />
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                    Reachable Modules
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.accessiblePaths.slice(0, 6).map((path) => (
                      <Badge key={path} variant="outline" className="h-6 rounded-full px-3 text-[10px]">
                        {path}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/60 px-6 py-4">
        <Button variant="outline" onClick={() => close(false)} className="rounded-full px-5">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            submitting ||
            !formState.name.trim() ||
            !formState.email.trim() ||
            (!isEditing && formState.password.trim().length < 8)
          }
          className="rounded-full px-5"
        >
          {submitting ? "Saving..." : isEditing ? "Save Access" : "Create User"}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function RoleEditorDialog({
  dialogState,
  open,
  onOpenChange,
  permissions,
  landingPathOptions,
}: {
  dialogState: RoleDialogState | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissions: PermissionDefinition[];
  landingPathOptions: string[];
}) {
  const { createRole, updateRole } = useUsers();
  const isEditing = dialogState?.mode === "edit";
  const isSuperAdmin = dialogState?.mode === "edit" && dialogState.role.slug === "super-admin";

  const [formState, setFormState] = useState(() => ({
    name: dialogState?.mode === "edit" ? dialogState.role.name : "",
    slug: dialogState?.mode === "edit" ? dialogState.role.slug : "",
    description: dialogState?.mode === "edit" ? dialogState.role.description : "",
    defaultLandingPath:
      dialogState?.mode === "edit"
        ? dialogState.role.defaultLandingPath
        : landingPathOptions[0] ?? "/dashboard",
    permissionKeys:
      dialogState?.mode === "edit"
        ? dialogState.role.permissionKeys.filter((permissionKey) => permissionKey !== "*")
        : [],
  }));

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, PermissionDefinition[]>>((acc, permission) => {
      acc[permission.moduleKey] = acc[permission.moduleKey] ?? [];
      acc[permission.moduleKey].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const resetForm = () => {
    setFormState({
      name: dialogState?.mode === "edit" ? dialogState.role.name : "",
      slug: dialogState?.mode === "edit" ? dialogState.role.slug : "",
      description: dialogState?.mode === "edit" ? dialogState.role.description : "",
      defaultLandingPath:
        dialogState?.mode === "edit"
          ? dialogState.role.defaultLandingPath
          : landingPathOptions[0] ?? "/dashboard",
      permissionKeys:
        dialogState?.mode === "edit"
          ? dialogState.role.permissionKeys.filter((permissionKey) => permissionKey !== "*")
          : [],
    });
  };

  const close = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    resetForm();
  }, [dialogState, landingPathOptions]);

  const togglePermission = (permissionKey: string) => {
    setFormState((current) => ({
      ...current,
      permissionKeys: current.permissionKeys.includes(permissionKey)
        ? current.permissionKeys.filter((existingKey) => existingKey !== permissionKey)
        : [...current.permissionKeys, permissionKey],
    }));
  };

  const handleSubmit = async () => {
    if (isEditing && dialogState?.mode === "edit") {
      await updateRole.mutateAsync({
        roleId: dialogState.role.id,
        name: formState.name.trim(),
        slug: formState.slug.trim(),
        description: formState.description.trim(),
        defaultLandingPath: formState.defaultLandingPath,
        permissionKeys: formState.permissionKeys,
      });
      close(false);
      return;
    }

    await createRole.mutateAsync({
      name: formState.name.trim(),
      slug: formState.slug.trim(),
      description: formState.description.trim(),
      defaultLandingPath: formState.defaultLandingPath,
      permissionKeys: formState.permissionKeys,
    });
    close(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={close}
      title={isEditing ? "Tune Role Blueprint" : "Design New Role"}
      description="Shape permissions, choose a landing page, and keep the control surface readable."
      className="sm:max-w-5xl border-border/60 bg-card/95 p-0 shadow-[0_40px_110px_-55px_rgba(15,23,42,0.8)]"
      icon={Blocks}
    >
      <div className="grid gap-0 lg:grid-cols-[1fr_1.2fr]">
        <div className="border-b border-border/60 p-6 lg:border-r lg:border-b-0">
          <div className="space-y-4">
            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Role Name
              </span>
              <Input
                value={formState.name}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Machine Operator"
                className="h-11 rounded-2xl border-border/60 bg-background/80"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Role Slug
              </span>
              <Input
                value={formState.slug}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/--+/g, "-"),
                  }))
                }
                disabled={dialogState?.mode === "edit" && dialogState.role.isSystem}
                placeholder="machine-operator"
                className="h-11 rounded-2xl border-border/60 bg-background/80 font-mono text-[13px]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Description
              </span>
              <Textarea
                value={formState.description}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Summarize what this role owns and why it exists."
                className="min-h-28 rounded-[24px] border-border/60 bg-background/80"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                Default Landing Page
              </span>
              <Select
                value={formState.defaultLandingPath}
                onValueChange={(value) =>
                  setFormState((current) => ({
                    ...current,
                    defaultLandingPath: value,
                  }))
                }
              >
                <SelectTrigger className="h-11 w-full rounded-2xl border-border/60 bg-background/80 px-4">
                  <SelectValue placeholder="Choose a landing page" />
                </SelectTrigger>
                <SelectContent>
                  {landingPathOptions.map((path) => (
                    <SelectItem key={path} value={path}>
                      {path}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <div className="rounded-[24px] border border-border/60 bg-linear-to-br from-primary/10 via-background to-background p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                  <Radar className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Preview Engine</p>
                  <p className="text-xs text-muted-foreground">
                    This role will open here after sign-in and expose the modules shown on the right.
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <LandingPathPill path={formState.defaultLandingPath} />
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-foreground">Permission Matrix</p>
              <p className="text-xs text-muted-foreground">
                Toggle the exact route and action capabilities this role should own.
              </p>
            </div>
            {isSuperAdmin && (
              <Badge className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary-foreground">
                Locked Full Access
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([moduleKey, modulePermissions]) => {
              const moduleTone = MODULE_PERMISSION_GROUPS[moduleKey as keyof typeof MODULE_PERMISSION_GROUPS];
              return (
                <div
                  key={moduleKey}
                  className="rounded-[24px] border border-border/60 bg-background/80 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-2xl border bg-muted text-foreground",
                          moduleTone?.accent === "violet" && "border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-300",
                          moduleTone?.accent === "amber" && "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300",
                          moduleTone?.accent === "cyan" && "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300",
                          moduleTone?.accent === "orange" && "border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-300",
                          moduleTone?.accent === "emerald" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
                          moduleTone?.accent === "sky" && "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300",
                          moduleTone?.accent === "rose" && "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                          moduleTone?.accent === "yellow" && "border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
                          moduleTone?.accent === "fuchsia" && "border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-300",
                          moduleTone?.accent === "indigo" && "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
                        )}
                      >
                        <Layers2 className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">
                          {MODULE_LABELS[moduleKey] ?? moduleKey}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {modulePermissions.length} permission lanes
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {modulePermissions.map((permission) => {
                      const isChecked =
                        isSuperAdmin || formState.permissionKeys.includes(permission.key);
                      return (
                        <label
                          key={permission.key}
                          className="flex items-start gap-3 rounded-2xl border border-border/50 bg-card/60 px-4 py-3"
                        >
                          <Checkbox
                            checked={isChecked}
                            disabled={isSuperAdmin}
                            onCheckedChange={() => togglePermission(permission.key)}
                            className="mt-0.5"
                          />
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {permission.label}
                              </span>
                              <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-mono">
                                {permission.key}
                              </Badge>
                            </div>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {permission.description}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border/60 px-6 py-4">
        <Button variant="outline" onClick={() => close(false)} className="rounded-full px-5">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            createRole.isPending ||
            updateRole.isPending ||
            !formState.name.trim() ||
            !formState.slug.trim() ||
            (!isSuperAdmin && formState.permissionKeys.length === 0)
          }
          className="rounded-full px-5"
        >
          {createRole.isPending || updateRole.isPending
            ? "Saving..."
            : isEditing
              ? "Save Role"
              : "Create Role"}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

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

  const previewRole =
    data.roles.find((role) => role.id === previewRoleId) ?? data.roles[0] ?? null;

  const userColumns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const user = row.original;
          return (
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          );
        },
      },
      {
        id: "role",
        header: "Role",
        cell: ({ row }) => {
          const role = row.original.roleAssignment;
          return role ? (
            <Badge className={cn("h-6 rounded-full px-3 text-[10px] font-bold uppercase", role.toneClassName)}>
              {role.name}
              {role.isArchived ? " / archived" : ""}
            </Badge>
          ) : (
            <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px]">
              Unassigned
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            className={cn(
              "h-6 rounded-full px-3 text-[10px] font-bold uppercase",
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
        header: "Joined",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
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
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setUserDialog({ mode: "edit", user })}
              >
                <UserRoundPen className="mr-2 size-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setSessionsUser(user)}
              >
                <MonitorDot className="mr-2 size-3.5" />
                Sessions
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() =>
                  user.banned
                    ? unbanUser.mutate({ userId: user.id })
                    : banUser.mutate({ userId: user.id, reason: "Restricted by super admin" })
                }
              >
                {user.banned ? (
                  <>
                    <ShieldCheck className="mr-2 size-3.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <ShieldAlert className="mr-2 size-3.5" />
                    Restrict
                  </>
                )}
              </Button>
              {user.id !== data.currentUserId && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="rounded-full"
                  onClick={() => removeUser.mutate({ userId: user.id })}
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
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
      <div className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <StatCard
            title="System Users"
            value={data.users.length}
            description="Managed identities currently covered by the RBAC control plane."
            accentClassName="border-violet-500/20 bg-violet-500 text-white"
            icon={Users}
          />
          <StatCard
            title="Active Roles"
            value={data.roles.filter((role) => !role.isArchived).length}
            description="Live role blueprints that can still be assigned to new users."
            accentClassName="border-emerald-500/20 bg-emerald-500 text-white"
            icon={Blocks}
          />
          <StatCard
            title="Archived Roles"
            value={data.roles.filter((role) => role.isArchived).length}
            description="Retired roles that remain attached to existing users until reassigned."
            accentClassName="border-amber-500/20 bg-amber-500 text-white"
            icon={Archive}
          />
          <StatCard
            title="Permission Catalog"
            value={data.permissions.length}
            description="Explicit route and action capabilities available inside the matrix."
            accentClassName="border-sky-500/20 bg-sky-500 text-white"
            icon={Radar}
          />
        </div>

        <div className="overflow-hidden rounded-[32px] border border-border/60 bg-card/95 shadow-[0_30px_90px_-55px_rgba(15,23,42,0.9)]">
          <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_30%),radial-gradient(circle_at_top_left,rgba(168,85,247,0.12),transparent_26%)] px-6 py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <Badge className="h-7 rounded-full bg-primary px-4 text-[10px] font-black uppercase tracking-[0.28em] text-primary-foreground">
                  Access Operations
                </Badge>
                <div>
                  <h2 className="text-3xl font-black tracking-tight text-foreground">
                    Identity Command Surface
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    Manage people, role blueprints, and module access from one deliberately
                    opinionated control center. Every action here is now backed by app-level RBAC.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="rounded-full border-border/60 px-5"
                  onClick={() => setRoleDialog({ mode: "create" })}
                >
                  <Blocks className="mr-2 size-4" />
                  New Role
                </Button>
                <Button className="rounded-full px-5" onClick={() => setUserDialog({ mode: "create" })}>
                  <Plus className="mr-2 size-4" />
                  New User
                </Button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
              <TabsList className="rounded-[24px] border border-border/60 bg-muted/40 p-1.5">
                <TabsTrigger
                  value="users"
                  className="rounded-[20px] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em]"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger
                  value="roles"
                  className="rounded-[20px] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em]"
                >
                  Roles
                </TabsTrigger>
                <TabsTrigger
                  value="access"
                  className="rounded-[20px] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em]"
                >
                  Access
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-5">
                <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-background/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">People & session governance</p>
                    <p className="text-xs text-muted-foreground">
                      Search, restrict, delete, or reassign users without leaving the dashboard.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                      <SelectTrigger className="h-10 w-full rounded-full border-border/60 bg-card/80 px-4 sm:w-[180px]">
                        <SelectValue placeholder="Filter status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="active">Active only</SelectItem>
                        <SelectItem value="restricted">Restricted only</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={userSearch}
                      onChange={(event) => setUserSearch(event.target.value)}
                      placeholder="Search users, emails, or roles..."
                      className="h-10 rounded-full border-border/60 bg-card/80 px-4 sm:w-[320px]"
                    />
                  </div>
                </div>

                <DataTable
                  columns={userColumns}
                  data={filteredUsers}
                  showSearch={false}
                  showViewOptions={false}
                  pageSize={8}
                  className="rounded-[28px] border-border/60 bg-background/70"
                />
              </TabsContent>

              <TabsContent value="roles" className="space-y-5">
                <div className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-background/70 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Role blueprints & lifecycle</p>
                    <p className="text-xs text-muted-foreground">
                      Create custom roles, archive assigned roles, and delete only when nobody depends on them.
                    </p>
                  </div>
                  <Input
                    value={roleSearch}
                    onChange={(event) => setRoleSearch(event.target.value)}
                    placeholder="Search role name, slug, or description..."
                    className="h-10 rounded-full border-border/60 bg-card/80 px-4 sm:w-[360px]"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {filteredRoles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group rounded-[28px] border border-border/60 bg-card/80 p-5 shadow-[0_18px_60px_-44px_rgba(15,23,42,0.75)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("h-6 rounded-full px-3 text-[10px] font-black uppercase", role.toneClassName)}>
                              {role.name}
                            </Badge>
                            {role.isSystem && (
                              <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px] font-bold uppercase">
                                System
                              </Badge>
                            )}
                            {role.isArchived && (
                              <Badge
                                variant="outline"
                                className="h-6 rounded-full border-amber-500/20 bg-amber-500/10 px-3 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300"
                              >
                                Archived
                              </Badge>
                            )}
                          </div>
                          <div>
                            <p className="font-mono text-xs text-muted-foreground">{role.slug}</p>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                              {role.description || "No description has been added yet."}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 text-right">
                          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                            Assignments
                          </div>
                          <p className="text-2xl font-black tracking-tight text-foreground">
                            {role.assignmentCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        <LandingPathPill path={role.defaultLandingPath} />
                        <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px]">
                          {role.permissionKeys.includes("*")
                            ? "Full access"
                            : `${role.permissionKeys.length} permission toggles`}
                        </Badge>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {role.accessiblePaths.slice(0, 5).map((path) => (
                          <Badge key={path} variant="outline" className="h-6 rounded-full px-3 text-[10px]">
                            {path}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-6 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => {
                            setPreviewRoleId(role.id);
                            setActiveTab("access");
                          }}
                        >
                          <Eye className="mr-2 size-3.5" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full"
                          onClick={() => setRoleDialog({ mode: "edit", role })}
                        >
                          <UserRoundPen className="mr-2 size-3.5" />
                          Edit
                        </Button>
                        {!role.isSystem && (
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() =>
                              archiveRole.mutate({
                                roleId: role.id,
                                isArchived: !role.isArchived,
                              })
                            }
                          >
                            {role.isArchived ? (
                              <>
                                <ArchiveRestore className="mr-2 size-3.5" />
                                Restore
                              </>
                            ) : (
                              <>
                                <Archive className="mr-2 size-3.5" />
                                Archive
                              </>
                            )}
                          </Button>
                        )}
                        {!role.isSystem && role.assignmentCount === 0 && (
                          <Button
                            variant="destructive"
                            className="rounded-full"
                            onClick={() => deleteRole.mutate({ roleId: role.id })}
                          >
                            <Trash2 className="mr-2 size-3.5" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="access" className="space-y-5">
                <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-[28px] border border-border/60 bg-background/70 p-5">
                    <div className="mb-4">
                      <p className="text-sm font-bold text-foreground">Live role preview</p>
                      <p className="text-xs text-muted-foreground">
                        Inspect exactly where a selected role can land and what it can touch.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {data.roles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setPreviewRoleId(role.id)}
                          className={cn(
                            "w-full rounded-[22px] border px-4 py-4 text-left transition-all",
                            previewRole?.id === role.id
                              ? "border-primary/40 bg-primary/10 shadow-[0_18px_50px_-35px_rgba(99,102,241,0.7)]"
                              : "border-border/60 bg-card/80 hover:border-primary/20 hover:bg-primary/5",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className={cn("h-6 rounded-full px-3 text-[10px] font-black uppercase", role.toneClassName)}>
                                  {role.name}
                                </Badge>
                                {role.isArchived && (
                                  <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px] uppercase">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                              <p className="mt-2 text-xs text-muted-foreground">{role.slug}</p>
                            </div>
                            <ArrowUpRight className="size-4 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {previewRole && (
                    <div className="space-y-5">
                      <div className="rounded-[28px] border border-border/60 bg-card/85 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("h-6 rounded-full px-3 text-[10px] font-black uppercase", previewRole.toneClassName)}>
                                {previewRole.name}
                              </Badge>
                              {previewRole.isSystem && (
                                <Badge variant="outline" className="h-6 rounded-full px-3 text-[10px] uppercase">
                                  System
                                </Badge>
                              )}
                            </div>
                            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                              {previewRole.description || "No role description has been added yet."}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => setRoleDialog({ mode: "edit", role: previewRole })}
                          >
                            <UserRoundPen className="mr-2 size-3.5" />
                            Edit Role
                          </Button>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2">
                          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                <Landmark className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">Default landing</p>
                                <p className="text-xs text-muted-foreground">
                                  Post-login destination if no protected redirect is available.
                                </p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <LandingPathPill path={previewRole.defaultLandingPath} />
                            </div>
                          </div>

                          <div className="rounded-[24px] border border-border/60 bg-background/80 p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                                <BadgeCheck className="size-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-foreground">Effective access</p>
                                <p className="text-xs text-muted-foreground">
                                  Reachable surfaces derived from the current permission set.
                                </p>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {previewRole.accessiblePaths.map((path) => (
                                <Badge key={path} variant="outline" className="h-6 rounded-full px-3 text-[10px]">
                                  {path}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-border/60 bg-card/85 p-5">
                        <div className="mb-4">
                          <p className="text-sm font-bold text-foreground">Permission detail</p>
                          <p className="text-xs text-muted-foreground">
                            Route and action capabilities currently granted to this role.
                          </p>
                        </div>
                        <div className="grid gap-3">
                          {data.permissions.map((permission) => {
                            const enabled =
                              previewRole.permissionKeys.includes("*") ||
                              previewRole.permissionKeys.includes(permission.key);
                            return (
                              <div
                                key={permission.key}
                                className={cn(
                                  "rounded-[22px] border px-4 py-3 transition-all",
                                  enabled
                                    ? "border-primary/20 bg-primary/8"
                                    : "border-border/60 bg-background/70 opacity-70",
                                )}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge
                                    className={cn(
                                      "h-5 rounded-full px-2 text-[10px] font-black uppercase",
                                      enabled
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted text-muted-foreground",
                                    )}
                                  >
                                    {enabled ? "Enabled" : "Off"}
                                  </Badge>
                                  <span className="text-sm font-semibold text-foreground">
                                    {permission.label}
                                  </span>
                                  <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px] font-mono">
                                    {permission.key}
                                  </Badge>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                  {permission.description}
                                </p>
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

      <UserEditorDialog
        dialogState={userDialog}
        open={!!userDialog}
        onOpenChange={(open) => !open && setUserDialog(null)}
        roles={data.roles}
      />

      <RoleEditorDialog
        dialogState={roleDialog}
        open={!!roleDialog}
        onOpenChange={(open) => !open && setRoleDialog(null)}
        permissions={data.permissions}
        landingPathOptions={data.landingPathOptions}
      />

      <ResponsiveDialog
        open={!!sessionsUser}
        onOpenChange={(open) => !open && setSessionsUser(null)}
        title="Active Sessions"
        description={`Inspect and revoke active device sessions for ${sessionsUser?.email ?? ""}.`}
        className="sm:max-w-xl border-border/60 bg-card/95"
        icon={MonitorDot}
      >
        {sessionsUser && <UserSessionsList userId={sessionsUser.id} />}
      </ResponsiveDialog>
    </>
  );
};
