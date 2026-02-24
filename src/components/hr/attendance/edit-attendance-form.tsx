import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem as SelectOption,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUpsertAttendance } from "@/hooks/hr/use-upsert-attendance";
import {
  Loader2,
  Clock,
  StickyNote,
  Info,
  Cpu,
  PenLine,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertAttendanceSchema } from "@/lib/validators/hr-validators";
import { Separator } from "@/components/ui/separator";

interface AttendanceData {
  checkIn?: string | null;
  checkOut?: string | null;
  checkIn2?: string | null;
  checkOut2?: string | null;
  overtimeHours?: string | null;
  status: "present" | "absent" | "leave" | "half_day" | "holiday";
  isLate?: boolean | null;
  isNightShift?: boolean | null;
  isApprovedLeave?: boolean | null;
  overtimeStatus?: string | null;
  overtimeRemarks?: string | null;
  entrySource?: string | null;
  notes?: string | null;
}

interface Props {
  employee: { id: string; firstName: string; lastName: string };
  attendance?: AttendanceData | null;
  date: string;
  onSuccess: () => void;
}

export const EditAttendanceForm = ({
  employee,
  attendance,
  date,
  onSuccess,
}: Props) => {
  const mutate = useUpsertAttendance();

  const form = useForm({
    defaultValues: {
      employeeId: employee.id,
      date: date,
      status: (attendance?.status || "present") as
        | "present"
        | "absent"
        | "leave"
        | "half_day"
        | "holiday",
      leaveType: ((attendance as any)?.leaveType ?? null) as
        | "sick"
        | "casual"
        | "annual"
        | "unpaid"
        | "special"
        | null,
      checkIn: attendance?.checkIn ?? null,
      checkOut: attendance?.checkOut ?? null,
      checkIn2: attendance?.checkIn2 ?? null,
      checkOut2: attendance?.checkOut2 ?? null,
      overtimeHours: attendance?.overtimeHours ?? null,
      isLate: attendance?.isLate ?? null,
      isNightShift: attendance?.isNightShift ?? null,
      isApprovedLeave: attendance?.isApprovedLeave ?? null,
      overtimeRemarks: attendance?.overtimeRemarks ?? null,
      overtimeStatus: (attendance?.overtimeStatus ?? "pending") as
        | "pending"
        | "approved"
        | "rejected",
      entrySource: (attendance?.entrySource ?? "manual") as
        | "biometric"
        | "manual",
      notes: attendance?.notes ?? null,
    },
    onSubmit: async ({ value }) => {
      const payload = upsertAttendanceSchema.parse(value);
      await mutate.mutateAsync(
        { data: payload },
        { onSuccess: () => onSuccess() },
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
      className="space-y-5 py-2"
    >
      <FieldGroup>
        {/* ── Status ── */}
        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel>Attendance Status</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(v: any) => field.handleChange(v)}
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

        {/* ── Leave type + approval (only when status = leave) ── */}
        <form.Subscribe selector={(s) => s.values.status}>
          {(status) =>
            status === "leave" && (
              <div className="space-y-3 animate-in fade-in">
                {/* Leave Type selector */}
                <form.Field name="leaveType">
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        Leave Type <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Select
                        value={field.state.value || ""}
                        onValueChange={(v: any) =>
                          field.handleChange(v || null)
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select leave type…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectOption value="casual">
                            Casual Leave (balance tracked)
                          </SelectOption>
                          <SelectOption value="annual">
                            Annual Leave (balance tracked)
                          </SelectOption>
                          <SelectOption value="sick">
                            Sick Leave (no deduction; Bradford counted)
                          </SelectOption>
                          <SelectOption value="special">
                            Special Leave (Bradford counted)
                          </SelectOption>
                          <SelectOption value="unpaid">
                            Unpaid Leave (conveyance deducted)
                          </SelectOption>
                        </SelectContent>
                      </Select>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                {/* Approved / Paid Leave toggle */}
                <form.Field name="isApprovedLeave">
                  {(field) => (
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-indigo-50/40 dark:bg-indigo-900/10">
                      <Checkbox
                        id="isApprovedLeave"
                        checked={!!field.state.value}
                        onCheckedChange={(c) => field.handleChange(!!c)}
                        className="mt-0.5"
                      />
                      <div>
                        <FieldLabel
                          htmlFor="isApprovedLeave"
                          className="mb-0 cursor-pointer text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-tight"
                        >
                          Admin-Approved Paid Leave
                        </FieldLabel>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Tick if admin-approved. No salary deduction. Sick
                          leave is always no-deduction regardless.
                        </p>
                      </div>
                    </div>
                  )}
                </form.Field>
              </div>
            )
          }
        </form.Subscribe>

        {/* ── Time-tracking fields (hidden for absent/holiday) ── */}
        <form.Subscribe selector={(s) => s.values.status}>
          {(status) => {
            if (["absent", "holiday", "leave"].includes(status)) {
              return (
                <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30 animate-in fade-in zoom-in-95">
                  <Info className="size-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground font-medium">
                    Time tracking is disabled for {status} status.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4 animate-in slide-in-from-top-2">
                <Separator className="opacity-50" />

                {/* Entry source selector */}
                <form.Field name="entrySource">
                  {(field) => (
                    <Field>
                      <FieldLabel className="flex items-center gap-1.5">
                        <Cpu className="size-3.5 text-muted-foreground" /> Entry
                        Source
                      </FieldLabel>
                      <Select
                        value={field.state.value}
                        onValueChange={(v: any) => field.handleChange(v)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectOption value="biometric">
                            <span className="flex items-center gap-2">
                              <Cpu className="size-3.5" /> Biometric Machine
                            </span>
                          </SelectOption>
                          <SelectOption value="manual">
                            <span className="flex items-center gap-2">
                              <PenLine className="size-3.5" /> Manual Entry
                            </span>
                          </SelectOption>
                        </SelectContent>
                      </Select>
                      <FieldError errors={field.state.meta.errors} />
                    </Field>
                  )}
                </form.Field>

                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Clock className="size-4" />
                  <span className="text-sm uppercase tracking-wider">
                    Shift Timings
                  </span>
                </div>

                {/* Shift 1 */}
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="checkIn">
                    {(field) => (
                      <Field>
                        <FieldLabel>Shift 1 – Start</FieldLabel>
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
                        <FieldLabel>Shift 1 – End</FieldLabel>
                        <Input
                          type="time"
                          value={field.state.value || ""}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                {/* Shift 2 (always available, for split-shift employees) */}
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="checkIn2">
                    {(field) => (
                      <Field>
                        <FieldLabel>
                          Shift 2 – Start{" "}
                          <span className="text-muted-foreground text-[10px]">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          type="time"
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="checkOut2">
                    {(field) => (
                      <Field>
                        <FieldLabel>
                          Shift 2 – End{" "}
                          <span className="text-muted-foreground text-[10px]">
                            (optional)
                          </span>
                        </FieldLabel>
                        <Input
                          type="time"
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                {/* Overtime hours */}
                <div className="grid grid-cols-1 gap-4">
                  <form.Field name="overtimeHours">
                    {(field) => (
                      <Field>
                        <FieldLabel>Overtime Hours</FieldLabel>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="e.g. 1.5"
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(e.target.value || null)
                          }
                          className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </Field>
                    )}
                  </form.Field>
                </div>

                {/* Overtime remarks + approval (shown when overtime is entered) */}
                <form.Subscribe
                  selector={(s) =>
                    parseFloat(s.values.overtimeHours || "0") > 0
                  }
                >
                  {(hasOT) =>
                    hasOT && (
                      <div className="space-y-3 p-3 rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-900/10 animate-in fade-in">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-xs uppercase tracking-tight">
                          <AlertCircle className="size-3.5" /> Overtime Approval
                          Required
                        </div>

                        <form.Field name="overtimeRemarks">
                          {(field) => (
                            <Field>
                              <FieldLabel>
                                Overtime Reason{" "}
                                <span className="text-destructive">*</span>
                              </FieldLabel>
                              <Textarea
                                placeholder="Reason for overtime (required before admin approval)..."
                                className="min-h-[70px] resize-none text-sm"
                                value={field.state.value || ""}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                              />
                              <FieldError errors={field.state.meta.errors} />
                            </Field>
                          )}
                        </form.Field>

                        <form.Field name="overtimeStatus">
                          {(field) => (
                            <Field>
                              <FieldLabel className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5" /> Approval
                                Status
                              </FieldLabel>
                              <Select
                                value={field.state.value || "pending"}
                                onValueChange={(v: any) =>
                                  field.handleChange(v)
                                }
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectOption value="pending">
                                    Pending Admin Approval
                                  </SelectOption>
                                  <SelectOption value="approved">
                                    Approved
                                  </SelectOption>
                                  <SelectOption value="rejected">
                                    Rejected
                                  </SelectOption>
                                </SelectContent>
                              </Select>
                              <p className="text-[11px] text-muted-foreground">
                                Overtime pay is only calculated for{" "}
                                <strong>Approved</strong> records.
                              </p>
                            </Field>
                          )}
                        </form.Field>
                      </div>
                    )
                  }
                </form.Subscribe>

                {/* Flags */}
                <div className="flex gap-4">
                  <form.Field name="isLate">
                    {(field) => (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-rose-50/30 dark:bg-rose-900/10 flex-1">
                        <Checkbox
                          id="isLateEdit"
                          checked={!!field.state.value}
                          onCheckedChange={(c) => field.handleChange(!!c)}
                        />
                        <FieldLabel
                          htmlFor="isLateEdit"
                          className="mb-0 cursor-pointer text-rose-700 dark:text-rose-400 font-bold text-xs uppercase tracking-tight"
                        >
                          Late Arrival
                        </FieldLabel>
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="isNightShift">
                    {(field) => (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg border bg-indigo-50/30 dark:bg-indigo-900/10 flex-1">
                        <Checkbox
                          id="isNightShiftEdit"
                          checked={!!field.state.value}
                          onCheckedChange={(c) => field.handleChange(!!c)}
                        />
                        <FieldLabel
                          htmlFor="isNightShiftEdit"
                          className="mb-0 cursor-pointer text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase tracking-tight"
                        >
                          Night Shift
                        </FieldLabel>
                      </div>
                    )}
                  </form.Field>
                </div>
              </div>
            );
          }}
        </form.Subscribe>

        <Separator className="opacity-50" />

        {/* Notes */}
        <form.Field name="notes">
          {(field) => (
            <Field>
              <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                <StickyNote className="size-4" />
                <span className="text-sm uppercase tracking-wider">
                  Internal Notes
                </span>
              </div>
              <Textarea
                placeholder="Add any specific observations or reasons..."
                className="min-h-[80px] resize-none"
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
