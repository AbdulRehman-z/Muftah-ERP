import { format, parseISO } from "date-fns";

export function generatePayslipEmailHtml(payslip: any) {
    const { employee, payroll } = payslip;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: sans-serif; color: #333; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; color: #1a1a1a; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; }
            .label { color: #666; }
            .value { font-weight: bold; }
            .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 2px solid #eee; font-size: 18px; font-weight: bold; }
            .net-pay { color: #000; background: #f4f4f4; padding: 10px; border-radius: 5px; }
            .footer { font-size: 12px; color: #999; text-align: center; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="title">TITAN ENTERPRISE</div>
                <div class="subtitle">Payslip - ${format(parseISO(payroll.month), "MMMM yyyy")}</div>
            </div>

            <div class="section">
                <div class="section-title">Employee Details</div>
                <div class="row"><span class="label">Name:</span> <span class="value">${employee.firstName} ${employee.lastName}</span></div>
                <div class="row"><span class="label">Employee ID:</span> <span class="value">${employee.employeeCode}</span></div>
                <div class="row"><span class="label">Designation:</span> <span class="value">${employee.designation}</span></div>
            </div>

            <div class="section">
                <div class="section-title">Earnings</div>
                <div class="row"><span class="label">Basic Salary:</span> <span class="value">PKR ${Math.round(parseFloat(payslip.basicSalary)).toLocaleString()}</span></div>
                ${parseFloat(payslip.overtimeAmount || "0") > 0 ? `<div class="row"><span class="label">Overtime:</span> <span class="value">PKR ${Math.round(parseFloat(payslip.overtimeAmount)).toLocaleString()}</span></div>` : ""}
                ${parseFloat(payslip.incentiveAmount || "0") > 0 ? `<div class="row"><span class="label">Incentives:</span> <span class="value">PKR ${Math.round(parseFloat(payslip.incentiveAmount)).toLocaleString()}</span></div>` : ""}
                <div class="row"><span class="label">Gross Salary:</span> <span class="value">PKR ${Math.round(parseFloat(payslip.grossSalary)).toLocaleString()}</span></div>
            </div>

            <div class="section">
                <div class="section-title">Deductions</div>
                <div class="row"><span class="label">Total Deductions:</span> <span class="value">PKR ${Math.round(parseFloat(payslip.totalDeductions)).toLocaleString()}</span></div>
            </div>

            <div class="total-row net-pay">
                <span>Net Payable:</span>
                <span>PKR ${Math.round(parseFloat(payslip.netSalary)).toLocaleString()}</span>
            </div>

            <div class="footer">
                <p>This is an automated payslip. If you have any queries, please contact the HR department.</p>
                <p>&copy; ${new Date().getFullYear()} Muftah Chemical PVT LTD (S-WASH)</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
