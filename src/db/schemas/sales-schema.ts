import { relations } from "drizzle-orm";
import {
    decimal,
    pgTable,
    text,
    timestamp,
    integer,
} from "drizzle-orm/pg-core";
import { recipes, warehouses } from "./inventory-schema";
import { user } from "./auth-schema";

const timestamps = {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .defaultNow()
        .$onUpdate(() => new Date())
        .notNull(),
};

// --- CUSTOMERS ---
export const customers = pgTable("customers", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    contactPerson: text("contact_person"),
    phone: text("phone"),
    address: text("address"),
    type: text("type"), // "distributor", "retail", etc.
    ...timestamps,
});

// --- INVOICES ---
export const invoices = pgTable("invoices", {
    id: text("id").primaryKey(),
    invoiceNumber: text("invoice_number").unique(),
    customerId: text("customer_id").references(() => customers.id),

    totalAmount: decimal("total_amount", { precision: 12, scale: 2 })
        .notNull()
        .default("0"),
    profitMargin: decimal("profit_margin", { precision: 12, scale: 2 })
        .notNull()
        .default("0"),

    status: text("status").notNull().default("paid"), // paid, pending, cancelled
    paymentMethod: text("payment_method"), // "cash", "bank"
    warehouseId: text("warehouse_id")
        .notNull()
        .references(() => warehouses.id), // Where stock was deducted from

    performedById: text("performed_by_id")
        .notNull()
        .references(() => user.id),
    ...timestamps,
});

// --- INVOICE ITEMS ---
export const invoiceItems = pgTable("invoice_items", {
    id: text("id").primaryKey(),
    invoiceId: text("invoice_id")
        .notNull()
        .references(() => invoices.id),
    recipeId: text("recipe_id")
        .notNull()
        .references(() => recipes.id),

    quantityCartons: integer("quantity_cartons").notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),

    ...timestamps,
});

// --- RELATIONS ---

export const customersRelations = relations(customers, ({ many }) => ({
    invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
    customer: one(customers, {
        fields: [invoices.customerId],
        references: [customers.id],
    }),
    items: many(invoiceItems),
    warehouse: one(warehouses, {
        fields: [invoices.warehouseId],
        references: [warehouses.id],
    }),
    performer: one(user, {
        fields: [invoices.performedById],
        references: [user.id],
    }),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
    invoice: one(invoices, {
        fields: [invoiceItems.invoiceId],
        references: [invoices.id],
    }),
    recipe: one(recipes, {
        fields: [invoiceItems.recipeId],
        references: [recipes.id],
    }),
}));
