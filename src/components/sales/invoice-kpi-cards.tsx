import { useGetInvoiceStats } from "@/hooks/sales/use-invoices";
import { Card, CardContent } from "@/components/ui/card";
import {
  ReceiptText,
  TrendingUp,
  AlertCircle,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const cards = [
  {
    key: "totalInvoices",
    label: "Total Invoices",
    icon: ReceiptText,
    format: (v: number) => v.toLocaleString(),
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "monthRevenue",
    label: "Revenue This Month",
    icon: TrendingUp,
    format: PKR,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    key: "totalOutstanding",
    label: "Outstanding Credit",
    icon: AlertCircle,
    format: PKR,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    key: "averageInvoiceValue",
    label: "Avg Invoice Value",
    icon: Calculator,
    format: PKR,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
] as const;

export const InvoiceKpiCards = () => {
  const { data: stats } = useGetInvoiceStats();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const value = stats[card.key as keyof typeof stats] as number;

        return (
          <Card key={card.key} className="border-border/60 overflow-hidden group hover:shadow-md transition-shadow duration-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className={cn("text-2xl font-bold tabular-nums tracking-tight", card.color)}>
                    {card.format(value ?? 0)}
                  </p>
                </div>
                <div className={cn("flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110", card.bg)}>
                  <Icon className={cn("size-5", card.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
