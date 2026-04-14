// import { useState, useRef } from "react";
// import { format, parseISO } from "date-fns";
// import { Button } from "@/components/ui/button";
// import { Printer, Mail, Loader2, Edit2 } from "lucide-react";
// import { useSendPayslipEmail } from "@/hooks/hr/use-send-payslip-email";
// import { OverrideBradfordDialog } from "./override-bradford-dialog";

// export type PayslipData = {
//     id: string;
//     employee: {
//         employeeCode: string;
//         firstName: string;
//         lastName: string;
//         cnic: string | null;
//         designation: string;
//         bankName: string | null;
//         bankAccountNumber: string | null;
//     };
//     payroll: {
//         month: string;
//         startDate: string;
//         endDate: string;
//     };
//     daysPresent: number | null;
//     daysAbsent: number | null;
//     daysLeave: number | null;
//     totalOvertimeHours: string | null;
//     nightShiftsCount: number | null;
//     bradfordFactorScore: string | null;
//     bradfordFactorOverride: string | null;
//     bradfordFactorPeriod: string | null;
//     basicSalary: string;
//     allowanceBreakdown: Record<string, number> | null;
//     overtimeAmount: string | null;
//     nightShiftAllowanceAmount: string | null;
//     incentiveAmount: string | null;
//     bonusAmount: string | null;
//     absentDeduction: string | null;
//     leaveDeduction: string | null;
//     advanceDeduction: string | null;
//     taxDeduction: string | null;
//     otherDeduction: string | null;
//     grossSalary: string;
//     totalDeductions: string;
//     netSalary: string;
//     remarks: string | null;
//     paymentSource?: string | null;
//     createdAt: Date;
// };

// type PayslipViewProps = {
//     payslip: PayslipData;
//     showActions?: boolean;
// };

// const allowanceLabels: Record<string, string> = {
//     houseRent: "House Rent Allowance",
//     utilities: "Utilities Allowance",
//     bikeMaintenance: "Bike Maintenance Allowance",
//     mobile: "Mobile Allowance",
//     fuel: "Fuel Allowance",
//     special: "Special Allowance",
//     conveyance: "Conveyance Allowance",
//     nightShift: "Night Shift Allowance",
//     technical: "Technical Allowance",
// };

// function fmt(val: number): string {
//     return val.toLocaleString("en-US", {
//         minimumFractionDigits: 0,
//         maximumFractionDigits: 0,
//     });
// }

// function toN(s: string | null | undefined): number {
//     const n = parseFloat(s || "0");
//     return isNaN(n) ? 0 : n;
// }

// const B = "none";

// const base: React.CSSProperties = {
//     border: B,
//     padding: "3px 7px",
//     fontSize: 11,
//     verticalAlign: "middle",
// };
// const styles = {
//     label: { ...base, fontWeight: 600 } as React.CSSProperties,
//     data: { ...base } as React.CSSProperties,
//     hdr: { ...base, fontWeight: 700, background: "#fff" } as React.CSSProperties,
//     num: {
//         ...base,
//         textAlign: "right" as const,
//         fontVariantNumeric: "tabular-nums",
//     } as React.CSSProperties,
//     totalLbl: {
//         ...base,
//         fontWeight: 700,
//         textAlign: "right" as const,
//         background: "#f3f4f6",
//     } as React.CSSProperties,
//     totalNum: {
//         ...base,
//         fontWeight: 700,
//         textAlign: "right" as const,
//         background: "#f3f4f6",
//         fontVariantNumeric: "tabular-nums",
//     } as React.CSSProperties,
//     netLbl: {
//         ...base,
//         fontWeight: 800,
//         background: "#ADD8E6",
//         fontSize: 12,
//     } as React.CSSProperties,
//     netNum: {
//         ...base,
//         fontWeight: 800,
//         background: "#ADD8E6",
//         fontSize: 12,
//         textAlign: "right" as const,
//         fontVariantNumeric: "tabular-nums",
//     } as React.CSSProperties,
// };

// export const PayslipView = ({
//     payslip,
//     showActions = true,
// }: PayslipViewProps) => {
//     const { employee, payroll } = payslip;
//     const sendEmailMutation = useSendPayslipEmail();
//     const [overrideOpen, setOverrideOpen] = useState(false);
//     const printRef = useRef<HTMLDivElement>(null);

//     // ── Bradford Factor ────────────────────────────────────────────────────
//     const effectiveBradford =
//         payslip.bradfordFactorOverride != null
//             ? toN(payslip.bradfordFactorOverride)
//             : toN(payslip.bradfordFactorScore);

//     const bradfordPeriod =
//         payslip.bradfordFactorPeriod ||
//         (payroll.startDate && payroll.endDate
//             ? `${format(parseISO(payroll.startDate), "d MMM yyyy")} to ${format(parseISO(payroll.endDate), "d MMM yyyy")}`
//             : "—");

//     const bradfordColor =
//         effectiveBradford === 0
//             ? "#15803d"
//             : effectiveBradford < 50
//                 ? "#a16207"
//                 : effectiveBradford < 250
//                     ? "#c2410c"
//                     : "#b91c1c";

//     // ── Earnings ───────────────────────────────────────────────────────────
//     const dynamicAllowances = Object.entries(payslip.allowanceBreakdown || {})
//         .filter(([key]) => key !== "basicSalary" && key !== "nightShift")
//         .map(([key, val]) => ({
//             label: allowanceLabels[key] || `${key} Allowance`,
//             value: Number(val),
//         }))
//         .filter((e) => e.value > 0);

//     const earnings: { label: string; value: number }[] = [
//         { label: "Basic Salary", value: toN(payslip.basicSalary) },
//         ...dynamicAllowances,
//         ...(toN(payslip.overtimeAmount) > 0
//             ? [{ label: "Overtime Amount", value: toN(payslip.overtimeAmount) }]
//             : []),
//         ...(toN(payslip.nightShiftAllowanceAmount) > 0
//             ? [
//                 {
//                     label: "Night Shift Allowance",
//                     value: toN(payslip.nightShiftAllowanceAmount),
//                 },
//             ]
//             : []),
//         ...(toN(payslip.incentiveAmount) + toN(payslip.bonusAmount) > 0
//             ? [
//                 {
//                     label: "Incentive / Bonus",
//                     value: toN(payslip.incentiveAmount) + toN(payslip.bonusAmount),
//                 },
//             ]
//             : []),
//     ];

//     // ── Deductions ─────────────────────────────────────────────────────────
//     const deductions: { label: string; value: number }[] = [
//         { label: "Income Tax", value: toN(payslip.taxDeduction) },
//         { label: "Absent / Undertime", value: toN(payslip.absentDeduction) },
//         { label: "Unapproved Leave", value: toN(payslip.leaveDeduction) },
//         { label: "Advance Recovery", value: toN(payslip.advanceDeduction) },
//         { label: "Other Deductions", value: toN(payslip.otherDeduction) },
//     ].filter((d) => d.value > 0);

//     const totalEarnings = earnings.reduce((s, e) => s + e.value, 0);
//     const totalDedns = deductions.reduce((s, d) => s + d.value, 0);
//     const netPay = Math.max(0, totalEarnings - totalDedns);

//     const rowCount = Math.max(earnings.length, deductions.length, 6);
//     const ep = [...earnings, ...Array(rowCount - earnings.length).fill(null)];
//     const dp = [...deductions, ...Array(rowCount - deductions.length).fill(null)];

//     // ── Print: open a full new tab with self-contained HTML (like COA) ──────
//     const handlePrint = () => {
//         const printWindow = window.open("", "_blank");
//         if (!printWindow) {
//             window.print();
//             return;
//         }

//         // Build the combined earnings/deductions table rows
//         const earningRows: string[] = [];
//         const deductionRows: string[] = [];
//         const maxRows = Math.max(earnings.length, deductions.length, 6);

//         for (let i = 0; i < maxRows; i++) {
//             const e = earnings[i];
//             const d = deductions[i];
//             earningRows.push(e ? `<td class="cell">${e.label}</td><td class="cell ta-center"></td><td class="cell num">${fmt(e.value)}</td>` : `<td class="cell"></td><td class="cell"></td><td class="cell"></td>`);
//             deductionRows.push(d ? `<td class="cell">${d.label}</td><td class="cell ta-center"></td><td class="cell num">${fmt(d.value)}</td>` : `<td class="cell"></td><td class="cell"></td><td class="cell"></td>`);
//         }

//         const combinedRows = earningRows
//             .map((er, i) => `<tr>${er}${deductionRows[i]}</tr>`)
//             .join("");

//         printWindow.document.write(`
//             <!DOCTYPE html>
//             <html>
//             <head>
//                 <meta charset="utf-8" />
//                 <title>Payslip - ${format(parseISO(payroll.month), "MMMM yyyy")} - ${employee.firstName} ${employee.lastName}</title>
//                 <style>
//                     @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

//                     * { margin: 0; padding: 0; box-sizing: border-box; }

//                     body {
//                         font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
//                         font-size: 11px;
//                         color: #111;
//                         background: white;
//                         padding: 0;
//                     }

//                     @media print {
//                         body { padding: 0; }
//                         .no-print { display: none !important; }
//                         @page { margin: 15mm; size: A4; }
//                     }

//                     .payslip {
//                         max-width: 780px;
//                         margin: 0 auto;
//                         padding: 40px;
//                     }

//                     /* Header */
//                     .header {
//                         display: flex;
//                         justify-content: space-between;
//                         align-items: flex-start;
//                         margin-bottom: 14px;
//                     }
//                     .header-left {
//                         display: flex;
//                         align-items: center;
//                         gap: 10px;
//                     }
//                     .company-name {
//                         font-size: 16px;
//                         font-weight: 800;
//                         text-transform: uppercase;
//                         letter-spacing: 0.5px;
//                     }
//                     .company-sub {
//                         font-size: 10px;
//                         color: #6b7280;
//                         font-style: italic;
//                     }
//                     .meta-right {
//                         text-align: right;
//                         font-size: 10px;
//                         color: #374151;
//                         line-height: 1.8;
//                     }

//                     /* Table styles */
//                     table {
//                         width: 100%;
//                         border-collapse: collapse;
//                         table-layout: fixed;
//                     }
//                     .cell {
//                         border: none;
//                         padding: 3px 7px;
//                         font-size: 11px;
//                         vertical-align: middle;
//                     }
//                     .cell-label {
//                         border: none;
//                         padding: 3px 7px;
//                         font-size: 11px;
//                         font-weight: 600;
//                         vertical-align: middle;
//                     }
//                     .cell-hdr {
//                         border: none;
//                         padding: 3px 7px;
//                         font-size: 11px;
//                         font-weight: 700;
//                         background: #fff;
//                     }
//                     .num {
//                         text-align: right;
//                         font-variant-numeric: tabular-nums;
//                     }
//                     .ta-center { text-align: center; }
//                     .ta-right { text-align: right; }
//                     .total-cell {
//                         border: none;
//                         padding: 3px 7px;
//                         font-weight: 700;
//                         text-align: right;
//                         background: #f3f4f6;
//                         -webkit-print-color-adjust: exact;
//                         print-color-adjust: exact;
//                     }
//                     .total-label {
//                         border: none;
//                         padding: 3px 7px;
//                         font-weight: 700;
//                         text-align: right;
//                         background: #f3f4f6;
//                         -webkit-print-color-adjust: exact;
//                         print-color-adjust: exact;
//                     }
//                     .net-cell {
//                         border: none;
//                         padding: 3px 7px;
//                         font-weight: 800;
//                         font-size: 13px;
//                         background: #ADD8E6;
//                         text-align: center;
//                         -webkit-print-color-adjust: exact;
//                         print-color-adjust: exact;
//                     }
//                     .net-num {
//                         border: none;
//                         padding: 3px 7px;
//                         font-weight: 800;
//                         font-size: 13px;
//                         background: #ADD8E6;
//                         text-align: right;
//                         font-variant-numeric: tabular-nums;
//                         -webkit-print-color-adjust: exact;
//                         print-color-adjust: exact;
//                     }
//                     .bradford {
//                         font-weight: 700;
//                         color: ${bradfordColor};
//                     }

//                     /* Remarks */
//                     .remarks {
//                         border: none;
//                         padding: 8px 10px;
//                         min-height: 54px;
//                         margin-top: 16px;
//                         margin-bottom: 32px;
//                         font-size: 11px;
//                     }

//                     /* Signatures */
//                     .signatures {
//                         display: flex;
//                         justify-content: space-between;
//                         padding-top: 36px;
//                         padding-left: 8px;
//                         padding-right: 8px;
//                     }
//                     .sig-block {
//                         text-align: center;
//                         width: 200px;
//                     }
//                     .sig-line {
//                         border-top: 1px solid #1f2937;
//                         padding-top: 6px;
//                         font-size: 11px;
//                         font-weight: 700;
//                     }

//                     /* Footer */
//                     .footer {
//                         margin-top: 20px;
//                         border-top: 1px solid #f3f4f6;
//                         padding-top: 10px;
//                         text-align: center;
//                         font-size: 9px;
//                         color: #9ca3af;
//                         text-transform: uppercase;
//                         letter-spacing: 2px;
//                     }
//                 </style>
//             </head>
//             <body>
//                 <div class="payslip">
//                     <!-- Header -->
//                     <div class="header">
//                         <div class="header-left">
//                             <img src="/company-logo-transparent.png" alt="Muftah Chemical" style="width: 50px; height: 50px; object-fit: contain; margin-right: 4px;" />
//                             <div>
//                                 <div class="company-name">Muftah Chemical PVT LTD</div>
//                                 <div class="company-sub">Confidential Payslip</div>
//                             </div>
//                         </div>
//                         <div class="meta-right">
//                             <div><strong>Month:</strong> ${format(parseISO(payroll.month), "MMMM yyyy")}</div>
//                             <div><strong>Period:</strong> ${format(parseISO(payroll.startDate), "dd MMM yyyy")} to ${format(parseISO(payroll.endDate), "dd MMM yyyy")}</div>
//                             <div><strong>Slip ID:</strong> ${payslip.id.slice(0, 8).toUpperCase()}</div>
//                         </div>
//                     </div>

//                     <!-- Master table -->
//                     <table>
//                         <colgroup>
//                             <col style="width: 18%" />
//                             <col style="width: 7%" />
//                             <col style="width: 11%" />
//                             <col style="width: 20%" />
//                             <col style="width: 7%" />
//                             <col style="width: 11%" />
//                         </colgroup>
//                         <tbody>
//                             <!-- Employee info -->
//                             <tr>
//                                 <td class="cell-label">Employee Code</td>
//                                 <td class="cell" colspan="2">${employee.employeeCode}</td>
//                                 <td class="cell-label">Name</td>
//                                 <td class="cell" colspan="2">${employee.firstName} ${employee.lastName}</td>
//                             </tr>
//                             <tr>
//                                 <td class="cell-label">Designation</td>
//                                 <td class="cell" colspan="2">${employee.designation}</td>
//                                 <td class="cell-label">CNIC</td>
//                                 <td class="cell" colspan="2">${employee.cnic || "N/A"}</td>
//                             </tr>
//                             <tr>
//                                 <td class="cell-label">Payment Method</td>
//                                 <td class="cell" colspan="2">${employee.bankAccountNumber ? "Bank Transfer" : "Cash"}</td>
//                                 <td class="cell-label">Bradford Factor Period</td>
//                                 <td class="cell" colspan="2">${bradfordPeriod}</td>
//                             </tr>
//                             <tr>
//                                 <td class="cell-label">Account Details</td>
//                                 <td class="cell" colspan="2">${employee.bankAccountNumber ? `${employee.bankName} - ${employee.bankAccountNumber} (${employee.firstName} ${employee.lastName})` : "—"}</td>
//                                 <td class="cell-label">Bradford Factor</td>
//                                 <td class="cell bradford" colspan="2">${effectiveBradford}${payslip.bradfordFactorOverride != null ? ' <span style="font-size:9px;color:#9ca3af;font-weight:400">(override)</span>' : ""}</td>
//                             </tr>

//                             <!-- Attendance -->
//                             <tr>
//                                 <td class="cell" colspan="6" style="padding-top:5px;padding-bottom:5px">
//                                     <strong>Attendance:</strong>
//                                     <span style="margin-right:14px">Present: <strong>${payslip.daysPresent ?? 0}</strong></span>
//                                     <span style="margin-right:14px">Absent: <strong>${payslip.daysAbsent ?? 0}</strong></span>
//                                     <span style="margin-right:14px">Leave: <strong>${payslip.daysLeave ?? 0}</strong></span>
//                                     <span style="margin-right:14px">OT (Hrs): <strong>${payslip.totalOvertimeHours ?? "0.00"}</strong></span>
//                                     <span>Night Shifts: <strong>${payslip.nightShiftsCount ?? 0}</strong></span>
//                                 </td>
//                             </tr>

//                             <!-- Column headers -->
//                             <tr>
//                                 <th class="cell-hdr">Earning</th>
//                                 <th class="cell-hdr ta-center">Hrs/Days</th>
//                                 <th class="cell-hdr ta-right">PKR</th>
//                                 <th class="cell-hdr">Deduction</th>
//                                 <th class="cell-hdr ta-center">Hrs/Days</th>
//                                 <th class="cell-hdr ta-right">PKR</th>
//                             </tr>

//                             <!-- Line items -->
//                             ${combinedRows}

//                             <!-- Totals -->
//                             <tr>
//                                 <td class="total-label" colspan="2">Total Earnings</td>
//                                 <td class="total-cell">${fmt(totalEarnings)}</td>
//                                 <td class="total-label" colspan="2">Total Deduction</td>
//                                 <td class="total-cell">${fmt(totalDedns)}</td>
//                             </tr>

//                             <!-- Net Pay -->
//                             <tr>
//                                 <td class="net-cell" colspan="4">Net Pay</td>
//                                 <td class="net-num">${fmt(netPay)}</td>
//                                 <td class="net-cell">PKR</td>
//                             </tr>
//                         </tbody>
//                     </table>

//                     <!-- Remarks -->
//                     <div class="remarks">
//                         ${payslip.remarks || "Salaries are paid as per company policy."}
//                         <br/><br/>
//                         ${payslip.paymentSource ? `<strong>Paid From:</strong> ${payslip.paymentSource}` : ""}
//                     </div>

//                     <!-- Footer -->
//                     <div class="footer">
//                         System Generated Slip • Muftah Chemical PVT LTD (S-WASH)
//                     </div>
//                 </div>
//             </body>
//             </html>
//         `);

//         printWindow.document.close();

//         // Wait for fonts/content to render before triggering the print dialog
//         setTimeout(() => {
//             try {
//                 printWindow.focus();
//                 printWindow.print();
//             } catch (_) {
//                 // Some browsers block programmatic print — user can use Ctrl+P
//             }
//         }, 400);
//     };

//     return (
//         <div
//             style={{
//                 maxWidth: 780,
//                 margin: "0 auto",
//                 background: "#fff",
//                 fontFamily: "Arial, sans-serif",
//                 color: "#111",
//             }}
//         >
//             {/* ── Actions toolbar ── */}
//             {showActions && (
//                 <div className="flex justify-end gap-3 print:hidden py-3 px-4 border-b border-gray-200 mb-4 bg-gray-50">
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={handlePrint}
//                         className="h-8 text-xs font-semibold"
//                     >
//                         <Printer className="size-3.5 mr-2" /> Print / Save PDF
//                     </Button>
//                     <Button
//                         variant="default"
//                         size="sm"
//                         onClick={() => sendEmailMutation.mutate(payslip.id)}
//                         disabled={sendEmailMutation.isPending}
//                         className="h-8 text-xs font-semibold"
//                     >
//                         {sendEmailMutation.isPending ? (
//                             <Loader2 className="size-3.5 mr-2 animate-spin" />
//                         ) : (
//                             <Mail className="size-3.5 mr-2" />
//                         )}
//                         Email Payslip
//                     </Button>
//                 </div>
//             )}

//             {/*
//               ┌─────────────────────────────────────────────────────┐
//               │  printRef wraps ONLY the slip content.              │
//               │  Toolbar buttons and dialogs are OUTSIDE this ref.  │
//               │  handlePrint copies innerHTML of this div into      │
//               │  a clean popup window — no sidebar, no overlay.     │
//               └─────────────────────────────────────────────────────┘
//             */}
//             <div ref={printRef} style={{ padding: "24px 28px" }}>
//                 {/* Company header */}
//                 <div
//                     style={{
//                         display: "flex",
//                         justifyContent: "space-between",
//                         alignItems: "flex-start",
//                         marginBottom: 14,
//                     }}
//                 >
//                     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                         <img 
//                             src="/company-logo-transparent.png" 
//                             alt="Logo" 
//                             style={{ width: 44, height: 44, objectFit: "contain" }} 
//                         />
//                         <div>
//                             <div
//                                 style={{
//                                     fontSize: 15,
//                                     fontWeight: 800,
//                                     textTransform: "uppercase",
//                                     letterSpacing: 0.5,
//                                 }}
//                             >
//                                 Muftah Chemical PVT LTD
//                             </div>
//                             <div
//                                 style={{ fontSize: 10, color: "#6b7280", fontStyle: "italic" }}
//                             >
//                                 Confidential Payslip
//                             </div>
//                         </div>
//                     </div>
//                     <div
//                         style={{
//                             textAlign: "right",
//                             fontSize: 10,
//                             color: "#374151",
//                             lineHeight: 1.8,
//                         }}
//                     >
//                         <div>
//                             <strong>Month:</strong>{" "}
//                             {format(parseISO(payroll.month), "MMMM yyyy")}
//                         </div>
//                         <div>
//                             <strong>Period:</strong>{" "}
//                             {format(parseISO(payroll.startDate), "dd MMM yyyy")} to{" "}
//                             {format(parseISO(payroll.endDate), "dd MMM yyyy")}
//                         </div>
//                         <div>
//                             <strong>Slip ID:</strong> {payslip.id.slice(0, 8).toUpperCase()}
//                         </div>
//                     </div>
//                 </div>

//                 {/* Single master table */}
//                 <table>
//                     <colgroup>
//                         <col style={{ width: "18%" }} />
//                         <col style={{ width: "7%" }} />
//                         <col style={{ width: "11%" }} />
//                         <col style={{ width: "20%" }} />
//                         <col style={{ width: "7%" }} />
//                         <col style={{ width: "11%" }} />
//                     </colgroup>
//                     <tbody>
//                         {/* Employee info */}
//                         <tr>
//                             <td style={styles.label}>Employee Code</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.employeeCode}
//                             </td>
//                             <td style={styles.label}>Name</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.firstName} {employee.lastName}
//                             </td>
//                         </tr>
//                         <tr>
//                             <td style={styles.label}>Designation</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.designation}
//                             </td>
//                             <td style={styles.label}>CNIC</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.cnic || "N/A"}
//                             </td>
//                         </tr>
//                         <tr>
//                             <td style={styles.label}>Payment Method</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.bankAccountNumber ? "Bank Transfer" : "Cash"}
//                             </td>
//                             <td style={styles.label}>Bradford Factor Period</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {bradfordPeriod}
//                             </td>
//                         </tr>
//                         <tr>
//                             <td style={styles.label}>Account Details</td>
//                             <td style={styles.data} colSpan={2}>
//                                 {employee.bankAccountNumber ? `${employee.bankName} - ${employee.bankAccountNumber} (${employee.firstName} ${employee.lastName})` : "—"}
//                             </td>
//                             <td style={styles.label}>Bradford Factor</td>
//                             <td
//                                 style={{
//                                     ...styles.data,
//                                     fontWeight: 700,
//                                     color: bradfordColor,
//                                 }}
//                                 colSpan={2}
//                             >
//                                 {effectiveBradford}
//                                 {payslip.bradfordFactorOverride != null && (
//                                     <span
//                                         style={{
//                                             fontSize: 9,
//                                             marginLeft: 4,
//                                             color: "#9ca3af",
//                                             fontWeight: 400,
//                                         }}
//                                     >
//                                         (override)
//                                     </span>
//                                 )}
//                                 {showActions && (
//                                     <button
//                                         type="button"
//                                         onClick={() => setOverrideOpen(true)}
//                                         title="Override Bradford Factor"
//                                         data-no-print="true"
//                                         style={{
//                                             marginLeft: 6,
//                                             background: "none",
//                                             border: "none",
//                                             cursor: "pointer",
//                                             padding: 0,
//                                             verticalAlign: "middle",
//                                         }}
//                                     >
//                                         <Edit2
//                                             style={{ width: 11, height: 11, color: "#9ca3af" }}
//                                         />
//                                     </button>
//                                 )}
//                             </td>
//                         </tr>

//                         {/* Attendance */}
//                         <tr>
//                             <td
//                                 colSpan={6}
//                                 style={{ ...styles.data, paddingTop: 5, paddingBottom: 5 }}
//                             >
//                                 <strong>Attendance: </strong>
//                                 <span style={{ marginRight: 14 }}>
//                                     Present: <strong>{payslip.daysPresent ?? 0}</strong>
//                                 </span>
//                                 <span style={{ marginRight: 14 }}>
//                                     Absent: <strong>{payslip.daysAbsent ?? 0}</strong>
//                                 </span>
//                                 <span style={{ marginRight: 14 }}>
//                                     Leave: <strong>{payslip.daysLeave ?? 0}</strong>
//                                 </span>
//                                 <span style={{ marginRight: 14 }}>
//                                     OT (Hrs):{" "}
//                                     <strong>{payslip.totalOvertimeHours ?? "0.00"}</strong>
//                                 </span>
//                                 <span>
//                                     Night Shifts: <strong>{payslip.nightShiftsCount ?? 0}</strong>
//                                 </span>
//                             </td>
//                         </tr>

//                         {/* Column headers */}
//                         <tr>
//                             <th style={styles.hdr}>Earning</th>
//                             <th style={{ ...styles.hdr, textAlign: "center" }}>Hrs/Days</th>
//                             <th style={{ ...styles.hdr, textAlign: "right" }}>PKR</th>
//                             <th style={styles.hdr}>Deduction</th>
//                             <th style={{ ...styles.hdr, textAlign: "center" }}>Hrs/Days</th>
//                             <th style={{ ...styles.hdr, textAlign: "right" }}>PKR</th>
//                         </tr>

//                         {/* Line items */}
//                         {ep.map((earning, i) => {
//                             const ded = dp[i];
//                             return (
//                                 <tr key={i}>
//                                     <td style={styles.data}>{earning?.label ?? ""}</td>
//                                     <td style={{ ...styles.data, textAlign: "center" }}></td>
//                                     <td style={styles.num}>
//                                         {earning ? fmt(earning.value) : ""}
//                                     </td>
//                                     <td style={styles.data}>{ded?.label ?? ""}</td>
//                                     <td style={{ ...styles.data, textAlign: "center" }}></td>
//                                     <td style={styles.num}>{ded ? fmt(ded.value) : ""}</td>
//                                 </tr>
//                             );
//                         })}

//                         {/* Totals */}
//                         <tr>
//                             <td colSpan={2} style={styles.totalLbl}>
//                                 Total Earnings
//                             </td>
//                             <td style={styles.totalNum}>{fmt(totalEarnings)}</td>
//                             <td colSpan={2} style={styles.totalLbl}>
//                                 Total Deduction
//                             </td>
//                             <td style={styles.totalNum}>{fmt(totalDedns)}</td>
//                         </tr>

//                         {/* Net Pay */}
//                         <tr>
//                             <td
//                                 colSpan={4}
//                                 style={{ ...styles.netLbl, textAlign: "center", fontSize: 13 }}
//                             >
//                                 Net Pay
//                             </td>
//                             <td style={{ ...styles.netNum, fontSize: 13 }}>{fmt(netPay)}</td>
//                             <td
//                                 style={{ ...styles.netLbl, textAlign: "center", fontSize: 13 }}
//                             >
//                                 PKR
//                             </td>
//                         </tr>
//                     </tbody>
//                 </table>

//                 {/* Remarks */}
//                 <div
//                     style={{
//                         border: B,
//                         padding: "8px 10px",
//                         minHeight: 54,
//                         marginTop: 16,
//                         marginBottom: 32,
//                         fontSize: 11,
//                     }}
//                 >
//                     {payslip.remarks || "Salaries are paid as per company policy."}
//                     {payslip.paymentSource && (
//                         <div style={{ marginTop: 8 }}>
//                             <strong>Paid From:</strong> {payslip.paymentSource}
//                         </div>
//                     )}
//                 </div>

//                 {/* Signatures removed */}

//                 {/* Footer */}
//                 <div
//                     style={{
//                         marginTop: 20,
//                         borderTop: "1px solid #f3f4f6",
//                         paddingTop: 10,
//                         textAlign: "center",
//                         fontSize: 9,
//                         color: "#9ca3af",
//                         textTransform: "uppercase",
//                         letterSpacing: 2,
//                     }}
//                 >
//                     System Generated Slip • Muftah Chemical PVT LTD
//                 </div>
//             </div>
//             {/* end printRef */}

//             <OverrideBradfordDialog
//                 open={overrideOpen}
//                 onOpenChange={setOverrideOpen}
//                 payslipId={payslip.id}
//                 currentScore={
//                     payslip.bradfordFactorOverride || payslip.bradfordFactorScore
//                 }
//             />
//         </div>
//     );
// };


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
    paymentSource?: string | null;
    createdAt: Date;
};

type PayslipViewProps = {
    payslip: PayslipData;
    showActions?: boolean;
};

const allowanceLabels: Record<string, string> = {
    houseRent: "House Rent",
    utilities: "Utilities Allowance",
    bikeMaintenance: "Bike Maintenance",
    mobile: "Mobile Package",
    fuel: "Fuel Allowance",
    special: "Special Allowance",
    conveyance: "Conveyance Allowance",
    nightShift: "Night Shift Allowance",
    technical: "Technical Allowance",
};

function fmt(val: number): string {
    if (val === 0) return "";
    return val.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}

function toN(s: string | null | undefined): number {
    const n = parseFloat(s || "0");
    return isNaN(n) ? 0 : n;
}

const COLORS = {
    headerBlue: "#5b9bd5",
    lightBlue: "#ddebf7",
    border: "#000000",
};

export const PayslipView = ({
    payslip,
    showActions = true,
}: PayslipViewProps) => {
    const { employee, payroll } = payslip;
    const sendEmailMutation = useSendPayslipEmail();
    const [overrideOpen, setOverrideOpen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    const effectiveBradford =
        payslip.bradfordFactorOverride != null
            ? toN(payslip.bradfordFactorOverride)
            : toN(payslip.bradfordFactorScore);

    const bradfordPeriod =
        payslip.bradfordFactorPeriod ||
        (payroll.startDate && payroll.endDate
            ? `${format(parseISO(payroll.startDate), "d MMM yyyy")} to ${format(parseISO(payroll.endDate), "d MMM yyyy")}`
            : "—");

    const dynamicAllowances = Object.entries(payslip.allowanceBreakdown || {})
        .filter(([key]) => key !== "basicSalary" && key !== "nightShift")
        .map(([key, val]) => ({
            label: allowanceLabels[key] || `${key} Allowance`,
            value: Number(val),
        }))
        .filter((e) => e.value > 0);

    const earnings = [
        { label: "Basic Salary", value: toN(payslip.basicSalary) },
        ...dynamicAllowances,
        ...(toN(payslip.overtimeAmount) > 0 ? [{ label: "Overtime", value: toN(payslip.overtimeAmount) }] : []),
        ...(toN(payslip.nightShiftAllowanceAmount) > 0 ? [{ label: "Night Shift", value: toN(payslip.nightShiftAllowanceAmount) }] : []),
        ...(toN(payslip.incentiveAmount) + toN(payslip.bonusAmount) > 0 ? [{ label: "Incentive / Bonus", value: toN(payslip.incentiveAmount) + toN(payslip.bonusAmount) }] : []),
    ];

    const deductions = [
        { label: "Income Tax", value: toN(payslip.taxDeduction) },
        { label: "Absent / Undertime", value: toN(payslip.absentDeduction) },
        { label: "Unapproved Leave", value: toN(payslip.leaveDeduction) },
        { label: "Loan Recovery", value: toN(payslip.advanceDeduction) },
        { label: "Other Deductions", value: toN(payslip.otherDeduction) },
    ].filter((d) => d.value > 0);

    const totalEarnings = earnings.reduce((s, e) => s + e.value, 0);
    const totalDedns = deductions.reduce((s, d) => s + d.value, 0);
    const netPay = Math.max(0, totalEarnings - totalDedns);

    const rowCount = Math.max(earnings.length, deductions.length, 6);
    const ep = [...earnings, ...Array(rowCount - earnings.length).fill(null)];
    const dp = [...deductions, ...Array(rowCount - deductions.length).fill(null)];

    const handlePrint = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            window.print();
            return;
        }

        const earningRows: string[] = [];
        const deductionRows: string[] = [];

        for (let i = 0; i < rowCount; i++) {
            const e = ep[i];
            const d = dp[i];
            earningRows.push(e ? `<td class="cell">${e.label}</td><td class="cell text-center"></td><td class="cell text-right pr-4">${fmt(e.value)}</td>` : `<td class="cell"></td><td class="cell"></td><td class="cell"></td>`);
            deductionRows.push(d ? `<td class="cell pl-2" style="border-left: 2px solid black;">${d.label}</td><td class="cell text-center"></td><td class="cell text-right pr-4">${fmt(d.value)}</td>` : `<td class="cell" style="border-left: 2px solid black;"></td><td class="cell"></td><td class="cell"></td>`);
        }

        const combinedRows = earningRows.map((er, i) => `<tr>${er}${deductionRows[i]}</tr>`).join("");

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <title>Payslip - ${format(parseISO(payroll.month), "MMM-yy")} - ${employee.firstName}</title>
                <style>
                    * { box-sizing: border-box; font-family: Arial, sans-serif; }
                    body { margin: 0; padding: 20px; font-size: 13px; color: #000; }
                    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
                    .border-black { border: 2px solid ${COLORS.border}; }
                    .bg-blue { background-color: ${COLORS.headerBlue}; color: black; font-weight: bold; }
                    .bg-lightblue { background-color: ${COLORS.lightBlue}; font-weight: bold; }
                    .cell { padding: 4px 6px; font-size: 12px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .pr-4 { padding-right: 16px; }
                    .pl-2 { padding-left: 8px; }
                    .flex { display: flex; }
                    .justify-between { justify-content: space-between; }
                    .font-bold { font-weight: bold; }
                    .logo-box { width: 30px; height: 30px; background: white; padding: 2px; border-radius: 4px; display: inline-block; vertical-align: middle; margin-right: 8px; }
                    .header-title { display: inline-block; vertical-align: middle; font-size: 16px; }
                </style>
            </head>
            <body>
                <div class="border-black">
                    <div class="bg-blue text-center" style="padding: 6px;">
                        <img src="/company-logo-transparent.png" class="logo-box" />
                        <span class="header-title">Muftah Chemical Pvt Ltd.</span>
                    </div>
                    
                    <div class="bg-lightblue text-center border-black" style="border-left:0; border-right:0; padding: 4px; font-size: 14px;">
                        STATEMENT OF EARNINGS
                    </div>

                    <table style="border-bottom: 2px solid black;">
                        <colgroup><col style="width: 25%"/><col style="width: 25%"/><col style="width: 25%"/><col style="width: 25%"/></colgroup>
                        <tbody>
                            <tr>
                                <td class="cell font-bold" colspan="2">${employee.employeeCode}</td>
                                <td class="cell font-bold">Payroll Month</td>
                                <td class="cell text-center">${format(parseISO(payroll.month), "MMM-yy")}</td>
                            </tr>
                            <tr>
                                <td class="cell font-bold" colspan="2">${employee.firstName} ${employee.lastName}</td>
                                <td class="cell font-bold">CNIC</td>
                                <td class="cell text-center">${employee.cnic || "-"}</td>
                            </tr>
                            <tr>
                                <td class="cell font-bold" colspan="2">${employee.designation}</td>
                                <td class="cell font-bold">Vacation Balance to Year End</td>
                                <td class="cell text-center">${payslip.daysLeave !== null ? `${14 - payslip.daysLeave} Days` : "14 Days"}</td>
                            </tr>
                            <tr><td colspan="4" style="height: 12px;"></td></tr>
                            <tr>
                                <td class="cell font-bold">Bank Account Number</td>
                                <td class="cell text-right pr-4">${employee.bankAccountNumber || ""}</td>
                                <td class="cell font-bold">Bradford factor Period</td>
                                <td class="cell text-center">${bradfordPeriod}</td>
                            </tr>
                            <tr>
                                <td class="cell font-bold">Bank Name</td>
                                <td class="cell text-right pr-4">${employee.bankName || ""}</td>
                                <td class="cell font-bold">Bradford factor</td>
                                <td class="cell text-center">${effectiveBradford}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table>
                        <colgroup>
                            <col style="width: 28%"/><col style="width: 11%"/><col style="width: 11%"/>
                            <col style="width: 28%"/><col style="width: 11%"/><col style="width: 11%"/>
                        </colgroup>
                        <thead>
                            <tr class="bg-lightblue" style="border-bottom: 2px solid black;">
                                <th class="cell text-left pl-2">Earning</th>
                                <th class="cell text-center">Hrs/Days</th>
                                <th class="cell text-right pr-4">PKR</th>
                                <th class="cell text-left pl-2" style="border-left: 2px solid black;">Deduction</th>
                                <th class="cell text-center">Hrs/Days</th>
                                <th class="cell text-right pr-4">PKR</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${combinedRows}
                            <tr style="border-top: 2px solid black;">
                                <td class="cell text-center font-bold" colspan="2">Total Earnings</td>
                                <td class="cell text-right pr-4 font-bold border-black" style="border-top:0; border-bottom:0;">${totalEarnings > 0 ? fmt(totalEarnings) : ""}</td>
                                <td class="cell text-center font-bold" colspan="2">Total Deduction</td>
                                <td class="cell text-right pr-4 font-bold border-black" style="border-top:0; border-bottom:0; border-right:0;">${totalDedns > 0 ? fmt(totalDedns) : ""}</td>
                            </tr>
                            <tr class="bg-lightblue border-black" style="border-left:0; border-right:0;">
                                <td class="cell text-center font-bold" colspan="4">Net Pay</td>
                                <td class="cell text-right pr-4 font-bold border-black" style="border-top:0; border-bottom:0;">${fmt(netPay)}</td>
                                <td class="cell text-center font-bold">PKR</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="border-black" style="margin-top: 20px; min-height: 60px; padding: 8px 12px; font-size: 12px;">
                    ${payslip.remarks || `${format(parseISO(payroll.month), "MMM")} Salary processed successfully.`}
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();
        setTimeout(() => {
            try {
                printWindow.focus();
                printWindow.print();
            } catch (_) { }
        }, 400);
    };

    return (
        <div className="w-full max-w-[850px] mx-auto bg-white font-sans text-black">
            {showActions && (
                <div className="flex justify-end gap-3 print:hidden py-3 px-4 border-b border-gray-200 mb-6 bg-gray-50 rounded-t-lg">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs font-semibold">
                        <Printer className="size-3.5 mr-2" /> Print / Save PDF
                    </Button>
                    <Button variant="default" size="sm" onClick={() => sendEmailMutation.mutate(payslip.id)} disabled={sendEmailMutation.isPending} className="h-8 text-xs font-semibold">
                        {sendEmailMutation.isPending ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Mail className="size-3.5 mr-2" />}
                        Email Payslip
                    </Button>
                </div>
            )}

            <div ref={printRef} className="p-4 sm:p-8">
                <div className="border-[2px] border-black text-[13px] leading-tight">
                    {/* Header */}
                    <div className="flex items-center justify-center p-2" style={{ backgroundColor: COLORS.headerBlue }}>
                        <div className="bg-white p-0.5 rounded mr-3 h-8 w-8 flex items-center justify-center">
                            <img src="/company-logo-transparent.png" alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <span className="text-[17px] font-bold tracking-wide">Muftah Chemical Pvt Ltd.</span>
                    </div>

                    {/* Sub Header */}
                    <div className="text-center py-1.5 font-bold border-y-[2px] border-black text-[14px]" style={{ backgroundColor: COLORS.lightBlue }}>
                        STATEMENT OF EARNINGS
                    </div>

                    {/* Employee & Payroll Details Grid */}
                    <div className="grid grid-cols-4 border-b-[2px] border-black divide-x-0">
                        {/* Left Side Data */}
                        <div className="col-span-2 p-2">
                            <div className="font-bold">{employee.employeeCode}</div>
                            <div className="font-bold">{employee.firstName} {employee.lastName}</div>
                            <div className="font-bold">{employee.designation}</div>
                            <div className="mt-5 flex justify-between font-bold">
                                <span>Bank Account Number</span>
                                <span className="font-normal">{employee.bankAccountNumber || ""}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span>Bank Name</span>
                                <span className="font-normal">{employee.bankName || ""}</span>
                            </div>
                        </div>
                        {/* Right Side Data */}
                        <div className="col-span-2 p-2 grid grid-cols-2 gap-y-0.5">
                            <div className="font-bold">Payroll Month</div>
                            <div className="text-center">{format(parseISO(payroll.month), "MMM-yy")}</div>

                            <div className="font-bold">CNIC</div>
                            <div className="text-center">{employee.cnic || "-"}</div>

                            <div className="font-bold">Vacation Balance to Year End</div>
                            <div className="text-center">{payslip.daysLeave !== null ? `${14 - payslip.daysLeave} Days` : "14 Days"}</div>

                            <div className="col-span-2 h-4"></div>

                            <div className="font-bold">Bradford factor Period</div>
                            <div className="text-center">{bradfordPeriod}</div>

                            <div className="font-bold flex items-center">
                                Bradford factor
                                {showActions && (
                                    <button onClick={() => setOverrideOpen(true)} className="ml-2 hover:bg-gray-100 p-1 rounded" title="Override Bradford Factor">
                                        <Edit2 className="w-3 h-3 text-gray-500" />
                                    </button>
                                )}
                            </div>
                            <div className="text-center flex justify-center items-center gap-2">
                                {effectiveBradford}
                                {payslip.bradfordFactorOverride != null && <span className="text-[10px] text-gray-500">(override)</span>}
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full table-fixed border-collapse">
                        <colgroup>
                            <col style={{ width: "28%" }} />
                            <col style={{ width: "11%" }} />
                            <col style={{ width: "11%" }} />
                            <col style={{ width: "28%" }} />
                            <col style={{ width: "11%" }} />
                            <col style={{ width: "11%" }} />
                        </colgroup>
                        <thead>
                            <tr className="border-b-[2px] border-black" style={{ backgroundColor: COLORS.lightBlue }}>
                                <th className="py-1.5 pl-2 text-left font-bold">Earning</th>
                                <th className="py-1.5 text-center font-bold">Hrs/Days</th>
                                <th className="py-1.5 pr-4 text-right font-bold">PKR</th>
                                <th className="py-1.5 pl-2 text-left font-bold border-l-[2px] border-black">Deduction</th>
                                <th className="py-1.5 text-center font-bold">Hrs/Days</th>
                                <th className="py-1.5 pr-4 text-right font-bold">PKR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ep.map((earning, i) => {
                                const ded = dp[i];
                                return (
                                    <tr key={i}>
                                        <td className="py-1 pl-2">{earning?.label ?? ""}</td>
                                        <td className="py-1 text-center"></td>
                                        <td className="py-1 pr-4 text-right">{earning && earning.value > 0 ? fmt(earning.value) : ""}</td>
                                        <td className="py-1 pl-2 border-l-[2px] border-black">{ded?.label ?? ""}</td>
                                        <td className="py-1 text-center"></td>
                                        <td className="py-1 pr-4 text-right">{ded && ded.value > 0 ? fmt(ded.value) : ""}</td>
                                    </tr>
                                );
                            })}

                            {/* Totals */}
                            <tr className="border-t-[2px] border-black">
                                <td colSpan={2} className="py-1.5 text-center font-bold">Total Earnings</td>
                                <td className="py-1.5 pr-4 text-right font-bold border-l-[2px] border-black">{totalEarnings > 0 ? fmt(totalEarnings) : ""}</td>
                                <td colSpan={2} className="py-1.5 text-center font-bold border-l-[2px] border-black">Total Deduction</td>
                                <td className="py-1.5 pr-4 text-right font-bold border-l-[2px] border-black">{totalDedns > 0 ? fmt(totalDedns) : ""}</td>
                            </tr>

                            {/* Net Pay */}
                            <tr className="border-t-[2px] border-black" style={{ backgroundColor: COLORS.lightBlue }}>
                                <td colSpan={4} className="py-1.5 text-center font-bold text-[14px]">Net Pay</td>
                                <td className="py-1.5 pr-4 text-right font-bold text-[14px] border-l-[2px] border-black">{fmt(netPay)}</td>
                                <td className="py-1.5 text-center font-bold text-[14px] border-l-[2px] border-black">PKR</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Remarks Footer */}
                <div className="border-[2px] border-black mt-6 p-3 min-h-[70px] text-[13px] flex items-end">
                    {payslip.remarks || `${format(parseISO(payroll.month), "MMM")} Salary includes OTL exceptions from standard period.`}
                </div>
            </div>

            <OverrideBradfordDialog
                open={overrideOpen}
                onOpenChange={setOverrideOpen}
                payslipId={payslip.id}
                currentScore={payslip.bradfordFactorOverride || payslip.bradfordFactorScore}
            />
        </div>
    );
};