import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Package,
  Boxes,
  Banknote,
  Factory,
  Warehouse,
  TrendingUp,
  Tag,
  Percent,
  FileText,
  ShoppingCart,
  AlertCircle,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Box,
  Clock,
  CheckCircle2,
  CircleDashed,
  XCircle,
  AlertTriangle,
  BarChart3,
  Truck,
  User,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DatePickerWithRange } from "@/components/custom/date-range-picker";
import { formatPKR } from "@/lib/currency-format";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { type DateRange } from "react-day-picker";
import { format, subMonths, startOfMonth, parseISO, isWithinInterval } from "date-fns";

interface MonthlySale {
  month: string;
  cartons: number;
  units: number;
  revenue: number;
}

interface StockItem {
  warehouseName: string;
  cartons: number;
  containers: number;
}

interface ProductDetail {
  product: { name: string; description: string | null; category: string | null };
  recipes: any[];
  monthlySales: MonthlySale[];
  productionHistory: any[];
  stockByWarehouse: StockItem[];
  priceChanges: any[];
  orders: any[];
  promos: any[];
  priceAgreements: any[];
  discountRules: any[];
}

interface ProductDetailViewProps {
  data: ProductDetail;
}

/* ────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────────────────────── */

export function ProductDetailView({ data }: ProductDetailViewProps) {
  const { product, recipes, monthlySales, productionHistory, stockByWarehouse, priceChanges, orders, promos, priceAgreements, discountRules } = data;

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(startOfMonth(new Date()), 11),
    to: new Date(),
  });

  /* Filter monthly sales by date range */
  const filteredSales = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return monthlySales;
    return monthlySales.filter((s) => {
      const d = parseISO(s.month + "-01");
      return isWithinInterval(d, { start: dateRange.from!, end: dateRange.to! });
    });
  }, [monthlySales, dateRange]);

  const totalCartons = filteredSales.reduce((s, m) => s + m.cartons, 0);
  const totalUnits = filteredSales.reduce((s, m) => s + m.units, 0);
  const totalRevenue = filteredSales.reduce((s, m) => s + m.revenue, 0);

  /* Previous period for trend calc */
  const prevCartons = useMemo(() => {
    if (filteredSales.length < 2) return 0;
    const half = Math.floor(filteredSales.length / 2);
    return filteredSales.slice(0, half).reduce((s, m) => s + m.cartons, 0);
  }, [filteredSales]);
  const prevUnits = useMemo(() => {
    if (filteredSales.length < 2) return 0;
    const half = Math.floor(filteredSales.length / 2);
    return filteredSales.slice(0, half).reduce((s, m) => s + m.units, 0);
  }, [filteredSales]);
  const prevRevenue = useMemo(() => {
    if (filteredSales.length < 2) return 0;
    const half = Math.floor(filteredSales.length / 2);
    return filteredSales.slice(0, half).reduce((s, m) => s + m.revenue, 0);
  }, [filteredSales]);

  const cartonTrend = trendPercent(totalCartons, prevCartons);
  const unitTrend = trendPercent(totalUnits, prevUnits);
  const revenueTrend = trendPercent(totalRevenue, prevRevenue);

  const totalStockCartons = stockByWarehouse.reduce((s, w) => s + w.cartons, 0);
  const totalStockContainers = stockByWarehouse.reduce((s, w) => s + w.containers, 0);

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════
          HERO HEADER
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-muted/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <Link to="/manufacturing/recipes">
                <Button variant="outline" size="icon" className="rounded-full shrink-0 mt-1">
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight">{product.name}</h1>
                  <Badge variant="secondary" className="capitalize text-xs px-2.5 py-0.5 h-6">
                    {product.category || "Uncategorized"}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed">
                  {product.description || "No description provided"}
                </p>
                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="size-3.5" />
                    {recipes.length} recipe{recipes.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Warehouse className="size-3.5" />
                    {stockByWarehouse.length} warehouse{stockByWarehouse.length !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Box className="size-3.5" />
                    {totalStockCartons.toLocaleString()} cartons in stock
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 min-w-[240px]">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Sales Period
              </label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          KPI CARDS
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          icon={<Boxes className="size-5" />}
          label="Total Cartons"
          value={totalCartons.toLocaleString()}
          trend={cartonTrend}
          color="emerald"
        />
        <KpiCard
          icon={<Package className="size-5" />}
          label="Total Units"
          value={totalUnits.toLocaleString()}
          trend={unitTrend}
          color="blue"
        />
        <KpiCard
          icon={<Banknote className="size-5" />}
          label="Total Revenue"
          value={formatPKR(totalRevenue)}
          trend={revenueTrend}
          color="amber"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          CHARTS
         ═══════════════════════════════════════════════════════════════════ */}
      {filteredSales.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            icon={<BarChart3 className="size-4" />}
            title="Sales Volume"
            subtitle="Cartons vs. Units"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredSales} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.2)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="cartons" name="Cartons" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="units" name="Units" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            icon={<TrendingUp className="size-4" />}
            title="Revenue"
            subtitle="Total revenue per period"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredSales}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `PKR ${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(38 92% 50%)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : (
        <EmptyStateCard
          icon={<TrendingUp className="size-5" />}
          title="No Sales Data"
          description="No sales recorded for the selected period."
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TABBED CONTENT
         ═══════════════════════════════════════════════════════════════════ */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full md:w-auto grid grid-cols-3 md:inline-flex md:grid-cols-none h-auto md:h-10 gap-1">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <FlaskConical className="size-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="operations" className="text-xs gap-1.5">
            <Factory className="size-3.5" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="pricing" className="text-xs gap-1.5">
            <Percent className="size-3.5" />
            Pricing
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 mt-2">
          {/* Recipes */}
          <SectionCard icon={<FlaskConical className="size-4" />} title="Recipes" subtitle={`${recipes.length} production recipe${recipes.length !== 1 ? "s" : ""}`}>
            {recipes.length === 0 ? (
              <EmptyState title="No Recipes" description="No production recipes have been created for this product yet." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recipes.map((recipe: any) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </SectionCard>

          {/* Stock by Warehouse */}
          <SectionCard icon={<Warehouse className="size-4" />} title="Stock by Warehouse" subtitle={`${totalStockCartons.toLocaleString()} cartons, ${totalStockContainers.toLocaleString()} containers total`}>
            {stockByWarehouse.length === 0 ? (
              <EmptyState title="No Stock" description="No finished goods stock is currently recorded." />
            ) : (
              <div className="space-y-3">
                {stockByWarehouse.map((s: any) => (
                  <StockBar key={s.warehouseName} item={s} maxCartons={Math.max(...stockByWarehouse.map((w) => w.cartons))} />
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── OPERATIONS TAB ───────────────────────────────────────────── */}
        <TabsContent value="operations" className="space-y-4 mt-2">
          {/* Production History */}
          <SectionCard icon={<Factory className="size-4" />} title="Production History" subtitle={`Last ${productionHistory.length} runs`}>
            {productionHistory.length === 0 ? (
              <EmptyState title="No Production Runs" description="No production runs have been recorded." />
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {productionHistory.map((run: any) => (
                    <ProductionRow key={run.id} run={run} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </SectionCard>

          {/* Orders */}
          <SectionCard icon={<ShoppingCart className="size-4" />} title="Orders" subtitle={`Last ${orders.length} orders`}>
            {orders.length === 0 ? (
              <EmptyState title="No Orders" description="No orders have been placed for this product." />
            ) : (
              <ScrollArea className="h-[400px]">
                <DataTable
                  headers={["Bill #", "Shopkeeper", "Order Booker", "Status", "Qty", "Rate", "Amount", "Date"]}
                  rows={orders.map((o: any) => [
                    <span key="bn" className="font-mono text-xs">{o.billNumber}</span>,
                    o.shopkeeperName,
                    o.orderBookerName || "-",
                    <StatusBadge key="st" status={o.status} />,
                    o.quantity,
                    formatPKR(Number(o.rate || 0)),
                    <span key="am" className="font-semibold">{formatPKR(Number(o.amount || 0))}</span>,
                    o.createdAt ? format(new Date(o.createdAt), "dd MMM yyyy") : "-",
                  ])}
                />
              </ScrollArea>
            )}
          </SectionCard>
        </TabsContent>

        {/* ── PRICING TAB ──────────────────────────────────────────────── */}
        <TabsContent value="pricing" className="space-y-4 mt-2">
          {/* Pricing History */}
          <CollapsibleSection icon={<FileText className="size-4" />} title="Pricing History" count={priceChanges.length}>
            {priceChanges.length === 0 ? (
              <EmptyState title="No Price Changes" description="No pricing history recorded." />
            ) : (
              <DataTable
                headers={["Date", "Old Price", "New Price", "Customer", "Source", "Changed By"]}
                rows={priceChanges.map((pc: any) => [
                  pc.createdAt ? format(new Date(pc.createdAt), "dd MMM yyyy") : "-",
                  <span key="old" className="text-muted-foreground">{formatPKR(Number(pc.oldPrice))}</span>,
                  <span key="new" className="font-semibold">{formatPKR(Number(pc.newPrice))}</span>,
                  pc.customer?.name || "Global",
                  <Badge key="src" variant="outline" className="text-[10px]">{pc.source}</Badge>,
                  pc.changedBy?.name || "-",
                ])}
              />
            )}
          </CollapsibleSection>

          {/* Promotional Rules */}
          <CollapsibleSection icon={<Tag className="size-4" />} title="Promotional Rules" count={promos.length}>
            {promos.length === 0 ? (
              <EmptyState title="No Promotions" description="No promotional rules configured." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {promos.map((p: any) => (
                  <Card key={p.id} className="border-border/50 bg-muted/20">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">Buy {p.buyQty} Get {p.freeQty} Free</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{p.eligibleCustomerType}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CalendarDays className="size-3" />
                        {p.activeFrom ? format(new Date(p.activeFrom), "dd MMM yyyy") : "-"}
                        {" → "}
                        {p.activeTo ? format(new Date(p.activeTo), "dd MMM yyyy") : "Ongoing"}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Price Agreements */}
          <CollapsibleSection icon={<FileText className="size-4" />} title="Customer Price Agreements" count={priceAgreements.length}>
            {priceAgreements.length === 0 ? (
              <EmptyState title="No Price Agreements" description="No customer-specific price agreements exist." />
            ) : (
              <DataTable
                headers={["Customer", "Type", "Value", "TP Baseline", "Effective From", "Effective To"]}
                rows={priceAgreements.map((pa: any) => [
                  pa.customer?.name || "-",
                  <Badge key="pt" variant="outline" className="text-[10px] capitalize">{pa.pricingType.replace(/_/g, " ")}</Badge>,
                  formatPKR(Number(pa.agreedValue)),
                  pa.tpBaseline ? formatPKR(Number(pa.tpBaseline)) : "-",
                  pa.effectiveFrom ? format(new Date(pa.effectiveFrom), "dd MMM yyyy") : "-",
                  pa.effectiveTo ? format(new Date(pa.effectiveTo), "dd MMM yyyy") : <span className="text-emerald-500 text-xs">Ongoing</span>,
                ])}
              />
            )}
          </CollapsibleSection>

          {/* Discount Rules */}
          <CollapsibleSection icon={<Percent className="size-4" />} title="Customer Discount Rules" count={discountRules.length}>
            {discountRules.length === 0 ? (
              <EmptyState title="No Discount Rules" description="No customer-specific discount rules exist." />
            ) : (
              <DataTable
                headers={["Customer", "Threshold", "Type", "Value", "Eligible Type", "Effective From", "Effective To"]}
                rows={discountRules.map((dr: any) => [
                  dr.customer?.name || "-",
                  `${dr.volumeThreshold} cartons`,
                  <Badge key="dt" variant="outline" className="text-[10px] capitalize">{dr.discountType.replace(/_/g, " ")}</Badge>,
                  dr.discountType === "percentage" ? `${dr.discountValue}%` : formatPKR(Number(dr.discountValue)),
                  <Badge key="et" variant="secondary" className="text-[10px] capitalize">{dr.eligibleCustomerType}</Badge>,
                  dr.effectiveFrom ? format(new Date(dr.effectiveFrom), "dd MMM yyyy") : "-",
                  dr.effectiveTo ? format(new Date(dr.effectiveTo), "dd MMM yyyy") : <span className="text-emerald-500 text-xs">Ongoing</span>,
                ])}
              />
            )}
          </CollapsibleSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS
   ──────────────────────────────────────────────────────────────────────────── */

function KpiCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend: number; color: "emerald" | "blue" | "amber" }) {
  const colorMap = {
    emerald: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", text: "text-emerald-500", iconBg: "bg-emerald-500/10" },
    blue: { border: "border-blue-500/20", bg: "bg-blue-500/5", text: "text-blue-500", iconBg: "bg-blue-500/10" },
    amber: { border: "border-amber-500/20", bg: "bg-amber-500/5", text: "text-amber-500", iconBg: "bg-amber-500/10" },
  };
  const c = colorMap[color];

  return (
    <Card className={`${c.border} ${c.bg} transition-all hover:shadow-md`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className={`inline-flex items-center justify-center size-9 rounded-lg ${c.iconBg} ${c.text}`}>
              {icon}
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight">{value}</div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
            </div>
          </div>
          {trend !== 0 && (
            <div className={`flex items-center gap-1 text-xs font-semibold ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-muted-foreground"}`}>
              {trend > 0 ? <ArrowUpRight className="size-3.5" /> : trend < 0 ? <ArrowDownRight className="size-3.5" /> : <Minus className="size-3.5" />}
              {Math.abs(trend).toFixed(1)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="text-primary">{icon}</div>
          <div>
            <CardTitle className="text-sm font-bold">{title}</CardTitle>
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">{children}</div>
      </CardContent>
    </Card>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{p.dataKey === "revenue" ? formatPKR(p.value) : p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <div className="font-semibold mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-amber-500" />
        <span className="text-muted-foreground">Revenue:</span>
        <span className="font-semibold">{formatPKR(payload[0].value)}</span>
      </div>
    </div>
  );
}

function RecipeCard({ recipe }: { recipe: any }) {
  const ingredientCost = recipe.ingredients?.reduce((sum: number, ing: any) => sum + (Number(ing.estimatedCost) || 0), 0) || 0;
  const packagingCost = recipe.packaging?.reduce((sum: number, pkg: any) => sum + (Number(pkg.estimatedCost) || 0), 0) || 0;
  const totalCost = ingredientCost + packagingCost;
  const costPerUnit = Number(recipe.estimatedCostPerContainer || 0);

  return (
    <Card className="border-border/60 hover:border-primary/30 transition-colors group">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">{recipe.name}</h3>
          <Badge variant={recipe.isActive ? "default" : "secondary"} className="text-[10px]">
            {recipe.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="text-muted-foreground">Batch Size</div>
          <div className="font-medium">{recipe.batchSize} {recipe.batchUnit}</div>
          <div className="text-muted-foreground">Target Units</div>
          <div className="font-medium">{recipe.targetUnitsPerBatch}</div>
          <div className="text-muted-foreground">Ingredients</div>
          <div className="font-medium">{recipe.ingredients?.length ?? 0}</div>
          <div className="text-muted-foreground">Packaging</div>
          <div className="font-medium">{recipe.packaging?.length ?? 0}</div>
        </div>

        {/* Cost breakdown bar */}
        {totalCost > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Cost Breakdown</span>
              <span className="font-semibold">{formatPKR(costPerUnit)}/unit</span>
            </div>
            <div className="h-2 flex rounded-full overflow-hidden bg-muted">
              {ingredientCost > 0 && (
                <div className="bg-emerald-500/70 h-full" style={{ width: `${(ingredientCost / totalCost) * 100}%` }} />
              )}
              {packagingCost > 0 && (
                <div className="bg-blue-500/70 h-full" style={{ width: `${(packagingCost / totalCost) * 100}%` }} />
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              {ingredientCost > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500/70" />
                  Ingredients {formatPKR(ingredientCost)}
                </span>
              )}
              {packagingCost > 0 && (
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-blue-500/70" />
                  Packaging {formatPKR(packagingCost)}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockBar({ item, maxCartons }: { item: StockItem; maxCartons: number }) {
  const pct = maxCartons > 0 ? (item.cartons / maxCartons) * 100 : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{item.warehouseName}</span>
        <span className="text-muted-foreground">
          {item.cartons.toLocaleString()} cartons · {item.containers.toLocaleString()} containers
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-primary/60 rounded-full transition-all" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

function ProductionRow({ run }: { run: any }) {
  const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
    completed: { icon: <CheckCircle2 className="size-3.5" />, color: "text-emerald-500" },
    in_progress: { icon: <CircleDashed className="size-3.5 animate-spin" />, color: "text-blue-500" },
    cancelled: { icon: <XCircle className="size-3.5" />, color: "text-red-500" },
    pending: { icon: <Clock className="size-3.5" />, color: "text-amber-500" },
  };
  const sc = statusConfig[run.status] || statusConfig.pending;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className={`${sc.color} shrink-0`}>{sc.icon}</div>
      <div className="min-w-0 flex-1 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs">
        <div>
          <div className="text-muted-foreground text-[10px]">Batch ID</div>
          <div className="font-mono font-medium truncate">{run.batchId}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px]">Batches</div>
          <div className="font-medium">{run.batchesProduced} → {run.containersProduced} containers</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px]">Cost</div>
          <div className="font-medium">{formatPKR(Number(run.totalProductionCost || 0))}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px]">Warehouse / Operator</div>
          <div className="font-medium truncate">{run.warehouse?.name || "-"} · {run.operator?.name || "-"}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground shrink-0 text-right">
        {run.createdAt ? format(new Date(run.createdAt), "dd MMM yyyy") : "-"}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: any; icon: React.ReactNode }> = {
    delivered: { variant: "default", icon: <CheckCircle2 className="size-3 mr-1" /> },
    pending: { variant: "secondary", icon: <Clock className="size-3 mr-1" /> },
    confirmed: { variant: "outline", icon: <CircleDashed className="size-3 mr-1" /> },
    returned: { variant: "destructive", icon: <XCircle className="size-3 mr-1" /> },
  };
  const v = variants[status] || variants.pending;
  return (
    <Badge variant={v.variant} className="text-[10px] gap-0.5 capitalize">
      {v.icon}
      {status}
    </Badge>
  );
}

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-primary">{icon}</div>
            <div>
              <CardTitle className="text-sm font-bold">{title}</CardTitle>
              {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CollapsibleSection({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CardHeader className="pb-3">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between text-left group">
              <div className="flex items-center gap-2">
                <div className="text-primary">{icon}</div>
                <div>
                  <CardTitle className="text-sm font-bold">{title}</CardTitle>
                </div>
                {count > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                    {count}
                  </Badge>
                )}
              </div>
              <div className="text-muted-foreground transition-transform group-data-[state=open]:rotate-180">
                <ChevronDown className="size-4" />
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/10 rounded-xl border border-dashed border-border/50">
      <AlertCircle className="size-8 text-muted-foreground/40 mb-3" />
      <h4 className="font-semibold text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
    </div>
  );
}

function EmptyStateCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-muted-foreground/40 mb-3">{icon}</div>
          <h4 className="font-semibold text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DataTable({ headers, rows }: { headers: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {headers.map((h, i) => (
              <TableHead key={i} className="text-[10px] uppercase font-bold tracking-wider">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={i} className="hover:bg-muted/30 transition-colors">
              {row.map((cell, j) => (
                <TableCell key={j} className="text-xs py-2.5">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   UTILITIES
   ──────────────────────────────────────────────────────────────────────────── */

function trendPercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
