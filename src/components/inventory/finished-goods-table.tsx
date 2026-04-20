import {
  Eye,
  Warehouse,
  ArrowUpDown,
  ArrowRightLeft,
} from "lucide-react";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { GenericEmpty } from "../custom/empty";
import { InventoryEmptyIllustration } from "@/components/illustrations/InventoryEmptyIllustration";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { DataTable } from "../custom/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { TransferStockDialog } from "./transfer-stock-dialog";

type FinishedGood = {
  id: string;
  quantityCartons: number;
  quantityContainers: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  warehouse: {
    id: string; // Ensure ID is available
    name: string;
    isActive: boolean;
  };
  recipe: {
    id: string;
    name: string;
    containersPerCarton: number | null;
    estimatedCostPerContainer: string | null;
    batchUnit: string;
    minimumStockLevel: number | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    product: {
      name: string;
    };
  };
};

interface FinishedGoodsTableProps {
  data: FinishedGood[];
  warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
  preselectedWarehouse: string | undefined;
}

export const FinishedGoodsTable = ({
  data,
  warehouses,
  preselectedWarehouse,
}: FinishedGoodsTableProps) => {
  const navigate = useNavigate();
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FinishedGood | null>(null);

  const columns = useMemo<ColumnDef<FinishedGood>[]>(
    () => [
      {
        id: "product",
        accessorFn: (row) => row.recipe.product.name,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4"
            >
              Product & Variant
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-bold text-foreground">
              {row.original.recipe.product.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.recipe.name}
            </span>
          </div>
        ),
      },
      {
        id: "warehouse",
        accessorFn: (row) => row.warehouse.name,
        header: "Warehouse",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Warehouse className="size-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {row.original.warehouse.name}
            </span>
            {!row.original.warehouse.isActive && (
              <Badge
                variant="outline"
                className="text-[10px] h-4 px-1 text-muted-foreground whitespace-nowrap"
              >
                Inactive
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "quantityCartons",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4"
            >
              Cartons
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <span className="font-mono font-bold">
            {row.getValue("quantityCartons")}
          </span>
        ),
      },
      {
        id: "totalUnits",
        header: "Total Units",
        cell: ({ row }) => {
          const fg = row.original;
          return (
            <div className="flex flex-col">
              <span className="font-mono font-bold">
                {fg.quantityCartons * (fg.recipe.containersPerCarton ?? 0) +
                  fg.quantityContainers}
              </span>
              <span className="text-[10px] uppercase text-muted-foreground">
                Loose: {fg.quantityContainers}
              </span>
            </div>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const fg = row.original;
          const totalUnits =
            fg.quantityCartons * (fg.recipe.containersPerCarton ?? 0) +
            fg.quantityContainers;

          if (totalUnits <= 0) {
            return <Badge variant="destructive">Out of Stock</Badge>;
          }

          if (
            fg.recipe.minimumStockLevel !== null &&
            fg.recipe.minimumStockLevel > 0 &&
            totalUnits <= fg.recipe.minimumStockLevel
          ) {
            return (
              <Badge
                variant="destructive"
                className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
              >
                Low Stock
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-600">
              Healthy
            </Badge>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "Last Updated",
        cell: ({ row }) => (
          <div className="flex flex-col text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground/70">
              {format(new Date(row.getValue("updatedAt")), "MMM d, yyyy")}
            </span>
            <span>{format(new Date(row.getValue("updatedAt")), "p")}</span>
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
              title="Transfer Stock"
              onClick={() => {
                setSelectedItem(row.original);
                setTransferOpen(true);
              }}
            >
              <ArrowRightLeft className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-primary hover:bg-primary/5 hover:text-primary"
              title="View Details"
              onClick={() => navigate({ to: "/inventory/item/$itemType/$itemId", params: { itemType: "finished", itemId: row.original.recipe.id } })}
            >
              <Eye className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  if (data.length === 0) {
    const selectedWarehouseName = warehouses.find(
      (w) => w.id === preselectedWarehouse,
    )?.name;
    const description = selectedWarehouseName
      ? `${selectedWarehouseName} warehouse has no finished goods in stock.`
      : "No finished goods available in inventory.";

    return (
      <GenericEmpty
        icon={InventoryEmptyIllustration}
        title="No Finished Goods"
        description={description}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Finished Goods</h3>
          <p className="text-sm text-muted-foreground">
            Manage and monitor your finished products ready for transfer.
          </p>
        </div>
      </div>

      <DataTable
        pageSize={5}
        columns={columns}
        data={data.filter(
          (item) =>
            item.quantityCartons > 0 || item.quantityContainers > 0,
        )}
        searchKey="product"
        searchPlaceholder="Filter finished goods..."
      />

      {/* Transfer Dialog */}
      {selectedItem && transferOpen && (
        <TransferStockDialog
          open={transferOpen}
          onOpenChange={setTransferOpen}
          warehouses={warehouses}
          defaultValues={{
            fromWarehouseId: selectedItem.warehouse.id || preselectedWarehouse,
            materialType: "finished",
            materialId: selectedItem.recipe.id,
            quantity:
              selectedItem.quantityCartons > 0
                ? selectedItem.quantityCartons.toString()
                : "",
          }}
        />
      )}
    </div>
  );
};
