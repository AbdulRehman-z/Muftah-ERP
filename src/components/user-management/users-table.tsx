
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { AddUserDialog } from "@/components/user-management/add-user-dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { adminGetUsersFn } from "@/server-functions/user-management/super-admin-get-users-fn";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { EditUserForm } from "@/components/user-management/edit-user-form";
import { UserSessionsList } from "@/components/user-management/user-sessions-list";
import { UserDangerZone } from "@/components/user-management/user-danger-zone";
import { columns, UserAction, User } from "./user-actions";

export const UsersTable = () => {
    const [search, setSearch] = useState("");
    const pageSize = 10;

    // Dialog states
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<{ user: User; type: UserAction } | null>(null);

    const { data } = useSuspenseQuery({
        queryKey: ["admin-users"],
        queryFn: () => adminGetUsersFn(),
    });

    const handleAction = (user: User, type: UserAction) => {
        setActiveAction({ user, type });
    };

    const tableColumns = columns(handleAction);

    // Client-side filtering
    const filteredUsers = data.users.users.filter((user: User) =>
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        user.name.toLowerCase().includes(search.toLowerCase())
    );

    const closeAction = () => setActiveAction(null);

    return (
        <div className="space-y-4">
            <div>
                <DataTable
                    columns={tableColumns}
                    data={filteredUsers as any}
                    searchValue={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search managed users..."
                    showPagination={true}
                    pageSize={pageSize}
                    actions={
                        <Button
                            size="sm"
                            onClick={() => setIsAddUserOpen(true)}
                            className="h-8 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all gap-2 px-4"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            New User
                        </Button>
                    }
                />
            </div>

            <AddUserDialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} />

            {/* Individual Action Dialogs */}

            {/* 1. Update User Dialog */}
            <ResponsiveDialog
                open={activeAction?.type === "update"}
                onOpenChange={(open) => !open && closeAction()}
                title="Update User Profile"
                description={`Adjusting details for ${activeAction?.user?.name}`}
                className="sm:max-w-xl"
            >
                {activeAction?.user && (
                    <div className="pt-2">
                        <EditUserForm user={activeAction.user as any} onSuccess={closeAction} />
                    </div>
                )}
            </ResponsiveDialog>

            {/* 2. Manage Sessions Dialog */}
            <ResponsiveDialog
                open={activeAction?.type === "sessions"}
                onOpenChange={(open) => !open && closeAction()}
                title="Active Sessions"
                description={`Managing login devices for ${activeAction?.user?.email}`}
                className="sm:max-w-md"
            >
                {activeAction?.user && <UserSessionsList userId={activeAction.user.id} />}
            </ResponsiveDialog>

            {/* 3. Account Status (Ban) Dialog */}
            <ResponsiveDialog
                open={activeAction?.type === "ban"}
                onOpenChange={(open) => !open && closeAction()}
                title={activeAction?.user?.banned ? "Unban Account" : "Access Restriction"}
                description={`Change account access for ${activeAction?.user?.name}`}
                className="sm:max-w-md"
            >
                {activeAction?.user && (
                    <div className="pt-2">
                        <UserDangerZone
                            user={activeAction.user as any}
                            onSuccess={closeAction}
                            onlyBan={true}
                        />
                    </div>
                )}
            </ResponsiveDialog>

            {/* 4. Delete User Dialog */}
            <ResponsiveDialog
                open={activeAction?.type === "delete"}
                onOpenChange={(open) => !open && closeAction()}
                title="Permanent Removal"
                description="This action will delete all user records irrevocably."
                className="sm:max-w-md text-destructive"
            >
                {activeAction?.user && (
                    <div className="pt-2">
                        <UserDangerZone
                            user={activeAction.user as any}
                            onSuccess={closeAction}
                            onlyDelete={true}
                        />
                    </div>
                )}
            </ResponsiveDialog>
        </div>
    );
}
