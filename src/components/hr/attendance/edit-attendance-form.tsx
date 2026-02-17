import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldError, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectValue, SelectTrigger, SelectItem as SelectOption } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertAttendance } from "@/hooks/hr/use-upsert-attendance";
import { Loader2, Clock, StickyNote, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertAttendanceSchema } from "@/lib/validators/hr-validators";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface Props {
    employee: { id: string; firstName: string; lastName: string; isOperator: boolean };
    attendance?: {
        checkIn?: string | null;
        checkOut?: string | null;
        checkIn2?: string | null;
        checkOut2?: string | null;
        status: "present" | "absent" | "leave" | "half_day" | "holiday";
        isLate?: boolean | null;
        notes?: string | null;
    } | null;
    date: string;
    onSuccess: () => void;
}

export const EditAttendanceForm = ({ employee, attendance, date, onSuccess }: Props) => {
    const mutate = useUpsertAttendance();

    const form = useForm({
        defaultValues: {
            employeeId: employee.id,
            date: date,
            status: attendance?.status || "present",
            checkIn: attendance?.checkIn ?? null,
            checkOut: attendance?.checkOut ?? null,
            checkIn2: attendance?.checkIn2 ?? null,
            checkOut2: attendance?.checkOut2 ?? null,
            isLate: attendance?.isLate ?? null,
            notes: attendance?.notes ?? null,
        },
        validators: {
            onSubmit: upsertAttendanceSchema,
        },
        onSubmit: async ({ value }) => {
            const payload = {
                ...value,
                checkIn: value.checkIn || null,
                checkOut: value.checkOut || null,
                checkIn2: value.checkIn2 || null,
                checkOut2: value.checkOut2 || null,
                notes: value.notes || null,
            };

            await mutate.mutateAsync(
                { data: payload },
                {
                    onSuccess: () => {
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
            className="space-y-6 py-2"
        >
            <FieldGroup>
                {/* Status Selection */}
                <form.Field name="status">
                    {(field) => (
                        <Field>
                            <FieldLabel>Attendance Status</FieldLabel>
                            <Select
                                value={field.state.value}
                                onValueChange={(val: any) => field.handleChange(val)}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectOption value="present">Present</SelectOption>
                                    <SelectOption value="absent">Absent</SelectOption>
                                    <SelectOption value="leave">On Leave</SelectOption>
                                    <SelectOption value="half_day">Half Day</SelectOption>
                                    <SelectOption value="holiday">Official Holiday</SelectOption>
                                </SelectContent>
                            </Select>
                            <FieldError errors={field.state.meta.errors} />
                        </Field>
                    )}
                </form.Field>

                <form.Subscribe
                    selector={(state) => state.values.status}
                    children={(status) => {
                        if (status === "absent" || status === "holiday") {
                            return (
                                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 animate-in fade-in zoom-in-95">
                                    <Info className="size-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground font-medium">
                                        Time tracking is disabled for {status} status.
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <Separator className="opacity-50" />
                                <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                                    <Clock className="size-4" />
                                    <span className="text-sm uppercase tracking-wider">Shift Timings</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <form.Field name="checkIn">
                                        {(field) => (
                                            <Field>
                                                <FieldLabel>Shift 1 (Start)</FieldLabel>
                                                <Input
                                                    type="time"
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                            </Field>
                                        )}
                                    </form.Field>
                                    <form.Field name="checkOut">
                                        {(field) => (
                                            <Field>
                                                <FieldLabel>Shift 1 (End)</FieldLabel>
                                                <Input
                                                    type="time"
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                            </Field>
                                        )}
                                    </form.Field>
                                </div>

                                {employee.isOperator && (
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <form.Field name="checkIn2">
                                            {(field) => (
                                                <Field>
                                                    <FieldLabel>Shift 2 (Start)</FieldLabel>
                                                    <Input
                                                        type="time"
                                                        value={field.state.value || ""}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                    />
                                                </Field>
                                            )}
                                        </form.Field>
                                        <form.Field name="checkOut2">
                                            {(field) => (
                                                <Field>
                                                    <FieldLabel>Shift 2 (End)</FieldLabel>
                                                    <Input
                                                        type="time"
                                                        value={field.state.value || ""}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                    />
                                                </Field>
                                            )}
                                        </form.Field>
                                    </div>
                                )}

                                <form.Field name="isLate">
                                    {(field) => (
                                        <div className="flex items-center gap-2 p-3 rounded-lg border bg-rose-50/30 dark:bg-rose-900/10">
                                            <Checkbox
                                                id="isLateEdit"
                                                checked={!!field.state.value}
                                                onCheckedChange={(checked) => field.handleChange(!!checked)}
                                            />
                                            <FieldLabel htmlFor="isLateEdit" className="mb-0 cursor-pointer text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-tighter">
                                                Mark as Tardy/Late Arrival
                                            </FieldLabel>
                                        </div>
                                    )}
                                </form.Field>
                            </div>
                        );
                    }}
                />

                <Separator className="opacity-50" />

                <form.Field name="notes">
                    {(field) => (
                        <Field>
                            <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                                <StickyNote className="size-4" />
                                <span className="text-sm uppercase tracking-wider">Internal Notes</span>
                            </div>
                            <Textarea
                                placeholder="Add any specific observations or reasons..."
                                className="min-h-[100px] resize-none"
                                value={field.state.value || ""}
                                onChange={(e) => field.handleChange(e.target.value)}
                            />
                        </Field>
                    )}
                </form.Field>

                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={form.state.isSubmitting}
                        className="w-full h-11"
                    >
                        {form.state.isSubmitting ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                            "Save Attendance Record"
                        )}
                    </Button>
                </div>
            </FieldGroup>
        </form>
    );
};
