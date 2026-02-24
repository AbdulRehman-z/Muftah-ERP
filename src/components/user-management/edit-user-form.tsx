import { useForm } from "@tanstack/react-form";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const editUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.email("Invalid email address"),
  role: z.enum(["admin", "finance-manager", "operator", "super-admin"]),
  password: z.string().refine((val) => val === "" || val.length >= 8, {
    message: "Password must be at least 8 characters",
  }),
});

type Props = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
    image?: string | null;
  };
  onSuccess: () => void;
};

export const EditUserForm = ({ user, onSuccess }: Props) => {
  const { setRole, updateUser, setUserPassword } = useUsers();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm({
    defaultValues: {
      name: user.name || "",
      email: user.email || "",
      role: user.role as
        | "admin"
        | "finance-manager"
        | "operator"
        | "super-admin",
      password: "",
    },
    validators: {
      onSubmit: editUserSchema,
    },
    onSubmit: async ({ value }) => {
      const promises = [];

      if (value.role !== user.role) {
        promises.push(
          setRole.mutateAsync({ userId: user.id, role: value.role }),
        );
      }

      if (value.name !== user.name || value.email !== user.email) {
        promises.push(
          updateUser.mutateAsync({
            userId: user.id,
            data: {
              name: value.name,
              email: value.email,
            },
          }),
        );
      }

      if (value.password && value.password.length >= 8) {
        promises.push(
          setUserPassword.mutateAsync({
            userId: user.id,
            password: value.password,
          }),
        );
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        onSuccess();
      } else {
        onSuccess();
      }
    },
  });

  const isSubmitting =
    setRole.isPending || updateUser.isPending || setUserPassword.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-2 text-sm text-muted-foreground p-3 border rounded-md bg-muted/20">
        <div className="flex justify-between items-center">
          <span className="font-medium text-foreground">User ID</span>
          <span className="font-mono text-[10px] opacity-70">{user.id}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-foreground">Current Role</span>
          <Badge
            variant="secondary"
            className="capitalize px-2 py-0 h-5 text-[10px] font-bold tracking-tight"
          >
            {user.role.replace("-", " ")}
          </Badge>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-foreground">Status</span>
          <Badge
            variant={user.banned ? "destructive" : "outline"}
            className={
              !user.banned
                ? "text-green-600 border-green-200 bg-green-50 h-5 text-[10px] font-bold"
                : "h-5 text-[10px] font-bold"
            }
          >
            {user.banned ? "Banned" : "Active"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel>Full Name</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <Input
                type="email"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
            </Field>
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <form.Field name="role">
          {(field) => (
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(val: any) => field.handleChange(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operator</SelectItem>
                  <SelectItem value="finance-manager">
                    Finance Manager
                  </SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="super-admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Field>
              <FieldLabel className="flex w-full items-center justify-between pb-1">
                <span className="text-foreground">New Password</span>
                <span className="text-[10px] text-muted-foreground font-normal italic">
                  (Min 8 characters)
                </span>
              </FieldLabel>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="Enter new password..."
                  className="h-10 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full w-10 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground/60 px-1">
                Leave this field empty if you do not want to change the
                password.
              </p>
              {field.state.meta.errors.length > 0 && (
                <span className="text-[10px] text-destructive font-medium mt-1">
                  {field.state.meta.errors.join(", ")}
                </span>
              )}
            </Field>
          )}
        </form.Field>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full h-11">
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save Changes
      </Button>
    </form>
  );
};
