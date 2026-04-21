import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPaymentFn } from "@/server-functions/suppliers/add-payment-fn";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CircleDollarSign } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";
import { PaymentMethodSelect } from "@/components/suppliers/payment-method-select";

const addPaymentSchema = z.object({
  supplierId: z.string(),
  purchaseId: z.string(),
  amount: z.string().min(1, "Amount is required"),
  walletId: z.string().min(1, "Payment method is required"),
  reference: z.string(),
  notes: z.string(),
});

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
  supplierName: string;
  outstandingBalance: number;
  purchaseId?: string;
  defaultAmount?: string;
  defaultNotes?: string;
};

export const RecordPaymentDialog = ({
  open,
  onOpenChange,
  supplierId,
  supplierName,
  outstandingBalance,
  purchaseId,
  defaultAmount,
  defaultNotes,
}: Props) => {
  const queryClient = useQueryClient();

  const mutate = useMutation({
    mutationFn: addPaymentFn,
    onSuccess: () => {
      toast.success("Payment recorded successfully");
      queryClient.invalidateQueries({ queryKey: ["supplier"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to record payment"),
  });

  const form = useForm({
    defaultValues: {
      supplierId: supplierId,
      purchaseId: purchaseId || "",
      amount: defaultAmount || "",
      walletId: "",
      reference: "",
      notes: defaultNotes || "",
    },
    validators: {
      onSubmit: addPaymentSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync({
        data: {
          ...value,
          paymentDate: new Date(),
        },
      });
    },
  });

  useEffect(() => {
    if (open) {
      form.setFieldValue("amount", defaultAmount || "");
      form.setFieldValue("purchaseId", purchaseId || "");
      form.setFieldValue("supplierId", supplierId);
      form.setFieldValue("notes", defaultNotes || "");
    }
  }, [open, defaultAmount, defaultNotes, purchaseId, supplierId, form]);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record Payment"
      description={
        purchaseId
          ? `Record payment for this purchase. Remaining balance: PKR ${outstandingBalance.toLocaleString()}`
          : `Record a payment made to ${supplierName}. Current outstanding balance: PKR ${outstandingBalance.toLocaleString()}`
      }
      icon={CircleDollarSign}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <form.Field name="amount">
          {(field) => (
            <Field>
              <FieldLabel>Amount (PKR)</FieldLabel>
              <Input
                type="number"
                placeholder="0.00"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="walletId">
          {(field) => (
            <Field>
              <FieldLabel>Payment Method</FieldLabel>
              <PaymentMethodSelect
                value={field.state.value}
                onValueChange={(val) => field.handleChange(val)}
                hidePayLater
                showBalance
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel>Notes (Optional)</FieldLabel>
              <Textarea
                placeholder="Any additional notes..."
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={mutate.isPending}>
            {mutate.isPending && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Record Payment
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
