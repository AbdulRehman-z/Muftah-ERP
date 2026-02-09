import { Package, Beaker, Box, Factory } from "lucide-react";
import { useState } from "react";
import { getFactoryFloorStockFn } from "@/server-functions/inventory/factory-floor/get-factory-floor-stocks-fn";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { GenericEmpty } from "../custom/empty";
import { AddWarehouseDialog } from "./add-warehouse-dialog";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StockTable } from "./stock-table";
import { FinishedGoodsTable } from "./finished-goods-table";
import { LowStockAlerts } from "./low-stocks-alert";
import { ConsumptionTable } from "./consumption-table";
import { getConsumptionHistoryFn } from "@/server-functions/inventory/factory-floor/get-consumption-history-fn";
import { getWarehousesFn } from "@/server-functions/inventory/get-warehouses-fn";

export const FactoryFloorContainer = () => {
    const { data: factoryFloor } = useSuspenseQuery({
        queryKey: ["factory-floor"],
        queryFn: getFactoryFloorStockFn,
    });

    const { data: allWarehouses } = useSuspenseQuery({
        queryKey: ["warehouses"],
        queryFn: getWarehousesFn,
    });

    const { data: consumptionHistory } = useSuspenseQuery({
        queryKey: ["consumption-history"],
        queryFn: getConsumptionHistoryFn,
    });

    const [activeTab, setActiveTab] = useState("raw");
    const [isAddFactoryOpen, setAddFactoryOpen] = useState(false);

    if (!factoryFloor) {
        return (
            <>
                <GenericEmpty
                    icon={Factory}
                    title="No Factory Floor Configured"
                    description="You haven't set up a Factory Floor warehouse yet. Create a production facility to start tracking chemicals and packaging."
                    ctaText="Add Factory Floor"
                    onAddChange={setAddFactoryOpen}
                />
                <AddWarehouseDialog
                    open={isAddFactoryOpen}
                    onOpenChange={setAddFactoryOpen}
                    forcedType="factory_floor"
                />
            </>
        );
    }

    const rawMaterials = factoryFloor.materialStock
        .filter((s) => s.chemicalId !== null)
        .map(s => ({
            ...s,
            warehouse: { name: factoryFloor.name, isActive: factoryFloor.isActive }
        }));

    const packagingMaterials = factoryFloor.materialStock
        .filter((s) => s.packagingMaterialId !== null && s.packagingMaterial?.type !== 'sticker')
        .map(s => ({
            ...s,
            warehouse: { name: factoryFloor.name, isActive: factoryFloor.isActive }
        }));

    const stickers = factoryFloor.materialStock
        .filter((s) => s.packagingMaterialId !== null && s.packagingMaterial?.type === 'sticker')
        .map(s => ({
            ...s,
            warehouse: { name: factoryFloor.name, isActive: factoryFloor.isActive }
        }));

    const finishedGoods = factoryFloor.finishedGoodsStock.map(fg => ({
        ...fg,
        warehouse: { name: factoryFloor.name, isActive: factoryFloor.isActive }
    }));

    const showRaw = activeTab === "raw";
    const showPackaging = activeTab === "packaging";
    const showFinished = activeTab === "finished";

    const showStickers = activeTab === "stickers";
    const showConsumption = activeTab === "consumption";

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Chemicals</CardTitle>
                        <Beaker className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{rawMaterials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Chemicals & Ingredients
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Packaging</CardTitle>
                        <Package className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{packagingMaterials.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Bottles, Caps, Cartons
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Finished Goods</CardTitle>
                        <Box className="size-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {finishedGoods.reduce((sum, fg) => sum + fg.quantityCartons, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Cartons ready for transfer
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Tabs and Header Actions */}
            <div className="flex items-center justify-between gap-4 border-b pb-4">
                <Tabs defaultValue="raw" onValueChange={setActiveTab} className="w-fit">
                    <TabsList className="">
                        <TabsTrigger
                            value="raw"
                        >
                            Chemicals
                        </TabsTrigger>
                        <TabsTrigger
                            value="packaging"
                        >
                            Packaging
                        </TabsTrigger>
                        <TabsTrigger
                            value="stickers"
                        >
                            Stickers
                        </TabsTrigger>
                        <TabsTrigger
                            value="finished"
                        >
                            Finished Goods
                        </TabsTrigger>
                        <TabsTrigger
                            value="consumption"
                        >
                            Consumption
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                <div className="flex items-center gap-2">
                    <LowStockAlerts />
                </div>
            </div>

            {/* Finished Goods Table */}
            {
                showFinished && (
                    <FinishedGoodsTable
                        data={finishedGoods as any}
                        warehouses={allWarehouses as any}
                        preselectedWarehouse={factoryFloor.id}
                    />
                )
            }

            {/* Chemicals Section */}
            {
                showRaw && (
                    <div className="space-y-4">
                        <StockTable
                            data={rawMaterials as any}
                            type="chemical"
                            warehouses={allWarehouses as any}
                            preselectedWarehouse={factoryFloor.id}
                            hideAddButton={true}
                            hideActions={true}
                        />
                    </div>
                )
            }

            {/* Packaging Materials Section */}
            {
                showPackaging && (
                    <div className="space-y-4">
                        <StockTable
                            data={packagingMaterials as any}
                            type="packaging"
                            warehouses={allWarehouses as any}
                            preselectedWarehouse={factoryFloor.id}
                            hideAddButton={true}
                            hideActions={true}
                        />
                    </div>
                )
            }

            {/* Stickers Section */}
            {
                showStickers && (
                    <div className="space-y-4">
                        <StockTable
                            data={stickers as any}
                            type="packaging"
                            warehouses={allWarehouses as any}
                            preselectedWarehouse={factoryFloor.id}
                            hideAddButton={true}
                            hideActions={true}
                        />
                    </div>
                )
            }
            {/* Consumption Table */}
            {
                showConsumption && (
                    <ConsumptionTable data={consumptionHistory as any} />
                )
            }
        </div >
    );
};
