import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer, Mail, Loader2, ShieldCheck } from "lucide-react";
import { useSendPayslipEmail } from "@/hooks/hr/use-send-payslip-email";

export type PayslipData = {
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
    createdAt: Date;
};

type PayslipViewProps = {
    payslip: PayslipData;
    showActions?: boolean;
};

export const PayslipView = ({ payslip, showActions = true }: PayslipViewProps) => {
    const { employee, payroll } = payslip;
    const sendEmailMutation = useSendPayslipEmail();

    // Calculate working days (unused in new design but kept for logic if needed)
    // const totalWorkingDays = calculateWorkingDays(payroll.startDate, payroll.endDate);

    // Earnings Data
    const earnings = [
        { label: "Basic Salary", value: parseFloat(payslip.basicSalary) },
        { label: "House Rent Allow.", value: parseFloat(payslip.houseRentAllowance || "0") },
        { label: "Utilities Allow.", value: parseFloat(payslip.utilitiesAllowance || "0") },
        { label: "Bike Maint. Allow.", value: parseFloat(payslip.bikeMaintenanceAllowance || "0") },
        { label: "Mobile Allow.", value: parseFloat(payslip.mobileAllowance || "0") },
        { label: "Fuel Allow.", value: parseFloat(payslip.fuelAllowance || "0") },
        { label: "Special Allow.", value: parseFloat(payslip.specialAllowance || "0") },
        { label: "Conveyance Allow.", value: parseFloat(payslip.conveyanceAllowance || "0") },
        { label: "Overtime Amount", value: parseFloat(payslip.overtimeAmount || "0") },
        { label: "Night Shift Allow.", value: parseFloat(payslip.nightShiftAllowanceAmount || "0") },
        { label: "Incentive/Bonus", value: parseFloat(payslip.incentiveAmount || "0") + parseFloat(payslip.bonusAmount || "0") },
    ].filter(item => item.value > 0);

    // Deductions Data
    const deductions = [
        { label: "Income Tax", value: parseFloat(payslip.taxDeduction || "0") },
        { label: "Absent/Undertime", value: parseFloat(payslip.absentDeduction || "0") },
        { label: "Advance Salary", value: parseFloat(payslip.advanceDeduction || "0") },
        { label: "Other Deductions", value: parseFloat(payslip.otherDeduction || "0") },
    ].filter(item => item.value > 0);

    // Recalculate Totals for Consistency on UI
    const calculatedGross = earnings.reduce((sum, item) => sum + item.value, 0);
    const calculatedDeductions = deductions.reduce((sum, item) => sum + item.value, 0);
    const calculatedNet = Math.max(0, calculatedGross - calculatedDeductions);

    const handlePrint = () => {
        window.print();
    };

    const handleEmail = () => {
        sendEmailMutation.mutate(payslip.id);
    };

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="max-w-fit mx-auto bg-white text-slate-900 font-sans">
            {/* Actions Toolbar */}
            {showActions && (
                <div className="flex justify-end gap-3 print:hidden py-4 px-6 border-b border-gray-100 mb-6 bg-gray-50/50">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs font-semibold">
                        <Printer className="size-3.5 mr-2" />
                        Print / PDF
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleEmail}
                        disabled={sendEmailMutation.isPending}
                        className="h-8 text-xs font-semibold"
                    >
                        {sendEmailMutation.isPending ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Mail className="size-3.5 mr-2" />}
                        Email Payslip
                    </Button>
                </div>
            )}

            {/* Paper Container - Matching 'Nano Banana Corp' layout */}
            <div className="p-8 md:p-12 bg-white min-h-[297mm] print:min-h-0 print:p-0">

                {/* 1. Header with Logo & Title */}
                <header className="flex justify-between items-start border-b-2 border-slate-300 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="size-10 text-yellow-500 fill-yellow-500/20" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">TITAN ENTERPRISE</h1>
                            <p className="text-sm font-medium text-slate-600 italic">Confidential Payslip</p>
                        </div>
                    </div>
                    <div className="text-right text-xs font-medium text-slate-700 space-y-1">
                        <p><span className="font-bold">Month:</span> {format(parseISO(payroll.month), "MMMM yyyy")}</p>
                        <p><span className="font-bold">Period:</span> {format(parseISO(payroll.startDate), "yyyy-MM-dd")} to {format(parseISO(payroll.endDate), "yyyy-MM-dd")}</p>
                        <p><span className="font-bold">Slip ID:</span> {payslip.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </header>

                {/* 2. Employee Details Block (Gray Background) */}
                <div className="bg-slate-100 border border-slate-200 p-3 mb-1">
                    <h3 className="text-xs font-bold uppercase text-slate-800 mb-2 pb-1 w-full border-b border-slate-300">Employee Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        {/* Left Column */}
                        <div className="space-y-1">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">Employee Code:</span>
                                <span className="text-slate-900 font-semibold">{employee.employeeCode}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">Name:</span>
                                <span className="text-slate-900 font-semibold">{employee.firstName} {employee.lastName}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">Designation:</span>
                                <span className="text-slate-900 font-semibold">{employee.designation}</span>
                            </div>
                        </div>
                        {/* Right Column */}
                        <div className="space-y-1">
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">CNIC:</span>
                                <span className="text-slate-900 font-semibold">{employee.cnic || "N/A"}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">Bank Name:</span>
                                <span className="text-slate-900 font-semibold">{employee.bankName || "Cash"}</span>
                            </div>
                            <div className="grid grid-cols-[100px_1fr]">
                                <span className="text-slate-600 font-medium">Account No:</span>
                                <span className="text-slate-900 font-semibold">{employee.bankAccountNumber || "N/A"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. Attendance Summary Block (Gray Background) */}
                <div className="bg-slate-100 border border-slate-200 border-t-0 p-2 mb-6 flex flex-wrap justify-between items-center text-xs px-4">
                    <div className="font-bold uppercase text-slate-800 mr-4">Attendance Summary</div>
                    <div className="flex gap-4 md:gap-8 flex-1 justify-end">
                        <span>Present: <span className="font-semibold text-slate-900">{payslip.daysPresent || 0}</span></span>
                        <span>Absent: <span className="font-semibold text-slate-900">{payslip.daysAbsent || 0}</span></span>
                        <span>Leave: <span className="font-semibold text-slate-900">{payslip.daysLeave || 0}</span></span>
                        <span>Overtime (Hrs): <span className="font-semibold text-slate-900">{payslip.totalOvertimeHours || 0}</span></span>
                        <span>Night Shifts: <span className="font-semibold text-slate-900">{payslip.nightShiftsCount || 0}</span></span>
                    </div>
                </div>

                {/* 4. Earnings & Deductions Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {/* Earnings Column */}
                    <div className="flex flex-col h-full">
                        <div className="bg-[#1e3a8a] text-white font-bold text-center py-1.5 uppercase text-xs mb-1 rounded-t-sm">Earnings</div>
                        <div className="flex-1 space-y-1 border-slate-200">
                            {earnings.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs px-2 py-0.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <span className="text-slate-700">{item.label}:</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t-2 border-slate-800 mt-auto pt-2 flex justify-between text-sm px-2 bg-slate-50 py-1">
                            <span className="font-bold text-slate-900">GROSS SALARY:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(calculatedGross)}</span>
                        </div>
                    </div>

                    {/* Deductions Column */}
                    <div className="flex flex-col h-full">
                        <div className="bg-[#1e3a8a] text-white font-bold text-center py-1.5 uppercase text-xs mb-1 rounded-t-sm">Deductions</div>
                        <div className="flex-1 space-y-1">
                            {deductions.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-xs px-2 py-0.5 border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                    <span className="text-slate-700">{item.label}:</span>
                                    <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
                                </div>
                            ))}
                            {deductions.length === 0 && (
                                <div className="text-center text-xs text-slate-400 italic py-4">No deductions applied</div>
                            )}
                        </div>
                        <div className="border-t-2 border-slate-800 mt-auto pt-2 flex justify-between text-sm px-2 bg-slate-50 py-1">
                            <span className="font-bold text-slate-900">TOTAL DEDUCTIONS:</span>
                            <span className="font-bold text-slate-900">{formatCurrency(calculatedDeductions)}</span>
                        </div>
                    </div>
                </div>

                {/* 5. Net Payable Box */}
                <div className="bg-[#f1f5f9] border-2 border-[#eab308] p-3 text-center mb-8 rounded-sm">
                    <span className="text-lg md:text-xl font-bold text-[#1e3a8a] uppercase tracking-wide">
                        NET PAYABLE (PKR): {formatCurrency(calculatedNet)}
                    </span>
                </div>

                {/* 6. Remarks */}
                <div className="mb-12 text-sm text-slate-700 px-2">
                    <p className="font-bold mb-1 uppercase text-xs text-slate-800">Remarks</p>
                    <p className="italic text-slate-600">{payslip.remarks || "Salaries are paid as per company policy."}</p>
                </div>

                {/* 7. Footer Signatures */}
                <div className="flex justify-between items-end mt-auto pt-10 px-4">
                    <div className="text-center w-64">
                        <div className="border-t border-slate-800 pt-2">
                            <p className="text-xs font-bold text-slate-800">Employee Signature</p>
                        </div>
                    </div>
                    <div className="text-center w-64">
                        <div className="border-t border-slate-800 pt-2">
                            <p className="text-xs font-bold text-slate-800">HR / Finance Manager</p>
                        </div>
                    </div>
                </div>

                {/* System Generated Note */}
                <div className="mt-8 text-center border-t border-slate-100 pt-4">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">System Generated Slip • Titan Enterprise</p>
                </div>

            </div>
        </div>
    );
};
