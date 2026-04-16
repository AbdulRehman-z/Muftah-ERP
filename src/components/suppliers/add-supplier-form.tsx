import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addSupplierFn } from "@/server-functions/suppliers/add-supplier-fn";
import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { supplierSchema } from "@/lib/validators";
import { Textarea } from "../ui/textarea";
import {
  UserCircle,
  Store,
  Mail,
  IdCard,
  Phone,
  MapPin,
  Building2,
  Map,
  AlignLeft
} from "lucide-react";

type Props = {
  onSuccess: () => void;
};

type SuppliersList = Awaited<ReturnType<typeof getSuppliersFn>>;
type SupplierListItem = SuppliersList[number];

export const AddSupplierForm = ({ onSuccess }: Props) => {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: addSupplierFn,
    onSuccess: async (newSupplier, variables) => {
      const submitted = (variables as { data?: Record<string, unknown> } | undefined)?.data;
      const nowIso = new Date().toISOString();
      const emailValue =
        (newSupplier as any)?.email ?? String(submitted?.email ?? "");
      const nationalIdValue =
        (newSupplier as any)?.nationalId ?? String(submitted?.nationalId ?? "");

      const optimisticSupplier = {
        id: (newSupplier as any)?.id ?? `temp-supplier-${Date.now()}`,
        supplierName:
          (newSupplier as any)?.supplierName ??
          String(submitted?.supplierName ?? "New Supplier"),
        supplierShopName:
          (newSupplier as any)?.supplierShopName ??
          String(submitted?.supplierShopName ?? ""),
        email: emailValue || null,
        phone: (newSupplier as any)?.phone ?? String(submitted?.phone ?? ""),
        nationalId: nationalIdValue || null,
        address: (newSupplier as any)?.address ?? String(submitted?.address ?? ""),
        city: (newSupplier as any)?.city ?? String(submitted?.city ?? ""),
        state: (newSupplier as any)?.state ?? String(submitted?.state ?? ""),
        notes: (newSupplier as any)?.notes ?? String(submitted?.notes ?? ""),
        createdAt: (newSupplier as any)?.createdAt ?? nowIso,
        updatedAt: (newSupplier as any)?.updatedAt ?? nowIso,
        purchases: [],
        payments: [],
        totalPurchases: 0,
        totalPayments: 0,
        balance: 0,
      } as SupplierListItem;

      queryClient.setQueryData<SuppliersList>(["suppliers"], (current) => {
        if (!current) return [optimisticSupplier];
        return [
          optimisticSupplier,
          ...current.filter((supplier) => supplier.id !== optimisticSupplier.id),
        ];
      });

      // Keep the optimistic list visible immediately; defer network refetch to avoid
      // first-insert stale overwrite cases in some environments.
      queryClient.invalidateQueries({
        queryKey: ["suppliers"],
        refetchType: "none",
      });
      toast.success("Supplier added successfully");
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
      className="space-y-6 pt-2"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <FieldGroup className="space-y-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
          <form.Field name="supplierName">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <UserCircle className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Contact Name</span>
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Ali Hassan"
                  className="bg-background"
                  autoFocus
                />
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  Primary point of contact for this supplier.
                </p>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="supplierShopName">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <Store className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Business / Shop Name</span>
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Hassan Traders"
                  className="bg-background"
                />
                <p className="text-[13px] text-muted-foreground mt-1.5">
                  Official registered business name.
                </p>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <Mail className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Email Address <span className="text-muted-foreground font-normal ml-1">(Optional)</span></span>
                </FieldLabel>
                <Input
                  type="email"
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="contact@supplier.com"
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <Phone className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Phone Number</span>
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. 0300 1234567"
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="nationalId">
            {(field) => (
              <Field className="md:col-span-2">
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <IdCard className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">National ID / CNIC</span>
                </FieldLabel>
                <Input
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. 37293-7217300-1"
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <Field className="md:col-span-2">
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Street Address</span>
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Shop #12, Main Market..."
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="city">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">City <span className="text-muted-foreground font-normal ml-1">(Optional)</span></span>
                </FieldLabel>
                <Input
                  value={field.state.value || ""}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Lahore"
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="state">
            {(field) => (
              <Field>
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <Map className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">State / Province <span className="text-muted-foreground font-normal ml-1">(Optional)</span></span>
                </FieldLabel>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="e.g. Punjab"
                  className="bg-background"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="notes">
            {(field) => (
              <Field className="md:col-span-2">
                <FieldLabel className="flex items-center gap-2 mb-1.5">
                  <AlignLeft className="size-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Internal Notes <span className="text-muted-foreground font-normal ml-1">(Optional)</span></span>
                </FieldLabel>
                <Textarea
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Add any specific payment terms, delivery schedules, or internal observations..."
                  className="bg-background min-h-[100px] resize-none"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="flex justify-end pt-6 mt-6 border-t border-border/60">
          <form.Subscribe selector={(s: any) => s.isSubmitting}>
            {(isSubmitting: boolean) => (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full md:w-auto md:min-w-[140px]"
              >
                {isSubmitting ? "Adding Supplier..." : "Add Supplier"}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </FieldGroup>
    </form>
  );
};