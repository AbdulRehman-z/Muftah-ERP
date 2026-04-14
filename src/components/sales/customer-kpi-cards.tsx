import { useGetCustomerStats } from "@/hooks/sales/use-customers";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  DollarSign,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PKR = (v: number) =>
  `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const cards = [
  {
    key: "totalCustomers",
    label: "Total Customers",
    icon: Users,
    format: (v: number) => v.toLocaleString(),
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    key: "totalSalesRevenue",
    label: "Total Sales Revenue",
    icon: DollarSign,
    format: PKR,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    key: "totalOutstanding",
    label: "Total Outstanding",
    icon: AlertTriangle,
    format: PKR,
    color: "text-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    key: "customersWithOutstanding",
    label: "Customers with Debt",
    icon: UserCheck,
    format: (v: number) => v.toLocaleString(),
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
] as const;

export const CustomerKpiCards = () => {
  const { data: stats } = useGetCustomerStats();

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
