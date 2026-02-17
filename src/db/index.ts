import { drizzle } from "drizzle-orm/node-postgres";
import * as authSchema from "./schemas/auth-schema";
import * as financeSchema from "./schemas/finance-schema";
import * as inventorySchema from "./schemas/inventory-schema";
import * as salesSchema from "./schemas/sales-schema";
import * as coreSuppliers from "./schemas/core-suppliers";
import * as supplierSchema from "./schemas/supplier-schema";
import * as hrSchema from "./schemas/hr-schema";

const schema = {
	...authSchema,
	...inventorySchema,
	...salesSchema,
	...financeSchema,
	...supplierSchema,
	...coreSuppliers,
	...hrSchema,
};

export const db = drizzle(process.env.DATABASE_URL!, { schema: schema });

export const { account, session, twoFactor, user, verification } = authSchema;
export const {
	warehouses,
	chemicals,
	packagingMaterials,
	materialStock,
	finishedGoodsStock,
	recipes,
	products,
	productionRuns,
	stockTransfers,
	inventoryAuditLog,
	productionMaterialsUsed,
} = inventorySchema;
export const { customers, invoices, invoiceItems } = salesSchema;
export const { wallets, expenses, transactions } = financeSchema;
export const { supplierPayments, purchaseRecords } = supplierSchema;
export const { suppliers } = coreSuppliers;
export const { employees, attendance, payrollRuns, payslips } = hrSchema;
