import { ResponsiveSheet } from "@/components/custom/responsive-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { usePreviewPayslip } from "@/hooks/hr/use-preview-payslip";
import { useSavePayslip } from "@/hooks/hr/use-save-payslip";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Calculator, CheckCircle2, AlertCircle, PlusCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SalaryCalculatorSheetProps {
    employeeId: string | null;
    month: string;
    isOpen: boolean;
    onClose: () => void;
}

export function SalaryCalculatorSheet({ employeeId, month, isOpen, onClose }: SalaryCalculatorSheetProps) {
    const [manualDeductions, setManualDeductions] = useState<{ description: string; amount: number }[]>([]);
    const [additionalAmounts, setAdditionalAmounts] = useState({
        bonus: 0,
        incentive: 0,
        tax: 0,
        advance: 0,
    });

    // Reset state when employee changes
    useEffect(() => {
        if (isOpen) {
            setManualDeductions([]);
            setAdditionalAmounts({ bonus: 0, incentive: 0, tax: 0, advance: 0 });
        }
    }, [employeeId, isOpen]);

    // Fetch Preview Calculation
    const { data: calculation, isLoading, isError, error } = usePreviewPayslip({
        employeeId: employeeId!,
        month,
        manualDeductions,
        additionalAmounts: {
            bonusAmount: additionalAmounts.bonus,
            incentiveAmount: additionalAmounts.incentive,
            taxDeduction: additionalAmounts.tax,
            advanceDeduction: additionalAmounts.advance,
        }
    }, isOpen);

    // Save Mutation
    const saveMutation = useSavePayslip(onClose);

    if (!employeeId) return null;

    const handleAddArrears = () => {
        if (calculation?.missedLastMonth) {
            const arrears = Math.round(parseFloat(calculation.lastMonthStandardSalary));
            setAdditionalAmounts(prev => ({
                ...prev,
                incentive: prev.incentive + arrears
            }));
        }
    };

    return (
        <ResponsiveSheet
            title="Salary Calculation"
            description={`Review and adjust salary details for ${month} before generating the final slip.`}
            open={isOpen}
            onOpenChange={(open) => !open && onClose()}
            className="sm:max-w-2xl"
        >
            <div className="flex flex-col h-full min-h-[60vh]">
                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : isError ? (
                    <div className="p-4 text-rose-500 bg-rose-50 rounded-md mt-4 text-sm font-bold border border-rose-100 italic">
                        ⚠️ Error: {error.message}
                    </div>
                ) : calculation ? (
                    <div className="space-y-6 pb-20 pt-4">
                        {/* Missed Last Month Alert */}
                        {calculation.missedLastMonth && (
                            <Alert className="bg-amber-50 border-amber-200 text-amber-900 animate-in fade-in slide-in-from-top-2 duration-500">
                                <AlertCircle className="h-4 w-4 text-amber-600" />
                                <AlertTitle className="text-[10px] font-black uppercase tracking-widest mb-1">Unpaid Cycle Detected</AlertTitle>
                                <AlertDescription className="text-xs flex flex-col gap-3">
                                    <p>This employee was not paid in the previous month. You might need to add their missed salary (PKR {Math.round(parseFloat(calculation.lastMonthStandardSalary)).toLocaleString()}) as arrears.</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-fit h-8 text-[10px] font-black uppercase tracking-widest bg-white border-amber-300 hover:bg-amber-100 hover:text-amber-950 transition-colors"
                                        onClick={handleAddArrears}
                                    >
                                        <PlusCircle className="size-3.5 mr-2" />
                                        Add as Arrears (Incentive)
                                    </Button>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Employee Summary */}
                        <div className="bg-muted/30 p-5 rounded-2xl border border-muted-foreground/5 grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                            <SummaryItem label="Employee" value={calculation.employeeName} />
                            <SummaryItem label="Staff Code" value={calculation.employeeCode} />
                            <SummaryItem label="Job Title" value={calculation.designation} />
                            <SummaryItem label="Cycle" value={`${format(parseISO(calculation.startDate), "dd MMM")} - ${format(parseISO(calculation.endDate), "dd MMM")}`} />
                        </div>

                        <Tabs defaultValue="breakdown" className="w-full">
                            <TabsList className="w-full bg-muted/50 p-1 h-12 rounded-xl mb-4">
                                <TabsTrigger value="breakdown" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">Earnings</TabsTrigger>
                                <TabsTrigger value="attendance" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">Attendance</TabsTrigger>
                                <TabsTrigger value="adjustments" className="flex-1 rounded-lg font-black text-[10px] uppercase tracking-widest data-[state=active]:shadow-sm">Custom</TabsTrigger>
                            </TabsList>

                            {/* BREAKDOWN TAB */}
                            <TabsContent value="breakdown" className="space-y-4 animate-in fade-in duration-300">
                                <section className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">Confirmed Earnings</h3>
                                    <div className="border border-muted-foreground/10 rounded-2xl overflow-hidden divide-y divide-muted-foreground/5 bg-card">
                                        <ValueRow label="Basic Salary" value={calculation.basicSalary} />
                                        <ValueRow label="House Rent" value={calculation.houseRentAllowance} />
                                        <ValueRow label="Utilities" value={calculation.utilitiesAllowance} />
                                        <ValueRow label="Conveyance" value={calculation.conveyanceAllowance} />
                                        <ValueRow label="Overtime Pay" value={calculation.overtimeAmount} highlight color="text-emerald-700" />
                                        <ValueRow label="Variable Incentives" value={calculation.bonusAmount + calculation.incentiveAmount} highlight color="text-emerald-700" />
                                    </div>
                                    <div className="flex justify-between items-center px-4 pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gross Amount</span>
                                        <span className="text-lg font-black text-emerald-600">PKR {Math.round(calculation.grossSalary).toLocaleString()}</span>
                                    </div>
                                </section>

                                <Separator className="opacity-50" />

                                <section className="space-y-3">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 pl-1">Applied Deductions</h3>
                                    <div className="border border-muted-foreground/10 rounded-2xl overflow-hidden divide-y divide-muted-foreground/5 bg-card">
                                        <ValueRow label="Absent/Short Sessions" value={calculation.absentDeduction + calculation.leaveDeduction} isDeduction />
                                        <ValueRow label="Statutory Tax" value={calculation.taxDeduction} isDeduction />
                                        <ValueRow label="Staff Loan/Advance" value={calculation.advanceDeduction} isDeduction />
                                        <ValueRow label="Other Adjustments" value={calculation.otherDeduction} isDeduction />
                                    </div>
                                    <div className="flex justify-between items-center px-4 pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Deductions</span>
                                        <span className="text-lg font-black text-rose-600">PKR {Math.round(calculation.totalDeductions).toLocaleString()}</span>
                                    </div>
                                </section>

                                <div className="mt-8 p-6 bg-primary/5 rounded-3xl border-2 border-primary/10 flex justify-between items-center shadow-inner">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Final Net Payable</span>
                                        <span className="text-sm font-medium text-muted-foreground italic">After all variations</span>
                                    </div>
                                    <span className="text-3xl font-black text-primary tracking-tighter italic">PKR {Math.round(calculation.netSalary).toLocaleString()}</span>
                                </div>
                            </TabsContent>

                            {/* ATTENDANCE TAB */}
                            <TabsContent value="attendance" className="space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <AttendanceStat label="Job Days" value={calculation.totalWorkingDays} />
                                    <AttendanceStat label="Present" value={calculation.daysPresent} color="bg-emerald-50 text-emerald-700 border-emerald-100" />
                                    <AttendanceStat label="Absent" value={calculation.daysAbsent} color="bg-rose-50 text-rose-700 border-rose-100" />
                                    <AttendanceStat label="Leaves" value={calculation.daysLeave} color="bg-amber-50 text-amber-700 border-amber-100" />
                                    <AttendanceStat label="Short Day" value={calculation.daysHalfDay} />
                                    <AttendanceStat label="OT Hours" value={calculation.totalOvertimeHours} color="bg-blue-50 text-blue-700 border-blue-100" />
                                </div>
                                <div className="p-5 bg-primary/5 rounded-2xl text-[10px] text-muted-foreground/80 font-bold uppercase tracking-widest text-center border border-primary/10 border-dashed">
                                    This summary is verified against the attendance module logs.
                                </div>
                            </TabsContent>

                            {/* ADJUSTMENTS TAB */}
                            <TabsContent value="adjustments" className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-6 border border-muted-foreground/10 p-6 rounded-3xl bg-card shadow-xs">
                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Incentives & Rewards</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bonus Amount</Label>
                                                <Input
                                                    type="number"
                                                    value={additionalAmounts.bonus || ""}
                                                    onChange={(e) => setAdditionalAmounts(prev => ({ ...prev, bonus: parseFloat(e.target.value) || 0 }))}
                                                    className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm focus-visible:ring-primary/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Incentive / Arrears</Label>
                                                <Input
                                                    type="number"
                                                    value={additionalAmounts.incentive || ""}
                                                    onChange={(e) => setAdditionalAmounts(prev => ({ ...prev, incentive: parseFloat(e.target.value) || 0 }))}
                                                    className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm focus-visible:ring-primary/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <Separator className="opacity-50" />

                                    <div className="space-y-4">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Manual Deductions</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Salary Advance</Label>
                                                <Input
                                                    type="number"
                                                    value={additionalAmounts.advance || ""}
                                                    onChange={(e) => setAdditionalAmounts(prev => ({ ...prev, advance: parseFloat(e.target.value) || 0 }))}
                                                    className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm focus-visible:ring-primary/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Income Tax</Label>
                                                <Input
                                                    type="number"
                                                    value={additionalAmounts.tax || ""}
                                                    onChange={(e) => setAdditionalAmounts(prev => ({ ...prev, tax: parseFloat(e.target.value) || 0 }))}
                                                    className="h-11 rounded-xl bg-muted/30 border-none font-bold text-sm focus-visible:ring-primary/20"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        {/* Final Actions */}
                        <div className="flex gap-4 pt-4 border-t border-muted-foreground/10">
                            <Button variant="ghost" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-colors" onClick={onClose} disabled={saveMutation.isPending}>
                                Discard Changes
                            </Button>
                            <Button className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 text-[10px] font-black uppercase tracking-widest hover:-translate-y-px transition-all" onClick={() => saveMutation.mutate({
                                employeeId: employeeId!,
                                month,
                                deductionConfig: {
                                    manualDeductions,
                                    deductConveyanceOnLeave: true,
                                },
                                additionalAmounts: {
                                    bonusAmount: Math.round(additionalAmounts.bonus),
                                    incentiveAmount: Math.round(additionalAmounts.incentive),
                                    taxDeduction: Math.round(additionalAmounts.tax),
                                    advanceDeduction: Math.round(additionalAmounts.advance),
                                }
                            })} disabled={saveMutation.isPending || !calculation}>
                                {saveMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Calculator className="size-4 mr-2" />}
                                Finalize & Generate Slip
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>
        </ResponsiveSheet>
    );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-70">{label}</span>
            <span className="font-black text-sm text-foreground truncate">{value}</span>
        </div>
    );
}

function ValueRow({ label, value, isDeduction, highlight, color }: { label: string; value: number; isDeduction?: boolean; highlight?: boolean, color?: string }) {
    if (value === 0 && !highlight) return null;
    return (
        <div className={`flex justify-between items-center py-3.5 px-5 text-sm transition-colors hover:bg-muted/30 ${highlight ? "bg-primary/5 font-bold" : ""}`}>
            <span className="text-muted-foreground font-medium">{label}</span>
            <span className={isDeduction ? "text-rose-600 font-black italic" : `${color || "text-emerald-600"} font-black`}>
                {isDeduction ? "-" : ""}{Math.round(value).toLocaleString()}
            </span>
        </div>
    );
}

function AttendanceStat({ label, value, color = "bg-muted/30" }: { label: string; value: number | string; color?: string }) {
    return (
        <div className={`p-4 rounded-2xl flex flex-col items-center justify-center ${color} border border-muted-foreground/5 shadow-xs transition-transform hover:scale-[1.02]`}>
            <span className="text-xl font-black italic tracking-tighter">{value}</span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-70 mt-1">{label}</span>
        </div>
    );
}
