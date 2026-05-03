import { useState, useEffect, useCallback } from "react";
import { DatePicker } from "@/components/custom/date-picker";
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
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/sales/use-invoices";
import { useWallets } from "@/hooks/finance/use-finance";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { getInventoryFn } from "@/server-functions/inventory/get-inventory-fn";
import { getCartonAvailabilityFn } from "@/server-functions/inventory/get-carton-availability-fn";
import {
    Loader2, Plus, Trash2, Users, UserPlus, Package,
    AlertCircle, Warehouse, DollarSign, ChevronRight, CheckCircle2,
    CreditCard, Calendar, Building2Icon, BanknoteIcon,
    MapPin, Phone, BadgeCheck, Layers,
    ArrowRight,
} from "lucide-react";
import { Field, FieldError, FieldGroup, FieldLabel, FieldDescription } from "../ui/field";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { effectiveCPP } from "@/server-functions/sales/invoices-fn";

// ── Types ────────────────────────────────────────────────────────────────────

type Props = {
    onSuccess: () => void;
    onCancel: () => void;
    onDirtyChange?: (isDirty: boolean) => void;
    initialData?: any;
};

type ItemFormValue = {
    pack: string;
    recipeId: string;
    unitType: "carton" | "units";
    numberOfCartons: number;
    numberOfUnits: number;
    discountCartons: number;
    packsPerCarton: number;
    hsnCode: string;
    perCartonPrice: number;
    retailPrice: number;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const PKR = (v: number) =>
    `PKR ${v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/**
 * Safe effectiveCPP — always returns at least 1 to prevent division by zero.
 * Wraps the imported effectiveCPP to guard against edge cases.
 */
const safeEffectiveCPP = (packsPerCarton: number, recipeDefault: number): number =>
    Math.max(1, effectiveCPP(packsPerCarton ?? 0, recipeDefault || 1));

/**
 * Compute line amount for a single item.
 * Uses safeEffectiveCPP to prevent NaN/Infinity for units-mode lines.
 */
function lineAmount(item: ItemFormValue, recipeContainersPerCarton: number): number {
    const eCPP = safeEffectiveCPP(item.packsPerCarton, recipeContainersPerCarton);
    if (item.unitType === "carton") {
        return (item.numberOfCartons || 0) * (item.perCartonPrice || 0);
    }
    return (item.numberOfUnits || 0) * ((item.perCartonPrice || 0) / eCPP);
}

/**
 * Resolve a stock entry for a given recipeId.
 * Uses s.recipeId consistently — the direct FK property, not s.recipe?.id.
 */
function findStock(availableStock: any[], recipeId: string) {
    return availableStock.find((s) => s.recipeId === recipeId) ?? null;
}

// ── Consistent Section card ──────────────────────────────────────────────────

const Section = ({
    icon: Icon,
    title,
    subtitle,
    children,
    className,
    step,
    action,
}: {
    icon: React.ElementType;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    className?: string;
    step?: number;
    action?: React.ReactNode;
}) => (
    <div className={cn("rounded-2xl border bg-card shadow-sm overflow-hidden", className)}>
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b bg-muted/20">
            <div className="flex items-center gap-3">
                {step !== undefined && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground leading-none">
                        {step}
                    </span>
                )}
                <div className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="size-3.5 text-primary" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold leading-none tracking-tight">{title}</h3>
                    {subtitle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-none">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div>{action}</div>}
        </div>
        <div className="p-5">{children}</div>
    </div>
);

// ── Mode toggle ──────────────────────────────────────────────────────────────

const ModeToggle = ({
    value,
    onChange,
}: {
    value: "existing" | "new";
    onChange: (v: "existing" | "new") => void;
}) => (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-xl w-fit border mb-5">
        {(["existing", "new"] as const).map((mode) => (
            <button
                key={mode}
                type="button"
                onClick={() => onChange(mode)}
                className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    value === mode
                        ? "bg-background shadow-sm text-foreground border"
                        : "text-muted-foreground hover:text-foreground",
                )}
            >
                {mode === "existing" ? (
                    <><Users className="size-3.5" /> Existing</>
                ) : (
                    <><UserPlus className="size-3.5" /> New Customer</>
                )}
            </button>
        ))}
    </div>
);

// ── CartonCompositionBadge ───────────────────────────────────────────────────

const CartonCompositionBadge = ({
    recipeDefault,
    effectiveValue,
}: {
    recipeDefault: number;
    effectiveValue: number;
}) => (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="secondary" className="text-[9px] px-1.5 h-5 cursor-help gap-1">
                    <Layers className="size-2.5" />
                    {effectiveValue === recipeDefault
                        ? `${recipeDefault} (default)`
                        : `${effectiveValue} / ${recipeDefault} default`}
                </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
                Recipe default: {recipeDefault} packs/carton
                {effectiveValue !== recipeDefault && ` · Override: ${effectiveValue}`}
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);

// ── DirtyStateNotifier ───────────────────────────────────────────────────────
// Extracted inner effect into a real component to satisfy rules-of-hooks.

const DirtyEffect = ({
    dirty,
    onDirtyChange,
}: {
    dirty: boolean;
    onDirtyChange: (isDirty: boolean) => void;
}) => {
    useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
    return null;
};

const DirtyStateNotifier = ({
    form,
    onDirtyChange,
}: {
    form: any;
    onDirtyChange: (isDirty: boolean) => void;
}) => (
    <form.Subscribe selector={(s: any) => s.isDirty}>
        {(dirty: boolean) => <DirtyEffect dirty={dirty} onDirtyChange={onDirtyChange} />}
    </form.Subscribe>
);

// ── Blank item factory ───────────────────────────────────────────────────────

const blankItem = (): ItemFormValue => ({
    pack: "",
    recipeId: "",
    unitType: "carton",
    numberOfCartons: 1,
    numberOfUnits: 0,
    discountCartons: 0,
    packsPerCarton: 0,
    hsnCode: "",
    perCartonPrice: 0,
    retailPrice: 0,
});

// ── Component ─────────────────────────────────────────────────────────────────

export const CreateInvoiceForm = ({ onSuccess, onCancel, onDirtyChange, initialData }: Props) => {
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

    // ── Carton availability ──────────────────────────────────────────────────
    const { data: cartonAvailability } = useQuery({
        queryKey: ["carton-availability", activeWarehouse],
        queryFn: () => getCartonAvailabilityFn({ data: { warehouseId: activeWarehouse } }),
        enabled: !!activeWarehouse,
    });

    const getCartonInfo = useCallback((recipeId: string) => {
        const info = cartonAvailability?.find((c) => c.recipeId === recipeId);
        return info ?? { completeCartons: 0, partialCartons: 0, totalPacks: 0 };
    }, [cartonAvailability]);

    // ── Warehouse init ───────────────────────────────────────────────────────
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

    const { mutateAsync: createInvoice, isPending: isCreating } = useCreateInvoice();
    const { mutateAsync: updateInvoice, isPending: isUpdating } = useUpdateInvoice();
    const isPending = isCreating || isUpdating;

    // ── Form ─────────────────────────────────────────────────────────────────
    const form = useForm({
        defaultValues: initialData ? {
            customerId: initialData.customerId || "",
            customerName: "",
            customerMobile: "",
            customerCnic: "",
            customerCity: "",
            customerState: "",
            customerBankAccount: "",
            customerType: (initialData.customer?.customerType || "retailer") as "distributor" | "retailer" | "wholesaler",
            warehouseId: initialData.warehouseId || "",
            account: initialData.account || (wallets[0]?.id || ""),
            cash: Number(initialData.cash) || 0,
            credit: Number(initialData.credit) || 0,
            creditReturnDate: initialData.creditReturnDate
                ? new Date(initialData.creditReturnDate).toISOString().split("T")[0]
                : "",
            expenses: Number(initialData.expenses) || 0,
            expensesDescription: initialData.expensesDescription || "",
            remarks: initialData.remarks || "",
            items: (initialData.items as any[]).map((it): ItemFormValue => {
                // FIX: determine unitType from the data, not just numberOfCartons > 0.
                // If numberOfCartons is present and > 0 → carton. Otherwise check numberOfUnits.
                const cartons = Number(it.numberOfCartons) || 0;
                const units = Number(it.numberOfUnits) || 0; // FIX: was it.quantity — wrong field name
                const unitType: "carton" | "units" = cartons > 0 ? "carton" : "units";
                return {
                    pack: it.pack || "",
                    recipeId: it.recipeId || "",
                    unitType,
                    numberOfCartons: cartons,
                    numberOfUnits: units,
                    discountCartons: Number(it.discountCartons) || 0,
                    packsPerCarton: Number(it.packsPerCarton) || 0,
                    hsnCode: it.hsnCode || "",
                    perCartonPrice: Number(it.perCartonPrice) || 0,
                    retailPrice: Number(it.retailPrice) || 0,
                };
            }),
        } : {
            customerId: "",
            customerName: "",
            customerMobile: "",
            customerCnic: "",
            customerCity: "",
            customerState: "",
            customerBankAccount: "",
            customerType: "retailer" as "distributor" | "retailer" | "wholesaler",
            warehouseId: "",
            account: wallets[0]?.id || "",
            cash: 0,
            credit: 0,
            creditReturnDate: "",
            expenses: 0,
            expensesDescription: "",
            remarks: "",
            items: [blankItem()],
        },

        onSubmit: async ({ value }) => {
            // Guard: all items need a product
            const unfilledItems = value.items.filter((it) => !it.recipeId);
            if (unfilledItems.length > 0) {
                toast.error("All invoice lines must have a product selected.");
                return;
            }

            const totalAmount = computeTotal(value.items, availableStock);
            const expenses = Number(value.expenses) || 0;
            const totalPayable = totalAmount + expenses;
            const cashPaid = Number(value.cash) || 0;

            // Guard: cash cannot exceed total
            if (cashPaid > totalPayable && totalPayable > 0) {
                toast.error(`Cash received (${PKR(cashPaid)}) cannot exceed total payable (${PKR(totalPayable)}).`);
                return;
            }

            const credit = Math.max(0, totalPayable - cashPaid);

            // Guard: credit due date required
            if (credit > 0 && !value.creditReturnDate) {
                toast.error("Please set a credit due date when credit remains.");
                return;
            }

            try {
                const payload = {
                    ...value,
                    customerName: customerMode === "existing" ? undefined : (value.customerName || undefined),
                    customerMobile: customerMode === "existing" ? undefined : (value.customerMobile || undefined),
                    customerCnic: customerMode === "existing" ? undefined : (value.customerCnic || undefined),
                    customerCity: customerMode === "existing" ? undefined : (value.customerCity || undefined),
                    customerState: customerMode === "existing" ? undefined : (value.customerState || undefined),
                    customerBankAccount: customerMode === "existing" ? undefined : (value.customerBankAccount || undefined),
                    customerId: customerMode === "existing" ? value.customerId : undefined,
                    warehouseId: activeWarehouse,
                    credit,
                    expenses: Number(value.expenses) || 0,
                    expensesDescription: value.expensesDescription || undefined,
                    remarks: value.remarks || undefined,
                    creditReturnDate: value.creditReturnDate ? new Date(value.creditReturnDate) : undefined,
                };

                if (initialData) {
                    await updateInvoice({ ...payload, id: initialData.id } as any);
                } else {
                    const validatedData = createInvoiceSchema.parse(payload);
                    await createInvoice(validatedData as any);
                }
                form.reset();
                onSuccess();
            } catch (error: any) {
                if (error instanceof z.ZodError) {
                    const friendlyMessages = error.issues.map((issue) => {
                        const path = issue.path.join(".");
                        const fieldLabels: Record<string, string> = {
                            customerId: "Customer",
                            customerName: "Customer name",
                            warehouseId: "Warehouse",
                            account: "Payment account",
                            creditReturnDate: "Credit return date",
                        };
                        const itemMatch = path.match(/^items\[(\d+)\]\.(\w+)$/);
                        if (itemMatch) {
                            const itemNum = Number(itemMatch[1]) + 1;
                            const field = itemMatch[2];
                            const labelMap: Record<string, string> = {
                                recipeId: "Product",
                                hsnCode: "HSN code",
                                perCartonPrice: "Price per carton",
                                retailPrice: "Retail price (MRP)",
                                pack: "Product name",
                            };
                            return `Item #${itemNum}: ${labelMap[field] ?? field} — ${issue.message}`;
                        }
                        return `${fieldLabels[path] ?? path} — ${issue.message}`;
                    });
                    toast.error("Please fix the following:\n" + friendlyMessages.join("\n"));
                } else {
                    toast.error(error.message || "Something went wrong. Please try again.");
                }
            }
        },
    });

    // ── Sync derived state into form ─────────────────────────────────────────
    useEffect(() => {
        form.setFieldValue("warehouseId", activeWarehouse);
    }, [activeWarehouse, form]);

    useEffect(() => {
        if (wallets.length > 0 && !form.getFieldValue("account")) {
            form.setFieldValue("account", wallets[0].id);
        }
    }, [wallets, form]);

    // Clear fields on mode switch
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
    }, [customerMode, form]);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        e.target.select();
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <form
            onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}
            className="space-y-5 pb-12 mt-2"
        >
            {onDirtyChange && (
                <DirtyStateNotifier form={form} onDirtyChange={onDirtyChange} />
            )}

            <FieldGroup>

                {/* ══ STEP 1 · CUSTOMER ══════════════════════════════════════ */}
                <Section icon={Users} title="Customer" subtitle="Who is this invoice for?" step={1}>
                    <ModeToggle value={customerMode} onChange={setCustomerMode} />

                    {customerMode === "existing" ? (
                        <form.Field
                            name="customerId"
                            validators={{
                                onChange: z.string().min(1, "Please select a customer"),
                                onSubmit: z.string().min(1, "Please select a customer"),
                            }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Select Customer <span className="text-destructive">*</span></FieldLabel>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger className={cn("h-10", !field.state.value && field.state.meta.isTouched && "border-destructive")}>
                                            <SelectValue placeholder="Choose a customer…" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {customers?.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{c.name}</span>
                                                        <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0 h-4">
                                                            {c.customerType}
                                                        </Badge>
                                                    </div>
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
                                    validators={{
                                        onChange: z.string().min(1, "Customer name is required"),
                                        onSubmit: z.string().min(1, "Customer name is required"),
                                    }}
                                >
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>
                                                <Users className="size-3 mr-1 inline" />
                                                Name <span className="text-destructive">*</span>
                                            </FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="e.g. Hamza Traders"
                                                className={cn(field.state.meta.errors.length > 0 && "border-destructive")}
                                            />
                                            <FieldError errors={field.state.meta.errors} />
                                        </Field>
                                    )}
                                </form.Field>

                                <form.Field name="customerMobile">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>
                                                <Phone className="size-3 mr-1 inline" />
                                                Mobile
                                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">(optional)</span>
                                            </FieldLabel>
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
                                            <FieldLabel>
                                                <BadgeCheck className="size-3 mr-1 inline" />
                                                CNIC
                                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">(optional)</span>
                                            </FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="xxxxx-xxxxxxx-x"
                                            />
                                        </Field>
                                    )}
                                </form.Field>

                                <form.Field name="customerCity">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel><MapPin className="size-3 mr-1 inline" />City</FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="Lahore"
                                            />
                                        </Field>
                                    )}
                                </form.Field>

                                <form.Field name="customerState">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>Province</FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="Punjab"
                                            />
                                        </Field>
                                    )}
                                </form.Field>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <form.Field name="customerBankAccount">
                                    {(field) => (
                                        <Field>
                                            <FieldLabel>
                                                <BanknoteIcon className="size-3 mr-1 inline" />
                                                Bank / Wallet
                                            </FieldLabel>
                                            <Input
                                                value={field.state.value}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                                placeholder="IBAN or EasyPaisa / JazzCash"
                                            />
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
                                                    <SelectItem value="wholesaler">Wholesaler</SelectItem>
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

                {/* ══ STEP 2 · DISPATCH SETTINGS ═════════════════════════════ */}
                <Section icon={Warehouse} title="Dispatch Settings" subtitle="Source warehouse and deposit account" step={2}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <form.Field
                            name="warehouseId"
                            validators={{
                                onChange: z.string().min(1, "Warehouse is required"),
                                onSubmit: z.string().min(1, "Warehouse is required"),
                            }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Source Warehouse <span className="text-destructive">*</span></FieldLabel>
                                    <Select
                                        value={activeWarehouse}
                                        onValueChange={(val) => {
                                            setActiveWarehouse(val);
                                            field.handleChange(val);
                                        }}
                                    >
                                        <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                                        <SelectContent>
                                            {warehouses.map((w: any) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Warehouse className="size-3 text-muted-foreground" />
                                                        <span>{w.name}</span>
                                                        {w.finishedGoodsStock?.length > 0 && (
                                                            <Badge variant="secondary" className="text-[9px] px-1.5 h-4">
                                                                {w.finishedGoodsStock.length} SKUs
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </SelectItem>
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
                            validators={{
                                onChange: z.string().min(1, "Account is required"),
                                onSubmit: z.string().min(1, "Account is required"),
                            }}
                        >
                            {(field) => (
                                <Field>
                                    <FieldLabel>Deposit Account <span className="text-destructive">*</span></FieldLabel>
                                    <Select value={field.state.value} onValueChange={field.handleChange}>
                                        <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                                        <SelectContent>
                                            {wallets.map((w: any) => (
                                                <SelectItem key={w.id} value={w.id}>
                                                    <span className="flex items-center gap-2">
                                                        {w.type === "bank"
                                                            ? <Building2Icon className="size-3.5 text-blue-500" />
                                                            : <BanknoteIcon className="size-3.5 text-emerald-500" />}
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

                {/* ══ STEP 3 · ITEMS + SETTLEMENT ════════════════════════════
                    Single Subscribe that drives ALL live calculations.
                    Using values.items as the single source of truth for
                    derived quantities — no dual-source drift.
                ══════════════════════════════════════════════════════════ */}
                <form.Subscribe selector={(s) => s.values}>
                    {(values) => {
                        const items: ItemFormValue[] = values.items || [];
                        const expenses = Number(values.expenses) || 0;
                        const cashPaid = Number(values.cash) || 0;

                        // computeTotal uses values.items directly — always in sync with Subscribe
                        const totalAmount = computeTotal(items, availableStock);
                        const totalPayable = totalAmount + expenses;
                        const totalCredit = Math.max(0, totalPayable - cashPaid);
                        const cashExceedsTotal = cashPaid > totalPayable && totalPayable > 0;
                        const isFullyPaid = totalCredit === 0 && cashPaid > 0;

                        return (
                            <div className="space-y-5">

                                {/* ── Items ── */}
                                <Section
                                    icon={Package}
                                    title="Invoice Items"
                                    subtitle="Products being sold in this invoice"
                                    step={3}
                                    action={
                                        !activeWarehouse && (
                                            <p className="text-[11px] text-amber-600 flex items-center gap-1">
                                                <AlertCircle className="size-3" /> Select a warehouse first
                                            </p>
                                        )
                                    }
                                >
                                    {/*
                                        form.Field name="items" is used ONLY for:
                                          - field.removeValue(index)
                                          - field.pushValue(...)
                                        All item data for rendering/math comes from `items` (values.items above).
                                        This eliminates the dual-source drift the original had.
                                    */}
                                    <form.Field name="items">
                                        {(field) => (
                                            <div className="space-y-3">

                                                {/* Desktop column headers */}
                                                <div
                                                    className="hidden md:grid items-center gap-2 px-3 pb-1 border-b"
                                                    style={{ gridTemplateColumns: "2.2fr 1fr 0.7fr 0.7fr 1.2fr 1fr 1fr 0.8fr 32px" }}
                                                >
                                                    {["Product", "Unit Type", "HSN", "Packs/Ctn", "Qty", "Unit Cost", "Retail MRP", "Amount", ""].map((h) => (
                                                        <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                            {h}
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="divide-y divide-border/40 rounded-xl border bg-muted/10 overflow-hidden">
                                                    {items.map((item, index) => {
                                                        // ── Per-item derived values ──────────────────────────
                                                        const stock = findStock(availableStock, item.recipeId);
                                                        const recipeDefault = stock?.recipe?.containersPerCarton || 1;
                                                        const eCPP = safeEffectiveCPP(item.packsPerCarton, recipeDefault);

                                                        const stockC = stock?.quantityCartons ?? 0;
                                                        const stockU = stock?.quantityContainers ?? 0;
                                                        const totalStockU = stockC * recipeDefault + stockU;

                                                        // Requested units including free cartons (for stock check)
                                                        const requestedU = item.unitType === "carton"
                                                            ? ((item.numberOfCartons || 0) + (item.discountCartons || 0)) * eCPP
                                                            : (item.numberOfUnits || 0);

                                                        // Line amount — billed qty only (discount cartons excluded from billing)
                                                        const amount = lineAmount(item, recipeDefault);

                                                        // Per-unit margin
                                                        const perUnitCost = (item.perCartonPrice || 0) / eCPP;
                                                        const perUnitRetail = item.retailPrice || 0;
                                                        const unitMargin = perUnitRetail > 0 && perUnitCost > 0
                                                            ? perUnitRetail - perUnitCost
                                                            : null;

                                                        const stockExceeded = stock !== null && requestedU > totalStockU && totalStockU > 0;

                                                        return (
                                                            <div
                                                                key={index}
                                                                className={cn(
                                                                    "px-3 py-3 transition-colors",
                                                                    stockExceeded && "bg-destructive/5",
                                                                    !stockExceeded && index % 2 === 1 && "bg-muted/20",
                                                                )}
                                                            >
                                                                {/* ── Desktop layout ── */}
                                                                <div
                                                                    className="hidden md:grid items-start gap-2"
                                                                    style={{ gridTemplateColumns: "2.2fr 1fr 0.7fr 0.7fr 1.2fr 1fr 1fr 0.8fr 32px" }}
                                                                >
                                                                    {/* Product */}
                                                                    <form.Field
                                                                        name={`items[${index}].recipeId`}
                                                                        validators={{
                                                                            onChange: z.string().min(1, "Select product"),
                                                                            onSubmit: z.string().min(1, "Select product"),
                                                                        }}
                                                                    >
                                                                        {(sf) => (
                                                                            <div className="space-y-1">
                                                                                <Select
                                                                                    value={sf.state.value}
                                                                                    onValueChange={(val) => {
                                                                                        const s = findStock(availableStock, val);
                                                                                        sf.handleChange(val);
                                                                                        form.setFieldValue(`items[${index}].pack`, s?.recipe?.name || "");
                                                                                        if (s?.recipe?.hsnCode) {
                                                                                            form.setFieldValue(`items[${index}].hsnCode`, s.recipe.hsnCode);
                                                                                        }
                                                                                        form.setFieldValue(`items[${index}].packsPerCarton`, s?.recipe?.containersPerCarton ?? 0);
                                                                                        // Auto-populate unit cost from recipe estimate
                                                                                        if (s?.recipe?.estimatedCostPerContainer) {
                                                                                            const cpp = s.recipe.containersPerCarton || 1;
                                                                                            const perCartonCost = Number(s.recipe.estimatedCostPerContainer) * cpp;
                                                                                            if (perCartonCost > 0) {
                                                                                                form.setFieldValue(`items[${index}].perCartonPrice`, Math.round(perCartonCost));
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger
                                                                                        className={cn(
                                                                                            "h-9 text-xs",
                                                                                            stockExceeded && "border-destructive",
                                                                                            !sf.state.value && sf.state.meta.isTouched && "border-destructive",
                                                                                        )}
                                                                                    >
                                                                                        <SelectValue placeholder="Select product…" />
                                                                                    </SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {availableStock.map((s) => {
                                                                                            const cInfo = getCartonInfo(s.recipeId);
                                                                                            return (
                                                                                                <SelectItem key={s.id} value={s.recipeId}>
                                                                                                    <div className="flex flex-col gap-0.5">
                                                                                                        <span className="font-medium text-xs">{s.recipe?.name}</span>
                                                                                                        <span className="text-[10px] text-muted-foreground">
                                                                                                            {cInfo.completeCartons > 0 ? (
                                                                                                                <>
                                                                                                                    <span className="text-emerald-600 font-semibold">{cInfo.completeCartons} complete</span>
                                                                                                                    {cInfo.partialCartons > 0 && <span className="text-amber-600 ml-1">· {cInfo.partialCartons} partial</span>}
                                                                                                                </>
                                                                                                            ) : (
                                                                                                                <>{s.quantityCartons}C / {s.quantityContainers}U in stock</>
                                                                                                            )}
                                                                                                        </span>
                                                                                                    </div>
                                                                                                </SelectItem>
                                                                                            );
                                                                                        })}
                                                                                    </SelectContent>
                                                                                </Select>

                                                                                {/* Stock status indicator */}
                                                                                <div className="flex items-center gap-1 text-[10px]">
                                                                                    {stockExceeded ? (
                                                                                        <span className="text-destructive font-semibold flex items-center gap-0.5">
                                                                                            <AlertCircle className="size-3" /> Exceeds stock
                                                                                        </span>
                                                                                    ) : stock ? (() => {
                                                                                        const cInfo = getCartonInfo(item.recipeId);
                                                                                        return (
                                                                                            <span className="text-emerald-600 flex items-center gap-0.5">
                                                                                                <CheckCircle2 className="size-3" />
                                                                                                {cInfo.completeCartons > 0
                                                                                                    ? (
                                                                                                        <>
                                                                                                            {cInfo.completeCartons}C complete
                                                                                                            {cInfo.partialCartons > 0 && <span className="text-amber-600 ml-1">({cInfo.partialCartons} partial)</span>}
                                                                                                        </>
                                                                                                    ) : (
                                                                                                        <>{stockC}C / {stockU}U available</>
                                                                                                    )}
                                                                                                {(item.discountCartons || 0) > 0 && (
                                                                                                    <span className="ml-1 text-amber-600 font-semibold">
                                                                                                        (+{item.discountCartons} free)
                                                                                                    </span>
                                                                                                )}
                                                                                            </span>
                                                                                        );
                                                                                    })() : (
                                                                                        <span className="text-muted-foreground">No stock info</span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Free cartons — carton mode only */}
                                                                                {item.unitType === "carton" && (
                                                                                    <form.Field name={`items[${index}].discountCartons`}>
                                                                                        {(sf) => (
                                                                                            <div className="flex items-center gap-1 mt-1">
                                                                                                <span className="text-[9px] text-muted-foreground font-medium whitespace-nowrap">Free ctns</span>
                                                                                                <Input
                                                                                                    type="number"
                                                                                                    min="0"
                                                                                                    className="h-6 w-14 text-[10px] pr-1 pl-1.5"
                                                                                                    value={sf.state.value}
                                                                                                    onFocus={handleFocus}
                                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                                    title="Free cartons — deducted from stock, not billed"
                                                                                                />
                                                                                            </div>
                                                                                        )}
                                                                                    </form.Field>
                                                                                )}

                                                                                <FieldError errors={sf.state.meta.errors} />

                                                                                {item.unitType === "carton" && stock && (
                                                                                    <CartonCompositionBadge recipeDefault={recipeDefault} effectiveValue={eCPP} />
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Unit type */}
                                                                    <form.Field name={`items[${index}].unitType`}>
                                                                        {(sf) => (
                                                                            <Select
                                                                                value={sf.state.value}
                                                                                onValueChange={(v: any) => {
                                                                                    sf.handleChange(v);
                                                                                    if (v === "carton") {
                                                                                        form.setFieldValue(`items[${index}].numberOfUnits`, 0);
                                                                                    } else {
                                                                                        form.setFieldValue(`items[${index}].numberOfCartons`, 0);
                                                                                        form.setFieldValue(`items[${index}].discountCartons`, 0);
                                                                                    }
                                                                                }}
                                                                            >
                                                                                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                                                                                <SelectContent>
                                                                                    <SelectItem value="carton">
                                                                                        <span className="flex items-center gap-1.5 text-xs">
                                                                                            <Package className="size-3 text-primary" /> Carton
                                                                                        </span>
                                                                                    </SelectItem>
                                                                                    <SelectItem value="units">
                                                                                        <span className="flex items-center gap-1.5 text-xs">
                                                                                            <Layers className="size-3 text-blue-500" /> Loose
                                                                                        </span>
                                                                                    </SelectItem>
                                                                                </SelectContent>
                                                                            </Select>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* HSN */}
                                                                    <form.Field name={`items[${index}].hsnCode`}>
                                                                        {(sf) => (
                                                                            <Input
                                                                                className={cn("h-9 text-xs", sf.state.meta.errors.length > 0 && "border-destructive")}
                                                                                placeholder="HSN"
                                                                                value={sf.state.value}
                                                                                onChange={(e) => sf.handleChange(e.target.value)}
                                                                            />
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Packs/Ctn — active for carton mode only */}
                                                                    <form.Field name={`items[${index}].packsPerCarton`}>
                                                                        {(sf) => (
                                                                            <div className="relative">
                                                                                <Input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    className={cn(
                                                                                        "h-9 text-xs pr-7",
                                                                                        item.unitType !== "carton" && "opacity-40 pointer-events-none",
                                                                                    )}
                                                                                    value={item.unitType === "carton" ? sf.state.value : 0}
                                                                                    onFocus={handleFocus}
                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                    disabled={item.unitType !== "carton"}
                                                                                    title={item.unitType !== "carton"
                                                                                        ? "Packs per carton only applies to carton orders"
                                                                                        : "Override packs per carton (0 = use recipe default)"}
                                                                                />
                                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-medium pointer-events-none">
                                                                                    pks
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Qty */}
                                                                    <div>
                                                                        {item.unitType === "carton" ? (
                                                                            <form.Field name={`items[${index}].numberOfCartons`}>
                                                                                {(sf) => (
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className={cn("h-9 text-xs pr-10", stockExceeded && "border-destructive")}
                                                                                            value={sf.state.value}
                                                                                            onFocus={handleFocus}
                                                                                            onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                        />
                                                                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-medium pointer-events-none">
                                                                                            ctn
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </form.Field>
                                                                        ) : (
                                                                            <form.Field name={`items[${index}].numberOfUnits`}>
                                                                                {(sf) => (
                                                                                    <div className="relative">
                                                                                        <Input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className={cn("h-9 text-xs pr-8", stockExceeded && "border-destructive")}
                                                                                            value={sf.state.value}
                                                                                            onFocus={handleFocus}
                                                                                            onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                        />
                                                                                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-medium pointer-events-none">
                                                                                            u
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </form.Field>
                                                                        )}
                                                                    </div>

                                                                    {/* Unit cost (per carton) */}
                                                                    <form.Field name={`items[${index}].perCartonPrice`}>
                                                                        {(sf) => (
                                                                            <div className="relative">
                                                                                <Input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="1"
                                                                                    className="h-9 text-xs pl-7"
                                                                                    value={sf.state.value}
                                                                                    onFocus={handleFocus}
                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                />
                                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-semibold pointer-events-none">
                                                                                    ₨
                                                                                </span>
                                                                                <span className="block text-[9px] text-center text-muted-foreground mt-0.5">
                                                                                    {stock && item.unitType === "carton"
                                                                                        ? `= ${eCPP} pks × ₨${((item.perCartonPrice || 0) / eCPP).toFixed(1)}`
                                                                                        : "/carton"}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Retail MRP */}
                                                                    <form.Field name={`items[${index}].retailPrice`}>
                                                                        {(sf) => (
                                                                            <div className="relative">
                                                                                <Input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    step="1"
                                                                                    className="h-9 text-xs pl-7"
                                                                                    value={sf.state.value}
                                                                                    onFocus={handleFocus}
                                                                                    onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                />
                                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-muted-foreground font-semibold pointer-events-none">
                                                                                    ₨
                                                                                </span>
                                                                                <span className="block text-[9px] text-center text-muted-foreground mt-0.5">/unit MRP</span>
                                                                            </div>
                                                                        )}
                                                                    </form.Field>

                                                                    {/* Amount + margin */}
                                                                    <div className="pt-0.5 space-y-1">
                                                                        <div className="font-bold text-sm text-right tabular-nums text-foreground">
                                                                            {PKR(amount)}
                                                                        </div>
                                                                        {unitMargin !== null && (
                                                                            <div className={cn(
                                                                                "text-[10px] font-semibold text-right tabular-nums",
                                                                                unitMargin < 0 ? "text-destructive" : "text-emerald-600",
                                                                            )}>
                                                                                {unitMargin >= 0 ? "+" : ""}{PKR(unitMargin)}/u
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Remove */}
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => field.removeValue(index)}
                                                                        disabled={field.state.value.length === 1}
                                                                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 mt-0.5"
                                                                    >
                                                                        <Trash2 className="size-3.5" />
                                                                    </Button>
                                                                </div>

                                                                {/* ── Mobile card ── */}
                                                                <div className="md:hidden space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <Badge variant="outline" className="text-[10px] font-mono">
                                                                            Line #{index + 1}
                                                                        </Badge>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => field.removeValue(index)}
                                                                            disabled={field.state.value.length === 1}
                                                                            className="h-7 text-destructive hover:bg-destructive/10"
                                                                        >
                                                                            <Trash2 className="size-3.5" />
                                                                        </Button>
                                                                    </div>

                                                                    {stockExceeded && (
                                                                        <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                                                                            <AlertCircle className="size-3.5 shrink-0" />
                                                                            Exceeds available stock: {stockC}C / {stockU}U
                                                                        </div>
                                                                    )}

                                                                    <form.Field name={`items[${index}].recipeId`}>
                                                                        {(sf) => (
                                                                            <Field>
                                                                                <FieldLabel className="text-xs">Product</FieldLabel>
                                                                                <Select
                                                                                    value={sf.state.value}
                                                                                    onValueChange={(val) => {
                                                                                        const s = findStock(availableStock, val);
                                                                                        sf.handleChange(val);
                                                                                        form.setFieldValue(`items[${index}].pack`, s?.recipe?.name || "");
                                                                                        if (s?.recipe?.hsnCode) {
                                                                                            form.setFieldValue(`items[${index}].hsnCode`, s.recipe.hsnCode);
                                                                                        }
                                                                                        form.setFieldValue(`items[${index}].packsPerCarton`, s?.recipe?.containersPerCarton ?? 0);
                                                                                        if (s?.recipe?.estimatedCostPerContainer) {
                                                                                            const cpp = s.recipe.containersPerCarton || 1;
                                                                                            const perCartonCost = Number(s.recipe.estimatedCostPerContainer) * cpp;
                                                                                            if (perCartonCost > 0) {
                                                                                                form.setFieldValue(`items[${index}].perCartonPrice`, Math.round(perCartonCost));
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                                                                                    <SelectContent>
                                                                                        {availableStock.map((s) => (
                                                                                            <SelectItem key={s.id} value={s.recipeId}>
                                                                                                {s.recipe?.name}
                                                                                            </SelectItem>
                                                                                        ))}
                                                                                    </SelectContent>
                                                                                </Select>
                                                                            </Field>
                                                                        )}
                                                                    </form.Field>

                                                                    {item.unitType === "carton" && stock && (
                                                                        <CartonCompositionBadge recipeDefault={recipeDefault} effectiveValue={eCPP} />
                                                                    )}

                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <form.Field name={`items[${index}].unitType`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">Type</FieldLabel>
                                                                                    <Select
                                                                                        value={sf.state.value}
                                                                                        onValueChange={(v: any) => {
                                                                                            sf.handleChange(v);
                                                                                            if (v === "carton") {
                                                                                                form.setFieldValue(`items[${index}].numberOfUnits`, 0);
                                                                                            } else {
                                                                                                form.setFieldValue(`items[${index}].numberOfCartons`, 0);
                                                                                                form.setFieldValue(`items[${index}].discountCartons`, 0);
                                                                                            }
                                                                                        }}
                                                                                    >
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
                                                                                    <Input
                                                                                        className="text-xs"
                                                                                        value={sf.state.value}
                                                                                        onChange={(e) => sf.handleChange(e.target.value)}
                                                                                        placeholder="HSN"
                                                                                    />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    </div>

                                                                    {item.unitType === "carton" && (
                                                                        <form.Field name={`items[${index}].packsPerCarton`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">Packs/Carton</FieldLabel>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <FieldDescription className="text-[10px]">0 = use recipe default</FieldDescription>
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    )}

                                                                    {item.unitType === "carton" && (
                                                                        <form.Field name={`items[${index}].discountCartons`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs flex items-center gap-1">
                                                                                        Discount Ctns
                                                                                        <span className="text-[10px] text-muted-foreground font-normal">(free)</span>
                                                                                    </FieldLabel>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                        placeholder="0"
                                                                                    />
                                                                                    <FieldDescription className="text-[10px]">Deducted from stock, not billed</FieldDescription>
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    )}

                                                                    <div className="grid grid-cols-3 gap-3">
                                                                        <Field>
                                                                            <FieldLabel className="text-xs">Qty</FieldLabel>
                                                                            {item.unitType === "carton" ? (
                                                                                <form.Field name={`items[${index}].numberOfCartons`}>
                                                                                    {(sf) => (
                                                                                        <Input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className="text-xs"
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
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className="text-xs"
                                                                                            value={sf.state.value}
                                                                                            onFocus={handleFocus}
                                                                                            onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                        />
                                                                                    )}
                                                                                </form.Field>
                                                                            )}
                                                                        </Field>

                                                                        <form.Field name={`items[${index}].perCartonPrice`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">Price/Ctn</FieldLabel>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                    />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>

                                                                        <form.Field name={`items[${index}].retailPrice`}>
                                                                            {(sf) => (
                                                                                <Field>
                                                                                    <FieldLabel className="text-xs">MRP/Unit</FieldLabel>
                                                                                    <Input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="text-xs"
                                                                                        value={sf.state.value}
                                                                                        onFocus={handleFocus}
                                                                                        onChange={(e) => sf.handleChange(Number(e.target.value))}
                                                                                    />
                                                                                </Field>
                                                                            )}
                                                                        </form.Field>
                                                                    </div>

                                                                    <div className="flex items-center justify-between border-t pt-2">
                                                                        <span className="text-xs text-muted-foreground">Line Total</span>
                                                                        <span className="font-bold text-sm">{PKR(amount)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Add line */}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => field.pushValue(blankItem())}
                                                    disabled={!activeWarehouse}
                                                    className="w-full gap-2 border-dashed text-muted-foreground hover:text-foreground hover:border-primary mt-1 h-9"
                                                >
                                                    <Plus className="size-4" /> Add Product Line
                                                </Button>

                                                {/* Running subtotal */}
                                                {totalAmount > 0 && (
                                                    <div className="flex items-center justify-between px-3 py-2 bg-primary/5 rounded-lg border border-primary/20 mt-2">
                                                        <span className="text-xs font-semibold text-muted-foreground">
                                                            {items.length} item{items.length !== 1 ? "s" : ""}
                                                        </span>
                                                        <span className="text-sm font-extrabold text-primary tabular-nums">
                                                            {PKR(totalAmount)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </form.Field>
                                </Section>

                                {/* ── Expenses + Settlement ── */}
                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                                    {/* Expenses & Notes */}
                                    <div className="lg:col-span-2">
                                        <Section icon={DollarSign} title="Expenses & Notes" step={4}>
                                            <div className="space-y-4">
                                                <form.Field name="expenses">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>Expense Amount</FieldLabel>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    className="pl-7"
                                                                    onFocus={handleFocus}
                                                                    value={field.state.value === 0 ? "" : field.state.value}
                                                                    onChange={(e) => field.handleChange(e.target.value === "" ? 0 : Number(e.target.value))}
                                                                    placeholder="0"
                                                                />
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold pointer-events-none">₨</span>
                                                            </div>
                                                            <FieldDescription>Shipping, loading charges, etc.</FieldDescription>
                                                        </Field>
                                                    )}
                                                </form.Field>

                                                <form.Field name="expensesDescription">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>
                                                                Expense Details
                                                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">(optional)</span>
                                                            </FieldLabel>
                                                            <Textarea
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                rows={2}
                                                                placeholder="e.g. Loading charges, freight"
                                                                className="resize-none"
                                                            />
                                                        </Field>
                                                    )}
                                                </form.Field>

                                                <form.Field name="remarks">
                                                    {(field) => (
                                                        <Field>
                                                            <FieldLabel>
                                                                Remarks
                                                                <span className="ml-1 text-[10px] text-muted-foreground font-normal">(optional)</span>
                                                            </FieldLabel>
                                                            <Textarea
                                                                value={field.state.value}
                                                                onChange={(e) => field.handleChange(e.target.value)}
                                                                rows={2}
                                                                placeholder="Any special instructions or notes"
                                                                className="resize-none"
                                                            />
                                                        </Field>
                                                    )}
                                                </form.Field>
                                            </div>
                                        </Section>
                                    </div>

                                    {/* Settlement */}
                                    <div className="lg:col-span-3">
                                        <Section icon={CreditCard} title="Settlement" subtitle="How is this invoice being paid?" step={5}>
                                            <div className="space-y-4">

                                                {/* Breakdown */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-muted-foreground">Items Total</span>
                                                        <span className="font-semibold tabular-nums">{PKR(totalAmount)}</span>
                                                    </div>
                                                    {expenses > 0 && (
                                                        <div className="flex justify-between items-center text-sm">
                                                            <span className="text-muted-foreground flex items-center gap-1">
                                                                <ArrowRight className="size-3" /> + Expenses
                                                            </span>
                                                            <span className="font-semibold tabular-nums text-amber-600">{PKR(expenses)}</span>
                                                        </div>
                                                    )}
                                                    <Separator />
                                                    <div className="flex justify-between items-center">
                                                        <span className="font-bold text-base">Total Payable</span>
                                                        <span className="font-extrabold text-lg text-primary tabular-nums">{PKR(totalPayable)}</span>
                                                    </div>
                                                </div>

                                                {/* Cash received */}
                                                <form.Field
                                                    name="cash"
                                                    validators={{
                                                        onChange: z.number().min(0, "Invalid amount"),
                                                        onSubmit: z.number().min(0, "Invalid amount"),
                                                    }}
                                                >
                                                    {(field) => (
                                                        <div className="space-y-2">
                                                            <Label className="text-sm font-bold flex items-center gap-1.5">
                                                                Cash Received <span className="text-destructive">*</span>
                                                            </Label>
                                                            <div className="relative">
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    step="1"
                                                                    className={cn(
                                                                        "h-12 text-xl font-black tabular-nums pl-9",
                                                                        cashExceedsTotal && "border-destructive focus-visible:ring-destructive",
                                                                    )}
                                                                    onFocus={handleFocus}
                                                                    value={field.state.value}
                                                                    onChange={(e) => field.handleChange(Number(e.target.value))}
                                                                />
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-bold pointer-events-none">₨</span>
                                                            </div>
                                                            {cashExceedsTotal && (
                                                                <p className="text-xs text-destructive flex items-center gap-1.5 bg-destructive/10 px-3 py-2 rounded-md">
                                                                    <AlertCircle className="size-3.5 shrink-0" />
                                                                    Cash cannot exceed total payable of {PKR(totalPayable)}
                                                                </p>
                                                            )}
                                                            <FieldError errors={field.state.meta.errors} />
                                                        </div>
                                                    )}
                                                </form.Field>

                                                {/* Quick-fill */}
                                                {totalPayable > 0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400"
                                                            onClick={() => form.setFieldValue("cash", totalPayable)}
                                                        >
                                                            <CheckCircle2 className="size-3.5" /> Paid in Full
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                                            onClick={() => form.setFieldValue("cash", 0)}
                                                        >
                                                            <CreditCard className="size-3.5" /> Full Credit
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Credit indicator */}
                                                <div className={cn(
                                                    "flex justify-between items-center p-3.5 rounded-xl text-sm font-bold border",
                                                    totalCredit > 0
                                                        ? "bg-destructive/8 text-destructive border-destructive/20"
                                                        : isFullyPaid
                                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                            : "bg-muted/30 text-muted-foreground border-transparent",
                                                )}>
                                                    <span className="flex items-center gap-1.5">
                                                        {totalCredit > 0 ? (
                                                            <><AlertCircle className="size-4" /> Credit Remaining</>
                                                        ) : isFullyPaid ? (
                                                            <><CheckCircle2 className="size-4" /> Fully Paid</>
                                                        ) : "—"}
                                                    </span>
                                                    <span className="tabular-nums text-base">{PKR(totalCredit)}</span>
                                                </div>

                                                {/* Credit due date */}
                                                {totalCredit > 0 && (
                                                    <form.Field name="creditReturnDate">
                                                        {(field) => (
                                                            <Field>
                                                                <FieldLabel className="flex items-center gap-1.5 text-destructive">
                                                                    <Calendar className="size-3.5" />
                                                                    Credit Due Date <span className="text-destructive">*</span>
                                                                </FieldLabel>
                                                                <DatePicker
                                                                    date={field.state.value ? new Date(field.state.value) : undefined}
                                                                    onChange={(d) => {
                                                                        if (!d) { field.handleChange(""); return; }
                                                                        const year = d.getFullYear();
                                                                        const month = String(d.getMonth() + 1).padStart(2, "0");
                                                                        const day = String(d.getDate()).padStart(2, "0");
                                                                        field.handleChange(`${year}-${month}-${day}`);
                                                                    }}
                                                                    placeholder="Select due date"
                                                                    className={cn(
                                                                        "w-full",
                                                                        !field.state.value && field.state.meta.isTouched ? "border-destructive" : "",
                                                                    )}
                                                                />
                                                                <FieldDescription>
                                                                    When the customer is expected to repay {PKR(totalCredit)}.
                                                                </FieldDescription>
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

                {/* ══ FOOTER ACTIONS ════════════════════════════════════════ */}
                <form.Subscribe selector={(s: any) => [s.canSubmit, s.isSubmitting]}>
                    {([canSubmit, isSubmitting]: any) => (
                        <div className="sticky bottom-0 bg-background/90 backdrop-blur-md border-t px-4 py-3 -mx-1 rounded-b-xl">
                            {!canSubmit && !isSubmitting && (
                                <div className="mb-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg">
                                    <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                                        <AlertCircle className="size-3.5 shrink-0" />
                                        Please fix validation errors above before generating the invoice.
                                    </p>
                                </div>
                            )}
                            <div className="flex items-center justify-between gap-3 max-w-full">
                                <p className="text-xs text-muted-foreground hidden sm:block">
                                    Please verify all entries before generating the invoice.
                                </p>
                                <div className="flex gap-2.5 ml-auto">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="lg"
                                        onClick={onCancel}
                                        disabled={isPending}
                                        className="min-w-24"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={isPending}
                                        className="min-w-40 gap-2 font-bold"
                                    >
                                        {isPending ? (
                                            <><Loader2 className="size-4 animate-spin" /> Processing…</>
                                        ) : (
                                            <><ChevronRight className="size-4" /> Generate Invoice</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </form.Subscribe>
            </FieldGroup>
        </form>
    );
};

// ── computeTotal ─────────────────────────────────────────────────────────────
// Uses findStock (s.recipeId) consistently. Uses safeEffectiveCPP to prevent
// NaN/Infinity. Single source of truth for all total calculations.

function computeTotal(items: ItemFormValue[], availableStock: any[]): number {
    return items.reduce((acc, item) => {
        const stock = findStock(availableStock, item.recipeId);
        const recipeDefault = stock?.recipe?.containersPerCarton || 1;
        return acc + lineAmount(item, recipeDefault);
    }, 0);
}