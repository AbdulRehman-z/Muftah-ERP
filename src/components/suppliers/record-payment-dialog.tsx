import { Button } from "@/components/ui/button";
import { ResponsiveDialog } from "@/components/custom/responsive-dialog";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addPaymentFn } from "@/server-functions/suppliers/add-payment-fn";
import { toast } from "sonner";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CircleDollarSign } from "lucide-react";
import { z } from "zod";
import { useEffect } from "react";

const addPaymentSchema = z
  .object({
    supplierId: z.string(),
    purchaseId: z.string(),
    amount: z.string().min(1, "Amount is required"),
    method: z.enum(["cash", "bank_transfer", "cheque"]),
    reference: z.string(),
    bankName: z.string(),
    paidBy: z.string().min(1, "Paid By is required"),
    notes: z.string(),
  })
  .refine(
    (data) => {
      if (["bank_transfer", "cheque"].includes(data.method)) {
        return !!data.bankName && data.bankName.trim().length > 0;
      }
      return true;
    },
    {
      message: "Bank Name is required",
      path: ["bankName"],
    },
  )
  .refine(
    (data) => {
      if (["bank_transfer", "cheque"].includes(data.method)) {
        return !!data.reference && data.reference.trim().length > 0;
      }
      return true;
    },
    {
      message: "Reference / Transaction ID is required",
      path: ["reference"],
    },
  );

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
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message || "Failed to record payment"),
  });

  const form = useForm({
    defaultValues: {
      supplierId: supplierId,
      purchaseId: purchaseId || "",
      amount: defaultAmount || "",
      method: "cash" as "cash" | "bank_transfer" | "cheque",
      reference: "",
      bankName: "",
      paidBy: "",
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
      // form.setFieldValue("notes", defaultNotes || "");
      // form.setFieldValue("purchaseId", purchaseId || "");
    }
  }, [open, defaultAmount, defaultNotes, purchaseId, form]);

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

        <form.Field name="method">
          {(field) => (
            <Field>
              <FieldLabel>Payment Method</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(val: any) => field.handleChange(val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => state.values.method}
          children={(method) => (
            <>
              {method !== "cash" && (
                <form.Field name="reference">
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        {method === "cheque"
                          ? "Cheque Number"
                          : "Transaction ID"}
                      </FieldLabel>
                      <Input
                        placeholder={
                          method === "cheque"
                            ? "e.g. 123456"
                            : "e.g. Bank Tx ID"
                        }
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              )}

              {["bank_transfer", "cheque"].includes(method) && (
                <form.Field name="bankName">
                  {(field) => (
                    <Field>
                      <FieldLabel>Bank Name</FieldLabel>
                      <Input
                        placeholder="e.g. HBL, Meezan, etc."
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              )}
            </>
          )}
        />

        <form.Field name="paidBy">
          {(field) => (
            <Field>
              <FieldLabel>Paid By</FieldLabel>
              <Input
                placeholder="Person who made the payment"
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(e.target.value)}
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
