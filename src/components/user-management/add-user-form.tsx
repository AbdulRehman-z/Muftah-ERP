import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCircleIcon, MailIcon, KeyIcon, ShieldIcon } from "lucide-react";

const addUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["operator", "finance-manager", "super-admin", "admin"]),
});

type Props = {
  onSuccess: () => void;
};

export const AddUserForm = ({ onSuccess }: Props) => {
  const { createUser } = useUsers();
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "operator" as
        | "operator"
        | "finance-manager"
        | "super-admin"
        | "admin",
    },
    validators: {
      onSubmit: addUserSchema,
    },
    onSubmit: async ({ value }) => {
      createUser.mutate(
        {
          email: value.email,
          password: value.password,
          name: value.name,
          role: value.role,
        },
        {
          onSuccess: () => {
            onSuccess();
            queryClient.invalidateQueries({
              queryKey: ["admin-users"],
            });
          },
          onError: (error: any) => {
            console.log(error);
            toast.error(error.message);
          },
        },
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6 pt-2"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel className="flex items-center gap-2 mb-1.5">
                <UserCircleIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Full Name</span>
              </FieldLabel>
              <Input
                placeholder="e.g. Abdul Rehman"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="bg-background"
                autoFocus
              />
              <p className="text-[13px] text-muted-foreground mt-1.5">
                The official name of the employee for system records.
              </p>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel className="flex items-center gap-2 mb-1.5">
                <MailIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Email Address</span>
              </FieldLabel>
              <Input
                type="email"
                placeholder="employee@company.dev"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="bg-background"
              />
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Used for account login and system notifications.
              </p>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Field>
              <FieldLabel className="flex items-center gap-2 mb-1.5">
                <KeyIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Password</span>
              </FieldLabel>
              <Input
                type="password"
                placeholder="••••••••"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                className="bg-background"
              />
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Must be at least 8 characters long.
              </p>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <Field>
              <FieldLabel className="flex items-center gap-2 mb-1.5">
                <ShieldIcon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">System Role</span>
              </FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(val: any) => field.handleChange(val)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="finance-manager">Finance Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[13px] text-muted-foreground mt-1.5">
                Determines the user's access level and permissions.
              </p>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="flex justify-end pt-4 border-t border-border/60">
        <Button
          type="submit"
          disabled={createUser.isPending}
          className="w-full md:w-auto md:min-w-[140px]"
        >
          {createUser.isPending ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
};