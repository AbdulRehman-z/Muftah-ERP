import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schemas/auth-schema";
import * as financeSchema from "./schemas/finance-schema";
import * as inventorySchema from "./schemas/inventory-schema";
import * as salesSchema from "./schemas/sales-schema";

const schema = {
	...authSchema,
	...inventorySchema,
	...salesSchema,
	...financeSchema,
};

export const db = drizzle(process.env.DATABASE_URL!, { schema: schema });

export const { account, session, twoFactor, user, verification } = authSchema;
export const {
	warehouses,
	employees,
	rawMaterials,
	packagingMaterials,
	materialStock,
	products,
	productVariants,
	productionRuns,
	stockTransfers,
	inventoryAuditLog,
} = inventorySchema;
export const { customers, invoices, invoiceItems } = salesSchema;
export const { wallets, expenses, transactions } = financeSchema;
