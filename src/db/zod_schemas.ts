import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as inventory from "./schemas/inventory-schema";
import * as sales from "./schemas/sales-schema";
import * as finance from "./schemas/finance-schema";
import { z } from "zod";

// --- WAREHOUSES ---
export const insertWarehouseSchema = createInsertSchema(inventory.warehouses);
export const selectWarehouseSchema = createSelectSchema(inventory.warehouses);

// --- EMPLOYEES ---
export const insertEmployeeSchema = createInsertSchema(inventory.employees);
export const selectEmployeeSchema = createSelectSchema(inventory.employees);

// --- MATERIALS ---
export const insertRawMaterialSchema = createInsertSchema(inventory.rawMaterials);
export const selectRawMaterialSchema = createSelectSchema(inventory.rawMaterials);

export const insertPackagingMaterialSchema = createInsertSchema(inventory.packagingMaterials);
export const selectPackagingMaterialSchema = createSelectSchema(inventory.packagingMaterials);

// --- PRODUCTS ---
export const insertProductSchema = createInsertSchema(inventory.products);
export const selectProductSchema = createSelectSchema(inventory.products);

export const insertProductVariantSchema = createInsertSchema(inventory.productVariants);
export const selectProductVariantSchema = createSelectSchema(inventory.productVariants);

// --- PRODUCTION ---
export const insertProductionRunSchema = createInsertSchema(inventory.productionRuns); // Backend use (logs)
export const selectProductionRunSchema = createSelectSchema(inventory.productionRuns);

// --- STOCK TRANSFERS ---
export const insertStockTransferSchema = createInsertSchema(inventory.stockTransfers);
export const selectStockTransferSchema = createSelectSchema(inventory.stockTransfers);

// --- AUDIT LOGS ---
export const insertInventoryAuditLogSchema = createInsertSchema(inventory.inventoryAuditLog);
export const selectInventoryAuditLogSchema = createSelectSchema(inventory.inventoryAuditLog);

// --- SALES ---
export const insertCustomerSchema = createInsertSchema(sales.customers);
export const selectCustomerSchema = createSelectSchema(sales.customers);

export const insertInvoiceSchema = createInsertSchema(sales.invoices);
export const selectInvoiceSchema = createSelectSchema(sales.invoices);

export const insertInvoiceItemSchema = createInsertSchema(sales.invoiceItems);
export const selectInvoiceItemSchema = createSelectSchema(sales.invoiceItems);

// --- FINANCE ---
export const insertWalletSchema = createInsertSchema(finance.wallets);
export const selectWalletSchema = createSelectSchema(finance.wallets);

export const insertExpenseSchema = createInsertSchema(finance.expenses);
export const selectExpenseSchema = createSelectSchema(finance.expenses);

export const insertTransactionSchema = createInsertSchema(finance.transactions);
export const selectTransactionSchema = createSelectSchema(finance.transactions);

// --- HR & PAYROLL ---
export const insertPayrollSchema = createInsertSchema(inventory.payroll);
export const selectPayrollSchema = createSelectSchema(inventory.payroll);

// --- CUSTOM INPUT SCHEMAS (For RPC/API) ---

// Schema for the "Production Input" action
export const productionInputSchema = z.object({
    variantId: z.string(),
    warehouseId: z.string(),
    cartonsProduced: z.number().int().positive(),
    operatorId: z.string().optional(), // Inferred from session usually, but consistent with RPC args
});

export const stockTransferInputSchema = z.object({
    fromWarehouseId: z.string(),
    toWarehouseId: z.string(),
    materialType: z.enum(["raw", "packaging", "variant"]),
    materialId: z.string(),
    quantity: z.number().positive(),
});

export const createInvoiceSchema = z.object({
    customerId: z.string().optional(),
    warehouseId: z.string(),
    walletId: z.string().min(1, "Select Payment Account"),
    items: z.array(z.object({
        variantId: z.string(),
        quantityCartons: z.number().int().positive(),
        unitPrice: z.number().positive(),
    })),
});

export const addExpenseSchema = z.object({
    description: z.string().min(1),
    category: z.string().min(1),
    amount: z.number().positive(),
    walletId: z.string().min(1),
});

export const processPayrollSchema = z.object({
    employeeId: z.string(),
    month: z.number().min(1).max(12),
    year: z.number(),
    baseSalary: z.number(),
    overtimePay: z.number().default(0),
    deductions: z.number().default(0),
    walletId: z.string(),
});

export type ProductionInput = z.infer<typeof productionInputSchema>;
export type StockTransferInput = z.infer<typeof stockTransferInputSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
export type ProcessPayrollInput = z.infer<typeof processPayrollSchema>;
