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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Download, Mail, Wallet, Calendar, TrendingDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PayslipView } from "@/components/hr/payroll/payslip-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

  const employee = history[0]?.employee;

  const stats = {
    totalPaid: history.reduce((acc, curr) => acc + Math.round(parseFloat(curr.netSalary)), 0),
    avgSalary: history.length > 0 ? Math.round(history.reduce((acc, curr) => acc + Math.round(parseFloat(curr.netSalary)), 0) / history.length) : 0,
    totalDeductions: history.reduce((acc, curr) => acc + Math.round(parseFloat(curr.totalDeductions)), 0),
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card p-8 rounded-3xl border border-muted-foreground/10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
          <Wallet className="size-40 rotate-12" />
        </div>

        <div className="flex items-start gap-6 relative">
          <Button variant="outline" size="icon" asChild className="rounded-xl h-12 w-12 shadow-xs hover:bg-primary/5 transition-all">
            <Link to="/hr/payroll">
              <ChevronLeft className="size-6" />
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row gap-5 items-center">
            <Avatar className="h-20 w-20 border-4 border-background shadow-xl ring-1 ring-muted-foreground/10">
              <AvatarFallback className="text-2xl font-black bg-primary/5 text-primary">
                {employee?.firstName[0]}{employee?.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-3xl font-black tracking-tighter">{employee?.firstName} {employee?.lastName}</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-widest text-[10px]">
                  {employee?.employeeCode}
                </Badge>
                <span className="text-sm font-bold text-muted-foreground">•</span>
                <span className="text-sm font-medium text-muted-foreground">{employee?.designation}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 relative">
          <Button variant="outline" className="rounded-xl h-11 px-5 font-bold uppercase tracking-widest text-[10px] shadow-xs border-muted-foreground/20">
            <Download className="size-4 mr-2" />
            History Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <HistoryKPICard
          title="Total Net Paid"
          value={`PKR ${stats.totalPaid.toLocaleString()}`}
          icon={Wallet}
          subtext="Lifetime earnings processed"
        />
        <HistoryKPICard
          title="Average Salary"
          value={`PKR ${stats.avgSalary.toLocaleString()}`}
          icon={Calendar}
          subtext="Per month average"
        />
        <HistoryKPICard
          title="Total Deductions"
          value={`PKR ${stats.totalDeductions.toLocaleString()}`}
          icon={TrendingDown}
          subtext="Total adjustments made"
          color="text-rose-600"
        />
      </div>

      {/* Table Section */}
      <Card className="border-muted-foreground/10 rounded-3xl overflow-hidden shadow-sm bg-card/50 backdrop-blur-sm">
        <CardHeader className="px-8 pt-8 pb-4">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary" />
            Payroll History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-b border-muted-foreground/10">
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14 pl-8">Month</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14">Period</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14 text-right">Gross</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14 text-right">Deductions</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14 text-right">Net Pay</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 h-14 text-center pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center text-muted-foreground font-medium italic">
                    No payroll records found for this employee.
                  </TableCell>
                </TableRow>
              ) : (
                history.map((payslip) => (
                  <TableRow key={payslip.id} className="hover:bg-muted/30 transition-colors border-b border-muted-foreground/5 last:border-0 group">
                    <TableCell className="font-black text-sm pl-8">
                      {payslip.payroll ? format(parseISO(payslip.payroll.month), "MMMM yyyy") : "-"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg border border-muted-foreground/5">
                        {payslip.payroll ? (
                          `${format(parseISO(payslip.payroll.startDate), "dd MMM")} - ${format(parseISO(payslip.payroll.endDate), "dd MMM")}`
                        ) : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-black text-sm">
                      {Math.round(parseFloat(payslip.grossSalary)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm text-rose-600">
                      -{Math.round(parseFloat(payslip.totalDeductions)).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right pr-4">
                      <span className="font-black text-base text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 italic">
                        {Math.round(parseFloat(payslip.netSalary)).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-center pr-8">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-primary/5 hover:text-primary transition-all">
                            <FileText className="size-4 mr-2" />
                            View Slip
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
                          {payslip.employee && payslip.payroll ? (
                            <div className="bg-background rounded-3xl overflow-hidden border shadow-2xl">
                              <PayslipView payslip={payslip as any} showActions={true} />
                            </div>
                          ) : (
                            <div className="p-10 bg-background rounded-3xl text-center text-muted-foreground font-bold shadow-2xl">
                              Incomplete payslip data.
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryKPICard({ title, value, subtext, icon: Icon, color = "text-foreground" }: { title: string; value: string; subtext: string; icon: any, color?: string }) {
  return (
    <Card className="border-muted-foreground/10 shadow-xs hover:shadow-md transition-all rounded-3xl overflow-hidden group bg-card border-b-4 border-b-primary/10">
      <CardContent className="p-7 relative">
        <div className="p-3 rounded-2xl bg-primary/5 group-hover:bg-primary/10 transition-colors w-fit mb-5">
          <Icon className="size-6 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-80">
            {title}
          </p>
          <h3 className={`text-2xl font-black tracking-tight ${color}`}>
            {value}
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
            {subtext}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

