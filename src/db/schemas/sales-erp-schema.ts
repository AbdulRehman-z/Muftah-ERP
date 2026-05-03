import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  decimal,
  integer,
  unique,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { customers, invoices } from "./sales-schema";
import { products } from "./inventory-schema";
import { user } from "./auth-schema";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// --- SALESMEN ---
export const salesmen = pgTable("salesmen", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  phone: text("phone"),
  status: text("status").notNull().default("active"), // "active" | "inactive"
  ...timestamps,
});

// --- CUSTOMER PRICE AGREEMENTS ---
export const customerPriceAgreements = pgTable("customer_price_agreements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  pricingType: text("pricing_type").notNull(), // "fixed" | "margin_off_tp" | "flat_discount"
  agreedValue: decimal("agreed_value", { precision: 12, scale: 2 }).notNull(),
  tpBaseline: decimal("tp_baseline", { precision: 12, scale: 2 }), // Nullable, only for margin_off_tp
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"), // Nullable means active
  ...timestamps,
});

// --- PROMOTIONAL RULES ---
export const promotionalRules = pgTable("promotional_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  buyQty: integer("buy_qty").notNull(),
  freeQty: integer("free_qty").notNull(),
  eligibleCustomerType: text("eligible_customer_type").notNull().default("all"), // "shopkeeper" | "distributor" | "retailer" | "wholesaler" | "all"
  activeFrom: timestamp("active_from").defaultNow().notNull(),
  activeTo: timestamp("active_to"),
  ...timestamps,
});

// --- PAYMENTS ---
export const payments = pgTable("payments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  invoiceId: text("invoice_id").references(() => invoices.id), // Optional
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  method: text("method").notNull().default("cash"), // "cash" | "bank_transfer" | "expense_offset"
  reference: text("reference"),
  expenseType: text("expense_type"), // Nullable, only for expense_offset
  recordedById: text("recorded_by_id")
    .notNull()
    .references(() => user.id),
  paymentDate: timestamp("payment_date").defaultNow().notNull(),
  notes: text("notes"),
  ...timestamps,
});

// --- SLIP RECORDS ---
export const slipRecords = pgTable("slip_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  slipNumber: text("slip_number").notNull().unique(),
  invoiceId: text("invoice_id")
    .notNull()
    .references(() => invoices.id),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  salesmanId: text("salesman_id")
    .references(() => salesmen.id), // Optional
  amountDue: decimal("amount_due", { precision: 12, scale: 2 }).notNull().default("0"),
  amountRecovered: decimal("amount_recovered", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("open"), // "open" | "partially_recovered" | "closed"
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  reconciledAt: timestamp("reconciled_at"),
  ...timestamps,
});

// --- CUSTOMER DISCOUNT RULES ---
export const customerDiscountRules = pgTable("customer_discount_rules", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "restrict" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  volumeThreshold: integer("volume_threshold").notNull(),
  discountType: text("discount_type").notNull(), // "carton_equivalent" | "percentage" | "fixed_amount"
  discountValue: decimal("discount_value", { precision: 12, scale: 2 }).notNull(),
  eligibleCustomerType: text("eligible_customer_type").notNull().default("all"), // "distributor" | "retailer" | "wholesaler" | "all"
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
  effectiveTo: timestamp("effective_to"),
  ...timestamps,
}, (table) => ({
  uniqueCustomerProductThreshold: unique("customer_discount_rules_customer_product_threshold_unique").on(table.customerId, table.productId, table.volumeThreshold),
  customerProductIdx: index("idx_customer_discount_rules_customer_product").on(table.customerId, table.productId),
  datesIdx: index("idx_customer_discount_rules_dates").on(table.effectiveFrom, table.effectiveTo),
  productIdx: index("idx_customer_discount_rules_product").on(table.productId),
}));

// --- PRICE CHANGE LOG ---
export const priceChangeLog = pgTable("price_change_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id),
  customerId: text("customer_id").references(() => customers.id), // Nullable for global changes
  oldPrice: decimal("old_price", { precision: 12, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 12, scale: 2 }).notNull(),
  changedById: text("changed_by_id")
    .notNull()
    .references(() => user.id),
  source: text("source").notNull(), // "admin" | "invoice_override" | "invoice_calculation"
  invoiceId: text("invoice_id").references(() => invoices.id), // Nullable
  metadata: jsonb("metadata"), // Stores additional context: { priceAgreementId, customerDiscountRuleId, promoRuleId }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// --- RELATIONS ---
export const salesmenRelations = relations(salesmen, ({ many }) => ({
  customers: many(customers),
  invoices: many(invoices),
  slipRecords: many(slipRecords),
}));

export const customerPriceAgreementsRelations = relations(
  customerPriceAgreements,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerPriceAgreements.customerId],
      references: [customers.id],
    }),
    product: one(products, {
      fields: [customerPriceAgreements.productId],
      references: [products.id],
    }),
  })
);

export const promotionalRulesRelations = relations(
  promotionalRules,
  ({ one }) => ({
    product: one(products, {
      fields: [promotionalRules.productId],
      references: [products.id],
    }),
  })
);

export const customerDiscountRulesRelations = relations(
  customerDiscountRules,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerDiscountRules.customerId],
      references: [customers.id],
    }),
    product: one(products, {
      fields: [customerDiscountRules.productId],
      references: [products.id],
    }),
  })
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  customer: one(customers, {
    fields: [payments.customerId],
    references: [customers.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  recordedBy: one(user, {
    fields: [payments.recordedById],
    references: [user.id],
  }),
}));

export const slipRecordsRelations = relations(slipRecords, ({ one }) => ({
  invoice: one(invoices, {
    fields: [slipRecords.invoiceId],
    references: [invoices.id],
  }),
  customer: one(customers, {
    fields: [slipRecords.customerId],
    references: [customers.id],
  }),
  salesman: one(salesmen, {
    fields: [slipRecords.salesmanId],
    references: [salesmen.id],
  }),
}));

export const priceChangeLogRelations = relations(priceChangeLog, ({ one }) => ({
  product: one(products, {
    fields: [priceChangeLog.productId],
    references: [products.id],
  }),
  customer: one(customers, {
    fields: [priceChangeLog.customerId],
    references: [customers.id],
  }),
  changedBy: one(user, {
    fields: [priceChangeLog.changedById],
    references: [user.id],
  }),
  invoice: one(invoices, {
    fields: [priceChangeLog.invoiceId],
    references: [invoices.id],
  }),
}));
