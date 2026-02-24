import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import * as inventory from "./schemas/inventory-schema";
import * as sales from "./schemas/sales-schema";
import * as finance from "./schemas/finance-schema";
import { z } from "zod";

// --- WAREHOUSES ---
export const insertWarehouseSchema = createInsertSchema(inventory.warehouses);
export const selectWarehouseSchema = createSelectSchema(inventory.warehouses);

// --- CHEMICALS ---
export const insertChemicalSchema = createInsertSchema(inventory.chemicals);
export const selectChemicalSchema = createSelectSchema(inventory.chemicals);

export const insertPackagingMaterialSchema = createInsertSchema(
  inventory.packagingMaterials,
);
export const selectPackagingMaterialSchema = createSelectSchema(
  inventory.packagingMaterials,
);

// --- PRODUCTS ---
export const insertProductSchema = createInsertSchema(inventory.products);
export const selectProductSchema = createSelectSchema(inventory.products);

// --- RECIPES ---
export const insertRecipeSchema = createInsertSchema(inventory.recipes);
export const selectRecipeSchema = createSelectSchema(inventory.recipes);

export const insertRecipeIngredientSchema = createInsertSchema(
  inventory.recipeIngredients,
);
export const selectRecipeIngredientSchema = createSelectSchema(
  inventory.recipeIngredients,
);

export const insertRecipePackagingSchema = createInsertSchema(
  inventory.recipePackaging,
);
export const selectRecipePackagingSchema = createSelectSchema(
  inventory.recipePackaging,
);

// --- PRODUCTION ---
export const insertProductionRunSchema = createInsertSchema(
  inventory.productionRuns,
);
export const selectProductionRunSchema = createSelectSchema(
  inventory.productionRuns,
);

// --- STOCK ---
export const insertMaterialStockSchema = createInsertSchema(
  inventory.materialStock,
);
export const selectMaterialStockSchema = createSelectSchema(
  inventory.materialStock,
);

export const insertFinishedGoodsStockSchema = createInsertSchema(
  inventory.finishedGoodsStock,
);
export const selectFinishedGoodsStockSchema = createSelectSchema(
  inventory.finishedGoodsStock,
);

// --- STOCK TRANSFERS ---
export const insertStockTransferSchema = createInsertSchema(
  inventory.stockTransfers,
);
export const selectStockTransferSchema = createSelectSchema(
  inventory.stockTransfers,
);

// --- AUDIT LOGS ---
export const insertInventoryAuditLogSchema = createInsertSchema(
  inventory.inventoryAuditLog,
);
export const selectInventoryAuditLogSchema = createSelectSchema(
  inventory.inventoryAuditLog,
);

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

// --- CUSTOM INPUT SCHEMAS (For RPC/API) ---

export const stockTransferInputSchema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  materialType: z.enum(["chemical", "packaging", "finished"]),
  materialId: z.string(),
  quantity: z.number().positive(),
});

export const createInvoiceSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required if new").optional(),
  customerMobile: z.string().optional(),
  customerCnic: z.string().optional(),
  customerCity: z.string().optional(),
  customerState: z.string().optional(),
  customerBankAccount: z.string().optional(),
  customerType: z.enum(["distributor", "retailer"]).default("retailer"),
  warehouseId: z.string(),
  account: z.string().min(1, "Select Payment Account"),
  cash: z.number().nonnegative().default(0),
  credit: z.number().nonnegative().default(0),
  creditReturnDate: z.date().optional(),
  expenses: z.number().nonnegative().default(0),
  expensesDescription: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(
    z.object({
      pack: z.string().min(1, "Pack is required"),
      recipeId: z.string().optional(),
      unitType: z.enum(["carton", "units"]).default("carton"),
      numberOfCartons: z.number().nonnegative().default(0),
      numberOfUnits: z.number().nonnegative().default(0),
      hsnCode: z.string().min(1, "HSN Code is mandatory"),
      perCartonPrice: z.number().nonnegative(),
      retailPrice: z.number().nonnegative(),
    }),
  ),
});

export const addExpenseSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive(),
  walletId: z.string().min(1),
});

export type StockTransferInput = z.infer<typeof stockTransferInputSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
