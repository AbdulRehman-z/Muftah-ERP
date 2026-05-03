import { z } from "zod";

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
  customerType: z.enum(["distributor", "retailer", "wholesaler"]).default("retailer"),
  salesmanId: z.string().optional(),
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
      recipeId: z.string().min(1, "Select a product"),
      unitType: z.enum(["carton", "units"]).default("carton"),
      numberOfCartons: z.number().nonnegative().default(0),
      numberOfUnits: z.number().nonnegative().default(0),
      discountCartons: z.number().nonnegative().default(0),
      packsPerCarton: z.number().int().nonnegative().default(0),
      hsnCode: z.string().optional().default(""),
      perCartonPrice: z.number().nonnegative(),
      retailPrice: z.number().nonnegative(),
      isPriceOverride: z.boolean().optional().default(false),
    }),
  ),
});

export const updateInvoiceSchema = z.object({
  id: z.string().min(1),
  warehouseId: z.string(),
  account: z.string().min(1, "Select Payment Account"),
  cash: z.number().nonnegative().default(0),
  creditReturnDate: z.date().optional(),
  expenses: z.number().nonnegative().default(0),
  expensesDescription: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(
    z.object({
      pack: z.string().min(1, "Pack is required"),
      recipeId: z.string().min(1, "Select a product"),
      unitType: z.enum(["carton", "units"]).default("carton"),
      numberOfCartons: z.number().nonnegative().default(0),
      numberOfUnits: z.number().nonnegative().default(0),
      discountCartons: z.number().nonnegative().default(0),
      packsPerCarton: z.number().int().nonnegative().default(0),
      hsnCode: z.string().optional().default(""),
      perCartonPrice: z.number().nonnegative(),
      retailPrice: z.number().nonnegative(),
      isPriceOverride: z.boolean().optional().default(false),
    }),
  ),
});

export const addExpenseSchema = z.object({
  description: z.string().min(1),
  category: z.string().min(1),
  amount: z.number().positive(),
  walletId: z.string().min(1),
});

export const createPaymentSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  method: z.enum(["cash", "bank_transfer", "expense_offset"]).default("cash"),
  reference: z.string().optional(),
  walletId: z.string().optional(),
  notes: z.string().optional(),
});

export const createCustomerDiscountRuleSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  productId: z.string().min(1, "Product is required"),
  volumeThreshold: z.number().int().positive("Volume threshold must be greater than zero"),
  discountType: z.enum(["carton_equivalent", "percentage", "fixed_amount"]),
  discountValue: z.number().nonnegative("Discount value must be non-negative"),
  eligibleCustomerType: z.enum(["distributor", "retailer", "wholesaler", "all"]).default("all"),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
}).refine(
  (data) => {
    if (data.discountType === "percentage") {
      return data.discountValue >= 0 && data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount must be between 0 and 100",
    path: ["discountValue"],
  }
).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return data.effectiveFrom <= data.effectiveTo;
    }
    return true;
  },
  {
    message: "effectiveFrom must be before or equal to effectiveTo",
    path: ["effectiveTo"],
  }
);

export const updateCustomerDiscountRuleSchema = z.object({
  id: z.string().min(1, "Rule ID is required"),
  customerId: z.string().min(1, "Customer is required").optional(),
  productId: z.string().min(1, "Product is required").optional(),
  volumeThreshold: z.number().int().positive("Volume threshold must be greater than zero").optional(),
  discountType: z.enum(["carton_equivalent", "percentage", "fixed_amount"]).optional(),
  discountValue: z.number().nonnegative("Discount value must be non-negative").optional(),
  eligibleCustomerType: z.enum(["distributor", "retailer", "wholesaler", "all"]).optional(),
  effectiveFrom: z.date().optional(),
  effectiveTo: z.date().optional(),
}).refine(
  (data) => {
    if (data.discountType === "percentage" && data.discountValue !== undefined) {
      return data.discountValue >= 0 && data.discountValue <= 100;
    }
    return true;
  },
  {
    message: "Percentage discount must be between 0 and 100",
    path: ["discountValue"],
  }
).refine(
  (data) => {
    if (data.effectiveFrom && data.effectiveTo) {
      return data.effectiveFrom <= data.effectiveTo;
    }
    return true;
  },
  {
    message: "effectiveFrom must be before or equal to effectiveTo",
    path: ["effectiveTo"],
  }
);

export type StockTransferInput = z.infer<typeof stockTransferInputSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type CreateCustomerDiscountRuleInput = z.infer<typeof createCustomerDiscountRuleSchema>;
export type UpdateCustomerDiscountRuleInput = z.infer<typeof updateCustomerDiscountRuleSchema>;
