import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, Download, Mail, Loader2 } from "lucide-react";
import { calculateWorkingDays } from "@/lib/payroll-calculator";
import { useSendPayslipEmail } from "@/hooks/hr/use-send-payslip-email";

type PayslipViewProps = {
    payslip: {
        id: string;
        employee: {
            employeeCode: string;
            firstName: string;
            lastName: string;
            cnic: string | null;
            designation: string;
            bankName: string | null;
            bankAccountNumber: string | null;
        };
        payroll: {
            month: string;
            startDate: string;
            endDate: string;
        };
        // Attendance
        daysPresent: number | null;
        daysAbsent: number | null;
        daysLeave: number | null;
        totalOvertimeHours: string | null;
        nightShiftsCount: number | null;
        // Earnings
        basicSalary: string;
        houseRentAllowance: string | null;
        utilitiesAllowance: string | null;
        bikeMaintenanceAllowance: string | null;
        mobileAllowance: string | null;
        fuelAllowance: string | null;
        specialAllowance: string | null;
        conveyanceAllowance: string | null;
        overtimeAmount: string | null;
        nightShiftAllowanceAmount: string | null;
        incentiveAmount: string | null;
        bonusAmount: string | null;
        // Deductions
        absentDeduction: string | null;
        advanceDeduction: string | null;
        taxDeduction: string | null;
        otherDeduction: string | null;
        // Totals
        grossSalary: string;
        totalDeductions: string;
        netSalary: string;
        remarks: string | null;
    };
    showActions?: boolean;
};

export const PayslipView = ({ payslip, showActions = true }: PayslipViewProps) => {
    const { employee, payroll } = payslip;
    const sendEmailMutation = useSendPayslipEmail();

    // Calculate working days on the fly since it's not stored in DB payslips table for now
    const totalWorkingDays = calculateWorkingDays(payroll.startDate, payroll.endDate);

    const earnings = [
        { label: "Basic Salary", value: Math.round(parseFloat(payslip.basicSalary)), hrs: totalWorkingDays },
        { label: "House Rent", value: Math.round(parseFloat(payslip.houseRentAllowance || "0")) },
        { label: "Utilities Allowance", value: Math.round(parseFloat(payslip.utilitiesAllowance || "0")) },
        { label: "Bike Maintenance", value: Math.round(parseFloat(payslip.bikeMaintenanceAllowance || "0")) },
        { label: "Mobile Package", value: Math.round(parseFloat(payslip.mobileAllowance || "0")) },
        { label: "Fuel", value: Math.round(parseFloat(payslip.fuelAllowance || "0")) },
        { label: "Special Allowance", value: Math.round(parseFloat(payslip.specialAllowance || "0")) },
        { label: "Conveyance", value: Math.round(parseFloat(payslip.conveyanceAllowance || "0")) },
        { label: "Overtime", value: Math.round(parseFloat(payslip.overtimeAmount || "0")) },
        { label: "Night Shift Allowance", value: Math.round(parseFloat(payslip.nightShiftAllowanceAmount || "0")) },
        { label: "Incentive", value: Math.round(parseFloat(payslip.incentiveAmount || "0")) },
        { label: "Bonus", value: Math.round(parseFloat(payslip.bonusAmount || "0")) },
    ].filter(item => item.value > 0);

    const deductions = [
        { label: "Absent/Undertime Deduction", value: Math.round(parseFloat(payslip.absentDeduction || "0")) },
        { label: "Advance Deduction", value: Math.round(parseFloat(payslip.advanceDeduction || "0")) },
        { label: "Tax Deduction", value: Math.round(parseFloat(payslip.taxDeduction || "0")) },
        { label: "Other Deductions", value: Math.round(parseFloat(payslip.otherDeduction || "0")) },
    ].filter(item => item.value > 0);

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        sendEmailMutation.mutate(payslip.id);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Action Buttons */}
            {showActions && (
                <div className="flex justify-end gap-2 print:hidden p-4">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="size-4 mr-2" />
                        Print / Save PDF
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleEmail}
                        disabled={sendEmailMutation.isPending}
                    >
                        {sendEmailMutation.isPending ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Mail className="size-4 mr-2" />}
                        Send via Email
                    </Button>
                </div>
            )}

            {/* Payslip Card */}
            <Card className="overflow-hidden print:shadow-none print:border shadow-xl border-none p-0">
                {/* Header */}
                <div className="bg-primary p-10 text-primary-foreground">
                    <div className="flex justify-between items-start">
                        <div className="space-y-2">
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                                Payslip
                            </h1>
                            <p className="text-primary-foreground/70 font-bold uppercase tracking-widest text-[10px]">
                                Statement of Earnings
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-black italic">TITAN</div>
                            <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest leading-tight">Elite Manufacturing <br /> Management</div>
                        </div>
                    </div>
                </div>

                <div className="bg-muted/10 p-10">
                    {/* Month Indicator */}
                    <div className="flex justify-center mb-10">
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl px-8 py-3 text-center">
                            <div className="text-[10px] font-black text-primary/60 uppercase tracking-widest mb-1">Payroll Cycle</div>
                            <div className="text-xl font-black text-primary italic lowercase leading-none">
                                {format(parseISO(payroll.month), "MMMM yyyy")}
                            </div>
                        </div>
                    </div>

                    {/* Employee Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2">Personal Identity</h3>
                            <InfoRow label="Employee Code" value={employee.employeeCode} highlight />
                            <InfoRow label="Employee Name" value={`${employee.firstName} ${employee.lastName}`} />
                            <InfoRow label="CNIC Number" value={employee.cnic || "N/A"} />
                            <InfoRow label="Designation" value={employee.designation} />
                        </div>
                        <div className="space-y-5">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-2">Financial & Attendance</h3>
                            <InfoRow label="Bank Entity" value={employee.bankName || "Cash/Manual"} />
                            <RowSeparator />
                            <InfoRow
                                label="Cycle Period"
                                value={`${format(parseISO(payroll.startDate), "dd MMM")} - ${format(parseISO(payroll.endDate), "dd MMM yyyy")}`}
                            />
                            <InfoRow
                                label="Duty Summary"
                                value={`P: ${payslip.daysPresent || 0}d | A: ${payslip.daysAbsent || 0}d | L: ${payslip.daysLeave || 0}d`}
                            />
                        </div>
                    </div>

                    {/* Earnings & Deductions Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border rounded-3xl overflow-hidden bg-card mb-10 shadow-sm">
                        {/* Earnings Column */}
                        <div className="p-8 border-r">
                            <h2 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-emerald-600">
                                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                Earnings
                            </h2>
                            <div className="space-y-1">
                                {earnings.map((item, index) => (
                                    <EarningsRow
                                        key={index}
                                        label={item.label}
                                        amount={item.value}
                                        hrs={item.hrs}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Deductions Column */}
                        <div className="p-8 bg-muted/5">
                            <h2 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-rose-600">
                                <div className="size-2 rounded-full bg-rose-500" />
                                Deductions
                            </h2>
                            <div className="space-y-1">
                                {deductions.length > 0 ? (
                                    deductions.map((item, index) => (
                                        <DeductionRow
                                            key={index}
                                            label={item.label}
                                            amount={item.value}
                                        />
                                    ))
                                ) : (
                                    <p className="text-[10px] text-muted-foreground italic font-bold uppercase tracking-widest opacity-50 p-4 text-center border-2 border-dashed rounded-xl">No deductions reported</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Final Net Summary */}
                    <div className="p-1 gap-2 flex flex-col md:flex-row">
                        <div className="flex-1 bg-emerald-50 border border-emerald-100 p-8 rounded-[40px] flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-2">Total Gross Earnings</span>
                            <span className="text-2xl font-black text-emerald-700 italic tracking-tighter">
                                PKR {Math.round(parseFloat(payslip.grossSalary)).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex-1 bg-rose-50 border border-rose-100 p-8 rounded-[40px] flex flex-col items-center justify-center">
                            <span className="text-[10px] font-black text-rose-600/70 uppercase tracking-widest mb-2">Total Deductions</span>
                            <span className="text-2xl font-black text-rose-700 italic tracking-tighter">
                                PKR {Math.round(parseFloat(payslip.totalDeductions)).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex-[1.5] bg-primary p-8 rounded-[40px] flex flex-col items-center justify-center shadow-lg shadow-primary/20 scale-105 z-10">
                            <span className="text-[10px] font-black text-primary-foreground/50 uppercase tracking-widest mb-1">Net Payable Amount</span>
                            <span className="text-5xl font-black text-primary-foreground tracking-tighter italic">
                                PKR {Math.round(parseFloat(payslip.netSalary)).toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Remarks Section */}
                    {payslip.remarks && (
                        <div className="mt-10 p-6 bg-amber-50 border-2 border-amber-100 rounded-3xl text-sm italic font-medium text-amber-800 text-center">
                            " {payslip.remarks} "
                        </div>
                    )}
                </div>

                {/* Overtime Info */}
                {parseFloat(payslip.totalOvertimeHours || "0") > 0 && (
                    <div className="p-4 bg-blue-50/50 text-xs text-blue-800 border-t">
                        <p>
                            <strong>Overtime Hours:</strong> {payslip.totalOvertimeHours} hrs |
                            <strong className="ml-2">Night Shifts:</strong> {payslip.nightShiftsCount || 0}
                        </p>
                    </div>
                )}

                {/* Print Footer */}
                <div className="bg-muted/10 p-10 pt-0 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-30">
                    This document is digitally verified & computer generated. Signature not required.
                    <br />
                    Generated: {format(new Date(), "dd-MMM-yyyy HH:mm")}
                </div>
            </Card>

            {/* Print Footer */}
            <div className="hidden print:block text-center text-xs text-muted-foreground pt-8 border-t">
                <p>This is a computer-generated payslip and does not require a signature.</p>
                <p className="mt-1">Generated on {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
            </div>
        </div>
    );
};

// Helper Components
function InfoRow({ label, value, highlight = false }: { label: string; value: string | number; highlight?: boolean }) {
    return (
        <div className="flex justify-between items-center group">
            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">{label}</span>
            <span className={`text-sm font-black ${highlight ? "text-primary italic" : "text-foreground"}`}>{value}</span>
        </div>
    );
}

function RowSeparator() {
    return <div className="h-px bg-muted-foreground/5 w-full" />
}

function EarningsRow({ label, amount, hrs }: { label: string; amount: number; hrs?: number }) {
    return (
        <div className="flex justify-between items-center py-3 bg-transparent hover:bg-emerald-50/50 px-2 rounded-xl transition-colors border-b border-muted-foreground/5 last:border-0">
            <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">{label}</span>
                {hrs !== undefined && (
                    <span className="text-[9px] font-black text-muted-foreground uppercase">
                        Service Days: {hrs}
                    </span>
                )}
            </div>
            <span className="text-sm font-black text-emerald-600 italic">
                {amount.toLocaleString()}
            </span>
        </div>
    );
}

function DeductionRow({ label, amount }: { label: string; amount: number }) {
    return (
        <div className="flex justify-between items-center py-3 bg-transparent hover:bg-rose-50/50 px-2 rounded-xl transition-colors border-b border-muted-foreground/5 last:border-0">
            <span className="text-xs font-bold text-foreground">{label}</span>
            <span className="text-sm font-black text-rose-600 italic">
                -{amount.toLocaleString()}
            </span>
        </div>
    );
}
