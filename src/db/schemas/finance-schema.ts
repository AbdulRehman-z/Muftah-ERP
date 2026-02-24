import { relations } from "drizzle-orm";
import { decimal, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// --- WALLETS (Cash vs Bank) ---
export const wallets = pgTable("wallets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // "Cash Drawer", "HBL Business Account"
  type: text("type").notNull(), // "cash", "bank"
  balance: decimal("balance", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  ...timestamps,
});

// --- EXPENSES ---
export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  category: text("category").notNull(), // "Electricity", "Fuel", "Rent", "Misc"
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),

  walletId: text("wallet_id")
    .notNull()
    .references(() => wallets.id),
  performedById: text("performed_by_id")
    .notNull()
    .references(() => user.id),
  ...timestamps,
});

// --- TRANSACTIONS (Journal) ---
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  walletId: text("wallet_id")
    .notNull()
    .references(() => wallets.id),

  type: text("type").notNull(), // "credit", "debit"
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),

  source: text("source").notNull(), // "Sale", "Expense", "Payroll", "Manual Adjustment"
  referenceId: text("reference_id"), // ID of Invoice, Expense, or Payroll record

  performedById: text("performed_by_id")
    .notNull()
    .references(() => user.id),
  ...timestamps,
});

// --- RELATIONS ---

export const walletsRelations = relations(wallets, ({ many }) => ({
  expenses: many(expenses),
  transactions: many(transactions),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  wallet: one(wallets, {
    fields: [expenses.walletId],
    references: [wallets.id],
  }),
  performer: one(user, {
    fields: [expenses.performedById],
    references: [user.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  performer: one(user, {
    fields: [transactions.performedById],
    references: [user.id],
  }),
}));
