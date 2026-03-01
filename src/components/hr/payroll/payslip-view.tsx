import { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Printer, Mail, Loader2, Edit2 } from "lucide-react";
import { useSendPayslipEmail } from "@/hooks/hr/use-send-payslip-email";
import { OverrideBradfordDialog } from "./override-bradford-dialog";

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
    daysPresent: number | null;
    daysAbsent: number | null;
    daysLeave: number | null;
    totalOvertimeHours: string | null;
    nightShiftsCount: number | null;
    bradfordFactorScore: string | null;
    bradfordFactorOverride: string | null;
    bradfordFactorPeriod: string | null;
    basicSalary: string;
    allowanceBreakdown: Record<string, number> | null;
    overtimeAmount: string | null;
    nightShiftAllowanceAmount: string | null;
    incentiveAmount: string | null;
    bonusAmount: string | null;
    absentDeduction: string | null;
    leaveDeduction: string | null;
    advanceDeduction: string | null;
    taxDeduction: string | null;
    otherDeduction: string | null;
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

const allowanceLabels: Record<string, string> = {
    houseRent: "House Rent Allowance",
    utilities: "Utilities Allowance",
    bikeMaintenance: "Bike Maintenance Allowance",
    mobile: "Mobile Allowance",
    fuel: "Fuel Allowance",
    special: "Special Allowance",
    conveyance: "Conveyance Allowance",
    nightShift: "Night Shift Allowance",
    technical: "Technical Allowance",
};

function fmt(val: number): string {
    return val.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function toN(s: string | null | undefined): number {
    const n = parseFloat(s || "0");
    return isNaN(n) ? 0 : n;
}

const B = "1px solid #9ca3af";

const base: React.CSSProperties = {
    border: B,
    padding: "3px 7px",
    fontSize: 11,
    verticalAlign: "middle",
};
const styles = {
    label: { ...base, fontWeight: 600 } as React.CSSProperties,
    data: { ...base } as React.CSSProperties,
    hdr: { ...base, fontWeight: 700, background: "#fff" } as React.CSSProperties,
    num: {
        ...base,
        textAlign: "right" as const,
        fontVariantNumeric: "tabular-nums",
    } as React.CSSProperties,
    totalLbl: {
        ...base,
        fontWeight: 700,
        textAlign: "right" as const,
        background: "#f3f4f6",
    } as React.CSSProperties,
    totalNum: {
        ...base,
        fontWeight: 700,
        textAlign: "right" as const,
        background: "#f3f4f6",
        fontVariantNumeric: "tabular-nums",
    } as React.CSSProperties,
    netLbl: {
        ...base,
        fontWeight: 800,
        background: "#ADD8E6",
        fontSize: 12,
    } as React.CSSProperties,
    netNum: {
        ...base,
        fontWeight: 800,
        background: "#ADD8E6",
        fontSize: 12,
        textAlign: "right" as const,
        fontVariantNumeric: "tabular-nums",
    } as React.CSSProperties,
};

export const PayslipView = ({
    payslip,
    showActions = true,
}: PayslipViewProps) => {
    const { employee, payroll } = payslip;
    const sendEmailMutation = useSendPayslipEmail();
    const [overrideOpen, setOverrideOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // ── Bradford Factor ────────────────────────────────────────────────────
    const effectiveBradford =
        payslip.bradfordFactorOverride != null
            ? toN(payslip.bradfordFactorOverride)
            : toN(payslip.bradfordFactorScore);

    const bradfordPeriod =
        payslip.bradfordFactorPeriod ||
        (payroll.startDate && payroll.endDate
            ? `${format(parseISO(payroll.startDate), "d MMM yyyy")} to ${format(parseISO(payroll.endDate), "d MMM yyyy")}`
            : "—");

    const bradfordColor =
        effectiveBradford === 0
            ? "#15803d"
            : effectiveBradford < 50
                ? "#a16207"
                : effectiveBradford < 250
                    ? "#c2410c"
                    : "#b91c1c";

    // ── Earnings ───────────────────────────────────────────────────────────
    const dynamicAllowances = Object.entries(payslip.allowanceBreakdown || {})
        .filter(([key]) => key !== "basicSalary" && key !== "nightShift")
        .map(([key, val]) => ({
            label: allowanceLabels[key] || `${key} Allowance`,
            value: Number(val),
        }))
        .filter((e) => e.value > 0);

    const earnings: { label: string; value: number }[] = [
        { label: "Basic Salary", value: toN(payslip.basicSalary) },
        ...dynamicAllowances,
        ...(toN(payslip.overtimeAmount) > 0
            ? [{ label: "Overtime Amount", value: toN(payslip.overtimeAmount) }]
            : []),
        ...(toN(payslip.nightShiftAllowanceAmount) > 0
            ? [
                {
                    label: "Night Shift Allowance",
                    value: toN(payslip.nightShiftAllowanceAmount),
                },
            ]
            : []),
        ...(toN(payslip.incentiveAmount) + toN(payslip.bonusAmount) > 0
            ? [
                {
                    label: "Incentive / Bonus",
                    value: toN(payslip.incentiveAmount) + toN(payslip.bonusAmount),
                },
            ]
            : []),
    ];

    // ── Deductions ─────────────────────────────────────────────────────────
    const deductions: { label: string; value: number }[] = [
        { label: "Income Tax", value: toN(payslip.taxDeduction) },
        { label: "Absent / Undertime", value: toN(payslip.absentDeduction) },
        { label: "Unapproved Leave", value: toN(payslip.leaveDeduction) },
        { label: "Advance Recovery", value: toN(payslip.advanceDeduction) },
        { label: "Other Deductions", value: toN(payslip.otherDeduction) },
    ].filter((d) => d.value > 0);

    const totalEarnings = earnings.reduce((s, e) => s + e.value, 0);
    const totalDedns = deductions.reduce((s, d) => s + d.value, 0);
    const netPay = Math.max(0, totalEarnings - totalDedns);

    const rowCount = Math.max(earnings.length, deductions.length, 6);
    const ep = [...earnings, ...Array(rowCount - earnings.length).fill(null)];
    const dp = [...deductions, ...Array(rowCount - deductions.length).fill(null)];

    // ── Print: open a full new tab with self-contained HTML (like COA) ──────
    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            window.print();
            return;
        }

        // Build the combined earnings/deductions table rows
        const earningRows: string[] = [];
        const deductionRows: string[] = [];
        const maxRows = Math.max(earnings.length, deductions.length, 6);

        for (let i = 0; i < maxRows; i++) {
            const e = earnings[i];
            const d = deductions[i];
            earningRows.push(e ? `<td class="cell">${e.label}</td><td class="cell ta-center"></td><td class="cell num">${fmt(e.value)}</td>` : `<td class="cell"></td><td class="cell"></td><td class="cell"></td>`);
            deductionRows.push(d ? `<td class="cell">${d.label}</td><td class="cell ta-center"></td><td class="cell num">${fmt(d.value)}</td>` : `<td class="cell"></td><td class="cell"></td><td class="cell"></td>`);
        }

        const combinedRows = earningRows
            .map((er, i) => `<tr>${er}${deductionRows[i]}</tr>`)
            .join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Payslip - ${format(parseISO(payroll.month), "MMMM yyyy")} - ${employee.firstName} ${employee.lastName}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

                    * { margin: 0; padding: 0; box-sizing: border-box; }

                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        font-size: 11px;
                        color: #111;
                        background: white;
                        padding: 0;
                    }

                    @media print {
                        body { padding: 0; }
                        .no-print { display: none !important; }
                        @page { margin: 15mm; size: A4; }
                    }

                    .payslip {
                        max-width: 780px;
                        margin: 0 auto;
                        padding: 40px;
                    }

                    /* Header */
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        margin-bottom: 14px;
                    }
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .company-name {
                        font-size: 16px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .company-sub {
                        font-size: 10px;
                        color: #6b7280;
                        font-style: italic;
                    }
                    .meta-right {
                        text-align: right;
                        font-size: 10px;
                        color: #374151;
                        line-height: 1.8;
                    }

                    /* Table styles */
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        table-layout: fixed;
                    }
                    .cell {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-size: 11px;
                        vertical-align: middle;
                    }
                    .cell-label {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-size: 11px;
                        font-weight: 600;
                        vertical-align: middle;
                    }
                    .cell-hdr {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-size: 11px;
                        font-weight: 700;
                        background: #fff;
                    }
                    .num {
                        text-align: right;
                        font-variant-numeric: tabular-nums;
                    }
                    .ta-center { text-align: center; }
                    .ta-right { text-align: right; }
                    .total-cell {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-weight: 700;
                        text-align: right;
                        background: #f3f4f6;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .total-label {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-weight: 700;
                        text-align: right;
                        background: #f3f4f6;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .net-cell {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-weight: 800;
                        font-size: 13px;
                        background: #ADD8E6;
                        text-align: center;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .net-num {
                        border: 1px solid #9ca3af;
                        padding: 3px 7px;
                        font-weight: 800;
                        font-size: 13px;
                        background: #ADD8E6;
                        text-align: right;
                        font-variant-numeric: tabular-nums;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .bradford {
                        font-weight: 700;
                        color: ${bradfordColor};
                    }

                    /* Remarks */
                    .remarks {
                        border: 1px solid #9ca3af;
                        padding: 8px 10px;
                        min-height: 54px;
                        margin-top: 16px;
                        margin-bottom: 32px;
                        font-size: 11px;
                    }

                    /* Signatures */
                    .signatures {
                        display: flex;
                        justify-content: space-between;
                        padding-top: 36px;
                        padding-left: 8px;
                        padding-right: 8px;
                    }
                    .sig-block {
                        text-align: center;
                        width: 200px;
                    }
                    .sig-line {
                        border-top: 1px solid #1f2937;
                        padding-top: 6px;
                        font-size: 11px;
                        font-weight: 700;
                    }

                    /* Footer */
                    .footer {
                        margin-top: 20px;
                        border-top: 1px solid #f3f4f6;
                        padding-top: 10px;
                        text-align: center;
                        font-size: 9px;
                        color: #9ca3af;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                    }
                </style>
            </head>
            <body>
                <div class="payslip">
                    <!-- Header -->
                    <div class="header">
                        <div class="header-left">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z" fill="#fef9c3" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M9 12l2 2 4-4" stroke="#eab308" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <div>
                                <div class="company-name">TITAN ENTERPRISE</div>
                                <div class="company-sub">Confidential Payslip</div>
                            </div>
                        </div>
                        <div class="meta-right">
                            <div><strong>Month:</strong> ${format(parseISO(payroll.month), "MMMM yyyy")}</div>
                            <div><strong>Period:</strong> ${format(parseISO(payroll.startDate), "dd MMM yyyy")} to ${format(parseISO(payroll.endDate), "dd MMM yyyy")}</div>
                            <div><strong>Slip ID:</strong> ${payslip.id.slice(0, 8).toUpperCase()}</div>
                        </div>
                    </div>

                    <!-- Master table -->
                    <table>
                        <colgroup>
                            <col style="width: 18%" />
                            <col style="width: 7%" />
                            <col style="width: 11%" />
                            <col style="width: 20%" />
                            <col style="width: 7%" />
                            <col style="width: 11%" />
                        </colgroup>
                        <tbody>
                            <!-- Employee info -->
                            <tr>
                                <td class="cell-label">Employee Code</td>
                                <td class="cell" colspan="2">${employee.employeeCode}</td>
                                <td class="cell-label">Name</td>
                                <td class="cell" colspan="2">${employee.firstName} ${employee.lastName}</td>
                            </tr>
                            <tr>
                                <td class="cell-label">Designation</td>
                                <td class="cell" colspan="2">${employee.designation}</td>
                                <td class="cell-label">CNIC</td>
                                <td class="cell" colspan="2">${employee.cnic || "N/A"}</td>
                            </tr>
                            <tr>
                                <td class="cell-label">Bank Account Number</td>
                                <td class="cell" colspan="2">${employee.bankAccountNumber || "N/A"}</td>
                                <td class="cell-label">Bradford Factor Period</td>
                                <td class="cell" colspan="2">${bradfordPeriod}</td>
                            </tr>
                            <tr>
                                <td class="cell-label">Bank Name</td>
                                <td class="cell" colspan="2">${employee.bankName || "Cash"}</td>
                                <td class="cell-label">Bradford Factor</td>
                                <td class="cell bradford" colspan="2">${effectiveBradford}${payslip.bradfordFactorOverride != null ? ' <span style="font-size:9px;color:#9ca3af;font-weight:400">(override)</span>' : ""}</td>
                            </tr>

                            <!-- Attendance -->
                            <tr>
                                <td class="cell" colspan="6" style="padding-top:5px;padding-bottom:5px">
                                    <strong>Attendance:</strong>
                                    <span style="margin-right:14px">Present: <strong>${payslip.daysPresent ?? 0}</strong></span>
                                    <span style="margin-right:14px">Absent: <strong>${payslip.daysAbsent ?? 0}</strong></span>
                                    <span style="margin-right:14px">Leave: <strong>${payslip.daysLeave ?? 0}</strong></span>
                                    <span style="margin-right:14px">OT (Hrs): <strong>${payslip.totalOvertimeHours ?? "0.00"}</strong></span>
                                    <span>Night Shifts: <strong>${payslip.nightShiftsCount ?? 0}</strong></span>
                                </td>
                            </tr>

                            <!-- Column headers -->
                            <tr>
                                <th class="cell-hdr">Earning</th>
                                <th class="cell-hdr ta-center">Hrs/Days</th>
                                <th class="cell-hdr ta-right">PKR</th>
                                <th class="cell-hdr">Deduction</th>
                                <th class="cell-hdr ta-center">Hrs/Days</th>
                                <th class="cell-hdr ta-right">PKR</th>
                            </tr>

                            <!-- Line items -->
                            ${combinedRows}

                            <!-- Totals -->
                            <tr>
                                <td class="total-label" colspan="2">Total Earnings</td>
                                <td class="total-cell">${fmt(totalEarnings)}</td>
                                <td class="total-label" colspan="2">Total Deduction</td>
                                <td class="total-cell">${fmt(totalDedns)}</td>
                            </tr>

                            <!-- Net Pay -->
                            <tr>
                                <td class="net-cell" colspan="4">Net Pay</td>
                                <td class="net-num">${fmt(netPay)}</td>
                                <td class="net-cell">PKR</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- Remarks -->
                    <div class="remarks">
                        ${payslip.remarks || "Salaries are paid as per company policy."}
                    </div>

                    <!-- Signatures -->
                    <div class="signatures">
                        <div class="sig-block"><div class="sig-line">Employee Signature</div></div>
                        <div class="sig-block"><div class="sig-line">HR / Finance Manager</div></div>
                    </div>

                    <!-- Footer -->
                    <div class="footer">
                        System Generated Slip • Titan Enterprise
                    </div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Wait for fonts/content to render before triggering the print dialog
        setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (_) {
                // Some browsers block programmatic print — user can use Ctrl+P
            }
        }, 400);
    };

    return (
        <div
            style={{
                maxWidth: 780,
                margin: "0 auto",
                background: "#fff",
                fontFamily: "Arial, sans-serif",
                color: "#111",
            }}
        >
            {/* ── Actions toolbar ── */}
            {showActions && (
                <div className="flex justify-end gap-3 print:hidden py-3 px-4 border-b border-gray-200 mb-4 bg-gray-50">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrint}
                        className="h-8 text-xs font-semibold"
                    >
                        <Printer className="size-3.5 mr-2" /> Print / Save PDF
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => sendEmailMutation.mutate(payslip.id)}
                        disabled={sendEmailMutation.isPending}
                        className="h-8 text-xs font-semibold"
                    >
                        {sendEmailMutation.isPending ? (
                            <Loader2 className="size-3.5 mr-2 animate-spin" />
                        ) : (
                            <Mail className="size-3.5 mr-2" />
                        )}
                        Email Payslip
                    </Button>
                </div>
            )}

            {/*
              ┌─────────────────────────────────────────────────────┐
              │  printRef wraps ONLY the slip content.              │
              │  Toolbar buttons and dialogs are OUTSIDE this ref.  │
              │  handlePrint copies innerHTML of this div into      │
              │  a clean popup window — no sidebar, no overlay.     │
              └─────────────────────────────────────────────────────┘
            */}
            <div ref={printRef} style={{ padding: "24px 28px" }}>
                {/* Company header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 14,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* SVG shield icon (no lucide dependency in popup) */}
                        <svg
                            width="36"
                            height="36"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{ color: "#eab308", flexShrink: 0 }}
                        >
                            <path
                                d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z"
                                fill="#fef9c3"
                                stroke="#eab308"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M9 12l2 2 4-4"
                                stroke="#eab308"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <div>
                            <div
                                style={{
                                    fontSize: 15,
                                    fontWeight: 800,
                                    textTransform: "uppercase",
                                    letterSpacing: 0.5,
                                }}
                            >
                                TITAN ENTERPRISE
                            </div>
                            <div
                                style={{ fontSize: 10, color: "#6b7280", fontStyle: "italic" }}
                            >
                                Confidential Payslip
                            </div>
                        </div>
                    </div>
                    <div
                        style={{
                            textAlign: "right",
                            fontSize: 10,
                            color: "#374151",
                            lineHeight: 1.8,
                        }}
                    >
                        <div>
                            <strong>Month:</strong>{" "}
                            {format(parseISO(payroll.month), "MMMM yyyy")}
                        </div>
                        <div>
                            <strong>Period:</strong>{" "}
                            {format(parseISO(payroll.startDate), "dd MMM yyyy")} to{" "}
                            {format(parseISO(payroll.endDate), "dd MMM yyyy")}
                        </div>
                        <div>
                            <strong>Slip ID:</strong> {payslip.id.slice(0, 8).toUpperCase()}
                        </div>
                    </div>
                </div>

                {/* Single master table */}
                <table>
                    <colgroup>
                        <col style={{ width: "18%" }} />
                        <col style={{ width: "7%" }} />
                        <col style={{ width: "11%" }} />
                        <col style={{ width: "20%" }} />
                        <col style={{ width: "7%" }} />
                        <col style={{ width: "11%" }} />
                    </colgroup>
                    <tbody>
                        {/* Employee info */}
                        <tr>
                            <td style={styles.label}>Employee Code</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.employeeCode}
                            </td>
                            <td style={styles.label}>Name</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.firstName} {employee.lastName}
                            </td>
                        </tr>
                        <tr>
                            <td style={styles.label}>Designation</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.designation}
                            </td>
                            <td style={styles.label}>CNIC</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.cnic || "N/A"}
                            </td>
                        </tr>
                        <tr>
                            <td style={styles.label}>Bank Account Number</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.bankAccountNumber || "N/A"}
                            </td>
                            <td style={styles.label}>Bradford Factor Period</td>
                            <td style={styles.data} colSpan={2}>
                                {bradfordPeriod}
                            </td>
                        </tr>
                        <tr>
                            <td style={styles.label}>Bank Name</td>
                            <td style={styles.data} colSpan={2}>
                                {employee.bankName || "Cash"}
                            </td>
                            <td style={styles.label}>Bradford Factor</td>
                            <td
                                style={{
                                    ...styles.data,
                                    fontWeight: 700,
                                    color: bradfordColor,
                                }}
                                colSpan={2}
                            >
                                {effectiveBradford}
                                {payslip.bradfordFactorOverride != null && (
                                    <span
                                        style={{
                                            fontSize: 9,
                                            marginLeft: 4,
                                            color: "#9ca3af",
                                            fontWeight: 400,
                                        }}
                                    >
                                        (override)
                                    </span>
                                )}
                                {showActions && (
                                    <button
                                        type="button"
                                        onClick={() => setOverrideOpen(true)}
                                        title="Override Bradford Factor"
                                        data-no-print="true"
                                        style={{
                                            marginLeft: 6,
                                            background: "none",
                                            border: "none",
                                            cursor: "pointer",
                                            padding: 0,
                                            verticalAlign: "middle",
                                        }}
                                    >
                                        <Edit2
                                            style={{ width: 11, height: 11, color: "#9ca3af" }}
                                        />
                                    </button>
                                )}
                            </td>
                        </tr>

                        {/* Attendance */}
                        <tr>
                            <td
                                colSpan={6}
                                style={{ ...styles.data, paddingTop: 5, paddingBottom: 5 }}
                            >
                                <strong>Attendance: </strong>
                                <span style={{ marginRight: 14 }}>
                                    Present: <strong>{payslip.daysPresent ?? 0}</strong>
                                </span>
                                <span style={{ marginRight: 14 }}>
                                    Absent: <strong>{payslip.daysAbsent ?? 0}</strong>
                                </span>
                                <span style={{ marginRight: 14 }}>
                                    Leave: <strong>{payslip.daysLeave ?? 0}</strong>
                                </span>
                                <span style={{ marginRight: 14 }}>
                                    OT (Hrs):{" "}
                                    <strong>{payslip.totalOvertimeHours ?? "0.00"}</strong>
                                </span>
                                <span>
                                    Night Shifts: <strong>{payslip.nightShiftsCount ?? 0}</strong>
                                </span>
                            </td>
                        </tr>

                        {/* Column headers */}
                        <tr>
                            <th style={styles.hdr}>Earning</th>
                            <th style={{ ...styles.hdr, textAlign: "center" }}>Hrs/Days</th>
                            <th style={{ ...styles.hdr, textAlign: "right" }}>PKR</th>
                            <th style={styles.hdr}>Deduction</th>
                            <th style={{ ...styles.hdr, textAlign: "center" }}>Hrs/Days</th>
                            <th style={{ ...styles.hdr, textAlign: "right" }}>PKR</th>
                        </tr>

                        {/* Line items */}
                        {ep.map((earning, i) => {
                            const ded = dp[i];
                            return (
                                <tr key={i}>
                                    <td style={styles.data}>{earning?.label ?? ""}</td>
                                    <td style={{ ...styles.data, textAlign: "center" }}></td>
                                    <td style={styles.num}>
                                        {earning ? fmt(earning.value) : ""}
                                    </td>
                                    <td style={styles.data}>{ded?.label ?? ""}</td>
                                    <td style={{ ...styles.data, textAlign: "center" }}></td>
                                    <td style={styles.num}>{ded ? fmt(ded.value) : ""}</td>
                                </tr>
                            );
                        })}

                        {/* Totals */}
                        <tr>
                            <td colSpan={2} style={styles.totalLbl}>
                                Total Earnings
                            </td>
                            <td style={styles.totalNum}>{fmt(totalEarnings)}</td>
                            <td colSpan={2} style={styles.totalLbl}>
                                Total Deduction
                            </td>
                            <td style={styles.totalNum}>{fmt(totalDedns)}</td>
                        </tr>

                        {/* Net Pay */}
                        <tr>
                            <td
                                colSpan={4}
                                style={{ ...styles.netLbl, textAlign: "center", fontSize: 13 }}
                            >
                                Net Pay
                            </td>
                            <td style={{ ...styles.netNum, fontSize: 13 }}>{fmt(netPay)}</td>
                            <td
                                style={{ ...styles.netLbl, textAlign: "center", fontSize: 13 }}
                            >
                                PKR
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Remarks */}
                <div
                    style={{
                        border: B,
                        padding: "8px 10px",
                        minHeight: 54,
                        marginTop: 16,
                        marginBottom: 32,
                        fontSize: 11,
                    }}
                >
                    {payslip.remarks || "Salaries are paid as per company policy."}
                </div>

                {/* Signatures */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: 36,
                        paddingLeft: 8,
                        paddingRight: 8,
                    }}
                >
                    {["Employee Signature", "HR / Finance Manager"].map((label) => (
                        <div key={label} style={{ textAlign: "center", width: 200 }}>
                            <div
                                style={{
                                    borderTop: "1px solid #1f2937",
                                    paddingTop: 6,
                                    fontSize: 11,
                                    fontWeight: 700,
                                }}
                            >
                                {label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    style={{
                        marginTop: 20,
                        borderTop: "1px solid #f3f4f6",
                        paddingTop: 10,
                        textAlign: "center",
                        fontSize: 9,
                        color: "#9ca3af",
                        textTransform: "uppercase",
                        letterSpacing: 2,
                    }}
                >
                    System Generated Slip • Titan Enterprise
                </div>
            </div>
            {/* end printRef */}

            <OverrideBradfordDialog
                open={overrideOpen}
                onOpenChange={setOverrideOpen}
                payslipId={payslip.id}
                currentScore={
                    payslip.bradfordFactorOverride || payslip.bradfordFactorScore
                }
            />
        </div>
    );
};
