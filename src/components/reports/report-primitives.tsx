import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/*
 * Shared report UI primitives — "Dark Editorial Ledger" aesthetic.
 * Each report page imports these and passes its unique accent color.
 */

type AccentColor = "emerald" | "rose" | "blue" | "amber" | "violet";

const accentMap: Record<
  AccentColor,
  {
    bar: string;
    border: string;
    borderHover: string;
    bgGradientFrom: string;
    text: string;
    rowHover: string;
  }
> = {
  emerald: {
    bar: "bg-emerald-500",
    border: "border-emerald-500/15",
    borderHover: "hover:border-emerald-500/25",
    bgGradientFrom: "from-emerald-500/[0.06]",
    text: "text-emerald-400/80",
    rowHover: "hover:bg-emerald-500/[0.04]",
  },
  rose: {
    bar: "bg-rose-500",
    border: "border-rose-500/15",
    borderHover: "hover:border-rose-500/25",
    bgGradientFrom: "from-rose-500/[0.06]",
    text: "text-rose-400/80",
    rowHover: "hover:bg-rose-500/[0.04]",
  },
  blue: {
    bar: "bg-blue-500",
    border: "border-blue-500/15",
    borderHover: "hover:border-blue-500/25",
    bgGradientFrom: "from-blue-500/[0.06]",
    text: "text-blue-400/80",
    rowHover: "hover:bg-blue-500/[0.04]",
  },
  amber: {
    bar: "bg-amber-500",
    border: "border-amber-500/15",
    borderHover: "hover:border-amber-500/25",
    bgGradientFrom: "from-amber-500/[0.06]",
    text: "text-amber-400/80",
    rowHover: "hover:bg-amber-500/[0.04]",
  },
  violet: {
    bar: "bg-violet-500",
    border: "border-violet-500/15",
    borderHover: "hover:border-violet-500/25",
    bgGradientFrom: "from-violet-500/[0.06]",
    text: "text-violet-400/80",
    rowHover: "hover:bg-violet-500/[0.04]",
  },
};

export function SectionTitle({
  children,
  accentColor = "emerald",
}: {
  children: React.ReactNode;
  accentColor?: AccentColor;
}) {
  const a = accentMap[accentColor];
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-1 h-6 rounded-full ${a.bar}`} />
      <h2 className="text-lg font-bold tracking-tight font-[family-name:var(--font-dm-sans)]">
        {children}
      </h2>
    </div>
  );
}

export function SummaryCard({
  label,
  value,
  accentColor = "emerald",
  delay = 0,
}: {
  label: string;
  value: string;
  accentColor?: AccentColor;
  delay?: number;
}) {
  const a = accentMap[accentColor];
  return (
    <Card
      className={`${a.border} bg-gradient-to-br ${a.bgGradientFrom} to-transparent ${a.borderHover} transition-all duration-300 group animate-in fade-in slide-in-from-bottom-2`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <CardContent className="pt-5 pb-4 px-5">
        <div className={`text-[10px] font-bold uppercase tracking-[0.12em] ${a.text} mb-2`}>
          {label}
        </div>
        <div className="text-xl font-black tracking-tight font-mono tabular-nums text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportTable({
  headers,
  children,
}: {
  headers: React.ReactNode[];
  children: React.ReactNode;
  accentColor?: AccentColor;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/40 bg-card/30">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/50">
            {headers.map((h, i) => (
              <TableHead
                key={i}
                className={`text-[10px] uppercase font-bold tracking-[0.1em] text-muted-foreground/70 bg-muted/20 h-10 ${i === headers.length - 1 ? "text-right" : ""}`}
              >
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}

export function ReportTableRow({
  children,
  accentColor = "emerald",
}: {
  children: React.ReactNode;
  accentColor?: AccentColor;
}) {
  const a = accentMap[accentColor];
  return (
    <TableRow
      className={`border-b border-border/30 transition-colors ${a.rowHover} group/row`}
    >
      {children}
    </TableRow>
  );
}

export function ReportCell({
  children,
  align = "left",
  mono = false,
  bold = false,
  muted = false,
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  mono?: boolean;
  bold?: boolean;
  muted?: boolean;
  className?: string;
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "";
  const monoClass = mono ? "font-mono tabular-nums" : "";
  const boldClass = bold ? "font-semibold" : "";
  const mutedClass = muted ? "text-muted-foreground" : "";

  return (
    <TableCell
      className={`text-[13px] py-3.5 ${alignClass} ${monoClass} ${boldClass} ${mutedClass} ${className}`}
    >
      {children}
    </TableCell>
  );
}

export function EmptySection({
  message,
}: {
  message: string;
  accentColor?: AccentColor;
}) {
  return (
    <div className="flex items-center justify-center py-12 text-center bg-muted/[0.02] rounded-xl border border-dashed border-border/25 print:hidden">
      <p className="text-sm text-muted-foreground/60">{message}</p>
    </div>
  );
}
