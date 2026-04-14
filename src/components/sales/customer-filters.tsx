import { useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  SlidersHorizontal,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface CustomerFilterState {
  search?: string;
  customerType?: "distributor" | "retailer" | "all";
  city?: string;
  outstandingOnly: boolean;
}

interface Props {
  value: CustomerFilterState;
  onChange: (value: CustomerFilterState) => void;
  cities?: string[];
}

export const CustomerFilters = ({ value, onChange, cities }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  const hasFilters = !!(
    value.search ||
    (value.customerType && value.customerType !== "all") ||
    value.city ||
    value.outstandingOnly
  );

  const clearAll = () => {
    onChange({
      outstandingOnly: false,
    });
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center gap-3 flex-1">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filters</span>
          {hasFilters && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {[
                value.search,
                value.customerType && value.customerType !== "all",
                value.city,
                value.outstandingOnly,
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Name, mobile, city..."
                  value={value.search ?? ""}
                  onChange={(e) => onChange({ ...value, search: e.target.value })}
                  className="pl-8 h-9 text-sm"
                />
              </div>
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

            {/* City */}
            {cities && cities.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Select
                  value={value.city ?? "all"}
                  onValueChange={(v) => onChange({ ...value, city: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {cities.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Outstanding Only */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Outstanding Credit</Label>
              <div className="flex items-center gap-2 h-9">
                <Switch
                  checked={value.outstandingOnly}
                  onCheckedChange={(checked) => onChange({ ...value, outstandingOnly: checked })}
                />
                <span className="text-sm text-muted-foreground">
                  {value.outstandingOnly ? "Show only" : "Show all"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
