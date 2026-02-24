import {
  FlaskConicalIcon,
  PackageIcon,
  Pencil,
  Plus,
  Trash2,
  Eye,
  ArrowUpDown,
  Wrench,
} from "lucide-react";
import { format } from "date-fns";
import { InventoryDetailsDialog } from "./inventory-details-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { GenericEmpty } from "../custom/empty";
import { useState, useMemo } from "react";
import { AddRawMaterialDialog } from "./add-raw-material-sheet";
import { AddPackagingMaterialDialog } from "./add-packaging-material-dialog";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { useDeleteMaterial } from "@/hooks/inventory/use-material-actions";
import { EditMaterialDialog } from "./edit-material-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";

type StockItem = {
  id: string;
  quantity: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  warehouse: {
    name: string;
    isActive: boolean;
  };
  chemical?: {
    id: string;
    name: string;
    unit: string;
    minimumStockLevel: string | number | null;
    costPerUnit: string | number | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    lastSupplier?: {
      id: string;
      supplierName: string;
      supplierShopName?: string | null;
      phone?: string | null;
    } | null;
  } | null;
  packagingMaterial?: {
    id: string;
    name: string;
    type: string;
    capacity: string | null;
    capacityUnit: string | null;
    unit?: string;
    size?: string | null;
    minimumStockLevel: string | number | null;
    costPerUnit: string | number | null;
    createdAt: string | Date;
    updatedAt: string | Date;
    lastSupplier?: {
      id: string;
      supplierName: string;
      supplierShopName?: string | null;
      phone?: string | null;
    } | null;
  } | null;
};

type StockTableProps = {
  data: StockItem[];
  type: "chemical" | "packaging";
  warehouses: Awaited<ReturnType<typeof getInventoryFn>>;
  preselectedWarehouse: string | undefined;
  hideAddButton?: boolean;
  hideActions?: boolean;
  onAdjustStock?: (item: StockItem) => void;
};

export const StockTable = ({
  data,
  type,
  warehouses,
  preselectedWarehouse,
  hideAddButton = false,
  hideActions = false,
  onAdjustStock,
}: StockTableProps) => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  const deleteMutation = useDeleteMaterial();

  const isChemical = type === "chemical";

  const handleDelete = async () => {
    if (!selectedItem) return;
    const materialId = isChemical
      ? selectedItem.chemical?.id
      : selectedItem.packagingMaterial?.id;
    if (!materialId) return;

    await deleteMutation.mutateAsync({
      data: {
        id: materialId,
        type: type,
      },
    });
    setDeleteDialogOpen(false);
    setSelectedItem(null);
  };

  const columns = useMemo<ColumnDef<StockItem>[]>(() => {
    const baseColumns: ColumnDef<StockItem>[] = [
      {
        id: "name",
        accessorFn: (row) =>
          isChemical ? row.chemical?.name : row.packagingMaterial?.name,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent"
            >
              Material Name
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const material = isChemical
            ? row.original.chemical
            : row.original.packagingMaterial;
          return (
            <div className="font-bold text-foreground py-1">
              {material?.name}
            </div>
          );
        },
      },

      {
        id: "quantity",
        accessorFn: (row) => parseFloat(row.quantity),
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="-ml-4 h-8 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent"
            >
              Current Stock
              <ArrowUpDown className="ml-2 h-3 w-3" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const material = isChemical
            ? row.original.chemical
            : row.original.packagingMaterial;
          return (
            <div className="flex flex-col gap-1 py-1">
              <span className="font-bold text-sm tracking-tight">
                {parseFloat(row.original.quantity).toFixed(2)}
              </span>
              <span className="text-[9px] font-black px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit leading-none">
                {material?.unit?.toUpperCase() ||
                  (type === "packaging" ? "PCS" : "KG")}
              </span>
            </div>
          );
        },
      },
      {
        id: "price",
        header: "PRICE/UNIT",
        cell: ({ row }) => {
          const material = isChemical
            ? row.original.chemical
            : row.original.packagingMaterial;
          return (
            <span className="text-xs font-medium text-foreground opacity-90">
              PKR{" "}
              {parseFloat(material?.costPerUnit?.toString() || "0").toFixed(2)}
            </span>
          );
        },
      },
      {
        id: "supplier",
        header: "SUPPLIER",
        cell: ({ row }) => {
          const material = isChemical
            ? row.original.chemical
            : row.original.packagingMaterial;
          return (
            <span className="text-xs font-medium text-muted-foreground truncate">
              {material?.lastSupplier?.supplierName || "N/A"}
            </span>
          );
        },
      },
      {
        id: "status",
        header: "STATUS",
        cell: ({ row }) => {
          const material = isChemical
            ? row.original.chemical
            : row.original.packagingMaterial;
          if (!material) return null;
          const currentQty = parseFloat(row.original.quantity);
          const minLevel =
            typeof material.minimumStockLevel === "string"
              ? parseFloat(material.minimumStockLevel)
              : material.minimumStockLevel || 0;
          const isLow = currentQty < minLevel;

          if (currentQty <= 0) {
            return (
              <Badge
                variant="destructive"
                className="h-5 text-[10px] uppercase tracking-tighter"
              >
                Out of Stock
              </Badge>
            );
          }

          return isLow ? (
            <Badge
              variant="destructive"
              className="h-5 text-[10px] uppercase tracking-tighter"
            >
              Low Stock
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-5 text-[10px] uppercase font-bold tracking-widest bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
            >
              Healthy
            </Badge>
          );
        },
      },
      {
        accessorKey: "updatedAt",
        header: "LAST UPDATED",
        cell: ({ row }) => (
          <div className="flex flex-col text-[10px] font-medium text-muted-foreground leading-tight">
            <span className="text-foreground/80">
              {format(new Date(row.original.updatedAt), "MMM d, yyyy")}
            </span>
            <span className="text-[9px] opacity-60 font-bold uppercase">
              {format(new Date(row.original.updatedAt), "p")}
            </span>
          </div>
        ),
      },
    ];

    if (!hideActions) {
      baseColumns.push({
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
              onClick={() => {
                setSelectedItem(row.original);
                setDetailsOpen(true);
              }}
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-slate-500 hover:bg-slate-100 hover:text-slate-700 rounded-md transition-colors"
              onClick={() => {
                setSelectedItem(row.original);
                setEditDialogOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors"
              onClick={() => {
                setSelectedItem(row.original);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      });
    } else {
      // If hiding actions, still keep the View Details button available maybe?
      // The user said "Remove the edit and delete functionality".
      // But also "when the eye icon is clicked then he should be able to see full details".
      // So I should keep the eye icon even if hideActions is true!
      baseColumns.push({
        id: "actions",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-md transition-colors"
              onClick={() => {
                setSelectedItem(row.original);
                setDetailsOpen(true);
              }}
            >
              <Eye className="size-3.5" />
            </Button>
            {onAdjustStock && (
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-amber-600 hover:bg-amber-50 hover:text-amber-700 rounded-md transition-colors"
                onClick={() => onAdjustStock(row.original)}
                title="Manual Stock Adjustment"
              >
                <Wrench className="size-3.5" />
              </Button>
            )}
          </div>
        ),
      });
    }

    return baseColumns;
  }, [isChemical, type, hideActions, onAdjustStock]);

  const closeEditDialog = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) setSelectedItem(null);
  };

  const selectedWarehouse = warehouses.find(
    (w) => w.id === preselectedWarehouse,
  );
  const isAddAllowed =
    !selectedWarehouse || selectedWarehouse.type === "factory_floor";

  if (data.length === 0) {
    const description = selectedWarehouse
      ? selectedWarehouse.type === "storage"
        ? `${selectedWarehouse.name} is a storage facility and cannot store raw materials (chemicals/packaging).`
        : `${selectedWarehouse.name} warehouse has no ${isChemical ? "Chemicals" : "packaging materials"}.`
      : `No ${isChemical ? "Chemicals" : "packaging material"} stock available.`;

    return (
      <>
        <GenericEmpty
          icon={isChemical ? FlaskConicalIcon : PackageIcon}
          title={
            selectedWarehouse?.type === "storage"
              ? "Invalid Storage Type"
              : `No ${isChemical ? "Chemicals" : "Packaging Material"} Stock`
          }
          description={description}
          ctaText={
            isAddAllowed && !hideAddButton
              ? `Add ${isChemical ? "Chemicals" : "Packaging Material"}`
              : undefined
          }
          onAddChange={
            isAddAllowed && !hideAddButton ? setCreateDialogOpen : undefined
          }
        />

        {isAddAllowed &&
          (isChemical ? (
            <AddRawMaterialDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              warehouses={warehouses}
              preselectedWarehouse={preselectedWarehouse}
            />
          ) : (
            <AddPackagingMaterialDialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              warehouses={warehouses}
              preselectedWarehouse={preselectedWarehouse}
            />
          ))}
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold tracking-tight">
            {isChemical ? "Chemicals" : "Packaging Materials"}
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage and monitor your {isChemical ? "ingredient" : "packaging"}{" "}
            stock levels.
          </p>
        </div>
        {isAddAllowed && !hideAddButton && (
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
          >
            <Plus className="size-4 mr-2" />
            {isChemical ? "Add Chemical" : "Add Packaging"}
          </Button>
        )}
      </div>

      <DataTable
        pageSize={5}
        columns={columns}
        data={data}
        searchKey="name"
        searchPlaceholder={`Filter ${isChemical ? "chemicals" : "packaging"}...`}
      />

      {/* Details Dialog */}
      {selectedItem && (
        <InventoryDetailsDialog
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          type={type}
          item={selectedItem}
        />
      )}

      {/* Edit Dialog */}
      {selectedItem && (
        <EditMaterialDialog
          key={selectedItem.id}
          open={editDialogOpen}
          onOpenChange={closeEditDialog}
          type={type}
          item={selectedItem}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the material and all its associated
              stock records across all warehouses. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Dialogs */}
      {isChemical ? (
        <AddRawMaterialDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          warehouses={warehouses.filter((w) => w.isActive)}
          preselectedWarehouse={preselectedWarehouse}
        />
      ) : (
        <AddPackagingMaterialDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          warehouses={warehouses.filter((w) => w.isActive)}
          preselectedWarehouse={preselectedWarehouse}
        />
      )}
    </div>
  );
};
