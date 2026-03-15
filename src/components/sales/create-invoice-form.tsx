import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "@tanstack/react-form";
import { createInvoiceSchema } from "@/db/zod_schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useGetAllCustomers } from "@/hooks/sales/use-customers";
import { useCreateInvoice } from "@/hooks/sales/use-invoices";
import { useWallets } from "@/hooks/finance/use-finance";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import {
    Loader2, Plus, Trash2, Users, UserPlus, Box, Package,
    AlertCircle, Warehouse, DollarSign, ChevronRight, CheckCircle2,
    CreditCard, Calendar,
    Building2Icon,
    BanknoteIcon,
} from "lucide-react";
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "../ui/field";
import { cn } from "@/lib/utils";

type Props = {
    onSuccess: () => void;
    onCancel: () => void;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const PKR = (v: number) => `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Section wrapper with consistent styling */
const Section = ({
    icon: Icon,
    title,
    subtitle,
    children,
    className,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn("rounded-xl border bg-card shadow-sm overflow-hidden", className)}>
        <div className="flex items-center gap-3 px-5 py-3.5 border-b bg-muted/30">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary/10">
                <Icon className="size-4 text-primary" />
            </div>
            <div>
                <h3 className="text-sm font-semibold leading-none">{title}</h3>
                {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

export const CreateInvoiceForm = ({ onSuccess, onCancel }: Props) => {
    const { data: customers } = useGetAllCustomers();
    const { data: inventoryData } = useSuspenseQuery({
        queryKey: ["inventory"],
        queryFn: () => getInventoryFn(),
    });
    const { data: walletsData } = useWallets();

    const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
    const [activeWarehouse, setActiveWarehouse] = useState<string>("");
    const [availableStock, setAvailableStock] = useState<any[]>([]);

    const wallets = walletsData || [];

    const warehouses = inventoryData ?? [];

    useEffect(() => {
        if (warehouses.length > 0 && !activeWarehouse) {
            setActiveWarehouse(warehouses[0].id);
        }
    }, [warehouses, activeWarehouse]);

    useEffect(() => {
        if (activeWarehouse) {
            const w = warehouses.find((w: any) => w.id === activeWarehouse);
            setAvailableStock(w?.finishedGoodsStock ?? []);
        }
    }, [activeWarehouse, warehouses]);

    const { mutateAsync: createInvoice, isPending } = useCreateInvoice();

    const form = useForm({
        defaultValues: {
            customerId: "",
            customerName: "",
            customerMobile: "",
            customerCnic: "",
            customerCity: "",
            customerState: "",
            customerBankAccount: "",
            customerType: "retailer" as "distributor" | "retailer",
            warehouseId: "",
            account: wallets[0]?.id || "",
            cash: 0,
            credit: 0,
            creditReturnDate: "",
            expenses: 0,
            expensesDescription: "",
            remarks: "",
            items: [{
                pack: "",
                recipeId: "",
                unitType: "carton" as "carton" | "units",
                numberOfCartons: 0,
                numberOfUnits: 0,
                hsnCode: "",
                perCartonPrice: 0,
                retailPrice: 0,
            }],
        },
        onSubmit: async ({ value }) => {
            try {
                const totalAmount = value.items.reduce((acc, item) => {
                    const stock = availableStock.find((s) => s.recipe?.id === item.recipeId);
                    const cpp = stock?.recipe?.containersPerCarton || 1;
                    return acc + (item.unitType === "carton"
                        ? (item.numberOfCartons || 0) * (item.perCartonPrice || 0)
                        : (item.numberOfUnits || 0) * ((item.perCartonPrice || 0) / cpp));
                }, 0);

                const totalPayable = totalAmount + (Number(value.expenses) || 0);
                const credit = Math.max(0, totalPayable - (Number(value.cash) || 0));

                const payload = {
                    ...value,
                    customerId: customerMode === "existing" ? value.customerId : undefined,
                    warehouseId: activeWarehouse,
                    credit,
                    creditReturnDate: value.creditReturnDate ? new Date(value.creditReturnDate) : undefined,
                };

                const validatedData = createInvoiceSchema.parse(payload);
                await createInvoice(validatedData as any, {
                    onSuccess: () => {
                        toast.success("Invoice generated successfully");
                        form.reset();
                        onSuccess();
                    },
                });
            } catch (error: any) {
                if (error instanceof z.ZodError) {
                    const message = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
                    toast.error("Validation failed: " + message);
                    console.error("Validation Error:", error.issues);
                } else {
                    toast.error(error.message || "Failed to generate invoice");
                }
            }
        },
    });

    useEffect(() => {
        form.setFieldValue("warehouseId", activeWarehouse);
    }, [activeWarehouse]);

    useEffect(() => {
        if (wallets.length > 0 && !form.getFieldValue("account")) {
            form.setFieldValue("account", wallets[0].id);
        }
    }, [wallets]);

    useEffect(() => {
        if (customerMode === "new") {
            form.setFieldValue("customerId", "");
        } else {
            form.setFieldValue("customerName", "");
            form.setFieldValue("customerMobile", "");
            form.setFieldValue("customerCnic", "");
            form.setFieldValue("customerCity", "");
            form.setFieldValue("customerState", "");
            form.setFieldValue("customerBankAccount", "");
            form.setFieldValue("customerType", "retailer");
        }
    }, [customerMode]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
            className="space-y-5 pb-10 mt-2"
        >
            <FieldGroup>

                {/* ── 1. Customer ─────────────────────────────────────────── */}
                <Section icon={Users} title="Customer" subtitle="Select an existing or create a new customer">
                    {/* Toggle */}
                    <div className="flex gap-2 mb-5 p-1 bg-muted/40 rounded-lg w-fit">
                        {(["existing", "new"] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setCustomerMode(mode)}
                                className={cn(
                                    "flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                                    customerMode === mode
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {mode === "existing" ? <Users className="size-3.5" /> : <UserPlus className="size-3.5" />}
                                {mode === "existing" ? "Existing" : "New Customer"}
                            </button>
                        ))}
                    </div>

                    {customerMode === "existing" ? (
                        <form.Field
                            name="customerId"
                            validators={{ onChange: z.string().min(1, "Please select a customer") }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Select Customer <span className="text-red-500">*</span></FieldLabel>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger className={cn(!field.state.value && field.state.meta.isTouched && "border-destructive")}>
                                            <SelectValue placeholder="Choose a customer…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers?.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <span className="font-medium">{c.name}</span>
                                                    <span className="ml-2 text-xs text-muted-foreground capitalize">({c.customerType})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <form.Field
                                    name="customerName"
                                    validators={{ onChange: z.string().min(1, "Customer name is required") }}
                                >
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Name <span className="text-red-500">*</span></FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="e.g. Hamza Traders"
                                            />
                                            <FieldError errors={field.state.meta.errors} />
                                        </Field>
                                    )}
                                </form.Field>
                                <form.Field name="customerMobile">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Mobile <span className="text-xs text-muted-foreground font-normal">(optional)</span></FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="03xx-xxxxxxx"
                                            />
                                        </Field>
                                    )}
                                </form.Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <form.Field name="customerCnic">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>CNIC <span className="text-xs text-muted-foreground font-normal">(optional)</span></FieldLabel>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="xxxxx-xxxxxxx-x" />
                                        </Field>
                                    )}
                                </form.Field>
                                <form.Field name="customerCity">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>City</FieldLabel>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Lahore" />
                                        </Field>
                                    )}
                                </form.Field>
                                <form.Field name="customerState">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Province</FieldLabel>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="Punjab" />
                                        </Field>
                                    )}
                                </form.Field>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <form.Field name="customerBankAccount">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Bank / Wallet</FieldLabel>
                                            <Input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} placeholder="IBAN or EasyPaisa/JazzCash" />
                                        </Field>
                                    )}
                                </form.Field>
                                <form.Field name="customerType">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Customer Type</FieldLabel>
                                            <Select value={field.state.value} onValueChange={(v: any) => field.handleChange(v)}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="retailer">Retailer</SelectItem>
                                                    <SelectItem value="distributor">Distributor</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    )}
                                </form.Field>
                            </div>
                        </div>
                    )}
                </Section>

                {/* ── 2. Dispatch settings ────────────────────────────────── */}
                <Section icon={Warehouse} title="Dispatch Settings" subtitle="Where goods are dispatched from and payment deposited to">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <form.Field
                            name="warehouseId"
                            validators={{ onChange: z.string().min(1, "Warehouse is required") }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Source Warehouse <span className="text-red-500">*</span></FieldLabel>
                                    <Select
                                        value={activeWarehouse}
                                        onValueChange={(val) => { setActiveWarehouse(val); field.handleChange(val); }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w: any) => (
                                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>Stock will be deducted from here.</FieldDescription>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>

                        <form.Field
                            name="account"
                            validators={{ onChange: z.string().min(1, "Account is required") }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Deposit Account <span className="text-red-500">*</span></FieldLabel>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select account" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {wallets.map((w: any) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    <span className="flex items-center gap-2">
                                                        {w.type === "bank" ? <Building2Icon className="size-3.5" /> : <BanknoteIcon className="size-3.5" />}
                                                        {w.name}
                                                    </span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldDescription>Cash payments will be credited here.</FieldDescription>
                                    <FieldError errors={field.state.meta.errors} />
                                </Field>
                            )}
                        </form.Field>
                    </div>
                </Section>

                {/* ── 3. Invoice Items ─────────────────────────────────────── */}
                <form.Subscribe selector={(s) => s.values}>
                    {(values) => {
                        const watchedItems = values.items || [];
                        const expenses = Number(values.expenses) || 0;
                        const cashPaid = Number(values.cash) || 0;

                        const totalAmount = watchedItems.reduce((acc: number, item: any) => {
                            const stock = availableStock.find((s) => s.recipe?.id === item.recipeId);
                            const cpp = stock?.recipe?.containersPerCarton || 1;
                            return acc + (item.unitType === "carton"
                                ? (item.numberOfCartons || 0) * (item.perCartonPrice || 0)
                                : (item.numberOfUnits || 0) * ((item.perCartonPrice || 0) / cpp));
                        }, 0);

                        const totalPayable = totalAmount + expenses;
                        const totalCredit = Math.max(0, totalPayable - cashPaid);
                        // BUG FIX: cash cannot exceed total payable — warn inline
                        const cashExceedsTotal = cashPaid > totalPayable && totalPayable > 0;

                        return (
                            <div className="space-y-5">
                                <Section
                                    icon={Package}
                                    title="Invoice Items"
                                    subtitle="Add the products being sold in this invoice"
                                >
                                    <form.Field name="items">
                                        {(field) => (
                                            <div className="space-y-3">
                                                {/* Desktop table header */}
                                                <div className="hidden md:grid grid-cols-[2fr_1.2fr_0.8fr_1.4fr_1.1fr_1.1fr_0.9fr_36px] gap-2 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                                                    <div>Product</div>
                                                    <div>Sale Type</div>
                                                    <div>HSN</div>
                                                    <div>Qty</div>
                                                    <div>Unit Cost</div>
                                                    <div>Retail MRP</div>
                                                    <div className="text-right">Amount</div>
                                                    <div />
                                                </div>

                                                <div className="divide-y divide-border/50 rounded-lg border bg-background overflow-hidden">
                                                    {field.state.value.map((_, index) => {
                                                        const item = watchedItems[index] || {};
                                                        const stock = availableStock.find((s) => s.recipe?.id === item.recipeId);
                                                        const cpp = stock?.recipe?.containersPerCarton || 1;
                                                        const stockCartons = stock?.quantityCartons ?? 0;
                                                        const stockUnits = stock?.quantityContainers ?? 0;
                                                        const totalStockUnits = stockCartons * cpp + stockUnits;

                                                        const requestedUnits = item.unitType === "carton"
                                                            ? (item.numberOfCartons || 0) * cpp
                                                            : (item.numberOfUnits || 0);

                                                        const lineAmount = item.unitType === "carton"
                                                            ? (item.numberOfCartons || 0) * (item.perCartonPrice || 0)
                                                            : (item.numberOfUnits || 0) * ((item.perCartonPrice || 0) / cpp);

                                                        // BUG FIX: margin calculation — compare per-unit values
                                                        const perUnitCost = (item.perCartonPrice || 0) / cpp;
                                                        const perUnitRetail = item.retailPrice || 0;
                                                        const unitMargin = perUnitRetail - perUnitCost;

                                                        const stockExceeded = requestedUnits > totalStockUnits && totalStockUnits > 0;

                                                        return (
                                                            <div
                                                                key={index}
                                                                className={cn(
                                                                    "p-3 transition-colors",
                                                                    stockExceeded && "bg-destructive/5",
                                                                )}
                                                            >
                                                                {/* Desktop row */}
                                                                <div className="hidden md:grid grid-cols-[2fr_1.2fr_0.8fr_1.4fr_1.1fr_1.1fr_0.9fr_36px] gap-2 items-start">

                                                                    {/* Product select */}
                                                                    <form.Field
                                                                        name={`items[${index}].recipeId`}
                                                                        validators={{ onChange: z.string().min(1, "Select product") }}
                                                                    >
                                                                        {(sf) => (
                                                                            <div className="space-y-1">
                                                                                <Select
                                                                                    value={sf.state.value}
                                                                                    onValueChange={(val) => {
                                                                                        const s = availableStock.find((s) => s.recipeId === val);
                                                                                        sf.handleChange(val);
                                                                                        form.setFieldValue(`items[${index}].pack`, s?.recipe?.name || "");
                                                                                        // Auto-fill HSN if available
                                                                                        if (s?.recipe?.hsnCode) {
                                                                                            form.setFieldValue(`items[${index}].hsnCode`, s.recipe.hsnCode);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className={cn(
                                                                                        "h-8 text-xs",
                                                                                        stockExceeded && "border-destructive",
                                                                                        !sf.state.value && sf.state.meta.isTouched && "border-destructive",
                                                                                    )}>
                                                                                        <SelectValue placeholder="Select product…" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {availableStock.map((s) => (
                                                                                            <SelectItem key={s.id} value={s.recipeId}>
                                                                                                <span>{s.recipe?.name}</span>
                                                                                                <span className="ml-2 text-[10px] text-muted-foreground">
                                                                                                    {s.quantityCartons}C/{s.quantityContainers}U
                                                                                                </span>
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                                <FieldError errors={sf.state.meta.errors} />
                                                                                <div className="text-[10px] text-muted-foreground flex gap-1">
                                                                                    <span>Stock:</span>
                                                                                    <span className="font-medium text-foreground">{stockCartons}C/{stockUnits}U</span>
                                                                                </div>
                                                                                {stockExceeded && (
                                                                                    <p className="text-[10px] text-destructive font-semibold flex items-center gap-0.5">
                                                                                        <AlertCircle className="size-3" /> Exceeds stock
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Unit type */}
                                                                    <form.Field name={`items[${index}].unitType`}>
                                                                        {(sf) => (
                                                                            <Select value={sf.state.value} onValueChange={(v: any) => sf.handleChange(v)}>
                                                                                <SelectTrigger className="h-8 text-xs">
                                                                                    <SelectValue />
                                                                                </SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="carton">
                                                                                        <span className="flex items-center gap-1.5"><Package className="size-3 text-primary" /> Carton</span>
                                                                                    </SelectItem>
                                                                                    <SelectItem value="units">
                                                                                        <span className="flex items-center gap-1.5"><Box className="size-3 text-blue-500" /> Loose Units</span>
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* HSN */}
                                                                    <form.Field name={`items[${index}].hsnCode`} validators={{ onChange: z.string().min(1, "Required") }}>
                                                                        {(sf) => (
                                                                            <div className="space-y-1">
                                                                                <Input
                                                                                    className={cn("h-8 text-xs", sf.state.meta.errors.length > 0 && "border-destructive")}
                                                                                    placeholder="HSN"
                                                                                    value={sf.state.value}
                                                                                    onChange={(e) => sf.handleChange(e.target.value)}
                                                                                />
                                                                                <FieldError errors={sf.state.meta.errors} />
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Qty */}
                                                                    <div>
                                                                        {item.unitType === "carton" ? (
                                                                            <form.Field name={`items[${index}].numberOfCartons`}>
                                                                                {(sf) => (
                                                                                    <Input
                                                                                        type="number" min="0" className="h-8 text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                    />
                                                                                )}
                                                                            </form.Field>
                                                                        ) : (
                                                                            <form.Field name={`items[${index}].numberOfUnits`}>
                                                                                {(sf) => (
                                                                                    <Input
                                                                                        type="number" min="0" className="h-8 text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                    />
                                                                                )}
                                                                            </form.Field>
                                                                        )}
                                                                    </div>

                                                                    {/* Per carton price */}
                                                                    <form.Field name={`items[${index}].perCartonPrice`}>
                                                                        {(sf) => (
                                                                            <div className="space-y-0.5">
                                                                                <Input
                                                                                    type="number" min="0" step="1" className="h-8 text-xs"
                                                                                    value={sf.state.value}
                                                                                    onFocus={handleFocus}
                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                />
                                                                                <div className="text-[9px] text-muted-foreground text-center">/carton</div>
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Retail price */}
                                                                    <form.Field name={`items[${index}].retailPrice`}>
                                                                        {(sf) => (
                                                                            <div className="space-y-0.5">
                                                                                <Input
                                                                                    type="number" min="0" step="1" className="h-8 text-xs"
                                                                                    value={sf.state.value}
                                                                                    onFocus={handleFocus}
                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                />
                                                                                <div className="text-[9px] text-muted-foreground text-center">/unit MRP</div>
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Amount + margin */}
                                                                    <div className="text-right space-y-0.5 pt-1">
                                                                        <div className="font-bold text-sm text-primary">{PKR(lineAmount)}</div>
                                                                        <div className={cn(
                                                                            "text-[10px] font-semibold",
                                                                            unitMargin < 0 ? "text-destructive" : "text-green-600",
                                                                        )}>
                                                                            {unitMargin >= 0 ? "+" : ""}{PKR(unitMargin)}/u
                                                                        </div>
                                                                    </div>

                                                                    {/* Remove */}
                                                                    <Button
                                                                        type="button" variant="ghost" size="icon"
                                                                        onClick={() => field.removeValue(index)}
                                                                        disabled={field.state.value.length === 1}
                                                                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </div>

                                                                {/* Mobile card */}
                                                                <div className="md:hidden space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <Badge variant="outline" className="text-[10px] font-mono">Item #{index + 1}</Badge>
                                                                        <Button
                                                                            type="button" variant="ghost" size="sm"
                                                                            onClick={() => field.removeValue(index)}
                                                                            disabled={field.state.value.length === 1}
                                                                            className="h-7 text-destructive hover:bg-destructive/10"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>

                                                                    {stockExceeded && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">
                                                                            <AlertCircle className="size-3.5 shrink-0" />
                                                                            Exceeds stock: {stockCartons}C / {stockUnits}U available
                                                                        </div>
                                                                    )}

                                                                    <form.Field name={`items[${index}].recipeId`}>
                                                                        {(sf) => (
                                                                            <Field>
                                                                                <FieldLabel className="text-xs">Product</FieldLabel>
                                                                                <Select value={sf.state.value} onValueChange={(val) => {
                                                                                    const s = availableStock.find((s) => s.recipeId === val);
                                                                                    sf.handleChange(val);
                                                                                    form.setFieldValue(`items[${index}].pack`, s?.recipe?.name || "");
                                                                                }}>
                                                                                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {availableStock.map((s) => (
                                                                                            <SelectItem key={s.id} value={s.recipeId}>{s.recipe?.name}</SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </Field>
                                                                        )}
                                                                    </form.Field>

                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <form.Field name={`items[${index}].unitType`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">Type</FieldLabel>
                                                                                    <Select value={sf.state.value} onValueChange={(v: any) => sf.handleChange(v)}>
                                                                                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                                                                        <SelectContent>
                                                                                            <SelectItem value="carton">Carton</SelectItem>
                                                                                            <SelectItem value="units">Loose Units</SelectItem>
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                        <form.Field name={`items[${index}].hsnCode`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">HSN</FieldLabel>
                                                                                    <Input className="text-xs" value={sf.state.value} onChange={(e) => sf.handleChange(e.target.value)} placeholder="HSN" />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    </div>

                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <Field>
                                                                            <FieldLabel className="text-xs">Qty</FieldLabel>
                                                                            {item.unitType === "carton" ? (
                                                                                <form.Field name={`items[${index}].numberOfCartons`}>
                                                                                    {(sf) => <Input type="number" min="0" className="text-xs" value={sf.state.value} onFocus={handleFocus} onChange={(e) => sf.handleChange(Number(e.target.value))} />}
                                                                                </form.Field>
                                                                            ) : (
                                                                                <form.Field name={`items[${index}].numberOfUnits`}>
                                                                                    {(sf) => <Input type="number" min="0" className="text-xs" value={sf.state.value} onFocus={handleFocus} onChange={(e) => sf.handleChange(Number(e.target.value))} />}
                                                                                </form.Field>
                                                                            )}
                                                                        </Field>
                                                                        <form.Field name={`items[${index}].perCartonPrice`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">Price/Ctn</FieldLabel>
                                                                                    <Input type="number" min="0" className="text-xs" value={sf.state.value} onFocus={handleFocus} onChange={(e) => sf.handleChange(Number(e.target.value))} />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                        <form.Field name={`items[${index}].retailPrice`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">MRP/Unit</FieldLabel>
                                                                                    <Input type="number" min="0" className="text-xs" value={sf.state.value} onFocus={handleFocus} onChange={(e) => sf.handleChange(Number(e.target.value))} />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    </div>

                                                                    <div className="flex items-center justify-between border-t pt-2">
                                                                        <span className="text-xs text-muted-foreground">Line Total</span>
                                                                        <span className="font-bold text-primary text-sm">{PKR(lineAmount)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Add item button */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => field.pushValue({
                                                        pack: "", recipeId: "", unitType: "carton",
                                                        numberOfCartons: 1, numberOfUnits: 0,
                                                        hsnCode: "", perCartonPrice: 0, retailPrice: 0,
                                                    })}
                                                    disabled={!activeWarehouse}
                                                    className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground mt-2"
                                                >
                                                    <Plus className="size-4" />
                                                    Add Product Line
                                                </Button>
                                            </div>
                                        )}
                                    </form.Field>
                                </Section>

                                {/* ── 4. Expenses + Settlement ─────────────── */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                                    {/* Expenses & Notes */}
                                    <div className="lg:col-span-2">
                                        <Section icon={DollarSign} title="Expenses & Notes">
                                            <div className="space-y-4">
                                                <form.Field name="expenses">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>Expense Amount</FieldLabel>
                                                            <Input
                                                                type="number" min="0" step="0.01"
                                                                onFocus={handleFocus}
                                                                value={field.state.value || ""}
                                                                onChange={(e) => field.handleChange(Number(e.target.value))}
                                                                placeholder="0"
                                                            />
                                                            <FieldDescription>Shipping, loading, etc.</FieldDescription>
                                                        </Field>
                                                    )}
                                                </form.Field>

                                                <form.Field name="expensesDescription">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>Expense Details <span className="text-xs text-muted-foreground font-normal">(optional)</span></FieldLabel>
                                                            <Textarea
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                rows={2}
                                                                placeholder="e.g. Loading charges, freight"
                                                            />
                                                        </Field>
                                                    )}
                                                </form.Field>

                                                <form.Field name="remarks">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>Invoice Remarks <span className="text-xs text-muted-foreground font-normal">(optional)</span></FieldLabel>
                                                            <Textarea
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                rows={2}
                                                                placeholder="Any special instructions"
                                                            />
                                                        </Field>
                                                    )}
                                                </form.Field>
                                            </div>
                                        </Section>
                                    </div>

                                    {/* Settlement Summary */}
                                    <div className="lg:col-span-3">
                                        <Section icon={CreditCard} title="Settlement Summary">
                                            <div className="space-y-4">
                                                {/* Totals breakdown */}
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Items Total</span>
                                                        <span className="font-semibold tabular-nums">{PKR(totalAmount)}</span>
                                                    </div>
                                                    {expenses > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-muted-foreground">+ Expenses</span>
                                                            <span className="font-semibold tabular-nums text-amber-600">{PKR(expenses)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-base font-extrabold border-t pt-2.5 mt-1">
                                                        <span>Total Payable</span>
                                                        <span className="text-primary tabular-nums">{PKR(totalPayable)}</span>
                                                    </div>
                                                </div>

                                                {/* Cash received */}
                                                <div className="pt-1">
                                                    <form.Field
                                                        name="cash"
                                                        validators={{ onChange: z.number().min(0, "Invalid amount") }}
                                                    >
                                                        {(field) => (
                                                            <div className="space-y-2">
                                                                <Label className="text-sm font-bold">
                                                                    Cash Received <span className="text-red-500">*</span>
                                                                </Label>
                                                                <Input
                                                                    type="number" min="0" step="0.01"
                                                                    className={cn(
                                                                        "h-12 text-xl font-black tabular-nums",
                                                                        cashExceedsTotal && "border-destructive focus-visible:ring-destructive",
                                                                    )}
                                                                    onFocus={handleFocus}
                                                                    value={field.state.value}
                                                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                                                />
                                                                {/* BUG FIX: show warning when cash > total */}
                                                                {cashExceedsTotal && (
                                                                    <p className="text-xs text-destructive flex items-center gap-1.5">
                                                                        <AlertCircle className="size-3.5" />
                                                                        Cash cannot exceed total payable ({PKR(totalPayable)})
                                                                    </p>
                                                                )}
                                                                <FieldError errors={field.state.meta.errors} />
                                                            </div>
                                                        )}
                                                    </form.Field>
                                                </div>

                                                {/* Quick fill buttons */}
                                                {totalPayable > 0 && (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button" variant="outline" size="sm"
                                                            className="flex-1 text-xs h-8 gap-1"
                                                            onClick={() => form.setFieldValue("cash", totalPayable)}
                                                        >
                                                            <CheckCircle2 className="size-3 text-green-600" />
                                                            Full Amount
                                                        </Button>
                                                        <Button
                                                            type="button" variant="outline" size="sm"
                                                            className="flex-1 text-xs h-8 gap-1"
                                                            onClick={() => form.setFieldValue("cash", 0)}
                                                        >
                                                            Full Credit
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Remaining credit display */}
                                                <div className={cn(
                                                    "flex justify-between items-center p-3 rounded-lg text-sm font-bold",
                                                    totalCredit > 0 ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-700",
                                                )}>
                                                    <span className="font-semibold">
                                                        {totalCredit > 0 ? "Credit Balance" : "Fully Paid"}
                                                    </span>
                                                    <span className="tabular-nums text-base">{PKR(totalCredit)}</span>
                                                </div>

                                                {/* BUG FIX: show credit return date field when credit > 0 */}
                                                {totalCredit > 0 && (
                                                    <form.Field
                                                        name="creditReturnDate"
                                                        validators={{
                                                            onChange: z.string().min(1, "A credit return date is required when credit remains"),
                                                        }}
                                                    >
                                                        {(field) => (
                                                            <Field>
                                                                <FieldLabel className="flex items-center gap-1.5">
                                                                    <Calendar className="size-3.5 text-destructive" />
                                                                    Credit Due Date <span className="text-red-500">*</span>
                                                                </FieldLabel>
                                                                <Input
                                                                    type="date"
                                                                    min={new Date().toISOString().split("T")[0]}
                                                                    value={field.state.value}
                                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                                    className={field.state.meta.errors.length > 0 ? "border-destructive" : ""}
                                                                />
                                                                <FieldDescription>When the customer should repay this credit.</FieldDescription>
                                                                <FieldError errors={field.state.meta.errors} />
                                                            </Field>
                                                        )}
                                                    </form.Field>
                                                )}
                                            </div>
                                        </Section>
                                    </div>
                                </div>
                            </div>
                        );
                    }}
                </form.Subscribe>

                {/* ── Footer actions ────────────────────────────────────────── */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                        Please verify all entries before generating.
                    </p>
                    <div className="flex gap-2.5 ml-auto">
                        <Button type="button" variant="outline" size="lg" onClick={onCancel} disabled={isPending} className="min-w-28">
                            Cancel
                        </Button>
                        <Button type="submit" size="lg" disabled={isPending} className="min-w-40 gap-2">
                            {isPending ? (
                                <><Loader2 className="size-4 animate-spin" /> Processing…</>
                            ) : (
                                <><ChevronRight className="size-4" /> Generate Invoice</>
                            )}
                        </Button>
                    </div>
                </div>

            </FieldGroup>
        </form>
    );
};