import { useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Printer, FileText, Loader2, ArrowLeft, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import type { DateRange } from "react-day-picker";
import { startOfMonth, endOfMonth } from "date-fns";

type AccentColor = "emerald" | "rose" | "blue" | "amber" | "violet";

const accentMap: Record<
  AccentColor,
  {
    text: string;
    bg: string;
    bgHover: string;
    buttonBg: string;
    buttonBgHover: string;
    buttonShadow: string;
    ring: string;
  }
> = {
  emerald: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    bgHover: "hover:bg-emerald-500/20",
    buttonBg: "bg-emerald-600",
    buttonBgHover: "hover:bg-emerald-500",
    buttonShadow: "shadow-emerald-500/20",
    ring: "focus-visible:ring-emerald-500/30",
  },
  rose: {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    bgHover: "hover:bg-rose-500/20",
    buttonBg: "bg-rose-600",
    buttonBgHover: "hover:bg-rose-500",
    buttonShadow: "shadow-rose-500/20",
    ring: "focus-visible:ring-rose-500/30",
  },
  blue: {
    text: "text-blue-400",
    bg: "bg-blue-500/10",
    bgHover: "hover:bg-blue-500/20",
    buttonBg: "bg-blue-600",
    buttonBgHover: "hover:bg-blue-500",
    buttonShadow: "shadow-blue-500/20",
    ring: "focus-visible:ring-blue-500/30",
  },
  amber: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    bgHover: "hover:bg-amber-500/20",
    buttonBg: "bg-amber-600",
    buttonBgHover: "hover:bg-amber-500",
    buttonShadow: "shadow-amber-500/20",
    ring: "focus-visible:ring-amber-500/30",
  },
  violet: {
    text: "text-violet-400",
    bg: "bg-violet-500/10",
    bgHover: "hover:bg-violet-500/20",
    buttonBg: "bg-violet-600",
    buttonBgHover: "hover:bg-violet-500",
    buttonShadow: "shadow-violet-500/20",
    ring: "focus-visible:ring-violet-500/30",
  },
};

interface ReportPageShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onGenerate: (range: DateRange | undefined) => void;
  isLoading: boolean;
  isEmpty: boolean;
  accentColor?: AccentColor;
  emptyMessage?: string;
}

export function ReportPageShell({
  title,
  subtitle,
  children,
  onGenerate,
  isLoading,
  isEmpty,
  accentColor = "emerald",
  emptyMessage = "Select a date range and click Generate to view the report.",
}: ReportPageShellProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [hasGenerated, setHasGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const a = accentMap[accentColor];

  const handleGenerate = () => {
    setHasGenerated(true);
    onGenerate(dateRange);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="flex-1 overflow-y-auto relative">
      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      <div className="flex flex-col min-h-full relative z-10">
        {/* Controls - hidden in print */}
        <div className="print:hidden">
          {/* Breadcrumb + Header */}
          <div className="border-b border-border/40 pb-6">
            <Link
              to="/reports"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mb-4 group"
            >
              <ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
              Back to Reports
            </Link>

            <div className="flex items-end justify-between gap-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-black tracking-tight font-[family-name:var(--font-dm-sans)]">
                  {title}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  {subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {hasGenerated && !isEmpty && (
                  <Button
                    variant="outline"
                    onClick={handlePrint}
                    className={`gap-2 h-10 px-4 text-xs font-semibold border-border/60 ${a.bgHover} transition-all`}
                  >
                    <Printer className="size-3.5" />
                    Print
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 py-6">
            <div className="flex items-center gap-2 bg-muted/40 border border-border/50 rounded-xl px-3 py-2.5">
              <CalendarRange className={`size-4 ${a.text}`} />
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(d) => {
                  setDateRange(d ?? { from: startOfMonth(new Date()), to: endOfMonth(new Date()) });
                  setHasGenerated(false);
                }}
                className="w-64"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !dateRange?.from}
              className={`gap-2 h-11 px-5 text-xs font-bold uppercase tracking-wider ${a.buttonBg} ${a.buttonBgHover} text-white shadow-lg ${a.buttonShadow} transition-all ${a.ring}`}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileText className="size-4" />
              )}
              Generate Report
            </Button>
          </div>
        </div>

        {/* Report Content */}
        <div ref={reportRef} className="report-content pb-12">
          {/* Print-only header */}
          <div className="hidden print:block mb-8 pb-4 border-b-2 border-black">
            <h1 className="text-2xl font-black uppercase tracking-tighter">
              {title}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {subtitle}
              {dateRange?.from && dateRange?.to && (
                <span className="ml-2 font-mono">
                  ({dateRange.from.toLocaleDateString()} —{" "}
                  {dateRange.to.toLocaleDateString()})
                </span>
              )}
            </p>
          </div>

          {!hasGenerated ? (
            <div className="flex flex-col items-center justify-center py-28 text-center bg-muted/[0.03] rounded-2xl border border-dashed border-border/30 print:hidden">
              <div className={`w-16 h-16 rounded-2xl ${a.bg} flex items-center justify-center mb-5`}>
                <FileText className={`size-7 ${a.text}`} />
              </div>
              <h3 className="font-semibold text-base">Ready to Generate</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                {emptyMessage}
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-28 print:hidden">
              <div className={`w-12 h-12 rounded-xl ${a.bg} flex items-center justify-center mb-4`}>
                <Loader2 className={`size-6 ${a.text} animate-spin`} />
              </div>
              <p className="text-sm text-muted-foreground font-medium">
                Generating report…
              </p>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center py-28 text-center bg-muted/[0.03] rounded-2xl border border-dashed border-border/30 print:hidden">
              <div className={`w-16 h-16 rounded-2xl ${a.bg} flex items-center justify-center mb-5`}>
                <FileText className={`size-7 ${a.text} opacity-50`} />
              </div>
              <h3 className="font-semibold text-base">No Records Found</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
                No data was found for the selected date range. Try expanding the
                range or checking a different period.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </div>

      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 1.2cm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .report-content {
            padding: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          th {
            background: #f0f0f0 !important;
            color: #333 !important;
            border: 1px solid #ccc;
            padding: 7px 10px;
            text-align: left;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 8.5pt;
            letter-spacing: 0.03em;
          }
          td {
            border: 1px solid #ddd;
            padding: 6px 10px;
            text-align: left;
            color: #222;
          }
          tr:nth-child(even) {
            background: #fafafa;
          }
          tr {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
