import { createServerFn } from "@tanstack/react-start";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { db } from "@/db";
import { invoices } from "@/db/schemas/sales-schema";
import { productionRuns, materialStock, finishedGoodsStock, chemicals, packagingMaterials, recipes } from "@/db/schemas/inventory-schema";
import { payslips, payrolls, employees } from "@/db/schemas/hr-schema";
import { expenses } from "@/db/schemas/finance-schema";
import { sql, and, gte, lte, eq, desc } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, startOfYear, endOfYear } from "date-fns";

export const getDashboardStatsFn = createServerFn()
    .middleware([requireAdminMiddleware])
    .inputValidator(z.object({
        year: z.number().default(new Date().getFullYear()),
        month: z.string().optional(), // YYYY-MM, if provided filters to that month
    }))
    .handler(async ({ data }) => {
        const { year, month } = data;

        // --- Date Range Setup ---
        let rangeStart: Date;
        let rangeEnd: Date;

        if (month) {
            const monthDate = parseISO(`${month}-01`);
            rangeStart = startOfMonth(monthDate);
            rangeEnd = endOfMonth(monthDate);
        } else {
            rangeStart = startOfYear(new Date(year, 0, 1));
            rangeEnd = endOfYear(new Date(year, 0, 1));
        }

        const startStr = format(rangeStart, "yyyy-MM-dd");
        const endStr = format(rangeEnd, "yyyy-MM-dd");

        // --- 1. Revenue (from invoices) ---
        const revenueResult = await db.select({
            total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
            count: sql<number>`count(*)`,
        })
            .from(invoices)
            .where(and(
                gte(invoices.createdAt, rangeStart),
                lte(invoices.createdAt, rangeEnd),
                eq(invoices.status, "paid"),
            ));

        const totalRevenue = parseFloat(revenueResult[0]?.total || "0");
        const invoiceCount = revenueResult[0]?.count || 0;

        // --- 2. Production ---
        const productionResult = await db.select({
            activeCount: sql<number>`count(*) filter (where ${productionRuns.status} = 'in_progress')`,
            completedCount: sql<number>`count(*) filter (where ${productionRuns.status} = 'completed')`,
            totalCartons: sql<string>`coalesce(sum(${productionRuns.cartonsProduced}), 0)`,
        })
            .from(productionRuns)
            .where(and(
                gte(productionRuns.createdAt, rangeStart),
                lte(productionRuns.createdAt, rangeEnd),
            ));

        const activeProductionRuns = productionResult[0]?.activeCount || 0;
        const completedProductionRuns = productionResult[0]?.completedCount || 0;
        const totalCartonsProduced = parseFloat(productionResult[0]?.totalCartons || "0");

        // --- 3. Stock Valuation ---
        // Raw material value: quantity * costPerUnit for chemicals
        const chemicalStockResult = await db
            .select({
                value: sql<string>`coalesce(sum(${materialStock.quantity}::numeric * ${chemicals.costPerUnit}::numeric), 0)`,
            })
            .from(materialStock)
            .leftJoin(chemicals, eq(materialStock.chemicalId, chemicals.id))
            .where(sql`${materialStock.chemicalId} is not null`);

        // Packaging material value
        const packagingStockResult = await db
            .select({
                value: sql<string>`coalesce(sum(${materialStock.quantity}::numeric * ${packagingMaterials.costPerUnit}::numeric), 0)`,
            })
            .from(materialStock)
            .leftJoin(packagingMaterials, eq(materialStock.packagingMaterialId, packagingMaterials.id))
            .where(sql`${materialStock.packagingMaterialId} is not null`);

        // Finished goods value: (cartons * containersPerCarton + loose) * costPerContainer
        const finishedGoodsResult = await db
            .select({
                value: sql<string>`coalesce(sum(
                    (${finishedGoodsStock.quantityCartons} * ${recipes.containersPerCarton} + ${finishedGoodsStock.quantityContainers})::numeric
                    * ${recipes.estimatedCostPerContainer}::numeric
                ), 0)`,
            })
            .from(finishedGoodsStock)
            .leftJoin(recipes, eq(finishedGoodsStock.recipeId, recipes.id));

        const rawStockValue = parseFloat(chemicalStockResult[0]?.value || "0") + parseFloat(packagingStockResult[0]?.value || "0");
        const finishedStockValue = parseFloat(finishedGoodsResult[0]?.value || "0");
        const totalStockValue = rawStockValue + finishedStockValue;

        // --- 4. Payroll Cost ---
        // Find payrolls in range
        const payrollsInRange = await db.query.payrolls.findMany({
            where: and(
                gte(payrolls.createdAt, rangeStart),
                lte(payrolls.createdAt, rangeEnd),
            ),
            columns: { id: true },
        });

        let totalPayrollCost = 0;
        if (payrollsInRange.length > 0) {
            const payrollIds = payrollsInRange.map(p => p.id);
            const payrollCostResult = await db.select({
                total: sql<string>`coalesce(sum(${payslips.netSalary}), 0)`,
            })
                .from(payslips)
                .where(sql`${payslips.payrollId} = any(${sql.raw(`array[${payrollIds.map(id => `'${id}'`).join(",")}]`)})`);
            totalPayrollCost = parseFloat(payrollCostResult[0]?.total || "0");
        }

        // --- 5. Expenses ---
        const expensesResult = await db.select({
            total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        })
            .from(expenses)
            .where(and(
                gte(expenses.createdAt, rangeStart),
                lte(expenses.createdAt, rangeEnd),
            ));
        const totalExpenses = parseFloat(expensesResult[0]?.total || "0");

        // --- 6. Monthly Revenue vs Expense Chart (last 12 months) ---
        const chartMonths: { month: string; revenue: number; expenses: number; payroll: number }[] = [];
        for (let i = 11; i >= 0; i--) {
            const mDate = subMonths(new Date(year, month ? parseInt(month.split("-")[1]) - 1 : 11, 1), i);
            const mStart = startOfMonth(mDate);
            const mEnd = endOfMonth(mDate);
            const mLabel = format(mDate, "MMM yy");

            const [mRevenue] = await db.select({
                total: sql<string>`coalesce(sum(${invoices.totalAmount}), 0)`,
            }).from(invoices).where(and(
                gte(invoices.createdAt, mStart),
                lte(invoices.createdAt, mEnd),
                eq(invoices.status, "paid"),
            ));

            const [mExpenses] = await db.select({
                total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
            }).from(expenses).where(and(
                gte(expenses.createdAt, mStart),
                lte(expenses.createdAt, mEnd),
            ));

            // Payroll for this month
            const mPayrolls = await db.query.payrolls.findMany({
                where: and(
                    gte(payrolls.createdAt, mStart),
                    lte(payrolls.createdAt, mEnd),
                ),
                columns: { id: true },
            });

            let mPayroll = 0;
            if (mPayrolls.length > 0) {
                const ids = mPayrolls.map(p => p.id);
                const [mPayrollResult] = await db.select({
                    total: sql<string>`coalesce(sum(${payslips.netSalary}), 0)`,
                }).from(payslips).where(
                    sql`${payslips.payrollId} = any(${sql.raw(`array[${ids.map(id => `'${id}'`).join(",")}]`)})`
                );
                mPayroll = parseFloat(mPayrollResult?.total || "0");
            }

            chartMonths.push({
                month: mLabel,
                revenue: Math.round(parseFloat(mRevenue?.total || "0")),
                expenses: Math.round(parseFloat(mExpenses?.total || "0") + mPayroll),
                payroll: Math.round(mPayroll),
            });
        }

        // --- 7. Recent Activity Feed (last 10 production runs) ---
        const recentRuns = await db.query.productionRuns.findMany({
            with: {
                recipe: {
                    with: { product: true },
                },
                operator: true,
            },
            orderBy: [desc(productionRuns.updatedAt)],
            limit: 8,
        });

        const recentActivity = recentRuns.map(run => ({
            id: run.id,
            batchId: run.batchId,
            productName: run.recipe?.product?.name || "Unknown",
            recipeName: run.recipe?.name || "Unknown",
            cartonsProduced: run.cartonsProduced || 0,
            containersProduced: run.containersProduced || 0,
            status: run.status,
            operatorName: (run.operator as any)?.name || "Unknown",
            date: run.updatedAt,
        }));

        // --- 8. Active Employee Count ---
        const [empCount] = await db.select({
            count: sql<number>`count(*)`,
        }).from(employees).where(eq(employees.status, "active"));

        return {
            // KPIs
            totalRevenue: Math.round(totalRevenue),
            invoiceCount,
            activeProductionRuns,
            completedProductionRuns,
            totalCartonsProduced: Math.round(totalCartonsProduced),
            rawStockValue: Math.round(rawStockValue),
            finishedStockValue: Math.round(finishedStockValue),
            totalStockValue: Math.round(totalStockValue),
            totalPayrollCost: Math.round(totalPayrollCost),
            totalExpenses: Math.round(totalExpenses),
            totalCost: Math.round(totalPayrollCost + totalExpenses),
            netProfit: Math.round(totalRevenue - totalPayrollCost - totalExpenses),
            activeEmployees: empCount?.count || 0,

            // Chart
            revenueExpenseChart: chartMonths,

            // Feed
            recentActivity,

            // Meta
            period: { startStr, endStr, year, month },
        };
    });
