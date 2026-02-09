import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { DataTable } from "../ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "../ui/button";

type MaterialUsage = {
    id: string;
    productionRunId: string;
    materialType: "chemical" | "packaging";
    materialId: string;
    quantityUsed: string;
    costPerUnit: string;
    totalCost: string;
    createdAt: Date;
    chemical?: { name: string; unit: string };
    packagingMaterial?: { name: string };
    productionRun?: { batchId: string; recipe: { name: string } };
};

export const ConsumptionTable = ({ data }: { data: MaterialUsage[] }) => {
    const columns = useMemo<ColumnDef<MaterialUsage>[]>(() => [
        {
            accessorKey: "createdAt",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Date
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div className="font-medium">
                    {format(new Date(row.getValue("createdAt")), "PP p")}
                </div>
            ),
        },
        {
            id: "batchId",
            accessorFn: (row) => row.productionRun?.batchId,
            header: "Batch",
            cell: ({ row }) => (
                <div className="flex flex-col">
                    <span className="font-bold">{row.original.productionRun?.batchId}</span>
                    <span className="text-xs text-muted-foreground">{row.original.productionRun?.recipe?.name}</span>
                </div>
            ),
        },
        {
            id: "material",
            header: "Material",
            cell: ({ row }) => (
                <span>
                    {row.original.materialType === "chemical"
                        ? row.original.chemical?.name
                        : row.original.packagingMaterial?.name}
                </span>
            ),
        },
        {
            accessorKey: "materialType",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant="outline" className="capitalize">
                    {row.getValue("materialType")}
                </Badge>
            ),
        },
        {
            accessorKey: "quantityUsed",
            header: () => (
                <div className="text-right">Quantity</div>
            ),
            cell: ({ row }) => (
                <div className="text-right font-mono">
                    {parseFloat(row.getValue("quantityUsed")).toFixed(2)}
                    <span className="text-xs text-muted-foreground ml-1">
                        {row.original.materialType === "chemical" ? row.original.chemical?.unit : "units"}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "totalCost",
            header: () => (
                <div className="text-right">Cost (PKR)</div>
            ),
            cell: ({ row }) => (
                <div className="text-right font-mono text-emerald-600 font-medium">
                    {parseFloat(row.getValue("totalCost")).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
            ),
        },
    ], []);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold tracking-tight">
                        Consumption History
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Track material usage across production runs. Search by Batch ID.
                    </p>
                </div>
            </div>

            <DataTable
                pageSize={5}
                columns={columns}
                data={data || []}
                searchKey="batchId"
                searchPlaceholder="Search by Batch ID..."
            />
        </div>
    );
};
