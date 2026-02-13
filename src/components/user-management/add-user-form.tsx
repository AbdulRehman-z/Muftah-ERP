
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { useUsers } from "@/hooks/use-users";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

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
            role: "operator" as "operator" | "finance-manager" | "super-admin" | "admin",
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
                }
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
            className="space-y-4"
        >
            <form.Field name="name">
                {(field) => (
                    <Field>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <form.Field name="email">
                {(field) => (
                    <Field>
                        <FieldLabel>Email</FieldLabel>
                        <Input
                            type="email"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <form.Field name="password">
                {(field) => (
                    <Field>
                        <FieldLabel>Password</FieldLabel>
                        <Input
                            type="password"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            onBlur={field.handleBlur}
                        />
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

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
                                <SelectItem value="finance-manager">Finance Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super-admin">Super Admin</SelectItem>
                            </SelectContent>
                        </Select>
                        <FieldError errors={field.state.meta.errors} />
                    </Field>
                )}
            </form.Field>

            <div className="flex justify-end pt-4">
                <Button type="submit" disabled={createUser.isPending} className="w-full">
                    {createUser.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Create User
                </Button>
            </div>
        </form>
    );
};
