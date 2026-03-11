import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/custom/data-table";
import { AddUserDialog } from "@/components/user-management/add-user-dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { EditUserForm } from "@/components/user-management/edit-user-form";
import { UserSessionsList } from "@/components/user-management/user-sessions-list";
import { UserDangerZone } from "@/components/user-management/user-danger-zone";
import { UserRoundPen, MonitorDot, Ban, Trash2 } from "lucide-react";
import { columns, UserAction, User } from "./user-actions";

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
    <div className="space-y-4">
      <DataTable
        columns={columns(handleAction)}
        data={filteredUsers as any}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
        showPagination
        pageSize={10}
        actions={
          <Button
            size="sm"
            onClick={() => setIsAddUserOpen(true)}
            className="h-8 gap-1.5 px-3 text-[12px] font-medium rounded-lg"
          >
            <Plus className="size-3.5" />
            New User
          </Button>
        }
      />

      <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />

      {/* Edit */}
      <ResponsiveDialog
        open={activeAction?.type === "update"}
        onOpenChange={(open) => !open && closeAction()}
        title="Edit User"
        description={`Updating details for ${activeAction?.user?.name ?? ""}`}
        className="sm:max-w-xl"
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
        className="sm:max-w-md"
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
        className="sm:max-w-md"
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
        className="sm:max-w-md"
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
    </div>
  );
};