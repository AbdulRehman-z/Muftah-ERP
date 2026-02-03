import { useSuspenseQuery } from "@tanstack/react-query";
import { Package, Beaker, Box, AlertTriangle, Factory } from "lucide-react";
import { useState } from "react";
import { getFactoryFloorStockFn } from "@/server-functions/inventory/factory-floor/get-factory-floor-stocks-fn";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { GenericEmpty } from "../custom/empty";

export const FactoryFloorContainer = () => {
    const { data: factoryFloor } = useSuspenseQuery({
        queryKey: ["factory-floor"],
        queryFn: getFactoryFloorStockFn,
    });

    const [activeTab, setActiveTab] = useState("all");

    if (!factoryFloor) {
        return (
            <GenericEmpty
                icon={Factory}
                title="No Factory Floor Configured"
                description="You haven't set up a Factory Floor warehouse yet. Create a warehouse with type 'Factory Floor' to start tracking production."
                ctaText="Go to Warehouses"
            // Ideally this should link to warehouses, but for now we just show the message
            // The user can navigate via sidebar
            />
        );
    }

    const rawMaterials = factoryFloor.materialStock.filter(
        (s) => s.chemicalId !== null,
    );
    const packagingMaterials = factoryFloor.materialStock.filter(
        (s) => s.packagingMaterialId !== null,
    );
    const finishedGoods = factoryFloor.finishedGoodsStock;

    const showRaw = activeTab === "all" || activeTab === "raw";
    const showPackaging = activeTab === "all" || activeTab === "packaging";

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

            {/* Filter Tabs */}
            <Tabs defaultValue="all" onValueChange={setActiveTab} className="w-full">
                <TabsList>
                    <TabsTrigger value="all">All Materials</TabsTrigger>
                    <TabsTrigger value="raw">Chemicals</TabsTrigger>
                    <TabsTrigger value="packaging">Packaging</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Chemicals Table */}
            {showRaw && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Beaker className="size-5" />
                            Chemicals (Ingredients)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rawMaterials.length === 0 ? (
                            <GenericEmpty
                                icon={Beaker}
                                title="No Chemicals"
                                description="No ingredients or chemicals available on the factory floor."
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Unit</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rawMaterials.map((stock) => {
                                        const qty = parseFloat(stock.quantity);
                                        const minLevel = parseFloat(
                                            stock.chemical?.minimumStockLevel || "0",
                                        );
                                        const isLow = qty < minLevel;

                                        return (
                                            <TableRow key={stock.id}>
                                                <TableCell className="font-medium">
                                                    {stock.chemical?.name || "Unknown"}
                                                </TableCell>
                                                <TableCell>
                                                    <span className={isLow ? "text-red-600 font-bold" : ""}>
                                                        {qty.toFixed(2)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{stock.chemical?.unit}</TableCell>
                                                <TableCell>
                                                    {isLow ? (
                                                        <Badge variant="destructive">Low Stock</Badge>
                                                    ) : (
                                                        <Badge variant="outline">OK</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Packaging Materials Table */}
            {showPackaging && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="size-5" />
                            Packaging Materials
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {packagingMaterials.length === 0 ? (
                            <GenericEmpty
                                icon={Package}
                                title="No Packaging Materials"
                                description="No bottles, caps, or cartons available on the factory floor."
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {packagingMaterials.map((stock) => {
                                        const qty = parseFloat(stock.quantity);
                                        const minLevel =
                                            stock.packagingMaterial?.minimumStockLevel || 0;
                                        const isLow = qty < minLevel;

                                        return (
                                            <TableRow key={stock.id}>
                                                <TableCell className="font-medium">
                                                    {stock.packagingMaterial?.name || "Unknown"}
                                                    {stock.packagingMaterial?.size && (
                                                        <span className="text-muted-foreground ml-1">
                                                            ({stock.packagingMaterial.size})
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {stock.packagingMaterial?.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={isLow ? "text-red-600 font-bold" : ""}>
                                                        {qty.toFixed(0)}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {isLow ? (
                                                        <Badge variant="destructive">Low Stock</Badge>
                                                    ) : (
                                                        <Badge variant="outline">OK</Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Finished Goods Table */}
            {activeTab === "all" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Box className="size-5" />
                            Finished Goods (Ready for Transfer)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {finishedGoods.length === 0 ? (
                            <GenericEmpty
                                icon={Box}
                                title="No Finished Goods"
                                description="No finished products waiting for transfer."
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Recipe</TableHead>
                                        <TableHead>Cartons</TableHead>
                                        <TableHead>Loose Units</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {finishedGoods.map((fg) => (
                                        <TableRow key={fg.id}>
                                            <TableCell className="font-medium">
                                                {fg.recipe?.product?.name || "Unknown"}
                                            </TableCell>
                                            <TableCell>{fg.recipe?.name || "Unknown"}</TableCell>
                                            <TableCell className="font-bold">
                                                {fg.quantityCartons}
                                            </TableCell>
                                            <TableCell>{fg.quantityContainers}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
