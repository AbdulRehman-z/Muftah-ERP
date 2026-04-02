import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, UserRoundPen, MonitorDot, Ban, Trash2, Users } from "lucide-react";
import { DataTable } from "@/components/custom/data-table";
import { AddUserDialog } from "@/components/user-management/add-user-dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { EditUserForm } from "@/components/user-management/edit-user-form";
import { UserSessionsList } from "@/components/user-management/user-sessions-list";
import { UserDangerZone } from "@/components/user-management/user-danger-zone";
import { columns, UserAction, User } from "./user-actions";
import { motion, Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Animation Variants ─────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
};

// ── Component ──────────────────────────────────────────────────────────────

export const UsersTable = () => {
  const [search, setSearch] = useState("");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<{
    user: User;
    type: UserAction;
  } | null>(null);

  const { data } = useSuspenseQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminGetUsersFn(),
  });

  const handleAction = (user: User, type: UserAction) => setActiveAction({ user, type });
  const closeAction = () => setActiveAction(null);

  const filteredUsers = data.users.users.filter(
    (user: User) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 font-sans antialiased">

      {/* ── Table Container ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="border border-border bg-card rounded-none shadow-none overflow-hidden">
        <div className="p-0 sm:p-2">
          <DataTable
            columns={columns(handleAction)}
            data={filteredUsers as any}
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by name or email…"
            showPagination
            pageSize={10}
            className="border-none shadow-none rounded-none"
            actions={
              <Button
                onClick={() => setIsAddUserOpen(true)}
              >
                <Plus className="size-4" />
                New User
              </Button>
            }
          />
        </div>
      </motion.div>

      {/* ── Modals / Dialogs ──────────────────────────────────────────── */}
      <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />

      {/* Edit */}
      <ResponsiveDialog
        open={activeAction?.type === "update"}
        onOpenChange={(open) => !open && closeAction()}
        title="Edit User"
        description={`Updating details for ${activeAction?.user?.name ?? ""}`}
        className="sm:max-w-xl rounded-none border-border shadow-none"
        icon={UserRoundPen}
      >
        {activeAction?.user && (
          <EditUserForm user={activeAction.user as any} onSuccess={closeAction} />
        )}
      </ResponsiveDialog>

      {/* Sessions */}
      <ResponsiveDialog
        open={activeAction?.type === "sessions"}
        onOpenChange={(open) => !open && closeAction()}
        title="Active Sessions"
        description={`Login devices for ${activeAction?.user?.email ?? ""}`}
        className="sm:max-w-md rounded-none border-border shadow-none"
        icon={MonitorDot}
      >
        {activeAction?.user && <UserSessionsList userId={activeAction.user.id} />}
      </ResponsiveDialog>

      {/* Ban */}
      <ResponsiveDialog
        open={activeAction?.type === "ban"}
        onOpenChange={(open) => !open && closeAction()}
        title={activeAction?.user?.banned ? "Unban Account" : "Ban Account"}
        description={`Manage access for ${activeAction?.user?.name ?? ""}`}
        className="sm:max-w-md rounded-none border-border shadow-none"
        icon={Ban}
      >
        {activeAction?.user && (
          <UserDangerZone
            user={activeAction.user as any}
            onSuccess={closeAction}
            onlyBan
          />
        )}
      </ResponsiveDialog>

      {/* Delete */}
      <ResponsiveDialog
        open={activeAction?.type === "delete"}
        onOpenChange={(open) => !open && closeAction()}
        title="Delete User"
        description="This action permanently removes all user data."
        className="sm:max-w-md rounded-none border-border shadow-none"
        icon={Trash2}
      >
        {activeAction?.user && (
          <UserDangerZone
            user={activeAction.user as any}
            onSuccess={closeAction}
            onlyDelete
          />
        )}
      </ResponsiveDialog>
    </motion.div>
  );
};