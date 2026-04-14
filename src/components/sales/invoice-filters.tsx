import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { type DateRange } from "react-day-picker";
import { format } from "date-fns";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface InvoiceFilterState {
  dateFrom?: string;
  dateTo?: string;
  status?: "paid" | "credit" | "partial" | "all";
  customerType?: "distributor" | "retailer" | "all";
  warehouseId?: string;
  amountMin?: number;
  amountMax?: number;
}

interface Props {
  value: InvoiceFilterState;
  onChange: (value: InvoiceFilterState) => void;
  warehouses?: { id: string; name: string }[];
}

export const InvoiceFilters = ({ value, onChange, warehouses }: Props) => {
  const [collapsed, setCollapsed] = useState(true);

  const hasFilters = !!(
    value.dateFrom ||
    value.dateTo ||
    (value.status && value.status !== "all") ||
    (value.customerType && value.customerType !== "all") ||
    value.warehouseId ||
    value.amountMin !== undefined ||
    value.amountMax !== undefined
  );

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onChange({
      ...value,
      dateFrom: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
      dateTo: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
    });
  };

  // Memoize date range object to prevent unnecessary DatePicker re-renders
  const dateRange = useMemo<DateRange | undefined>(() => {
    if (!value.dateFrom && !value.dateTo) return undefined;
    return {
      from: value.dateFrom ? new Date(value.dateFrom) : undefined,
      to: value.dateTo ? new Date(value.dateTo) : undefined,
    };
  }, [value.dateFrom, value.dateTo]);

  const clearAll = () => {
    onChange({
      status: "all",
      customerType: "all",
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasFilters && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {[
                value.dateFrom || value.dateTo,
                value.status && value.status !== "all",
                value.customerType && value.customerType !== "all",
                value.warehouseId,
                value.amountMin !== undefined,
                value.amountMax !== undefined,
              ].filter(Boolean).length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs gap-1 text-muted-foreground">
              <X className="size-3" />
              Clear All
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="h-7 text-xs gap-1"
          >
            {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
            {collapsed ? "Show" : "Hide"}
          </Button>
        </div>
      </div>

      {/* Filter body */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={handleDateRangeChange}
                className="w-full"
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={value.status ?? "all"}
                onValueChange={(v) => onChange({ ...value, status: v as any })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Type */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Customer Type</Label>
              <Select
                value={value.customerType ?? "all"}
                onValueChange={(v) => onChange({ ...value, customerType: v as any })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                  <SelectItem value="retailer">Retailer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse */}
            {warehouses && warehouses.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Warehouse</Label>
                <Select
                  value={value.warehouseId ?? "all"}
                  onValueChange={(v) => onChange({ ...value, warehouseId: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All warehouses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Amount Min */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Min Amount (PKR)</Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={value.amountMin ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    amountMin: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-9 text-sm"
              />
            </div>

            {/* Amount Max */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Max Amount (PKR)</Label>
              <Input
                type="number"
                min="0"
                placeholder="No limit"
                value={value.amountMax ?? ""}
                onChange={(e) =>
                  onChange({
                    ...value,
                    amountMax: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="h-9 text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
