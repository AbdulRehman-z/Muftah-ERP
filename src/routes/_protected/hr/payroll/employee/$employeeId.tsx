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
import { ChevronLeft, FileText, Download, Wallet, Calendar, TrendingDown, Clock, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { PayslipDialog } from "@/components/hr/payroll/payslip-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { PayslipData } from "@/components/hr/payroll/payslip-view";

export const Route = createFileRoute("/_protected/hr/payroll/employee/$employeeId")({
  component: EmployeePayrollHistory,
  loader: async ({ context: { queryClient }, params: { employeeId } }) => {
    await queryClient.ensureQueryData({
      queryKey: ["employee-payroll-history", employeeId],
      queryFn: () => getEmployeePayrollHistoryFn({ data: { employeeId } }),
    });
  },
});

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
    totalPaid: history.reduce((acc, curr) => acc + parseFloat(curr.netSalary), 0),
    avgSalary: history.length > 0 ? history.reduce((acc, curr) => acc + parseFloat(curr.netSalary), 0) / history.length : 0,
    totalDeductions: history.reduce((acc, curr) => acc + parseFloat(curr.totalDeductions), 0),
  };

  const formatCurrency = (value: number) => {
    return Math.round(value).toLocaleString();
  };

  const handleViewPayslip = (payslip: any) => {
    setSelectedPayslip(payslip);
    setIsPayslipOpen(true);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild className="rounded-lg h-9 w-9 shrink-0 shadow-xs hover:bg-primary/5">
            <Link to="/hr/payroll">
              <ChevronLeft className="size-4" />
            </Link>
          </Button>

          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border ">
              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                {employee?.firstName[0]}{employee?.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight">{employee?.firstName} {employee?.lastName}</h1>
                <Badge variant="outline" className="text-[9px] px-1.5 h-4 bg-primary/5 text-primary border-primary/20">
                  {employee?.employeeCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{employee?.designation}</p>
            </div>
          </div>
        </div>

        <Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] font-bold uppercase tracking-widest shadow-xs">
          <Download className="size-3.5" />
          History Report
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="Total Net Paid"
          value={`PKR ${formatCurrency(stats.totalPaid)}`}
          icon={Wallet}
          subtext="Lifetime earnings processed"
          accentColor="text-emerald-600"
          accentBg="bg-emerald-50"
        />
        <KPICard
          title="Average Salary"
          value={`PKR ${formatCurrency(stats.avgSalary)}`}
          icon={Calendar}
          subtext="Monthly average"
          accentColor="text-blue-600"
          accentBg="bg-blue-50"
        />
        <KPICard
          title="Total Deductions"
          value={`PKR ${formatCurrency(stats.totalDeductions)}`}
          icon={TrendingDown}
          subtext="Lifetime adjustments"
          accentColor="text-rose-600"
          accentBg="bg-rose-50"
        />
      </div>

      {/* Table Section */}
      <div className="border border-border/60 rounded-xl bg-card  overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/5">
              <Clock className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">Payroll History</h3>
              <p className="text-[10px] text-muted-foreground">Monthly salary records</p>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 pl-6">Month</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11">Period</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">Gross Pay</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">Deductions</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-right">Net Pay</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-11 text-center pr-6">Slip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <FileText className="size-8 mb-2 opacity-20" />
                    <p className="text-xs font-bold">No records found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              history.map((payslip) => (
                <TableRow key={payslip.id} className="">
                  <TableCell className="pl-6 py-3">
                    <span className="text-xs font-bold text-foreground">
                      {payslip.payroll ? format(parseISO(payslip.payroll.month), "MMMM yyyy") : "-"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                      {payslip.payroll ? (
                        `${format(parseISO(payslip.payroll.startDate), "dd MMM")} - ${format(parseISO(payslip.payroll.endDate), "dd MMM")}`
                      ) : "-"}
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
                      <span className="text-xs font-medium text-muted-foreground/50">0</span>
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
              ))
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

function KPICard({ title, value, subtext, icon: Icon, accentColor, accentBg }: { title: string; value: string; subtext: string; icon: any, accentColor: string, accentBg: string }) {
  return (
    <Card className="border border-border/60 rounded-xl overflow-hidden  hover: transition-all group">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn("p-2 rounded-lg transition-colors", accentBg)}>
            <Icon className={cn("size-4", accentColor)} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-80">{title}</p>
          <h3 className={cn("text-2xl font-black tracking-tight", accentColor)}>
            {value}
          </h3>
          <p className="text-[10px] font-medium text-muted-foreground/70 mt-1">
            {subtext}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
