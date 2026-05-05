import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  CreditCard,
  FileText,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

type AccentColor = "emerald" | "rose" | "blue" | "amber" | "violet";

const accentMap: Record<
  AccentColor,
  {
    bar: string;
    iconBg: string;
    iconBorder: string;
    iconText: string;
    labelText: string;
    numberText: string;
    actionText: string;
  }
> = {
  emerald: {
    bar: "bg-emerald-500/60",
    iconBg: "bg-emerald-500/10",
    iconBorder: "border-emerald-500/20",
    iconText: "text-emerald-400",
    labelText: "text-emerald-400/80",
    numberText: "text-emerald-400/30",
    actionText: "text-emerald-400",
  },
  rose: {
    bar: "bg-rose-500/60",
    iconBg: "bg-rose-500/10",
    iconBorder: "border-rose-500/20",
    iconText: "text-rose-400",
    labelText: "text-rose-400/80",
    numberText: "text-rose-400/30",
    actionText: "text-rose-400",
  },
  blue: {
    bar: "bg-blue-500/60",
    iconBg: "bg-blue-500/10",
    iconBorder: "border-blue-500/20",
    iconText: "text-blue-400",
    labelText: "text-blue-400/80",
    numberText: "text-blue-400/30",
    actionText: "text-blue-400",
  },
  amber: {
    bar: "bg-amber-500/60",
    iconBg: "bg-amber-500/10",
    iconBorder: "border-amber-500/20",
    iconText: "text-amber-400",
    labelText: "text-amber-400/80",
    numberText: "text-amber-400/30",
    actionText: "text-amber-400",
  },
  violet: {
    bar: "bg-violet-500/60",
    iconBg: "bg-violet-500/10",
    iconBorder: "border-violet-500/20",
    iconText: "text-violet-400",
    labelText: "text-violet-400/80",
    numberText: "text-violet-400/30",
    actionText: "text-violet-400",
  },
};

const reportTypes = [
  {
    title: "Sales Report",
    description: "All finalized invoices and line items for any date range. Includes cash, credit, and revenue breakdowns.",
    href: "/reports/sales",
    icon: TrendingUp,
    accent: "emerald" as AccentColor,
    number: "01",
  },
  {
    title: "Credits Report",
    description: "All credit slips, recovery status, and outstanding balances for any period.",
    href: "/reports/credits",
    icon: CreditCard,
    accent: "rose" as AccentColor,
    number: "02",
  },
  {
    title: "Salaries Report",
    description: "Itemized payslip data with earnings, deductions, and net pay for any date range.",
    href: "/reports/salaries",
    icon: Users,
    accent: "blue" as AccentColor,
    number: "03",
  },
  {
    title: "Purchases Report",
    description: "All supplier purchases with material details, quantities, costs, and payment status.",
    href: "/reports/purchases",
    icon: ShoppingCart,
    accent: "amber" as AccentColor,
    number: "04",
  },
  {
    title: "Expenses Report",
    description: "Finance expenses and production-related manufacturing costs for any period.",
    href: "/reports/expenses",
    icon: Banknote,
    accent: "violet" as AccentColor,
    number: "05",
  },
];

export const Route = createFileRoute("/_protected/reports/")({
  component: ReportsLandingPage,
});

function ReportsLandingPage() {
  return (
    <main className="flex-1 overflow-y-auto relative">
      {/* Noise texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="flex flex-col min-h-full relative z-10">
        {/* Header */}
        <div className="border-b border-border/40 pb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-[2px] bg-primary/60 rounded-full" />
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70">
              Financial & Operational
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-dm-sans)]">
            Reports
          </h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Generate comprehensive operational reports for any date range. Each report is optimized for screen reading and landscape printing.
          </p>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5 py-8">
          {reportTypes.map((report) => {
            const Icon = report.icon;
            const a = accentMap[report.accent];
            return (
              <Link key={report.href} to={report.href} className="group">
                <div className="h-full relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/[0.3] hover:border-border/60 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                  {/* Accent edge */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${a.bar}`} />

                  <div className="p-6 flex flex-col h-full pl-7">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${a.iconBg} border ${a.iconBorder} flex items-center justify-center`}>
                          <Icon className={`size-4 ${a.iconText}`} />
                        </div>
                        <div>
                          <h3 className="font-bold text-base tracking-tight">{report.title}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-[0.12em] ${a.labelText}`}>
                            Operational Report
                          </span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${a.numberText}`}>
                        {report.number}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {report.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-border/30 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60 group-hover:text-foreground transition-colors">
                        <FileText className="size-3.5" />
                        PDF-ready
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider ${a.actionText} group-hover:underline`}>
                        Generate
                        <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
