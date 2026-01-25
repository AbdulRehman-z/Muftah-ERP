import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import {
	boolean,
	decimal,
	index,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./auth-schema";
import { wallets } from "./finance-schema";

const timestamps = {
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
};

// --- WAREHOUSES ---

export const warehouses = pgTable(
	"warehouses",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => createId()),
		name: text("name").notNull(),
		address: text("address").notNull(), // Renamed from 'location' for clarity
		latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
		longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
		...timestamps,
	},
	(table) => {
		return {
			coordsIdx: index("coords_idx").on(table.latitude, table.longitude),
		};
	},
);

// --- EMPLOYEES ---
export const employees = pgTable("employees", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	role: text("role").notNull(), // "Operator", "Loader", "Supervisor"
	baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).default("0"),
	// We might link this to a User for Auth, but keeping it distinct as per requirements for now
	// userId: text("user_id").references(() => user.id),
	...timestamps,
});

// --- PAYROLL ---
export const payroll = pgTable("payroll", {
	id: text("id").primaryKey(),
	employeeId: text("employee_id")
		.notNull()
		.references(() => employees.id),

	month: integer("month").notNull(), // 1-12
	year: integer("year").notNull(),

	baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull(),
	overtimePay: decimal("overtime_pay", { precision: 10, scale: 2 }).default(
		"0",
	),
	deductions: decimal("deductions", { precision: 10, scale: 2 }).default("0"), // Loans/Fines

	totalPaid: decimal("total_paid", { precision: 12, scale: 2 }).notNull(),
	status: text("status").notNull().default("paid"), // paid, pending

	walletId: text("wallet_id").references(() => wallets.id), // Where salary was paid from

	...timestamps,
});

// --- MATERIALS ---
export const rawMaterials = pgTable("raw_materials", {
	id: text("id").primaryKey(),
	name: text("name").notNull(), // e.g., "LABSA", "Caustic Soda"
	unit: text("unit").notNull().default("kg"), // "kg", "liters", "pcs"
	minimumStockLevel: decimal("minimum_stock_level", {
		precision: 10,
		scale: 2,
	}).default("0"),
	...timestamps,
});

export const packagingMaterials = pgTable("packaging_materials", {
	id: text("id").primaryKey(),
	name: text("name").notNull(), // e.g., "500ml Bottle", "Sticker Front"
	unit: text("unit").notNull().default("unit"), // "unit", "piece"
	minimumStockLevel: integer("minimum_stock_level").default(0),
	...timestamps,
});

// --- INVENTORY STOCK (Multi-Warehouse) ---
// Tracks how much of a generic material is in a specific warehouse
export const materialStock = pgTable(
	"material_stock",
	{
		id: text("id").primaryKey(),
		warehouseId: text("warehouse_id")
			.notNull()
			.references(() => warehouses.id),
		rawMaterialId: text("raw_material_id").references(() => rawMaterials.id),
		packagingMaterialId: text("packaging_material_id").references(
			() => packagingMaterials.id,
		),

		quantity: decimal("quantity", { precision: 12, scale: 3 })
			.notNull()
			.default("0"), // Supports partial KGs
		...timestamps,
	},
	(t) => ({
		warehouseIdx: index("stock_warehouse_idx").on(t.warehouseId),
	}),
);

// --- PRODUCTS & VARIANTS ---
export const products = pgTable("products", {
	id: text("id").primaryKey(),
	name: text("name").notNull(), // "Dishwash Liquid"
	description: text("description"),
	...timestamps,
});

export const productVariants = pgTable("product_variants", {
	id: text("id").primaryKey(),
	productId: text("product_id")
		.notNull()
		.references(() => products.id),
	name: text("name").notNull(), // "Rs.50 Pack (500ml)"

	// The Formula / BOM
	packsPerCarton: integer("packs_per_carton").notNull().default(1),
	weightPerPackKg: decimal("weight_per_pack_kg", {
		precision: 8,
		scale: 3,
	}).notNull(), // 0.105

	// Primary chemical to deduct (Simplification for now, can be a junction table for complex formulas later)
	primaryRawMaterialId: text("primary_raw_material_id").references(
		() => rawMaterials.id,
	),

	// Primary packaging to deduct (Simplification)
	primaryPackagingId: text("primary_packaging_material_id").references(
		() => packagingMaterials.id,
	),

	// Finished Goods Stock (Simple per-variant stock for now, can be moved to materialStock if treated as a resource)
	stockQuantityCartons: integer("stock_quantity_cartons").default(0),

	// Pricing
	retailPrice: decimal("retail_price", { precision: 10, scale: 2 }),
	hsnCode: text("hsn_code"),

	...timestamps,
});

// --- PRODUCTION RUNS ---
export const productionRuns = pgTable("production_runs", {
	id: text("id").primaryKey(),
	batchId: text("batch_id").notNull().unique(), // Unique human-readable batch code

	variantId: text("variant_id")
		.notNull()
		.references(() => productVariants.id),
	warehouseId: text("warehouse_id")
		.notNull()
		.references(() => warehouses.id),
	operatorId: text("operator_id")
		.notNull()
		.references(() => user.id), // The user who did it

	cartonsProduced: integer("cartons_produced").notNull(),
	totalPacksCreated: integer("total_packs_created").notNull(),
	totalLiquidDeductedKg: decimal("total_liquid_deducted_kg", {
		precision: 12,
		scale: 3,
	}).notNull(),

	status: text("status").notNull().default("completed"), // completed, reverted
	...timestamps,
});

// --- STOCK TRANSFERS ---
export const stockTransfers = pgTable("stock_transfers", {
	id: text("id").primaryKey(),
	fromWarehouseId: text("from_warehouse_id")
		.notNull()
		.references(() => warehouses.id),
	toWarehouseId: text("to_warehouse_id")
		.notNull()
		.references(() => warehouses.id),

	materialType: text("material_type").notNull(), // "raw", "packaging", "variant"
	materialId: text("material_id").notNull(),

	quantity: decimal("quantity", { precision: 12, scale: 3 }).notNull(),
	performedById: text("performed_by_id")
		.notNull()
		.references(() => user.id),

	status: text("status").notNull().default("completed"), // pending, completed, cancelled
	...timestamps,
});

// --- INVENTORY AUDIT LOG ---
export const inventoryAuditLog = pgTable("inventory_audit_log", {
	id: text("id").primaryKey(),
	warehouseId: text("warehouse_id")
		.notNull()
		.references(() => warehouses.id),

	materialType: text("material_type").notNull(), // "raw", "packaging", "variant"
	materialId: text("material_id").notNull(),

	type: text("type").notNull(), // "credit", "debit"
	amount: decimal("amount", { precision: 12, scale: 3 }).notNull(),
	reason: text("reason").notNull(), // "Production", "Sale", "Transfer", "Adjustment"

	performedById: text("performed_by_id")
		.notNull()
		.references(() => user.id),
	referenceId: text("reference_id"), // ID of ProductionRun, SalesInvoice, or StockTransfer

	...timestamps,
});

// --- RELATIONS ---

export const warehousesRelations = relations(warehouses, ({ many }) => ({
	stock: many(materialStock),
	productionRuns: many(productionRuns),
}));

export const materialStockRelations = relations(materialStock, ({ one }) => ({
	warehouse: one(warehouses, {
		fields: [materialStock.warehouseId],
		references: [warehouses.id],
	}),
	rawMaterial: one(rawMaterials, {
		fields: [materialStock.rawMaterialId],
		references: [rawMaterials.id],
	}),
	packagingMaterial: one(packagingMaterials, {
		fields: [materialStock.packagingMaterialId],
		references: [packagingMaterials.id],
	}),
}));

export const productionRunsRelations = relations(productionRuns, ({ one }) => ({
	variant: one(productVariants, {
		fields: [productionRuns.variantId],
		references: [productVariants.id],
	}),
	warehouse: one(warehouses, {
		fields: [productionRuns.warehouseId],
		references: [warehouses.id],
	}),
	operator: one(user, {
		fields: [productionRuns.operatorId],
		references: [user.id],
	}),
}));

export const productVariantsRelations = relations(
	productVariants,
	({ one, many }) => ({
		product: one(products, {
			fields: [productVariants.productId],
			references: [products.id],
		}),
		productionRuns: many(productionRuns),
		primaryRawMaterial: one(rawMaterials, {
			fields: [productVariants.primaryRawMaterialId],
			references: [rawMaterials.id],
		}),
	}),
);

export const employeesRelations = relations(employees, ({ many }) => ({
	payrollRecords: many(payroll),
}));

export const payrollRelations = relations(payroll, ({ one }) => ({
	employee: one(employees, {
		fields: [payroll.employeeId],
		references: [employees.id],
	}),
	wallet: one(wallets, {
		fields: [payroll.walletId],
		references: [wallets.id],
	}),
}));

export const stockTransfersRelations = relations(stockTransfers, ({ one }) => ({
	fromWarehouse: one(warehouses, {
		fields: [stockTransfers.fromWarehouseId],
		references: [warehouses.id],
	}),
	toWarehouse: one(warehouses, {
		fields: [stockTransfers.toWarehouseId],
		references: [warehouses.id],
	}),
	performer: one(user, {
		fields: [stockTransfers.performedById],
		references: [user.id],
	}),
}));

export const inventoryAuditLogRelations = relations(
	inventoryAuditLog,
	({ one }) => ({
		warehouse: one(warehouses, {
			fields: [inventoryAuditLog.warehouseId],
			references: [warehouses.id],
		}),
		performer: one(user, {
			fields: [inventoryAuditLog.performedById],
			references: [user.id],
		}),
	}),
);
