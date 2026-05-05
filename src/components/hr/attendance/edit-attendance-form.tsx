import { useEffect, useRef } from "react";
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
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { upsertAttendanceSchema } from "@/lib/validators/hr-validators";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ── TimeInput ──────────────────────────────────────────────────────────────

const TimeInput = ({
  value,
  onChange,
  className,
}: {
  value: string | null;
  onChange: (val: string | null) => void;
  className?: string;
}) => {
  return (
    <div className="relative">
      <Input
        type="time"
        value={value || ""}
        onChange={(e) => onChange(e.target.value || null)}
        className={cn(
          "h-9 pl-8 text-[13px] bg-background border-border/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary/20",
          "[&::-webkit-calendar-picker-indicator]:opacity-100",
          "[&::-webkit-calendar-picker-indicator]:bg-transparent",
          "[&::-webkit-calendar-picker-indicator]:absolute",
          "[&::-webkit-calendar-picker-indicator]:right-2",
          "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
          className,
        )}
      />
      <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none transition-colors group-focus-within:text-primary" />
    </div>
  );
};

// ── Types ──────────────────────────────────────────────────────────────────

interface AttendanceData {
  checkIn?: string | null;
  checkOut?: string | null;
  checkIn2?: string | null;
  checkOut2?: string | null;
  overtimeHours?: string | null;
  dutyHours?: string | null;
  leaveType?: "sick" | "casual" | "annual" | "unpaid" | "special" | null;
  status: "present" | "absent" | "leave" | "holiday";
  isLate?: boolean | null;
  isNightShift?: boolean | null;
  isApprovedLeave?: boolean | null;
  leaveApprovalStatus?: "none" | "pending" | "approved" | "rejected" | null;
  overtimeStatus?: "pending" | "approved" | "rejected" | null;
  overtimeRemarks?: string | null;
  entrySource?: "biometric" | "manual" | null;
  notes?: string | null;
}

interface Props {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    standardDutyHours?: number | null;
    isOrderBooker?: boolean | null;
  };
  attendance?: AttendanceData | null;
  date: string;
  onSuccess: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const calculateHours = (
  in1?: string | null,
  out1?: string | null,
  in2?: string | null,
  out2?: string | null,
): number | null => {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const getMinsDiff = (
    startStr?: string | null,
    endStr?: string | null,
  ): number => {
    if (!startStr || !endStr) return 0;
    const s = toMin(startStr);
    const e = toMin(endStr);
    return e >= s ? e - s : 24 * 60 - s + e;
  };

  const totalMins = getMinsDiff(in1, out1) + getMinsDiff(in2, out2);
  return totalMins > 0 ? totalMins / 60 : null;
};

const statusConfig = {
  present: {
    label: "Present",
    color: "text-emerald-600 dark:text-emerald-500",
  },
  leave: { label: "On Leave", color: "text-amber-600 dark:text-amber-500" },
  absent: { label: "Absent", color: "text-rose-600 dark:text-rose-500" },
  holiday: {
    label: "Official Holiday",
    color: "text-blue-600 dark:text-blue-500",
  },
} as const;

// ── Auto-populate hook ─────────────────────────────────────────────────────

interface AutoPopulateProps {
  form: any;
  standardDutyHours: number;
}

const AutoPopulate = ({ form, standardDutyHours }: AutoPopulateProps) => {
  return (
    <form.Subscribe
      selector={(s: any) => [
        s.values.checkIn,
        s.values.checkOut,
        s.values.checkIn2,
        s.values.checkOut2,
        s.values.status,
      ]}
    >
      {([ci1, co1, ci2, co2, status]: any[]) => (
        <AutoPopulateEffect
          form={form}
          ci1={ci1}
          co1={co1}
          ci2={ci2}
          co2={co2}
          status={status}
          standardDutyHours={standardDutyHours}
        />
      )}
    </form.Subscribe>
  );
};

const AutoPopulateEffect = ({
  form,
  ci1,
  co1,
  ci2,
  co2,
  status,
  standardDutyHours,
}: {
  form: any;
  ci1: string | null;
  co1: string | null;
  ci2: string | null;
  co2: string | null;
  status: string;
  standardDutyHours: number;
}) => {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (status === "absent" || status === "holiday") {
      form.setFieldValue("dutyHours", "0");
      form.setFieldValue("overtimeHours", "0");
      form.setFieldValue("leaveApprovalStatus", "none");
      return;
    }

    if (status === "leave") {
      form.setFieldValue("dutyHours", "0");
      form.setFieldValue("overtimeHours", "0");
      const currentLeaveStatus = form.getFieldValue("leaveApprovalStatus");
      if (!currentLeaveStatus || currentLeaveStatus === "none") {
        form.setFieldValue("leaveApprovalStatus", "pending");
      }
      return;
    }

    form.setFieldValue("leaveApprovalStatus", "none");

    const std = standardDutyHours || 8;
    const totalHours = calculateHours(ci1, co1, ci2, co2);

    if (totalHours !== null) {
      if (totalHours > std) {
        const overtime = totalHours - std;
        form.setFieldValue("dutyHours", std.toFixed(2));
        form.setFieldValue("overtimeHours", overtime.toFixed(2));

        const currentOTStatus = form.getFieldValue("overtimeStatus");
        if (!currentOTStatus || currentOTStatus === "rejected") {
          form.setFieldValue("overtimeStatus", "pending");
        }
      } else {
        form.setFieldValue("dutyHours", totalHours.toFixed(2));
        form.setFieldValue("overtimeHours", "0");
        form.setFieldValue("overtimeStatus", null);
        form.setFieldValue("overtimeRemarks", null);
      }
    } else if (status === "present") {
      if (!form.getFieldValue("dutyHours")) {
        form.setFieldValue("dutyHours", std.toFixed(2));
      }
      if (!form.getFieldValue("overtimeHours")) {
        form.setFieldValue("overtimeHours", "0");
      }
    }
  }, [ci1, co1, ci2, co2, status, standardDutyHours]);

  return null;
};

// ── Form ───────────────────────────────────────────────────────────────────

export const EditAttendanceForm = ({
  employee,
  attendance,
  date,
  onSuccess,
}: Props) => {
  const mutate = useUpsertAttendance();
  const std = employee.standardDutyHours || 8;

  const form = useForm({
    defaultValues: {
      employeeId: employee.id,
      date: date,
      status: (attendance?.status || "present") as
        | "present"
        | "absent"
        | "leave"
        | "holiday",
      leaveType: (attendance?.leaveType ?? null) as
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
      isLate: attendance?.isLate ?? false,
      isNightShift: attendance?.isNightShift ?? false,
      isApprovedLeave: attendance?.isApprovedLeave ?? false,
      overtimeRemarks: attendance?.overtimeRemarks ?? null,
      overtimeStatus: (attendance?.overtimeStatus ?? "pending") as
        | "pending"
        | "approved"
        | "rejected",
      entrySource: (attendance?.entrySource ?? "manual") as
        | "biometric"
        | "manual",
      dutyHours: attendance?.dutyHours ?? null,
      leaveApprovalStatus: attendance?.leaveApprovalStatus ?? "none",
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
      className="space-y-0 py-1"
    >
      <AutoPopulate form={form} standardDutyHours={std} />

      <FieldGroup className="space-y-0 divide-y divide-border/40">
        {/* ── Section: Status ─────────────────────────────────────────── */}
        <SectionBlock icon={CalendarDays} label="Attendance Status">
          <form.Field name="status">
            {(field) => (
              <Field className="space-y-1.5">
                <FieldLabel className="sr-only">Status</FieldLabel>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 rounded-lg bg-muted/40 border border-border/50">
                  {(["present", "leave", "absent", "holiday"] as const).map(
                    (s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => field.handleChange(s)}
                        className={cn(
                          "rounded-md py-1.5 text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          field.state.value === s
                            ? `bg-background  border border-border/40 ${statusConfig[s].color}`
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent",
                        )}
                      >
                        {statusConfig[s].label}
                      </button>
                    ),
                  )}
                </div>
                <FieldError
                  errors={field.state.meta.errors}
                  className="text-[11px]"
                />
              </Field>
            )}
          </form.Field>

          <form.Subscribe selector={(s: any) => s.values.status}>
            {(status: string) =>
              status === "leave" && (
                <div className="mt-4 space-y-4 animate-in fade-in duration-300">
                  <form.Field name="leaveType">
                    {(field) => (
                      <Field className="space-y-1.5">
                        <FieldLabel className="text-[13px] font-medium text-foreground/90">
                          Leave Type <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Select
                          value={field.state.value || ""}
                          onValueChange={(v: any) =>
                            field.handleChange(v || null)
                          }
                        >
                          <SelectTrigger className="h-9 text-[13px] bg-background border-border/60 transition-colors focus:ring-2 focus:ring-primary/20">
                            <SelectValue placeholder="Select leave type…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectOption value="annual">
                              Annual Leave
                            </SelectOption>
                            <SelectOption value="sick">Sick Leave</SelectOption>
                            <SelectOption value="special">
                              Special Leave
                            </SelectOption>
                          </SelectContent>
                        </Select>
                        <FieldError
                          errors={field.state.meta.errors}
                          className="text-[11px]"
                        />
                      </Field>
                    )}
                  </form.Field>

                  <form.Field name="isApprovedLeave">
                    {() => (
                      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
                        <Info className="size-4 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                        <div className="space-y-0.5">
                          <p className="text-[13px] font-medium text-amber-800 dark:text-amber-400">
                            Pending Admin Approval
                          </p>
                          <p className="text-[12.5px] text-amber-700/80 dark:text-amber-500/80 leading-relaxed">
                            This leave request will be routed to an
                            administrator. Salary deductions and Bradford Factor
                            updates are finalized upon approval.
                          </p>
                        </div>
                      </div>
                    )}
                  </form.Field>
                </div>
              )
            }
          </form.Subscribe>
        </SectionBlock>

        {/* ── Section: Time Tracking ──────────────────────────────────── */}
        {!employee.isOrderBooker && (
          <form.Subscribe selector={(s: any) => s.values.status}>
            {(status: string) => {
              const blocked = ["absent", "holiday", "leave"].includes(status);

              return (
                <SectionBlock icon={Clock} label="Shift Timings">
                  {blocked ? (
                    <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border/50 bg-muted/30 animate-in fade-in duration-300">
                      <Info className="size-4 text-muted-foreground shrink-0" />
                      <p className="text-[13px] text-muted-foreground">
                        Time tracking is disabled for the{" "}
                        <strong className="text-foreground">
                          {statusConfig[status as keyof typeof statusConfig]
                            ?.label || status}
                        </strong>{" "}
                        status.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      <form.Field name="entrySource">
                        {(field) => (
                          <Field className="space-y-2">
                            <FieldLabel className="text-[13px] font-medium text-foreground/90">
                              Entry Source
                            </FieldLabel>
                            <div className="flex p-1 rounded-lg bg-muted/40 border border-border/50">
                              {[
                                { value: "biometric", label: "Biometric" },
                                { value: "manual", label: "Manual Entry" },
                              ].map(({ value, label }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() =>
                                    field.handleChange(value as any)
                                  }
                                  className={cn(
                                    "flex-1 rounded-md py-1.5 text-[13px] font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    field.state.value === value
                                      ? "bg-background text-foreground  border border-border/40"
                                      : "text-muted-foreground hover:text-foreground border border-transparent",
                                  )}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </Field>
                        )}
                      </form.Field>

                      <Separator className="opacity-50" />

                      <div>
                        <p className="text-[13px] font-medium text-foreground/90 mb-2">
                          Primary Shift
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <form.Field name="checkIn">
                            {(field) => (
                              <Field className="space-y-1">
                                <FieldLabel className="text-[12px] text-muted-foreground">
                                  Start Time
                                </FieldLabel>
                                <TimeInput
                                  value={field.state.value}
                                  onChange={field.handleChange}
                                />
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name="checkOut">
                            {(field) => (
                              <Field className="space-y-1">
                                <FieldLabel className="text-[12px] text-muted-foreground">
                                  End Time
                                </FieldLabel>
                                <TimeInput
                                  value={field.state.value}
                                  onChange={field.handleChange}
                                />
                              </Field>
                            )}
                          </form.Field>
                        </div>
                      </div>

                      <div>
                        <p className="text-[13px] font-medium text-foreground/90 mb-2">
                          Secondary Shift{" "}
                          <span className="font-normal text-muted-foreground ml-1">
                            (Optional Split)
                          </span>
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <form.Field name="checkIn2">
                            {(field) => (
                              <Field className="space-y-1">
                                <FieldLabel className="text-[12px] text-muted-foreground">
                                  Start Time
                                </FieldLabel>
                                <TimeInput
                                  value={field.state.value}
                                  onChange={field.handleChange}
                                />
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name="checkOut2">
                            {(field) => (
                              <Field className="space-y-1">
                                <FieldLabel className="text-[12px] text-muted-foreground">
                                  End Time
                                </FieldLabel>
                                <TimeInput
                                  value={field.state.value}
                                  onChange={field.handleChange}
                                />
                              </Field>
                            )}
                          </form.Field>
                        </div>
                      </div>

                      <Separator className="opacity-50" />

                      <div className="grid grid-cols-2 gap-3">
                        <form.Field name="dutyHours">
                          {(field) => (
                            <Field className="space-y-1">
                              <FieldLabel className="text-[13px] font-medium text-foreground/90">
                                Duty Hours
                              </FieldLabel>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder={`e.g. ${std}.00`}
                                value={field.state.value || ""}
                                onChange={(e) =>
                                  field.handleChange(e.target.value || null)
                                }
                                className="h-9 text-[13px] transition-colors bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-emerald-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </Field>
                          )}
                        </form.Field>

                        <form.Field name="overtimeHours">
                          {(field) => (
                            <Field className="space-y-1">
                              <FieldLabel className="text-[13px] font-medium text-foreground/90">
                                Overtime
                              </FieldLabel>
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="0.00"
                                value={field.state.value || ""}
                                onChange={(e) =>
                                  field.handleChange(e.target.value || null)
                                }
                                className="h-9 text-[13px] transition-colors bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-amber-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </Field>
                          )}
                        </form.Field>
                      </div>

                      <form.Subscribe
                        selector={(s: any) =>
                          parseFloat(s.values.overtimeHours || "0") > 0
                        }
                      >
                        {(hasOT: boolean) =>
                          hasOT && (
                            <div className="space-y-4 p-4 rounded-lg border border-amber-200/60 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 animate-in fade-in duration-300">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="size-4 text-amber-600 dark:text-amber-500 shrink-0" />
                                <span className="text-[13px] font-semibold text-amber-800 dark:text-amber-400">
                                  Overtime Approval Required
                                </span>
                              </div>

                              <form.Field name="overtimeRemarks">
                                {(field) => (
                                  <Field className="space-y-1.5">
                                    <FieldLabel className="text-[12.5px] font-medium text-amber-900/90 dark:text-amber-300/90">
                                      Reason{" "}
                                      <span className="text-destructive">
                                        *
                                      </span>
                                    </FieldLabel>
                                    <Textarea
                                      placeholder="Describe why overtime was necessary..."
                                      className="min-h-[70px] text-[13px] resize-none transition-colors focus-visible:ring-amber-500/30 border-amber-200/60 dark:border-amber-800/60 bg-background"
                                      value={field.state.value || ""}
                                      onChange={(e) =>
                                        field.handleChange(
                                          e.target.value || null,
                                        )
                                      }
                                    />
                                    <FieldError
                                      errors={field.state.meta.errors}
                                      className="text-[11px]"
                                    />
                                  </Field>
                                )}
                              </form.Field>

                              <form.Field name="overtimeStatus">
                                {(field) => (
                                  <div className="flex items-center justify-between border-t border-amber-200/50 dark:border-amber-800/50 pt-3">
                                    <div className="text-[12.5px] font-medium text-amber-800/70 dark:text-amber-500/80">
                                      Approval Status
                                    </div>
                                    <OTStatusBadge
                                      status={field.state.value as any}
                                    />
                                  </div>
                                )}
                              </form.Field>
                              <p className="text-[12px] text-amber-700/70 dark:text-amber-500/70 leading-relaxed">
                                Overtime pay is calculated only for Approved
                                records. Status is managed by administrators.
                              </p>
                            </div>
                          )
                        }
                      </form.Subscribe>

                      <Separator className="opacity-50" />

                      <div className="grid grid-cols-2 gap-3">
                        <form.Field name="isLate">
                          {(field) => (
                            <FlagToggle
                              id="isLateEdit"
                              checked={!!field.state.value}
                              onCheckedChange={(c) => field.handleChange(!!c)}
                              label="Late Arrival"
                              colorClass="border-rose-200 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400"
                            />
                          )}
                        </form.Field>

                        <form.Field name="isNightShift">
                          {(field) => (
                            <FlagToggle
                              id="isNightShiftEdit"
                              checked={!!field.state.value}
                              onCheckedChange={(c) => field.handleChange(!!c)}
                              label="Night Shift"
                              colorClass="border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400"
                            />
                          )}
                        </form.Field>
                      </div>
                    </div>
                  )}
                </SectionBlock>
              );
            }}
          </form.Subscribe>
        )}

        {/* ── Section: Notes ──────────────────────────────────────────── */}
        <SectionBlock icon={StickyNote} label="Internal Notes">
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel className="sr-only">Notes</FieldLabel>
                <Textarea
                  placeholder="Add any specific observations, corrections, or context..."
                  className="min-h-[90px] text-[13px] resize-none bg-background border-border/60 focus-visible:ring-2 focus-visible:ring-primary/20 transition-colors"
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(e.target.value || null)}
                />
              </Field>
            )}
          </form.Field>
        </SectionBlock>
      </FieldGroup>

      {/* ── Submit ──────────────────────────────────────────────────────── */}
      <div className="pt-6 pb-2">
        <form.Subscribe selector={(s: any) => s.isSubmitting}>
          {(isSubmitting: boolean) => (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 text-[13px] font-medium rounded-lg  active:scale-[0.99] transition-all duration-200"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving Record...
                </>
              ) : (
                "Save Attendance Record"
              )}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────

const SectionBlock = ({
  icon: Icon,
  label,
  children,
}: {
  icon: any;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="py-5 first:pt-2 space-y-4">
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground shrink-0" />
      <h3 className="text-[13px] font-semibold text-foreground tracking-wide uppercase">
        {label}
      </h3>
    </div>
    <div>{children}</div>
  </div>
);

const FlagToggle = ({
  id,
  checked,
  onCheckedChange,
  label,
  colorClass,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (c: boolean) => void;
  label: string;
  colorClass?: string;
}) => (
  <label
    htmlFor={id}
    className={cn(
      "flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all duration-200 select-none",
      checked ? colorClass : "border-border/60 bg-background hover:bg-muted/30",
    )}
  >
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(c) => onCheckedChange(!!c)}
      className="data-[state=checked]:bg-current data-[state=checked]:border-current"
    />
    <span
      className={cn(
        "text-[13px] font-medium",
        !checked && "text-foreground/80",
      )}
    >
      {label}
    </span>
  </label>
);

const OTStatusBadge = ({
  status,
}: {
  status: "pending" | "approved" | "rejected" | null;
}) => {
  const config = {
    pending: {
      label: "Pending",
      className:
        "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800/60",
    },
    approved: {
      label: "Approved",
      className:
        "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800/60",
    },
    rejected: {
      label: "Rejected",
      className:
        "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:border-rose-800/60",
    },
  };
  const c = config[status || "pending"];
  return (
    <Badge
      className={cn("text-[11px] font-semibold px-2 py-0.5", c.className)}
      variant="outline"
    >
      {c.label}
    </Badge>
  );
};
