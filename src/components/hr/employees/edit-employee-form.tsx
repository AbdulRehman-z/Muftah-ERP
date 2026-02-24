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
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Loader2, UserCircle2, Briefcase, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/custom/date-picker";
import {
  STANDARD_ALLOWANCES,
  type AllowanceConfig,
} from "@/lib/types/hr-types";
import { Plus, Trash2 } from "lucide-react";

type Employee = Awaited<ReturnType<typeof getEmployeesFn>>[0];

interface Props {
  employee: Employee;
  onSuccess: () => void;
}

export const EditEmployeeForm = ({ employee, onSuccess }: Props) => {
  const mutate = useUpdateEmployee();

  const form = useForm({
    defaultValues: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employeeCode: employee.employeeCode,
      designation: employee.designation,
      department: employee.department || "",
      joiningDate: employee.joiningDate,
      status: employee.status as
        | "active"
        | "on_leave"
        | "terminated"
        | "resigned",
      employmentType: employee.employmentType as
        | "full_time"
        | "part_time"
        | "contract"
        | "intern",
      phone: employee.phone || "",
      cnic: employee.cnic || "",
      address: employee.address || "",
      bankName: employee.bankName || "",
      bankAccountNumber: employee.bankAccountNumber || "",

      // Compensation
      standardDutyHours: employee.standardDutyHours || 8,
      standardSalary: employee.standardSalary || "",
      allowanceConfig:
        ((employee.allowanceConfig as unknown as AllowanceConfig[]) ||
          JSON.parse(JSON.stringify(STANDARD_ALLOWANCES))) as AllowanceConfig[],
    },
    validators: {
      onSubmit: updateEmployeeSchema,
    },
    onSubmit: async ({ value }) => {
      await mutate.mutateAsync(
        { data: value },
        {
          onSuccess: () => {
            // toast.success("Employee records updated");
            onSuccess();
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
      className="space-y-8 py-2"
    >
      <FieldGroup>
        {/* Identity Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <UserCircle2 className="size-4" />
            <span className="text-sm uppercase tracking-wider">
              Identity Details
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="firstName">
              {(field) => (
                <Field>
                  <FieldLabel>First Name</FieldLabel>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="lastName">
              {(field) => (
                <Field>
                  <FieldLabel>Last Name</FieldLabel>
                  <Input
                    value={field.state.value}
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
              {(field) => (
                <Field>
                  <FieldLabel>Employee Code</FieldLabel>
                  <Input
                    placeholder="e.g. 11005"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="cnic">
              {(field) => (
                <Field>
                  <FieldLabel>CNIC / ID Number</FieldLabel>
                  <Input
                    placeholder="42101-XXXXXXX-X"
                    value={field.state.value}
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
              {(field) => (
                <Field>
                  <FieldLabel>Phone Number</FieldLabel>
                  <Input
                    placeholder="+92 XXX XXXXXXX"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="joiningDate">
              {(field) => (
                <Field>
                  <FieldLabel>Joining Date</FieldLabel>
                  <DatePicker
                    date={
                      field.state.value
                        ? parseISO(field.state.value)
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
              {(field) => (
                <Field>
                  <FieldLabel>Employment Status</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(val: any) => field.handleChange(val)}
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
              {(field) => (
                <Field>
                  <FieldLabel>Employment Type</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(val: any) => field.handleChange(val)}
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
            {(field) => (
              <Field>
                <FieldLabel>Full Address</FieldLabel>
                <Textarea
                  placeholder="House #, Street, Area, City"
                  value={field.state.value}
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
              {(field) => (
                <Field>
                  <FieldLabel>Bank Name / Wallet (Optional)</FieldLabel>
                  <Input
                    placeholder="e.g. HBL, JazzCash, Meezan Bank"
                    value={field.state.value || ""}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="bankAccountNumber">
              {(field) => (
                <Field>
                  <FieldLabel>Account Number (Optional)</FieldLabel>
                  <Input
                    placeholder="IBAN or Mobile Number"
                    value={field.state.value || ""}
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

        {/* Job Role Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Briefcase className="size-4" />
            <span className="text-sm uppercase tracking-wider">
              Assigned Role
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="designation">
              {(field) => (
                <Field>
                  <FieldLabel>Designation</FieldLabel>
                  <Input
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="department">
              {(field) => (
                <Field>
                  <FieldLabel>Department</FieldLabel>
                  <Input
                    value={field.state.value}
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

        {/* Compensation Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Wallet className="size-4" />
            <span className="text-sm uppercase tracking-wider">
              Salary & Allowances
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form.Field name="standardSalary">
              {(field) => (
                <Field>
                  <FieldLabel className="text-muted-foreground font-medium">
                    Basic Salary (Monthly)
                  </FieldLabel>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors group-focus-within:text-yellow-600">
                      <span className="text-xs font-bold text-muted-foreground/70">
                        PKR
                      </span>
                    </div>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="pl-12 bg-yellow-50/30 border-yellow-200 focus-visible:ring-yellow-500 font-mono text-lg h-12 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            <form.Field name="standardDutyHours">
              {(field) => (
                <Field>
                  <FieldLabel>Daily Duty Hours</FieldLabel>
                  <Input
                    type="number"
                    placeholder="e.g. 8"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                    className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
          </div>

          <div className="pt-4 pb-2">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold tracking-wide text-muted-foreground">
                ALLOWANCES
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  form.pushFieldValue("allowanceConfig", {
                    id: `custom_${Date.now()}`,
                    name: "New Allowance",
                    amount: 0,
                  })
                }
              >
                <Plus className="w-4 h-4 mr-2" /> Add Custom
              </Button>
            </div>

            <div className="space-y-4">
              <form.Field name="allowanceConfig">
                {(field) => (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {field.state.value.map(
                        (allowance: any, index: number) => (
                          <div
                            key={allowance.id}
                            className="relative flex flex-col gap-1.5 p-3 border rounded-lg bg-card  hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <form.Field
                                name={`allowanceConfig[${index}].name` as any}
                              >
                                {(nameField) => (
                                  <Input
                                    value={nameField.state.value as string}
                                    onChange={(e) =>
                                      nameField.handleChange(
                                        e.target.value as any,
                                      )
                                    }
                                    placeholder="Allowance Name"
                                    className="h-7 text-xs font-semibold border-transparent px-1 hover:border-border focus-visible:ring-1 bg-transparent w-full shadow-none"
                                  />
                                )}
                              </form.Field>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0 ml-1 opacity-50 hover:opacity-100"
                                onClick={() =>
                                  form.removeFieldValue(
                                    "allowanceConfig",
                                    index,
                                  )
                                }
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>

                            <form.Field
                              name={`allowanceConfig[${index}].amount` as any}
                            >
                              {(amountField) => (
                                <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      PKR
                                    </span>
                                  </div>
                                  <Input
                                    type="number"
                                    value={
                                      amountField.state.value === 0
                                        ? ""
                                        : (amountField.state.value as number)
                                    }
                                    onChange={(e) =>
                                      amountField.handleChange(
                                        (e.target.value === ""
                                          ? 0
                                          : Number(e.target.value)) as any,
                                      )
                                    }
                                    className="h-9 pl-10 text-sm font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              )}
                            </form.Field>
                          </div>
                        ),
                      )}
                    </div>
                  </>
                )}
              </form.Field>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={form.state.isSubmitting}
            className="w-full h-11"
          >
            {form.state.isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              "Update Employee Records"
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
};
