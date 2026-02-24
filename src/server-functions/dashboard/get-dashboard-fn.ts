import { createServerFn } from "@tanstack/react-start";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { db } from "@/db";
import { invoices } from "@/db/schemas/sales-schema";
import {
  productionRuns,
  materialStock,
  finishedGoodsStock,
  chemicals,
  packagingMaterials,
  recipes,
} from "@/db/schemas/inventory-schema";
import { payslips, payrolls, employees } from "@/db/schemas/hr-schema";
import { expenses } from "@/db/schemas/finance-schema";
import { sql, and, gte, lte, eq, desc, inArray } from "drizzle-orm";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
  startOfYear,
  endOfYear,
} from "date-fns";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Safely parse a DB decimal/string to a JS float, defaulting to 0. */
function toFloat(value: string | number | null | undefined): number {
  const n = parseFloat(String(value ?? "0"));
  return isNaN(n) ? 0 : n;
}

/**
 * BUG FIX: The original used a raw string interpolation to build an ANY() array,
 * which is vulnerable to SQL injection and broken for UUIDs with special chars.
 * Use Drizzle's `inArray` operator instead.
 */
async function getPayrollCostForIds(payrollIds: string[]): Promise<number> {
  if (payrollIds.length === 0) return 0;
  const result = await db
    .select({ total: sql<string>`coalesce(sum(${payslips.netSalary}), 0)` })
    .from(payslips)
    .where(inArray(payslips.payrollId, payrollIds));
  return toFloat(result[0]?.total);
}

// ─── Server Function ─────────────────────────────────────────────────────────

export const getDashboardStatsFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(
    z.object({
      year: z.number().default(new Date().getFullYear()),
      /**
       * BUG FIX: The original had no validation on the `month` string format.
       * If an invalid string was passed, `parseISO` would silently produce an
       * Invalid Date and all queries would use NaN timestamps.
       */
      month: z
        .string()
        .regex(/^\d{4}-\d{2}$/, "month must be in YYYY-MM format")
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { year, month } = data;

    // ── Date Range ──────────────────────────────────────────────────────
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

    // ── 1. Revenue ──────────────────────────────────────────────────────
    const [revenueRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${invoices.totalPrice}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(
        and(
          gte(invoices.createdAt, rangeStart),
          lte(invoices.createdAt, rangeEnd),
        ),
      );

    const totalRevenue = toFloat(revenueRow?.total);
    const invoiceCount = revenueRow?.count ?? 0;

    // ── 2. Production ───────────────────────────────────────────────────
    const [productionRow] = await db
      .select({
        activeCount: sql<number>`count(*) filter (where ${productionRuns.status} = 'in_progress')`,
        completedCount: sql<number>`count(*) filter (where ${productionRuns.status} = 'completed')`,
        totalCartons: sql<string>`coalesce(sum(${productionRuns.cartonsProduced}), 0)`,
      })
      .from(productionRuns)
      .where(
        and(
          gte(productionRuns.createdAt, rangeStart),
          lte(productionRuns.createdAt, rangeEnd),
        ),
      );

    const activeProductionRuns = productionRow?.activeCount ?? 0;
    const completedProductionRuns = productionRow?.completedCount ?? 0;
    const totalCartonsProduced = toFloat(productionRow?.totalCartons);

    // ── 3. Stock Valuation ──────────────────────────────────────────────
    const [chemicalStockRow] = await db
      .select({
        value: sql<string>`coalesce(sum(${materialStock.quantity}::numeric * ${chemicals.costPerUnit}::numeric), 0)`,
      })
      .from(materialStock)
      .leftJoin(chemicals, eq(materialStock.chemicalId, chemicals.id))
      .where(sql`${materialStock.chemicalId} is not null`);

    const [packagingStockRow] = await db
      .select({
        value: sql<string>`coalesce(sum(${materialStock.quantity}::numeric * ${packagingMaterials.costPerUnit}::numeric), 0)`,
      })
      .from(materialStock)
      .leftJoin(
        packagingMaterials,
        eq(materialStock.packagingMaterialId, packagingMaterials.id),
      )
      .where(sql`${materialStock.packagingMaterialId} is not null`);

    /**
     * BUG FIX: Original query could produce NULL * number = NULL for rows
     * where estimatedCostPerContainer is NULL. Added NULLIF guards so those
     * rows contribute 0 instead of silently being dropped from the sum.
     */
    const [finishedGoodsRow] = await db
      .select({
        value: sql<string>`coalesce(sum(
                    (
                        ${finishedGoodsStock.quantityCartons} * coalesce(${recipes.containersPerCarton}, 0)
                        + ${finishedGoodsStock.quantityContainers}
                    )::numeric
                    * coalesce(${recipes.estimatedCostPerContainer}, 0)::numeric
                ), 0)`,
      })
      .from(finishedGoodsStock)
      .leftJoin(recipes, eq(finishedGoodsStock.recipeId, recipes.id));

    const rawStockValue =
      toFloat(chemicalStockRow?.value) + toFloat(packagingStockRow?.value);
    const finishedStockValue = toFloat(finishedGoodsRow?.value);
    const totalStockValue = rawStockValue + finishedStockValue;

    // ── 4. Payroll Cost ─────────────────────────────────────────────────
    const payrollsInRange = await db.query.payrolls.findMany({
      where: and(
        gte(payrolls.createdAt, rangeStart),
        lte(payrolls.createdAt, rangeEnd),
      ),
      columns: { id: true },
    });

    const totalPayrollCost = await getPayrollCostForIds(
      payrollsInRange.map((p) => p.id),
    );

    // ── 5. Expenses ─────────────────────────────────────────────────────
    const [expensesRow] = await db
      .select({
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
      })
      .from(expenses)
      .where(
        and(
          gte(expenses.createdAt, rangeStart),
          lte(expenses.createdAt, rangeEnd),
        ),
      );

    const totalExpenses = toFloat(expensesRow?.total);

    // ── 6. Revenue vs Expense Chart (last 12 months) ────────────────────
    /**
     * BUG FIX: The original used `parseInt(month.split("-")[1]) - 1` as the
     * month index when computing chart anchoring. This was wrong — it produced
     * months relative to the *selected* month's index, so selecting Feb 2025
     * would anchor the 12-month window at month 1 (January), not at Feb 2025.
     * Fix: anchor on `rangeEnd` so the 12-month window always ends at the
     * last day of the selected period.
     */
    const chartMonths: {
      month: string;
      revenue: number;
      expenses: number;
      payroll: number;
    }[] = [];

    for (let i = 11; i >= 0; i--) {
      const mDate = subMonths(rangeEnd, i);
      const mStart = startOfMonth(mDate);
      const mEnd = endOfMonth(mDate);
      const mLabel = format(mDate, "MMM yy");

      // Run month-level queries in parallel for performance
      const [mRevenueRow, mExpensesRow, mPayrollRows] = await Promise.all([
        db
          .select({
            total: sql<string>`coalesce(sum(${invoices.totalPrice}), 0)`,
          })
          .from(invoices)
          .where(
            and(gte(invoices.createdAt, mStart), lte(invoices.createdAt, mEnd)),
          )
          .then((r) => r[0]),

        db
          .select({
            total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
          })
          .from(expenses)
          .where(
            and(gte(expenses.createdAt, mStart), lte(expenses.createdAt, mEnd)),
          )
          .then((r) => r[0]),

        db.query.payrolls.findMany({
          where: and(
            gte(payrolls.createdAt, mStart),
            lte(payrolls.createdAt, mEnd),
          ),
          columns: { id: true },
        }),
      ]);

      const mPayroll = await getPayrollCostForIds(
        mPayrollRows.map((p) => p.id),
      );

      chartMonths.push({
        month: mLabel,
        revenue: Math.round(toFloat(mRevenueRow?.total)),
        expenses: Math.round(toFloat(mExpensesRow?.total) + mPayroll),
        payroll: Math.round(mPayroll),
      });
    }

    // ── 7. Recent Activity Feed ─────────────────────────────────────────
    const recentRuns = await db.query.productionRuns.findMany({
      with: {
        recipe: { with: { product: true } },
        operator: true,
      },
      orderBy: [desc(productionRuns.updatedAt)],
      limit: 8,
    });

    const recentActivity = recentRuns.map((run) => ({
      id: run.id,
      batchId: run.batchId,
      productName: run.recipe?.product?.name ?? "Unknown Product",
      recipeName: run.recipe?.name ?? "Unknown Recipe",
      cartonsProduced: run.cartonsProduced ?? 0,
      containersProduced: run.containersProduced ?? 0,
      status: run.status,
      /**
       * BUG FIX: Original cast operator to `any` to access `.name`, which
       * silently fails if the operator relation shape changes. Use optional
       * chaining with a typed fallback instead.
       */
      operatorName:
        (run.operator as { name?: string } | null)?.name ?? "Unassigned",
      date: run.updatedAt,
    }));

    // ── 8. Active Employee Count ────────────────────────────────────────
    const [empCountRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.status, "active"));

    const activeEmployees = empCountRow?.count ?? 0;

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
      activeEmployees,

      // Chart
      revenueExpenseChart: chartMonths,

      // Feed
      recentActivity,

      // Meta
      period: {
        startStr: format(rangeStart, "yyyy-MM-dd"),
        endStr: format(rangeEnd, "yyyy-MM-dd"),
        year,
        month,
      },
    };
  });
