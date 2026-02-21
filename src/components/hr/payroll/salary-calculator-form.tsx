import { useForm, useStore } from "@tanstack/react-form";
import { Loader2, Plus, Trash2, AlertCircle, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { usePreviewPayslip } from "@/hooks/hr/use-preview-payslip";
import { useSavePayslip } from "@/hooks/hr/use-save-payslip";
import { format, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import React, { useState, type ChangeEvent } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SalaryCalculatorFormProps = {
    employeeId: string;
    month: string;
    onSuccess: () => void;
    isOpen: boolean;
};

export const SalaryCalculatorForm = ({ employeeId, month, onSuccess, isOpen }: SalaryCalculatorFormProps) => {
    const [activeTab, setActiveTab] = useState("overview");

    // Save Mutation
    const saveMutation = useSavePayslip(onSuccess);

    const form = useForm({
        defaultValues: {
            bonus: "",
            incentive: "",
            tax: "",
            advance: "",
            overtimeMultiplier: "1.5",
            manualDeductions: [] as { description: string; amount: string }[],
        },
        onSubmit: async () => {
            // Logic handled in handleSave
        },
    });

    // Watch form values for preview
    const formValues = useStore(form.store, (state: any) => state.values);

    // Fetch Preview Calculation
    const { data: calculation, isFetching, isLoading, isError, error } = usePreviewPayslip({
        employeeId: employeeId,
        month,
        manualDeductions: formValues.manualDeductions.map((d: any) => ({
            description: d.description,
            amount: parseFloat(d.amount) || 0
        })),
        additionalAmounts: {
            bonusAmount: parseFloat(formValues.bonus) || 0,
            incentiveAmount: parseFloat(formValues.incentive) || 0,
            taxDeduction: parseFloat(formValues.tax) || 0,
            advanceDeduction: parseFloat(formValues.advance) || 0,
            overtimeMultiplier: parseFloat(formValues.overtimeMultiplier) || 1.5,
        }
    }, isOpen);

    const handleAddArrears = () => {
        if (calculation?.missedLastMonth) {
            const arrears = Math.round(parseFloat(calculation.lastMonthStandardSalary));
            const currentIncentive = parseFloat(formValues.incentive) || 0;
            form.setFieldValue("incentive", (currentIncentive + arrears).toString());
        }
    };

    const handleSave = () => {
        if (!calculation) return;
        saveMutation.mutate({
            employeeId: employeeId,
            month,
            deductionConfig: {
                manualDeductions: formValues.manualDeductions.map((d: any) => ({
                    description: d.description,
                    amount: parseFloat(d.amount) || 0
                })),
                deductConveyanceOnLeave: true,
            },
            additionalAmounts: {
                bonusAmount: Math.round(parseFloat(formValues.bonus) || 0),
                incentiveAmount: Math.round(parseFloat(formValues.incentive) || 0),
                taxDeduction: Math.round(parseFloat(formValues.tax) || 0),
                advanceDeduction: Math.round(parseFloat(formValues.advance) || 0),
                overtimeMultiplier: parseFloat(formValues.overtimeMultiplier) || 1.5,
            }
        });
    };

    if (isLoading && !calculation) {
        return (
            <div className="flex flex-1 items-center justify-center min-h-[400px]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-4 bg-destructive/10 text-destructive rounded-md flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="size-4" />
                Error: {error?.message}
            </div>
        );
    }

    if (!calculation) return null;

    const totalAttendanceDeduction = calculation.absentDeduction + calculation.leaveDeduction;

    return (
        <div className="space-y-6 pb-20 relative">
            {/* Overlay loader for refetching */}
            {isFetching && calculation && (
                <div className="absolute top-0 right-0 p-2 z-50">
                    <Loader2 className="size-4 animate-spin text-primary opacity-70" />
                </div>
            )}

            {/* Header / Employee Summary */}
            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-muted/40">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Employee</p>
                        <p className="font-semibold text-sm">{calculation.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{calculation.designation}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-medium text-muted-foreground uppercase">Cycle</p>
                        <p className="font-semibold text-sm">{format(parseISO(calculation.startDate), "dd MMM")} - {format(parseISO(calculation.endDate), "dd MMM")}</p>
                        <p className="text-xs text-muted-foreground">{calculation.employeeCode}</p>
                    </div>
                </div>

                {/* Arrears Alert */}
                {calculation.missedLastMonth && (
                    <Alert className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800 font-semibold mb-1">Unpaid Cycle Detected</AlertTitle>
                        <AlertDescription className="text-amber-700 flex flex-col gap-2">
                            <p>This employee was not paid in the previous month. Amount: PKR {Math.round(parseFloat(calculation.lastMonthStandardSalary)).toLocaleString()}</p>
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-fit h-7 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                                onClick={handleAddArrears}
                            >
                                <Plus className="size-3 mr-1" />
                                Add as Incentive
                            </Button>
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                    <TabsTrigger value="adjustments">Adjustments</TabsTrigger>
                    <TabsTrigger value="calculations">Calculations</TabsTrigger>
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    {/* Basic Earnings Summary */}
                    <Card>
                        <CardHeader className="py-2 px-4 border-b bg-muted/30">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Earnings Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableBody>
                                    <SummaryRow
                                        label="Monthly Base Salary"
                                        value={Object.values(calculation.standardBreakdown).reduce((a, b) => a + b, 0)}
                                        tooltip="Sum of all fixed salary components"
                                    />
                                    <SummaryRow label="Fuel & Special Allowances" value={calculation.fuelAllowance + calculation.specialAllowance} />
                                    <SummaryRow label="Overtime Pay" value={calculation.overtimeAmount} highlight />
                                    <SummaryRow label="Bonus & Incentives" value={calculation.bonusAmount + calculation.incentiveAmount} highlight />
                                    <TableRow className="bg-muted/10 font-semibold">
                                        <TableCell className="py-2.5">Total Gross Earnings</TableCell>
                                        <TableCell className="text-right py-2.5 text-emerald-700">PKR {Math.round(calculation.grossSalary + totalAttendanceDeduction).toLocaleString()}</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* All Deductions Card */}
                    <Card>
                        <CardHeader className="py-2 px-4 border-b bg-muted/30">
                            <CardTitle className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Deductions Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableBody>
                                    <SummaryRow
                                        label="Absents & Short Sessions"
                                        value={totalAttendanceDeduction}
                                        isDeduction
                                        tooltip="Loss of pay due to missing days or short hours"
                                    />
                                    <SummaryRow label="Income Tax" value={calculation.taxDeduction} isDeduction />
                                    <SummaryRow label="Salary Advance Recovery" value={calculation.advanceDeduction} isDeduction />
                                    <SummaryRow label="Other Manual Deductions" value={calculation.otherDeduction} isDeduction />
                                    <TableRow className="bg-muted/10 font-semibold border-t">
                                        <TableCell className="py-2.5">Total Deductions</TableCell>
                                        <TableCell className="text-right py-2.5 text-rose-600">
                                            - PKR {Math.round(calculation.totalDeductions + totalAttendanceDeduction).toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Net Pay */}
                    <div className="flex items-center justify-between p-5 bg-primary/5 border border-primary/20 rounded-xl shadow-sm">
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wide">
                                Net Payable Amount
                            </p>
                            <p className="text-xs text-muted-foreground">Final amount to be credited to employee</p>
                        </div>
                        <div className="text-right">
                            <p className="text-3xl font-extrabold text-primary tracking-tight">PKR {Math.round(calculation.netSalary).toLocaleString()}</p>
                        </div>
                    </div>
                </TabsContent>

                {/* ATTENDANCE TAB */}
                <TabsContent value="attendance">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatCard
                            label="Total Job Days"
                            value={calculation.totalWorkingDays}
                            tooltip="Standard working days in this cycle (Mon-Fri)"
                        />
                        <StatCard
                            label="Present"
                            value={calculation.daysPresent}
                            className={cn(
                                "bg-emerald-50 border-emerald-100 text-emerald-700",
                                calculation.daysPresent > calculation.totalWorkingDays && "ring-2 ring-emerald-500 ring-offset-2"
                            )}
                            tooltip={calculation.daysPresent > calculation.totalWorkingDays ? "Includes working on weekends/holidays" : undefined}
                        />
                        <StatCard label="Absent" value={calculation.daysAbsent} className="bg-rose-50 border-rose-100 text-rose-700" />
                        <StatCard label="Leaves" value={calculation.daysLeave} className="bg-amber-50 border-amber-100 text-amber-700" />
                        <StatCard label="Short Days" value={calculation.daysHalfDay} />
                        <StatCard
                            label="Undertime (Hrs)"
                            value={calculation.totalUndertimeHours}
                            className={calculation.totalUndertimeHours > 0 ? "bg-amber-50 border-amber-100 text-amber-700" : ""}
                        />
                        <StatCard label="Overtime (Hrs)" value={calculation.totalOvertimeHours} className="bg-blue-50 border-blue-100 text-blue-700 md:col-span-1" />
                    </div>

                    {calculation.daysPresent > calculation.totalWorkingDays && (
                        <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs flex items-center gap-2">
                            <Info className="size-4 shrink-0" />
                            Employee worked {calculation.daysPresent - calculation.totalWorkingDays} extra days beyond the standard job cycle.
                        </div>
                    )}

                    <p className="text-[10px] text-center text-muted-foreground mt-8 border-t pt-2 uppercase font-medium tracking-widest">
                        Verified Attendance Records
                    </p>
                </TabsContent>

                {/* ADJUSTMENTS TAB */}
                <TabsContent value="adjustments" className="space-y-6">
                    <FieldGroup>
                        <form.Field name="overtimeMultiplier">
                            {(field) => (
                                <Field className="mb-4">
                                    <FieldLabel className="flex items-center gap-2">
                                        Overtime Multiplier Rate
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="size-3 text-muted-foreground" />
                                                </TooltipTrigger>
                                                <TooltipContent className="max-w-[200px] text-xs">
                                                    Standard is 1.5x of hourly basic rate. Change here if required.
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </FieldLabel>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        value={field.state.value}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                        placeholder="1.5"
                                        className="w-24 border-primary/30"
                                    />
                                </Field>
                            )}
                        </form.Field>

                        <Separator className="my-4" />

                        <div className="grid grid-cols-2 gap-4">
                            <form.Field name="bonus">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Bonus Amount</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                            placeholder="0"
                                        />
                                    </Field>
                                )}
                            </form.Field>
                            <form.Field name="incentive">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Incentive / Arrears</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                            placeholder="0"
                                        />
                                    </Field>
                                )}
                            </form.Field>
                            <form.Field name="tax">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Income Tax</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                            placeholder="0"
                                        />
                                    </Field>
                                )}
                            </form.Field>
                            <form.Field name="advance">
                                {(field) => (
                                    <Field>
                                        <FieldLabel>Salary Advance Deduction</FieldLabel>
                                        <Input
                                            type="number"
                                            value={field.state.value}
                                            onChange={(e: ChangeEvent<HTMLInputElement>) => field.handleChange(e.target.value)}
                                            placeholder="0"
                                        />
                                    </Field>
                                )}
                            </form.Field>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-medium">Other Manual Deductions</h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => form.pushFieldValue("manualDeductions", { description: "", amount: "" })}
                                    className="h-8 text-xs"
                                >
                                    <Plus className="size-3 mr-1" /> Add
                                </Button>
                            </div>

                            <form.Field name="manualDeductions">
                                {(field) => (
                                    <div className="space-y-3">
                                        {field.state.value.map((_, i) => (
                                            <div key={i} className="flex gap-2 items-start">
                                                <form.Field name={`manualDeductions[${i}].description`}>
                                                    {(subField) => (
                                                        <Input
                                                            placeholder="Description"
                                                            value={subField.state.value}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => subField.handleChange(e.target.value)}
                                                            className="flex-1"
                                                        />
                                                    )}
                                                </form.Field>
                                                <form.Field name={`manualDeductions[${i}].amount`}>
                                                    {(subField) => (
                                                        <Input
                                                            type="number"
                                                            placeholder="Amount"
                                                            value={subField.state.value}
                                                            onChange={(e: ChangeEvent<HTMLInputElement>) => subField.handleChange(e.target.value)}
                                                            className="w-24"
                                                        />
                                                    )}
                                                </form.Field>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="shrink-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => form.removeFieldValue("manualDeductions", i)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        ))}
                                        {field.state.value.length === 0 && <p className="text-xs text-muted-foreground italic">No manual deductions added.</p>}
                                    </div>
                                )}
                            </form.Field>
                        </div>
                    </FieldGroup>
                </TabsContent>

                {/* CALCULATIONS TAB */}
                <TabsContent value="calculations" className="space-y-5 text-sm">
                    {/* Step 0: Base Rates */}
                    <CalcSection step="Step 1" title="Base Rates" color="blue">
                        <CalcRow
                            label="Standard Salary (Contract)"
                            formula={`All components combined`}
                            result={`PKR ${Math.round(Object.values(calculation.standardBreakdown).reduce((a, b) => a + b, 0)).toLocaleString()}`}
                        />
                        <CalcRow
                            label="Total Working Days (this cycle)"
                            formula={`Mon–Fri days between ${format(parseISO(calculation.startDate), "dd MMM")} – ${format(parseISO(calculation.endDate), "dd MMM")}`}
                            result={`${calculation.totalWorkingDays} days`}
                        />
                        <CalcRow
                            label="Standard Duty Hours / Day"
                            formula="Configured per employee"
                            result={`${calculation.calculationMeta.standardDutyHours} hrs`}
                        />
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg space-y-1 font-mono text-xs">
                            <p className="text-blue-800 font-semibold mb-1">Derived Rates:</p>
                            <p>Per Day Basic = {Math.round(calculation.standardBreakdown.basicSalary).toLocaleString()} ÷ {calculation.totalWorkingDays} = <span className="font-bold">{calculation.calculationMeta.perDayBasic.toFixed(2)}</span></p>
                            <p>Per Hour Basic = {calculation.calculationMeta.perDayBasic.toFixed(2)} ÷ {calculation.calculationMeta.standardDutyHours} = <span className="font-bold">{calculation.calculationMeta.perHourBasic.toFixed(2)}</span></p>
                        </div>
                    </CalcSection>

                    {/* Step 2: Salary Component Breakdown */}
                    <CalcSection step="Step 2" title="Salary Component Breakdown" color="slate">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="bg-muted/40 text-muted-foreground">
                                        <th className="text-left py-1.5 px-2 font-semibold">Component</th>
                                        <th className="text-right py-1.5 px-2 font-semibold">Standard</th>
                                        <th className="text-right py-1.5 px-2 font-semibold text-rose-600">Deducted</th>
                                        <th className="text-right py-1.5 px-2 font-semibold text-emerald-700">Adjusted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {[
                                        { label: "Basic Salary (50%)", std: calculation.standardBreakdown.basicSalary, adj: calculation.basicSalary },
                                        { label: "House Rent (20%)", std: calculation.standardBreakdown.houseRentAllowance, adj: calculation.houseRentAllowance },
                                        { label: "Utilities (15%)", std: calculation.standardBreakdown.utilitiesAllowance, adj: calculation.utilitiesAllowance },
                                        { label: "Bike Maintenance (10%)", std: calculation.standardBreakdown.bikeMaintenanceAllowance, adj: calculation.bikeMaintenanceAllowance },
                                        { label: "Mobile Allowance (5%)", std: calculation.standardBreakdown.mobileAllowance, adj: calculation.mobileAllowance },
                                        { label: "Conveyance (fixed)", std: calculation.standardBreakdown.conveyanceAllowance, adj: calculation.conveyanceAllowance },
                                    ].map(({ label, std, adj }) => {
                                        const deducted = std - adj;
                                        return (
                                            <tr key={label} className="hover:bg-muted/20">
                                                <td className="py-1.5 px-2 text-muted-foreground">{label}</td>
                                                <td className="py-1.5 px-2 text-right font-mono">{Math.round(std).toLocaleString()}</td>
                                                <td className={`py-1.5 px-2 text-right font-mono ${deducted > 0 ? "text-rose-600" : "text-muted-foreground"}`}>
                                                    {deducted > 0 ? `- ${Math.round(deducted).toLocaleString()}` : "—"}
                                                </td>
                                                <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-700">{Math.round(adj).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                    {calculation.fuelAllowance > 0 && (
                                        <tr className="hover:bg-muted/20">
                                            <td className="py-1.5 px-2 text-muted-foreground">Fuel Allowance (fixed)</td>
                                            <td className="py-1.5 px-2 text-right font-mono">{Math.round(calculation.fuelAllowance).toLocaleString()}</td>
                                            <td className="py-1.5 px-2 text-right text-muted-foreground">—</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-700">{Math.round(calculation.fuelAllowance).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    {calculation.specialAllowance > 0 && (
                                        <tr className="hover:bg-muted/20">
                                            <td className="py-1.5 px-2 text-muted-foreground">Special Allowance (fixed)</td>
                                            <td className="py-1.5 px-2 text-right font-mono">{Math.round(calculation.specialAllowance).toLocaleString()}</td>
                                            <td className="py-1.5 px-2 text-right text-muted-foreground">—</td>
                                            <td className="py-1.5 px-2 text-right font-mono font-semibold text-emerald-700">{Math.round(calculation.specialAllowance).toLocaleString()}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-2 p-2.5 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Note:</span> Fuel & Special Allowances are never deducted for absences or leaves.
                        </div>
                    </CalcSection>

                    {/* Step 3: Attendance Deductions Breakdown */}
                    <CalcSection step="Step 3" title="Attendance Deduction Rules Applied" color="rose">
                        <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-3 gap-1 text-muted-foreground font-semibold border-b pb-1">
                                <span>Type</span><span className="text-center">Count</span><span className="text-right">Formula</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 items-center py-1 border-b border-dashed border-border/50">
                                <span className="font-medium">Full Day Absent</span>
                                <span className="text-center font-mono">{calculation.daysAbsent}×</span>
                                <span className="text-right text-muted-foreground font-mono">{calculation.daysAbsent} × Per Day (Basic+HRA+Util+Bike+Mobile)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 items-center py-1 border-b border-dashed border-border/50">
                                <span className="font-medium">Half Day</span>
                                <span className="text-center font-mono">{calculation.daysHalfDay}×</span>
                                <span className="text-right text-muted-foreground font-mono">{calculation.daysHalfDay} × 0.5 × Per Day (same 5 components)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 items-center py-1 border-b border-dashed border-border/50">
                                <span className="font-medium">Undertime</span>
                                <span className="text-center font-mono">{calculation.totalUndertimeHours} hrs</span>
                                <span className="text-right text-muted-foreground font-mono">{calculation.totalUndertimeHours} × {calculation.calculationMeta.perHourBasic.toFixed(2)} (Basic only)</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1 items-center py-1">
                                <span className="font-medium">Unpaid Leave</span>
                                <span className="text-center font-mono">{calculation.daysLeave}×</span>
                                <span className="text-right text-muted-foreground font-mono">{calculation.daysLeave} × Per Day Conveyance (only)</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-lg">
                            <span className="text-xs font-semibold text-rose-800">Total Attendance Deduction</span>
                            <span className="text-sm font-bold font-mono text-rose-700">- PKR {Math.round(calculation.absentDeduction + calculation.leaveDeduction).toLocaleString()}</span>
                        </div>
                    </CalcSection>

                    {/* Step 4: Overtime */}
                    {calculation.totalOvertimeHours > 0 && (
                        <CalcSection step="Step 4" title="Overtime Calculation" color="blue">
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg font-mono text-xs space-y-1 text-blue-900">
                                <p>OT Rate = Per Hour Basic × Multiplier</p>
                                <p className="font-bold">OT Rate = {calculation.calculationMeta.perHourBasic.toFixed(2)} × {calculation.calculationMeta.overtimeMultiplier} = {calculation.calculationMeta.overtimeRatePerHour.toFixed(2)} / hr</p>
                                <Separator className="my-1.5 bg-blue-200" />
                                <p>OT Pay = OT Rate × Total OT Hours</p>
                                <p className="font-bold">OT Pay = {calculation.calculationMeta.overtimeRatePerHour.toFixed(2)} × {calculation.totalOvertimeHours} hrs = PKR {Math.round(calculation.overtimeAmount).toLocaleString()}</p>
                            </div>
                            {calculation.calculationMeta.overtimeMultiplier !== 1.5 && (
                                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mt-2">
                                    ⚠ Custom multiplier ({calculation.calculationMeta.overtimeMultiplier}×) applied — standard is 1.5×
                                </p>
                            )}
                        </CalcSection>
                    )}

                    {/* Step 5: Gross Salary Build-up */}
                    <CalcSection step={calculation.totalOvertimeHours > 0 ? "Step 5" : "Step 4"} title="Gross Salary Build-up" color="emerald">
                        <div className="space-y-1 text-xs font-mono">
                            {[
                                { label: "Adjusted Basic", val: calculation.basicSalary },
                                { label: "Adjusted House Rent", val: calculation.houseRentAllowance },
                                { label: "Adjusted Utilities", val: calculation.utilitiesAllowance },
                                { label: "Adjusted Bike Maintenance", val: calculation.bikeMaintenanceAllowance },
                                { label: "Adjusted Mobile", val: calculation.mobileAllowance },
                                { label: "Adjusted Conveyance", val: calculation.conveyanceAllowance },
                                { label: "Fuel Allowance", val: calculation.fuelAllowance },
                                { label: "Special Allowance", val: calculation.specialAllowance },
                                { label: "Overtime Pay", val: calculation.overtimeAmount },
                                { label: "Night Shift Allowance", val: calculation.nightShiftAllowance },
                                { label: "Incentive / Arrears", val: calculation.incentiveAmount },
                                { label: "Bonus", val: calculation.bonusAmount },
                            ].filter(r => r.val > 0).map(({ label, val }) => (
                                <div key={label} className="flex justify-between py-0.5 border-b border-dashed border-border/40">
                                    <span className="text-muted-foreground">+ {label}</span>
                                    <span>{Math.round(val).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                            <span className="text-xs font-bold text-emerald-800">= GROSS SALARY</span>
                            <span className="text-base font-extrabold font-mono text-emerald-700">PKR {Math.round(calculation.grossSalary).toLocaleString()}</span>
                        </div>
                    </CalcSection>

                    {/* Step 6: Flat Deductions */}
                    <CalcSection step={calculation.totalOvertimeHours > 0 ? "Step 6" : "Step 5"} title="Flat Deductions (from Gross)" color="rose">
                        <div className="space-y-1 text-xs font-mono">
                            {calculation.taxDeduction > 0 && (
                                <div className="flex justify-between py-0.5 border-b border-dashed border-border/40">
                                    <span className="text-muted-foreground">− Income Tax</span>
                                    <span className="text-rose-600">{Math.round(calculation.taxDeduction).toLocaleString()}</span>
                                </div>
                            )}
                            {calculation.advanceDeduction > 0 && (
                                <div className="flex justify-between py-0.5 border-b border-dashed border-border/40">
                                    <span className="text-muted-foreground">− Salary Advance Recovery</span>
                                    <span className="text-rose-600">{Math.round(calculation.advanceDeduction).toLocaleString()}</span>
                                </div>
                            )}
                            {calculation.manualDeductions.map((d, i) => (
                                <div key={i} className="flex justify-between py-0.5 border-b border-dashed border-border/40">
                                    <span className="text-muted-foreground">− {d.description || "Manual Deduction"}</span>
                                    <span className="text-rose-600">{Math.round(d.amount).toLocaleString()}</span>
                                </div>
                            ))}
                            {calculation.totalDeductions === 0 && (
                                <p className="text-muted-foreground italic py-1">No flat deductions applied.</p>
                            )}
                        </div>
                        {calculation.totalDeductions > 0 && (
                            <div className="mt-2 flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-lg">
                                <span className="text-xs font-semibold text-rose-800">Total Flat Deductions</span>
                                <span className="text-sm font-bold font-mono text-rose-700">- PKR {Math.round(calculation.totalDeductions).toLocaleString()}</span>
                            </div>
                        )}
                    </CalcSection>

                    {/* Step 7: Net Salary */}
                    <div className="p-4 bg-primary/5 border-2 border-primary/30 rounded-xl space-y-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">{calculation.totalOvertimeHours > 0 ? "Step 7" : "Step 6"}: Net Salary</p>
                        <div className="font-mono text-xs text-muted-foreground space-y-0.5">
                            <p>Net = Gross − Flat Deductions</p>
                            <p className="font-semibold text-foreground">
                                Net = {Math.round(calculation.grossSalary).toLocaleString()} − {Math.round(calculation.totalDeductions).toLocaleString()} = <span className="text-primary text-base font-extrabold">PKR {Math.round(calculation.netSalary).toLocaleString()}</span>
                            </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground">Net salary cannot go below PKR 0.</p>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex gap-3 pt-6 border-t mt-auto sticky bottom-0 bg-background/80 backdrop-blur-sm pb-4">
                <Button variant="outline" className="w-full" onClick={onSuccess} disabled={saveMutation.isPending}>
                    Cancel
                </Button>
                <Button
                    className="w-full"
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !calculation}
                >
                    {saveMutation.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Calculator className="mr-2 size-4" />}
                    Finalize & Generate Slip
                </Button>
            </div>
        </div>
    );
};

// Helper Components
function SummaryRow({ label, value, isDeduction, highlight, tooltip }: { label: string; value: number; isDeduction?: boolean; highlight?: boolean; tooltip?: string }) {
    if (value === 0 && !highlight) return null;
    return (
        <TableRow className="hover:bg-transparent border-0 group">
            <TableCell className="py-2 text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    {label}
                    {tooltip && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Info className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    <p className="text-xs">{tooltip}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </TableCell>
            <TableCell className={`text-right py-2 font-mono ${isDeduction ? "text-rose-600" : ""} ${highlight ? "font-bold text-emerald-600" : ""}`}>
                {isDeduction ? "- " : ""}{Math.round(value).toLocaleString()}
            </TableCell>
        </TableRow>
    );
}

function StatCard({ label, value, className, tooltip }: { label: string; value: number | string; className?: string; tooltip?: string }) {
    const content = (
        <div className={cn("p-4 rounded-lg border text-center transition-all duration-200 hover:shadow-md cursor-default", className || "bg-card")}>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider">{label}</p>
        </div>
    );

    if (tooltip) {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-xs">{tooltip}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

type CalcColor = "blue" | "rose" | "emerald" | "slate";
const calcColorMap: Record<CalcColor, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    slate: "bg-muted/40 border-border text-muted-foreground",
};

function CalcSection({ step, title, color, children }: { step: string; title: string; color: CalcColor; children: React.ReactNode }) {
    return (
        <div className="border rounded-xl overflow-hidden">
            <div className={cn("px-4 py-2.5 flex items-center gap-2 border-b", calcColorMap[color])}>
                <span className="text-[10px] font-extrabold uppercase tracking-widest opacity-70">{step}</span>
                <span className="text-xs font-bold">{title}</span>
            </div>
            <div className="p-4 space-y-2 bg-card">
                {children}
            </div>
        </div>
    );
}

function CalcRow({ label, formula, result }: { label: string; formula: string; result: string }) {
    return (
        <div className="flex items-start justify-between gap-4 text-xs py-1 border-b border-dashed border-border/40 last:border-0">
            <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-muted-foreground font-mono">{formula}</p>
            </div>
            <p className="font-bold font-mono text-right shrink-0">{result}</p>
        </div>
    );
}
