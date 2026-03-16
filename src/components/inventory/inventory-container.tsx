import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  PlusIcon,
  Pencil,
  Eye,
  Warehouse,
  Package,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { GenericEmpty } from "../custom/empty";
import { InventoryEmptyIllustration } from "@/components/illustrations/InventoryEmptyIllustration";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AddWarehouseDialog } from "./add-warehouse-dialog";
import { ManageWarehouseStatusDialog } from "./manage-warehouse-status-dialog";
import { EditWarehouseDialog } from "./edit-warehouse-dialog";
import { WarehouseDetailsDialog } from "./warehouse-details-dialog";
import { FinishedGoodsTable } from "./finished-goods-table";
import { TransferStockDialog } from "./transfer-stock-dialog";
import { TooltipWrapper } from "../custom/tooltip-wrapper";
import { cn } from "@/lib/utils";

export const InventoryContainer = () => {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [isAddWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [isTransferOpen, setTransferOpen] = useState(false);
  const [isEditWarehouseOpen, setEditWarehouseOpen] = useState(false);
  const [isDetailsWarehouseOpen, setDetailsWarehouseOpen] = useState(false);

  const { data: warehouses } = useSuspenseQuery({
    queryKey: ["inventory"],
    queryFn: getInventoryFn,
    refetchInterval: 1000,
  });

  useEffect(() => {
    if (
      selectedWarehouse !== "all" &&
      !warehouses.find((w) => w.id === selectedWarehouse)
    ) {
      setSelectedWarehouse("all");
    }
  }, [warehouses, selectedWarehouse]);

  if (warehouses.length === 0) {
    return (
      <>
        <GenericEmpty
          icon={InventoryEmptyIllustration}
          title="Ready to store Stock?"
          description="Add a warehouse facility to start managing your finished goods inventory."
          ctaText="Add Warehouse"
          onAddChange={setAddWarehouseOpen}
        />
        <AddWarehouseDialog
          onOpenChange={setAddWarehouseOpen}
          open={isAddWarehouseOpen}
          forcedType="storage"
        />
      </>
    );
  }

  const storageWarehouses = warehouses.filter((w) => w.type === "storage");
  const activeWarehouseCount = storageWarehouses.filter((w) => w.isActive).length;

  const finishedGoods = storageWarehouses.flatMap((w) =>
    (selectedWarehouse === "all" || w.id === selectedWarehouse
      ? w.finishedGoodsStock || []
      : []
    ).map((fg) => ({
      ...fg,
      warehouse: { name: w.name, isActive: w.isActive },
    })),
  );

  const selectedWarehouseData =
    selectedWarehouse !== "all"
      ? warehouses.find((w) => w.id === selectedWarehouse)
      : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* ── Toolbar ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border bg-secondary">
        <div className="flex items-center gap-3">
          {/* Warehouse Selector */}
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-[220px] h-9 bg-background border-border/60 text-[13px] font-medium rounded-lg">
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[13px]">
                <div className="flex items-center gap-2">
                  <Warehouse className="size-3.5 text-muted-foreground" />
                  All Warehouses
                </div>
              </SelectItem>
              {storageWarehouses.map((w) => (
                <SelectItem key={w.id} value={w.id} className="text-[13px]">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        w.isActive ? "bg-emerald-500" : "bg-slate-400",
                      )}
                    />
                    {w.name}
                    {!w.isActive && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1 text-muted-foreground ml-1"
                      >
                        Inactive
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Per-warehouse actions */}
          {selectedWarehouse !== "all" && storageWarehouses.length > 0 && (
            <div className="flex items-center gap-1 border-l pl-3">
              <TooltipWrapper tooltipContent="View Details">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDetailsWarehouseOpen(true)}
                  className="size-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  <Eye className="size-3.5" />
                </Button>
              </TooltipWrapper>
              <TooltipWrapper tooltipContent="Edit Warehouse">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditWarehouseOpen(true)}
                  className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Pencil className="size-3.5" />
                </Button>
              </TooltipWrapper>
              <ManageWarehouseStatusDialog
                warehouseId={selectedWarehouse}
                warehouseName={selectedWarehouseData?.name || ""}
                isActive={selectedWarehouseData?.isActive ?? true}
                otherWarehouses={warehouses.filter(
                  (w) => w.id !== selectedWarehouse && w.isActive,
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTransferOpen(true)}
            className="h-9 gap-2 text-[13px] font-medium rounded-lg border-border/60 hover:bg-muted/50 transition-colors"
          >
            <ArrowRightLeft className="size-3.5" />
            Transfer Stock
          </Button>
          <Button
            size="sm"
            onClick={() => setAddWarehouseOpen(true)}
            className="h-9 gap-2 text-[13px] font-medium rounded-lg"
          >
            <PlusIcon className="size-3.5" />
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          icon={Warehouse}
          label="Total Warehouses"
          value={storageWarehouses.length}
          subtext={`${activeWarehouseCount} active`}
          color="blue"
        />
        <KPICard
          icon={Package}
          label="Finished Goods"
          value={finishedGoods.length}
          subtext={
            selectedWarehouse === "all"
              ? "Across all warehouses"
              : `In ${selectedWarehouseData?.name || "selected warehouse"}`
          }
          color="emerald"
        />
        <KPICard
          icon={TrendingUp}
          label="Active Locations"
          value={activeWarehouseCount}
          subtext={`${storageWarehouses.length - activeWarehouseCount} inactive`}
          color="violet"
        />
      </div>

      {/* ── Stock Tables ───────────────────────────────────────────────── */}
      <Tabs defaultValue="finished" className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-muted/50 p-1 h-10 rounded-lg">
            <TabsTrigger
              value="finished"
              className="gap-2 px-4 text-[13px] rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Package className="size-3.5" />
              Finished Goods
              {finishedGoods.length > 0 && (
                <span className="ml-1 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  {finishedGoods.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="finished" className="mt-0 focus-visible:outline-none">
          <FinishedGoodsTable
            data={finishedGoods as any}
            warehouses={warehouses}
            preselectedWarehouse={
              selectedWarehouse === "all" ? undefined : selectedWarehouse
            }
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AddWarehouseDialog
        open={isAddWarehouseOpen}
        onOpenChange={setAddWarehouseOpen}
        forcedType="storage"
      />
      <TransferStockDialog
        open={isTransferOpen}
        onOpenChange={setTransferOpen}
        warehouses={warehouses}
      />

      {selectedWarehouse !== "all" &&
        (() => {
          const activeWarehouse = warehouses.find(
            (w) => w.id === selectedWarehouse,
          );
          if (!activeWarehouse) return null;
          return (
            <>
              <EditWarehouseDialog
                open={isEditWarehouseOpen}
                onOpenChange={setEditWarehouseOpen}
                warehouse={activeWarehouse as any}
              />
              <WarehouseDetailsDialog
                open={isDetailsWarehouseOpen}
                onOpenChange={setDetailsWarehouseOpen}
                warehouse={activeWarehouse as any}
              />
            </>
          );
        })()}
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────

type KPIColor = "blue" | "emerald" | "violet" | "amber";

const kpiColorMap: Record<
  KPIColor,
  { bg: string; iconBg: string; icon: string; value: string; text: string }
> = {
  blue: {
    bg: "bg-blue-50/60 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20",
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-400",
    text: "text-blue-600/70 dark:text-blue-400/70",
  },
  emerald: {
    bg: "bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-500/20",
    icon: "text-emerald-600 dark:text-emerald-400",
    value: "text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-600/70 dark:text-emerald-400/70",
  },
  violet: {
    bg: "bg-violet-50/60 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-500/20",
    iconBg: "bg-violet-100 dark:bg-violet-500/20",
    icon: "text-violet-600 dark:text-violet-400",
    value: "text-violet-700 dark:text-violet-400",
    text: "text-violet-600/70 dark:text-violet-400/70",
  },
  amber: {
    bg: "bg-amber-50/60 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20",
    iconBg: "bg-amber-100 dark:bg-amber-500/20",
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-400",
    text: "text-amber-600/70 dark:text-amber-400/70",
  },
};

function KPICard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  subtext: string;
  color: KPIColor;
}) {
  const c = kpiColorMap[color];
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 transition-all hover:shadow-md",
        c.bg,
      )}
    >
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-4", c.iconBg)}>
        <Icon className={cn("size-4", c.icon)} />
      </div>
      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", c.text)}>
        {label}
      </p>
      <p className={cn("text-3xl font-black tracking-tight leading-tight", c.value)}>
        {value}
      </p>
      <p className="text-[11px] text-muted-foreground/70 font-medium mt-1">
        {subtext}
      </p>
    </div>
  );
}