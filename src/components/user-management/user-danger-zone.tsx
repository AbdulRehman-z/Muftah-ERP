import { useForm } from "@tanstack/react-form";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Ban, Trash2, ShieldCheck, AlertTriangle, Loader2 } from "lucide-react";

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
    defaultValues: { banReason: "" },
    onSubmit: async () => { },
  });

  const isBanned = user.banned;
  const showBan = !onlyDelete || onlyBan;
  const showDelete = !onlyBan || onlyDelete;

  return (
    <div className="space-y-3 pt-2 pb-2">
      {/* Ban / Unban block */}
      {showBan && (
        isBanned ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-emerald-900 dark:text-emerald-300 leading-tight">
                  Restore Access
                </p>
                <p className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
                  The user will be able to sign in again immediately.
                </p>
              </div>
            </div>
            <Button
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold border-0"
              onClick={() => unbanUser.mutate({ userId: user.id }, { onSuccess })}
              disabled={unbanUser.isPending}
            >
              {unbanUser.isPending ? (
                <><Loader2 className="mr-2 size-3.5 animate-spin" />Unbanning…</>
              ) : "Unban Account"}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                <Ban className="size-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-orange-900 dark:text-orange-300 leading-tight">
                  Restrict Account
                </p>
                <p className="text-[11px] text-orange-700/70 dark:text-orange-400/70">
                  Prevents the user from accessing the platform.
                </p>
              </div>
            </div>
            <form.Field name="banReason">
              {(field) => (
                <Input
                  placeholder="Reason for restriction (optional)"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="h-9 text-[12.5px] border-orange-500/20 bg-background"
                />
              )}
            </form.Field>
            <Button
              className="w-full h-9 bg-orange-600 hover:bg-orange-700 text-white text-[12.5px] font-semibold border-0"
              onClick={() =>
                banUser.mutate(
                  { userId: user.id, reason: form.getFieldValue("banReason") },
                  { onSuccess },
                )
              }
              disabled={banUser.isPending}
            >
              {banUser.isPending ? (
                <><Loader2 className="mr-2 size-3.5 animate-spin" />Restricting…</>
              ) : "Confirm Restriction"}
            </Button>
          </div>
        )
      )}

      {/* Delete block */}
      {showDelete && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="size-4 text-destructive" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-destructive leading-tight">
                Permanent Deletion
              </p>
              <p className="text-[11px] text-destructive/60 italic">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            className="w-full h-9 text-[12.5px] font-semibold"
            onClick={() => {
              if (confirm(`Delete user "${user.name}"? This is irreversible.`)) {
                removeUser.mutate({ userId: user.id }, { onSuccess });
              }
            }}
            disabled={removeUser.isPending}
          >
            {removeUser.isPending ? (
              <><Loader2 className="mr-2 size-3.5 animate-spin" />Deleting…</>
            ) : `Delete ${user.name}`}
          </Button>
        </div>
      )}
    </div>
  );
};