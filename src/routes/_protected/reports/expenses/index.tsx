import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { ReportPageShell } from "@/components/reports/report-page-shell";
import {
  SectionTitle,
  SummaryCard,
  ReportTable,
  ReportTableRow,
  ReportCell,
  EmptySection,
} from "@/components/reports/report-primitives";
import { getExpensesReportFn } from "@/server-functions/reports/expenses-report-fn";
import { formatNumber, formatPKR } from "@/lib/currency-format";
import { Badge } from "@/components/ui/badge";

const ACCENT = "violet";

export const Route = createFileRoute("/_protected/reports/expenses/")({
  component: ExpensesReportPage,
});

function ExpensesReportPage() {
  const [params, setParams] = useState<{ dateFrom?: string; dateTo?: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["reports", "expenses", params?.dateFrom, params?.dateTo],
    queryFn: () => getExpensesReportFn({ data: params ?? {} }),
    enabled: !!params,
  });

  const handleGenerate = (range: DateRange | undefined) => {
    setParams({
      dateFrom: range?.from?.toISOString(),
      dateTo: range?.to?.toISOString(),
    });
  };

  const isEmpty = !data || (data.financeExpenses.length === 0 && data.productionCosts.length === 0);

  return (
    <ReportPageShell
      title="Expenses Report"
      subtitle="Finance expenses and production-related manufacturing costs for the selected period."
      onGenerate={handleGenerate}
      isLoading={isLoading}
      isEmpty={isEmpty}
      accentColor={ACCENT}
    >
      {data && (
        <div className="space-y-10">
          {/* Grand Summary */}
          <section>
            <SectionTitle accentColor={ACCENT}>Period Summary</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
              <SummaryCard label="Finance Expenses" value={formatPKR(data.summary.totalFinanceExpenses, false)} accentColor={ACCENT} delay={0} />
              <SummaryCard label="Production Costs" value={formatPKR(data.summary.totalProductionCosts, false)} accentColor={ACCENT} delay={80} />
              <SummaryCard label="Grand Total" value={formatPKR(data.summary.grandTotal, false)} accentColor={ACCENT} delay={160} />
              <SummaryCard label="Records" value={formatNumber(data.summary.financeCount + data.summary.productionCount)} accentColor={ACCENT} delay={240} />
            </div>
          </section>

          {/* Finance Expenses */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 rounded-full bg-violet-500" />
              <h2 className="text-lg font-bold tracking-tight font-[family-name:var(--font-dm-sans)]">General Expenses</h2>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-violet-500/15 text-violet-300 border-0">Finance</Badge>
            </div>
            {data.financeExpenses.length === 0 ? (
              <EmptySection message="No finance expenses recorded for this period." accentColor={ACCENT} />
            ) : (
              <ReportTable
                accentColor={ACCENT}
                headers={["Date", "Category", "Description", "Wallet", "Slip #", "Amount"]}
              >
                {data.financeExpenses.map((e: any) => (
                  <ReportTableRow key={e.expenseId} accentColor={ACCENT}>
                    <ReportCell muted>
                      {e.expenseDate ? new Date(e.expenseDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </ReportCell>
                    <ReportCell bold>{e.categoryName || "Uncategorized"}</ReportCell>
                    <ReportCell>{e.description || "—"}</ReportCell>
                    <ReportCell muted>{e.walletName || "—"}</ReportCell>
                    <ReportCell mono muted>{e.slipNumber || "—"}</ReportCell>
                    <ReportCell align="right" mono bold>{formatPKR(e.amount, false)}</ReportCell>
                  </ReportTableRow>
                ))}
              </ReportTable>
            )}
          </section>

          {/* Production Costs */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-6 rounded-full bg-amber-500" />
              <h2 className="text-lg font-bold tracking-tight font-[family-name:var(--font-dm-sans)]">Manufacturing Costs</h2>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border-0">Production</Badge>
            </div>
            {data.productionCosts.length === 0 ? (
              <EmptySection message="No production costs recorded for this period." accentColor={ACCENT} />
            ) : (
              <ReportTable
                accentColor={ACCENT}
                headers={["Batch ID", "Completed", "Product", "Recipe", "Warehouse", "Containers", "Chemical Cost", "Packaging Cost", "Total Cost"]}
              >
                {data.productionCosts.map((p: any) => (
                  <ReportTableRow key={p.runId} accentColor={ACCENT}>
                    <ReportCell mono bold>{p.batchId}</ReportCell>
                    <ReportCell muted>
                      {p.actualCompletionDate ? new Date(p.actualCompletionDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </ReportCell>
                    <ReportCell>{p.productName}</ReportCell>
                    <ReportCell>{p.recipeName}</ReportCell>
                    <ReportCell muted>{p.warehouseName}</ReportCell>
                    <ReportCell align="right" mono>{formatNumber(p.containersProduced)}</ReportCell>
                    <ReportCell align="right" mono>{formatPKR(p.totalChemicalCost, false)}</ReportCell>
                    <ReportCell align="right" mono>{formatPKR(p.totalPackagingCost, false)}</ReportCell>
                    <ReportCell align="right" mono bold>{formatPKR(p.totalProductionCost, false)}</ReportCell>
                  </ReportTableRow>
                ))}
              </ReportTable>
            )}
          </section>
        </div>
      )}
    </ReportPageShell>
  );
}
