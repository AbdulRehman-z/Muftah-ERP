import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addSupplierFn } from "@/server-functions/suppliers/add-supplier-fn";
import { supplierSchema } from "@/lib/validators";
import { Textarea } from "../ui/textarea";

type Props = {
  onSuccess: () => void;
};

export const AddSupplierForm = ({ onSuccess }: Props) => {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: addSupplierFn,
    onSuccess: () => {
      toast.success("Supplier added successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add supplier");
    },
  });

  const form = useForm({
    defaultValues: {
      supplierName: "",
      supplierShopName: "",
      email: "",
      nationalId: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      notes: "",
    } as any,
    validators: {
      onSubmit: supplierSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync({ data: value });
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <form.Field name="supplierName">
            {(field) => (
              <Field>
                <FieldLabel>Supplier Name</FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Ali"
                />
                <FieldDescription>
                  Enter the name of the supplier
                </FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="supplierShopName">
            {(field) => (
              <Field>
                <FieldLabel>Supplier Shop Name</FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Hassan Supplier"
                />
                <FieldDescription>
                  Enter the name of the supplier's shop
                </FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel>Email (Optional)</FieldLabel>
                <Input
                  type="email"
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldDescription>
                  Enter the email of the supplier
                </FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="nationalId">
            {(field) => (
              <Field>
                <FieldLabel>National ID</FieldLabel>
                <Input
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="3729372173"
                />
                <FieldDescription>
                  Enter the national ID of the supplier
                </FieldDescription>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="phone">
          {(field) => (
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="2897327237"
              />
              <FieldDescription>
                Enter the phone number of the supplier
              </FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="address">
          {(field) => (
            <Field>
              <FieldLabel>Address</FieldLabel>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="sdiasdibawid"
              />
              <FieldDescription>
                Enter the address of the supplier
              </FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="city">
            {(field) => (
              <Field>
                <FieldLabel>City (Optional)</FieldLabel>
                <Input
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Lahore"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="state">
            {(field) => (
              <Field>
                <FieldLabel>State (Optional)</FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Punjab"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel>Notes (Optional)</FieldLabel>
              <Textarea
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldDescription>
                Enter any notes about the supplier
              </FieldDescription>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <Button
          type="submit"
          disabled={form.state.isSubmitting}
          className="w-full"
        >
          {form.state.isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            "Add Supplier"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
};
