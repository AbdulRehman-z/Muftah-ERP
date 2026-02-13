
import { useForm } from "@tanstack/react-form";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban, Trash2, ShieldCheck, AlertTriangle } from "lucide-react";

type Props = {
    user: {
        id: string;
        banned: boolean;
        name: string;
    };
    onSuccess: () => void;
    onlyBan?: boolean;
    onlyDelete?: boolean;
};

export const UserDangerZone = ({ user, onSuccess, onlyBan, onlyDelete }: Props) => {
    const { banUser, unbanUser, removeUser } = useUsers();

    const form = useForm({
        defaultValues: {
            banReason: "",
        },
        onSubmit: async ({ value }) => {
            // Handled by buttons
        },
    });

    const isBanned = user.banned;

    return (
        <div className="space-y-6 pt-2 pb-4">
            {(!onlyDelete || onlyBan) && (
                <div className="space-y-4">
                    {isBanned ? (
                        <div className="flex flex-col gap-4 p-4 border border-emerald-500/10 bg-emerald-500/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-full">
                                    <ShieldCheck className="size-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-emerald-900 leading-tight">Restore Access</p>
                                    <p className="text-[11px] text-emerald-700/70">The user will be able to sign in again immediately.</p>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-10 text-xs font-bold uppercase tracking-wider"
                                onClick={() => unbanUser.mutate({ userId: user.id }, { onSuccess })}
                                disabled={unbanUser.isPending}
                            >
                                {unbanUser.isPending ? "Unbanning..." : "Unban Account"}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4 p-4 border border-orange-500/10 bg-orange-500/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-full">
                                    <Ban className="size-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-orange-900 leading-tight">Restrict Account</p>
                                    <p className="text-[11px] text-orange-700/70">Prevents the user from accessing the platform.</p>
                                </div>
                            </div>
                            <form.Field name="banReason">
                                {(field) => (
                                    <Input
                                        placeholder="Reason for restriction (optional)"
                                        value={field.state.value}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        className="bg-background border-orange-500/10 text-xs h-9"
                                    />
                                )}
                            </form.Field>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white border-0 h-10 text-xs font-bold uppercase tracking-wider"
                                onClick={() => banUser.mutate({
                                    userId: user.id,
                                    reason: form.getFieldValue("banReason"),
                                }, { onSuccess })}
                                disabled={banUser.isPending}
                            >
                                {banUser.isPending ? "Restricting..." : "Confirm Restriction"}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {(!onlyBan || onlyDelete) && (
                <div className="flex flex-col gap-4 p-4 border border-destructive/10 bg-destructive/5 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-destructive/10 rounded-full">
                            <AlertTriangle className="size-4 text-destructive" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm text-destructive leading-tight">Permanent Deletion</p>
                            <p className="text-[11px] text-destructive/70 italic">Warning: This action is irreversible.</p>
                        </div>
                    </div>
                    <Button
                        variant="destructive"
                        className="w-full h-10 text-xs font-bold uppercase tracking-wider"
                        onClick={() => {
                            if (confirm(`Type confirm to delete user ${user.name}`)) {
                                removeUser.mutate({ userId: user.id }, { onSuccess });
                            }
                        }}
                        disabled={removeUser.isPending}
                    >
                        {removeUser.isPending ? "Deleting..." : `Delete ${user.name}`}
                    </Button>
                </div>
            )}
        </div>
    );
};
