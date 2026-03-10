/**
 * EditEmployeeForm.tsx
 * Place at: @/components/hr/edit-employee-form.tsx
 */

import { useMemo } from "react";
import { useForm } from "@tanstack/react-form";
import { format, parseISO } from "date-fns";
import { useUpdateEmployee } from "@/hooks/hr/use-update-employee";
import { updateEmployeeSchema } from "@/lib/validators/hr-validators";
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
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Loader2, UserCircle2, Briefcase, Wallet, Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/custom/date-picker";
import { toast } from "sonner";
import {
  STANDARD_ALLOWANCES,
  type AllowanceConfig,
} from "@/lib/types/hr-types";
import { AllowanceCard, DEDUCTION_OCCASIONS } from "@/components/hr/employees/allowance-card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Employee = Awaited<ReturnType<typeof getEmployeesFn>>[0];

interface Props {
  employee: Employee;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS (module-level, not recreated on every render)
// ─────────────────────────────────────────────────────────────────────────────

const FALLBACK_DEDUCTIONS: AllowanceConfig["deductions"] = {
  absent: true,
  annualLeave: false,
  sickLeave: false,
  specialLeave: false,
  lateArrival: false,
  earlyLeaving: false,
};

/**
 * Safely migrates an allowance from the DB that may be missing the
 * deductions field (saved before this feature was implemented).
 * Each sub-field is individually defaulted so partial DB objects also work.
 * Also handles backward-compat migration from old `leave` field to `annualLeave`.
 */
const migrateAllowance = (raw: Partial<AllowanceConfig>): AllowanceConfig => ({
  id: raw.id ?? `custom_${Date.now()}`,
  name: raw.name ?? "Allowance",
  amount: raw.amount ?? 0,
  lateEarlyBasis: raw.lateEarlyBasis ?? "hourly",
  deductions: {
    absent: raw.deductions?.absent ?? FALLBACK_DEDUCTIONS.absent,
    annualLeave: raw.deductions?.annualLeave ?? (raw.deductions as any)?.leave ?? FALLBACK_DEDUCTIONS.annualLeave,
    sickLeave: raw.deductions?.sickLeave ?? FALLBACK_DEDUCTIONS.sickLeave,
    specialLeave: raw.deductions?.specialLeave ?? FALLBACK_DEDUCTIONS.specialLeave,
    lateArrival: raw.deductions?.lateArrival ?? FALLBACK_DEDUCTIONS.lateArrival,
    earlyLeaving: raw.deductions?.earlyLeaving ?? FALLBACK_DEDUCTIONS.earlyLeaving,
  },
});

const newCustomAllowance = (): AllowanceConfig => ({
  id: `custom_${Date.now()}`,
  name: "New Allowance",
  amount: 0,
  deductions: {
    absent: false,
    annualLeave: false,
    sickLeave: false,
    specialLeave: false,
    lateArrival: false,
    earlyLeaving: false,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const EditEmployeeForm = ({ employee, onSuccess }: Props) => {
  const mutate = useUpdateEmployee();

  /**
   * useMemo so that if the parent re-renders with a different employee
   * (e.g. sheet closes and re-opens), the migrated allowances correctly
   * reflect the new employee rather than the stale one from the first render.
   */
  const existingAllowances = useMemo<AllowanceConfig[]>(() => {
    const raw = employee.allowanceConfig as unknown as Partial<AllowanceConfig>[] | null;
    const source = raw ?? (JSON.parse(JSON.stringify(STANDARD_ALLOWANCES)) as AllowanceConfig[]);
    return source.map(migrateAllowance);
  }, [employee.id]); // re-derive only when the actual employee changes

  const form = useForm({
    defaultValues: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designation: employee.designation,
      department: employee.department ?? "",
      joiningDate: employee.joiningDate,
      status: employee.status as "active" | "on_leave" | "terminated" | "resigned",
      employmentType: employee.employmentType as
        | "full_time"
        | "part_time"
        | "contract"
        | "intern",
      phone: employee.phone ?? "",
      cnic: employee.cnic ?? "",
      address: employee.address ?? "",
      bankName: employee.bankName ?? "",
      bankAccountNumber: employee.bankAccountNumber ?? "",
      standardDutyHours: employee.standardDutyHours ?? 8,
      standardSalary: employee.standardSalary ?? "",
      commissionRate: employee.commissionRate ?? "0",
      isOrderBooker: (employee as any).isOrderBooker ?? false,
      allowanceConfig: existingAllowances,
    },
    validators: {
      onSubmit: updateEmployeeSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync(
        { data: value },
        {
          onSuccess: () => {
            toast.success("Employee records updated");
            onSuccess();
          },
          onError: () => {
            toast.error("Failed to update employee. Please try again.");
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
      className="space-y-8 py-2"
    >
      <FieldGroup>

        {/* ── SECTION: Identity Details ──────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <UserCircle2 className="size-4" />
            <span className="text-sm uppercase tracking-wider">Identity Details</span>
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
                    placeholder="e.g. 42101-XXXXXXX-X"
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
                    placeholder="e.g. +92 XXX XXXXXXX"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="status">
              {(field: AnyFieldApi) => (
                <Field>
                  <FieldLabel>Employment Status</FieldLabel>
                  <Select
                    value={field.state.value as string}
                    onValueChange={(val) => field.handleChange(val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                      <SelectItem value="resigned">Resigned</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>
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
          </div>

          <form.Field name="address">
            {(field: AnyFieldApi) => (
              <Field>
                <FieldLabel>Full Address</FieldLabel>
                <Textarea
                  placeholder="e.g. House #, Street, Area, City"
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

        {/* ── SECTION: Assigned Role ─────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Briefcase className="size-4" />
            <span className="text-sm uppercase tracking-wider">Assigned Role</span>
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
        </div>

        <Separator className="opacity-50" />

        {/* ── SECTION: Salary & Allowances ──────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Wallet className="size-4" />
            <span className="text-sm uppercase tracking-wider">Salary & Allowances</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="pl-12 bg-yellow-50/30 border-yellow-200 dark:bg-yellow-500/10 dark:border-yellow-500/30 focus-visible:ring-yellow-500 font-mono text-lg h-12 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(s: any) => s.values.isOrderBooker}>
              {(isOrderBooker) => isOrderBooker ? (
                <form.Field name="commissionRate">
                  {(field: AnyFieldApi) => (
                    <Field>
                      <FieldLabel className="text-muted-foreground font-medium">
                        Commission Rate (%)
                      </FieldLabel>
                      <div className="relative group max-w-xs">
                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                          <span className="text-xs font-bold text-muted-foreground/70 group-focus-within:text-blue-600 transition-colors">
                            %
                          </span>
                        </div>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0.0"
                          value={field.state.value as string}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="pr-10 bg-blue-50/30 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30 focus-visible:ring-blue-500 font-mono text-lg h-12 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>
              ) : null}
            </form.Subscribe>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Subscribe selector={(s: any) => s.values.isOrderBooker}>
              {(isOrderBooker) => (
                <p className="text-[11px] text-muted-foreground/60 mt-2">
                  <strong>Basic Salary:</strong> On absent days, a full day's worth is cut.
                  {isOrderBooker && (
                    <>
                      <br />
                      <strong>Commission:</strong> Order bookers receive this % on their total collected Recovery.
                    </>
                  )}
                </p>
              )}
            </form.Subscribe>

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

          {/* ── Allowances ── */}
          <div className="pt-2">
            <div className="flex justify-between items-center mb-1">
              <div>
                <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                  ALLOWANCES
                </h4>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
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
                    Saving changes...
                  </>
                ) : (
                  "Update Employee Records"
                )}
              </Button>
            )}
          </form.Subscribe>
        </div>

      </FieldGroup>
    </form>
  );
};