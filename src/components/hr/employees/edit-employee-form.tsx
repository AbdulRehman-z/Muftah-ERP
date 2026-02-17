import { useForm } from "@tanstack/react-form";
import { format, parseISO } from "date-fns";
import { useUpdateEmployee } from "@/hooks/hr/use-update-employee";
import { updateEmployeeSchema } from "@/lib/validators/hr-validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { getEmployeesFn } from "@/server-functions/hr/employees/get-employees-fn";
import { Loader2, UserCircle2, Briefcase, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/custom/date-picker";

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
            status: employee.status as "active" | "on_leave" | "terminated" | "resigned",
            employmentType: employee.employmentType as "full_time" | "part_time" | "contract" | "intern",
            phone: employee.phone || "",
            cnic: employee.cnic || "",
            address: employee.address || "",

            // Compensation
            basicSalary: employee.basicSalary,
            houseRentAllowance: employee.houseRentAllowance || "",
            utilitiesAllowance: employee.utilitiesAllowance || "",
            conveyanceAllowance: employee.conveyanceAllowance || "",
            bikeMaintenanceAllowance: employee.bikeMaintenanceAllowance || "",
            mobileAllowance: employee.mobileAllowance || "",
            fuelAllowance: employee.fuelAllowance || "",
            specialAllowance: employee.specialAllowance || "",
            incentivePercentage: employee.incentivePercentage || "",

            standardDutyHours: employee.standardDutyHours as 8 | 12,
            isOperator: employee.isOperator,
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
                {/* Identity Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <UserCircle2 className="size-4" />
                        <span className="text-sm uppercase tracking-wider">Identity Details</span>
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
                                        date={field.state.value ? parseISO(field.state.value) : undefined}
                                        onChange={(date) => field.handleChange(date ? format(date, "yyyy-MM-dd") : "")}
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
                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                </div>

                <Separator className="opacity-50" />

                {/* Job Role Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Briefcase className="size-4" />
                        <span className="text-sm uppercase tracking-wider">Assigned Role</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <form.Field name="standardDutyHours">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Standard Duty Hours</FieldLabel>
                                    <Select
                                        value={String(field.state.value)}
                                        onValueChange={(val) => field.handleChange(Number(val) as 8 | 12)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="8">8 Hours Shift</SelectItem>
                                            <SelectItem value="12">12 Hours Shift</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </Field>
                            )}
                        </form.Field>
                        <div className="h-[42px] flex items-end pb-1.5">
                            <form.Field name="isOperator">
                                {(field) => (
                                    <div className="flex items-center gap-2 h-10 px-3 rounded-lg border bg-muted/20 w-full">
                                        <Checkbox
                                            id="isOpEdit"
                                            checked={!!field.state.value}
                                            onCheckedChange={(checked) => field.handleChange(!!checked)}
                                        />
                                        <FieldLabel htmlFor="isOpEdit" className="cursor-pointer text-xs mb-0">Production Operator</FieldLabel>
                                    </div>
                                )}
                            </form.Field>
                        </div>
                    </div>
                </div>


                <Separator className="opacity-50" />

                {/* Compensation Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary font-semibold">
                        <Wallet className="size-4" />
                        <span className="text-sm uppercase tracking-wider">Salary & Allowances</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <form.Field name="basicSalary">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Basic Salary</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="houseRentAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>House Rent</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <form.Field name="utilitiesAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Utilities</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="conveyanceAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Conveyance</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <form.Field name="mobileAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Mobile</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="bikeMaintenanceAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Bike Maint.</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="fuelAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Fuel</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <form.Field name="incentivePercentage">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Incentive (%)</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
                        <form.Field name="specialAllowance">
                            {(field) => (
                                <Field>
                                    <FieldLabel>Special Allowance</FieldLabel>
                                    <Input
                                        type="number"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </Field>
                            )}
                        </form.Field>
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
        </form >
    );
};
