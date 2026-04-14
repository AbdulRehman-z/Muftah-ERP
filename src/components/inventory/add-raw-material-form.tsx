import { useForm } from "@tanstack/react-form";
import { Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../ui/field";
import { Input } from "../ui/input";
import { addChemicalSchema } from "@/lib/validators/validators";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { PaymentMethodSelect } from "@/components/suppliers/payment-method-select";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useAddChemical } from "@/hooks/inventory/use-add-raw-material";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getSuppliersFn } from "@/server-functions/suppliers/get-suppliers-fn";
import { useMemo } from "react";
import { Textarea } from "../ui/textarea";

type Props = {
  onSuccess: () => void;
  warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
  preselectedWarehouse: string | undefined;
  preselectedSupplierId?: string;
};

export const AddRawMaterialForm = ({
  onSuccess,
  warehouses,
  preselectedWarehouse,
  preselectedSupplierId,
}: Props) => {
  const mutate = useAddChemical();

  const { data: suppliers } = useSuspenseQuery({
    queryKey: ["suppliers"],
    queryFn: getSuppliersFn,
  });

  // Filter warehouses: Must be factory_floor
  const availableWarehouses = useMemo(() => {
    return warehouses.filter((w) => w.type === "factory_floor");
  }, [warehouses]);

  const form = useForm({
    defaultValues: {
      name: "",
      warehouseId: preselectedWarehouse || availableWarehouses[0]?.id || "",
      quantity: "",
      packagingType: "",
      packagingSize: "",
      costPerUnit: "",
      unit: "kg" as "kg" | "liters",
      minimumStockLevel: "0",
      supplierId: preselectedSupplierId || "",
      notes: "",
      paymentMethod: "pay_later",
      paymentStatus: "paid" as "paid" | "partial" | "unpaid",
      amountPaid: "",
      transactionId: "",
      bankName: "",
    },
    validators: {
      onSubmit: addChemicalSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync({
        data: value as any,
      });
      onSuccess();
    },
  });

  const isPreselectedInvalid =
    preselectedWarehouse &&
    !availableWarehouses.find((w) => w.id === preselectedWarehouse);

  return (
    <form
      className="space-y-4 w-full"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      {isPreselectedInvalid && (
        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-center gap-2">
          <Info className="size-4" />
          Selected facility is not a Factory Floor. Please select a valid
          facility.
        </div>
      )}

      <FieldGroup>
        {availableWarehouses.length === 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 text-red-600 text-xs flex items-center gap-2">
            <Info className="size-4" />
            No Factory Floor configured. Please create one first.
          </div>
        )}

        <form.Field name="name">
          {(field) => (
            <Field>
              <FieldLabel>Chemical Name</FieldLabel>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="e.g. Caustic Soda"
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        {!preselectedSupplierId && (
          <form.Field name="supplierId">
            {(field) => (
              <Field>
                <FieldLabel>Supplier</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value) => field.handleChange(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="packagingType">
            {(field) => (
              <Field>
                <FieldLabel>Packaging Type</FieldLabel>
                <Select
                  value={field.state.value || ""}
                  onValueChange={(val) => field.handleChange(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Drum">Drum</SelectItem>
                    <SelectItem value="Bag">Bag</SelectItem>
                    <SelectItem value="Can">Can</SelectItem>
                    <SelectItem value="Box">Box</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}
          </form.Field>

          <form.Field name="packagingSize">
            {(field) => (
              <Field>
                <FieldLabel>Packaging Size</FieldLabel>
                <Input
                  placeholder="e.g. 25kg, 200L"
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </Field>
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="quantity">
            {(field) => (
              <Field>
                <FieldLabel>Quantity</FieldLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  min={0}
                  step={0.01}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="unit">
            {(field) => (
              <Field>
                <FieldLabel>Unit</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(val) =>
                    field.handleChange(val as "kg" | "liters")
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                    <SelectItem value="liters">Liters (l)</SelectItem>
                  </SelectContent>
                </Select>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="costPerUnit">
            {(field) => (
              <Field>
                <FieldLabel>Cost Per Unit (PKR)</FieldLabel>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  min={0}
                  step={0.01}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Field name="minimumStockLevel">
            {(field) => (
              <Field>
                <FieldLabel>Min Stock Level</FieldLabel>
                <Input
                  type="number"
                  placeholder="0"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  min={0}
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
                placeholder="Any additional details..."
                value={field.state.value || ""}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError errors={field.state.meta.errors} />
            </Field>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-4">
          <form.Field name="paymentMethod">
            {(field) => (
              <Field>
                <FieldLabel>Payment Method</FieldLabel>
                <PaymentMethodSelect
                  value={field.state.value || "pay_later"}
                  onValueChange={(val) => {
                    field.handleChange(val);
                    if (val === "pay_later") {
                      form.setFieldValue("paymentStatus", "unpaid");
                      form.setFieldValue("amountPaid", "");
                    }
                  }}
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => state.values.paymentMethod}
            children={(method) => (
              <form.Field name="paymentStatus">
                {(field) => (
                  <Field>
                    <FieldLabel>Payment Status</FieldLabel>
                    <Select
                      value={field.state.value}
                      onValueChange={(val: any) => field.handleChange(val)}
                      disabled={method === "pay_later"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="paid">Paid Full</SelectItem>
                        <SelectItem value="partial">Credit / Partial</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                )}
              </form.Field>
            )}
          />

          <form.Subscribe
            selector={(state) => [
              state.values.paymentStatus,
              state.values.costPerUnit,
              state.values.quantity,
              state.values.amountPaid,
              state.values.paymentMethod,
            ]}
            children={([status, cost, qty, paid, method]) => {
              if (method === "pay_later") return null;
              if (status !== "partial") return null;

              const total =
                (parseFloat(cost || "0") || 0) * (parseFloat(qty || "0") || 0);
              const paidAmount = parseFloat(paid || "0") || 0;
              const remaining = total - paidAmount;

              return (
                <div className="col-span-2 space-y-2">
                  <form.Field name="amountPaid">
                    {(field) => (
                      <Field>
                        <FieldLabel>
                          Amount Paid <span className="text-red-500">*</span>
                        </FieldLabel>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={field.state.value || ""}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldDescription>
                          Runnning Total: PKR {total.toLocaleString()}
                        </FieldDescription>
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>

                  <div className="text-sm font-medium border rounded-md p-3 bg-muted/30 flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Remaining Balance:
                    </span>
                    <span
                      className={
                        remaining > 0 ? "text-red-500" : "text-green-600"
                      }
                    >
                      PKR{" "}
                      {remaining.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>
              );
            }}
          />

          <form.Subscribe
            selector={(state) => state.values.paymentMethod}
            children={(paymentMethod) => {
              if (
                paymentMethod !== "bank_transfer" &&
                paymentMethod !== "cheque"
              )
                return null;
              return (
                <div className="col-span-2 space-y-4 pt-2">
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

                  <form.Field name="transactionId">
                    {(field) => (
                      <Field>
                        <FieldLabel>Reference / Transaction ID</FieldLabel>
                        <Input
                          placeholder={
                            paymentMethod === "cheque"
                              ? "Cheque Number"
                              : "Bank Transaction ID"
                          }
                          value={field.state.value || ""}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                        <FieldError errors={field.state.meta.errors} />
                      </Field>
                    )}
                  </form.Field>
                </div>
              );
            }}
          />
        </div>

        <Button
          disabled={form.state.isSubmitting}
          type="submit"
          className="w-full"
        >
          {form.state.isSubmitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            "Add Chemical"
          )}
        </Button>
      </FieldGroup>
    </form>
  );
};
