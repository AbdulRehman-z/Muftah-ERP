import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getEmployeePayrollHistoryFn } from "@/server-functions/hr/payroll/dashboard-fn";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  FileText,
  Wallet,
  Calendar,
  TrendingDown,
  Clock,
  ArrowUpRight,
  Printer,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PayslipDialog } from "@/components/hr/payroll/payslip-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { PayslipData } from "@/components/hr/payroll/payslip-view";

export const Route = createFileRoute(
  "/_protected/hr/payroll/employee/$employeeId",
)({
  component: EmployeePayrollHistory,
  loader: async ({ context: { queryClient }, params: { employeeId } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["employee-payroll-history", employeeId],
      queryFn: () => getEmployeePayrollHistoryFn({ data: { employeeId } }),
    });
  },
});

// ── Print helpers ─────────────────────────────────────────────────────────

function pkr(n: number) {
  return `PKR ${Math.round(n).toLocaleString("en-US")}`;
}

function buildHistoryReportHTML(
  history: any[],
  employee: any,
  stats: { totalPaid: number; avgSalary: number; totalDeductions: number },
) {
  const empName = `${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`.trim();
  const now = format(new Date(), "dd MMM yyyy, hh:mm a");

  const rows = history
    .map((p) => {
      const month = p.payroll
        ? format(parseISO(p.payroll.month), "MMMM yyyy")
        : "—";
      const period = p.payroll
        ? `${format(parseISO(p.payroll.startDate), "dd MMM")} – ${format(parseISO(p.payroll.endDate), "dd MMM")}`
        : "—";
      const gross = Math.round(parseFloat(p.grossSalary || "0"));
      const deductions = Math.round(parseFloat(p.totalDeductions || "0"));
      const net = Math.round(parseFloat(p.netSalary || "0"));
      const absent = p.daysAbsent ?? 0;
      const present = p.daysPresent ?? 0;

      return `
        <tr>
          <td>${month}</td>
          <td style="color:#64748b;font-size:11px;">${period}</td>
          <td class="num">${present}d / ${absent + present}d</td>
          <td class="num">PKR ${gross.toLocaleString()}</td>
          <td class="num" style="color:#be123c;">${deductions > 0 ? `-PKR ${deductions.toLocaleString()}` : "—"}</td>
          <td class="num" style="color:#15803d;font-weight:800;">PKR ${net.toLocaleString()}</td>
        </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payroll History — ${empName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1e293b;
      padding: 32px 40px;
      background: #fff;
    }
    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 3px solid #1e293b;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .header-title { font-size: 22px; font-weight: 900; color: #0f172a; }
    .header-sub  { font-size: 12px; color: #64748b; margin-top: 2px; }
    .header-right { text-align: right; font-size: 11px; color: #94a3b8; }
    .header-right .bold { font-size: 13px; font-weight: 700; color: #334155; }
    /* ── Employee card ── */
    .emp-card {
      display: flex; align-items: center; gap: 16px;
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 10px; padding: 14px 18px;
      margin-bottom: 24px;
    }
    .emp-avatar {
      width: 48px; height: 48px; border-radius: 50%;
      background: #1e293b; color: #fff;
      font-size: 18px; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .emp-name { font-size: 17px; font-weight: 800; }
    .emp-sub  { font-size: 11px; color: #64748b; margin-top: 2px; }
    /* ── KPI strip ── */
    .kpi-strip {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      margin-bottom: 24px;
    }
    .kpi {
      border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;
    }
    .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; }
    .kpi-value { font-size: 18px; font-weight: 800; margin-top: 4px; }
    .kpi-sub   { font-size: 10px; color: #94a3b8; margin-top: 2px; }
    .green  { color: #15803d; }
    .blue   { color: #1d4ed8; }
    .rose   { color: #be123c; }
    /* ── Table ── */
    .section-title {
      font-size: 10px; font-weight: 800; text-transform: uppercase;
      letter-spacing: 0.1em; color: #475569;
      margin-bottom: 10px; padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    table { width: 100%; border-collapse: collapse; }
    thead tr { background: #f1f5f9; }
    th {
      text-align: left; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.08em;
      color: #64748b; padding: 9px 10px;
      border-bottom: 2px solid #e2e8f0;
    }
    th.num, td.num { text-align: right; }
    td {
      padding: 9px 10px; font-size: 12px;
      border-bottom: 1px solid #f1f5f9;
    }
    tbody tr:hover { background: #f8fafc; }
    .total-row td {
      background: #f1f5f9; font-weight: 700;
      border-top: 2px solid #cbd5e1;
    }
    /* ── Footer ── */
    .footer {
      margin-top: 32px; padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px; color: #94a3b8;
      display: flex; justify-content: space-between;
    }
    @media print {
      body { padding: 20px 28px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="header-title">Employee Payroll History Report</div>
      <div class="header-sub">Comprehensive payroll record — confidential</div>
    </div>
    <div class="header-right">
      <div>Generated on</div>
      <div class="bold">${now}</div>
    </div>
  </div>

  <!-- Employee Info -->
  <div class="emp-card">
    <div class="emp-avatar">${(employee?.firstName?.[0] ?? "?").toUpperCase()}${(employee?.lastName?.[0] ?? "").toUpperCase()}</div>
    <div>
      <div class="emp-name">${empName}</div>
      <div class="emp-sub">
        ${employee?.designation ?? "—"} &nbsp;•&nbsp;
        ${employee?.employeeCode ?? "—"} &nbsp;•&nbsp;
        ${employee?.cnic ?? "N/A"}
      </div>
    </div>
  </div>

  <!-- KPI strip -->
  <div class="kpi-strip">
    <div class="kpi">
      <div class="kpi-label">Total Net Paid</div>
      <div class="kpi-value green">${pkr(stats.totalPaid)}</div>
      <div class="kpi-sub">Lifetime earnings</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Average Monthly Net</div>
      <div class="kpi-value blue">${pkr(stats.avgSalary)}</div>
      <div class="kpi-sub">Over ${history.length} payslip(s)</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total Deductions</div>
      <div class="kpi-value rose">${pkr(stats.totalDeductions)}</div>
      <div class="kpi-sub">All-time adjustments</div>
    </div>
  </div>

  <!-- Table -->
  <div class="section-title">Monthly Payroll Breakdown &mdash; All Records</div>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>Period</th>
        <th class="num">Attendance</th>
        <th class="num">Gross Pay</th>
        <th class="num">Deductions</th>
        <th class="num">Net Pay</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row">
        <td colspan="3">Total (${history.length} months)</td>
        <td class="num">—</td>
        <td class="num rose">-PKR ${Math.round(stats.totalDeductions).toLocaleString()}</td>
        <td class="num green">PKR ${Math.round(stats.totalPaid).toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>This report is system-generated and does not require a signature.</div>
    <div>Titan ERP · ${now}</div>
  </div>
</body>
</html>`;
}

// ── Main Component ────────────────────────────────────────────────────────

function EmployeePayrollHistory() {
  const { employeeId } = Route.useParams();
  const { data: history } = useSuspenseQuery({
    queryKey: ["employee-payroll-history", employeeId],
    queryFn: () => getEmployeePayrollHistoryFn({ data: { employeeId } }),
  });

  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);

  const employee = history[0]?.employee;

  const stats = {
    totalPaid: history.reduce((acc, curr) => acc + parseFloat(curr.netSalary || "0"), 0),
    avgSalary:
      history.length > 0
        ? history.reduce((acc, curr) => acc + parseFloat(curr.netSalary || "0"), 0) /
        history.length
        : 0,
    totalDeductions: history.reduce(
      (acc, curr) => acc + parseFloat(curr.totalDeductions || "0"),
      0,
    ),
  };

  const formatCurrency = (value: number) => Math.round(value).toLocaleString();

  const handleViewPayslip = (payslip: any) => {
    setSelectedPayslip(payslip);
    setIsPayslipOpen(true);
  };

  const handleDownloadReport = () => {
    const html = buildHistoryReportHTML(history, employee, stats);
    const win = window.open("", "_blank");
    if (!win) {
      window.alert("Popup blocked. Please allow popups for this site.");
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    // Trigger print after fonts have rendered
    setTimeout(() => {
      win.focus();
      win.print();
    }, 500);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            asChild
            className="rounded-lg h-9 w-9 shrink-0 shadow-xs hover:bg-primary/5"
          >
            <Link to="/hr/payroll">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {employee?.firstName?.[0]}
                {employee?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight">
                  {employee?.firstName} {employee?.lastName}
                </h1>
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 h-4 bg-primary/5 text-primary border-primary/20"
                >
                  {employee?.employeeCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">
                {employee?.designation}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleDownloadReport}
            disabled={history.length === 0}
          >
            <Printer className="size-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              History Report
            </span>
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Net Paid"
          value={`PKR ${formatCurrency(stats.totalPaid)}`}
          icon={Wallet}
          subtext="Lifetime earnings processed"
          accentColor="text-emerald-600"
          accentBg="bg-emerald-50 dark:bg-emerald-950/30"
        />
        <KPICard
          title="Average Salary"
          value={`PKR ${formatCurrency(stats.avgSalary)}`}
          icon={Calendar}
          subtext={`Across ${history.length} payslip(s)`}
          accentColor="text-blue-600"
          accentBg="bg-blue-50 dark:bg-blue-950/30"
        />
        <KPICard
          title="Total Deductions"
          value={`PKR ${formatCurrency(stats.totalDeductions)}`}
          icon={TrendingDown}
          subtext="Lifetime adjustments"
          accentColor="text-rose-600"
          accentBg="bg-rose-50 dark:bg-rose-950/30"
        />
      </div>

      {/* ── Table ── */}
      <div className="border border-border/60 rounded-xl bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5">
              <Clock className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">
                Payroll History
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {history.length} monthly salary record{history.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 pl-6">
                Month
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11">
                Period
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">
                Attendance
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">
                Gross Pay
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">
                Deductions
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">
                Net Pay
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-center pr-6">
                Slip
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="size-8 mb-2 opacity-20" />
                    <p className="text-xs font-bold">No records found</p>
                    <p className="text-[10px] mt-1 opacity-60">
                      Payslips for this employee will appear here once payroll is processed.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <>
                {history.map((payslip) => (
                  <TableRow key={payslip.id} className="hover:bg-muted/20">
                    <TableCell className="pl-6 py-3">
                      <span className="text-xs font-bold text-foreground">
                        {payslip.payroll
                          ? format(parseISO(payslip.payroll.month), "MMMM yyyy")
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                        {payslip.payroll
                          ? `${format(parseISO(payslip.payroll.startDate), "dd MMM")} – ${format(parseISO(payslip.payroll.endDate), "dd MMM")}`
                          : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        <span className="text-foreground font-bold">{payslip.daysPresent ?? 0}</span>
                        <span className="opacity-50"> / {(payslip.daysPresent ?? 0) + (payslip.daysAbsent ?? 0)}d</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatCurrency(parseFloat(payslip.grossSalary))}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-3">
                      {parseFloat(payslip.totalDeductions) > 0 ? (
                        <span className="text-xs font-bold text-rose-600">
                          -{formatCurrency(parseFloat(payslip.totalDeductions))}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <span className="text-xs font-black text-emerald-600">
                        PKR {formatCurrency(parseFloat(payslip.netSalary))}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-6 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/5 hover:text-primary transition-colors"
                        onClick={() => handleViewPayslip(payslip)}
                      >
                        <ArrowUpRight className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="bg-muted/40 border-t-2">
                  <TableCell colSpan={3} className="pl-6 py-3">
                    <span className="text-xs font-black uppercase tracking-wide">
                      Total ({history.length} months)
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="text-xs font-bold">—</span>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="text-xs font-black text-rose-600">
                      -{formatCurrency(stats.totalDeductions)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right py-3">
                    <span className="text-sm font-black text-emerald-600">
                      PKR {formatCurrency(stats.totalPaid)}
                    </span>
                  </TableCell>
                  <TableCell />
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <PayslipDialog
        open={isPayslipOpen}
        onOpenChange={setIsPayslipOpen}
        payslip={selectedPayslip}
      />
    </div>
  );
}

function KPICard({
  title,
  value,
  subtext,
  icon: Icon,
  accentColor,
  accentBg,
}: {
  title: string;
  value: string;
  subtext: string;
  icon: any;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <Card className={cn("border border-border/60 rounded-xl overflow-hidden transition-all", accentBg)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-lg bg-white/60 dark:bg-black/20 transition-colors")}>
            <Icon className={cn("size-4", accentColor)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-80">
            {title}
          </p>
          <h3 className={cn("text-2xl font-black tracking-tight", accentColor)}>{value}</h3>
          <p className="text-[10px] font-medium text-muted-foreground/70 mt-1">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}
