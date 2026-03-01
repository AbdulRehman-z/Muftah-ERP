/**
 * AddEmployeeForm.tsx
 * Place at: @/components/hr/add-employee-form.tsx
 */

import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { format, parseISO } from "date-fns";
import { useCreateEmployee } from "@/hooks/hr/use-create-employee";
import { createEmployeeSchema } from "@/lib/validators/hr-validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Loader2, UserPlus, Briefcase, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/custom/date-picker";
import {
  STANDARD_ALLOWANCES,
  type AllowanceConfig,
} from "@/lib/types/hr-types";
import { AllowanceCard, DEDUCTION_OCCASIONS } from "@/components/hr/employees/allowance-card";

interface Props {
  onSuccess: () => void;
}

const newCustomAllowance = (): AllowanceConfig => ({
  id: `custom_${Date.now()}`,
  name: "New Allowance",
  amount: 0,
  deductions: {
    absent: false,
    leave: false,
    specialLeave: false,
    lateArrival: false,
    earlyLeaving: false,
  },
});

export const AddEmployeeForm = ({ onSuccess }: Props) => {
  const mutate = useCreateEmployee();

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeCode: "",
      designation: "",
      department: "",
      joiningDate: "",
      status: "active" as "active" | "on_leave" | "terminated" | "resigned",
      employmentType: "full_time" as
        | "full_time"
        | "part_time"
        | "contract"
        | "intern",
      phone: "",
      cnic: "",
      address: "",
      bankName: "",
      bankAccountNumber: "",
      standardDutyHours: 8,
      standardSalary: "",
      // Deep clone so mutations don't affect the STANDARD_ALLOWANCES constant
      allowanceConfig: JSON.parse(
        JSON.stringify(STANDARD_ALLOWANCES)
      ) as AllowanceConfig[],
    },
    validators: {
      onSubmit: createEmployeeSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync(
        { data: value },
        {
          onSuccess: () => {
            toast.success("Employee registered successfully");
            onSuccess();
            form.reset();
          },
          onError: () => {
            toast.error("Failed to register employee. Please try again.");
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
      className="space-y-8"
    >
      <FieldGroup>

        {/* ── SECTION: Identity & Personal ─────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <UserPlus className="size-4" />
            <span className="text-sm uppercase tracking-wider">Identity & Personal</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="firstName">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>First Name</FieldLabel>
                  <Input
                    placeholder="e.g. John"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Last Name</FieldLabel>
                  <Input
                    placeholder="e.g. Doe"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="employeeCode">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Employee Code</FieldLabel>
                  <Input
                    placeholder="e.g. EMP-11005"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="cnic">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>CNIC / ID Number</FieldLabel>
                  <Input
                    placeholder="42101-XXXXXXX-X"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="phone">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Phone Number</FieldLabel>
                  <Input
                    placeholder="+92 XXX XXXXXXX"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="joiningDate">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Joining Date</FieldLabel>
                  <DatePicker
                    date={
                      field.state.value
                        ? parseISO(field.state.value as string)
                        : undefined
                    }
                    onChange={(date) =>
                      field.handleChange(date ? format(date, "yyyy-MM-dd") : "")
                    }
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="address">
            {(field: AnyFieldApi) => (
              <Field>
                <FieldLabel>Full Address</FieldLabel>
                <Textarea
                  placeholder="House #, Street, Area, City"
                  value={field.state.value as string}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className="min-h-[80px]"
                />
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="bankName">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Bank Name / Wallet (Optional)</FieldLabel>
                  <Input
                    placeholder="e.g. HBL, JazzCash, Meezan Bank"
                    value={(field.state.value as string) || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="bankAccountNumber">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Account Number (Optional)</FieldLabel>
                  <Input
                    placeholder="IBAN or Mobile Number"
                    value={(field.state.value as string) || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* ── SECTION: Job Role & Status ────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Briefcase className="size-4" />
            <span className="text-sm uppercase tracking-wider">Job Role & Status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="designation">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Designation</FieldLabel>
                  <Input
                    placeholder="e.g. Production Manager"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="department">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Department</FieldLabel>
                  <Input
                    placeholder="e.g. Finance"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="employmentType">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Employment Type</FieldLabel>
                  <Select
                    value={field.state.value as string}
                    onValueChange={(val) => field.handleChange(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
            <form.Field name="standardDutyHours">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Daily Duty Hours</FieldLabel>
                  <Input
                    type="number"
                    placeholder="e.g. 8"
                    value={field.state.value as number}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* ── SECTION: Compensation & Allowances ───────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Wallet className="size-4" />
            <span className="text-sm uppercase tracking-wider">Compensation & Allowances</span>
          </div>

          <form.Field name="standardSalary">
            {(field: AnyFieldApi) => (
              <Field>
                <FieldLabel className="text-muted-foreground font-medium">
                  Basic Salary (Monthly)
                </FieldLabel>
                <div className="relative group max-w-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-bold text-muted-foreground/70 group-focus-within:text-yellow-600 transition-colors">
                      PKR
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={field.state.value as string}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="pl-12 bg-yellow-50/30 border-yellow-200 focus-visible:ring-yellow-500 font-mono text-lg h-12 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1">
                  On absent days, a full day's worth of basic salary is cut. For late arrivals or early
                  departures, basic salary is reduced by the exact number of minutes missed.
                </p>
                <FieldError errors={field.state.meta.errors} />
              </Field>
            )}
          </form.Field>

          {/* ── Allowances ── */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                  ALLOWANCES
                </h4>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5 w-3/4">
                  Toggle the icons on each card to configure when that allowance is deducted.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.pushFieldValue("allowanceConfig", newCustomAllowance())}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Custom
              </Button>
            </div>

            {/* Legend — driven by DEDUCTION_OCCASIONS, never drifts out of sync */}
            <div className="flex flex-wrap items-center gap-3 py-3 px-1 mb-3 border-b border-dashed">
              {DEDUCTION_OCCASIONS.map((o) => (
                <div key={o.id} className="flex items-center gap-1.5">
                  <div className={`size-2 rounded-full ${o.legendColor}`} />
                  <span className="text-[10px] text-muted-foreground/70 font-medium">{o.label}</span>
                </div>
              ))}
              <span className="text-[10px] text-muted-foreground/40 ml-auto">
                hover icons for details
              </span>
            </div>

            <form.Field name="allowanceConfig">
              {(field: AnyFieldApi) => (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(field.state.value as AllowanceConfig[]).map(
                    (allowance, index) => (
                      <AllowanceCard
                        key={allowance.id}
                        form={form}
                        index={index}
                        allowanceId={allowance.id}
                        onRemove={() =>
                          form.removeFieldValue("allowanceConfig", index)
                        }
                      />
                    )
                  )}
                </div>
              )}
            </form.Field>
          </div>
        </div>

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <div className="pt-4">
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting} className="w-full h-11">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Employee"
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>

      </FieldGroup>
    </form>
  );
};