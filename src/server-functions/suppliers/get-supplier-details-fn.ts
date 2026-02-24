import { createServerFn } from "@tanstack/react-start";
import { db, materialStock } from "@/db";
import { requireAdminMiddleware } from "@/lib/middlewares";
import { z } from "zod";
import { notFound } from "@tanstack/react-router";

export const getSupplierDetailsFn = createServerFn()
  .middleware([requireAdminMiddleware])
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const supplier = await db.query.suppliers.findFirst({
      where: (suppliers, { eq }) => eq(suppliers.id, data.id),
      with: {
        purchases: {
          with: {
            warehouse: true,
            chemical: true,
            packagingMaterial: true,
          },
          orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
        },
        payments: {
          with: {
            purchase: {
              with: {
                chemical: true,
                packagingMaterial: true,
              },
            },
          },
          orderBy: (payments, { desc }) => [desc(payments.createdAt)],
        },
      },
    });

    if (!supplier) {
      throw notFound();
    }

    const totalPurchases = supplier.purchases.reduce(
      (acc, p) => acc + parseFloat(p.cost),
      0,
    );
    const totalPayments = supplier.payments.reduce(
      (acc, p) => acc + parseFloat(p.amount),
      0,
    );
    const balance = totalPurchases - totalPayments;

    // Fetch current stock levels for items purchased from this supplier
    // We accumulate all chemical IDs and packaging IDs
    const chemicalIds = new Set(
      supplier.purchases.map((p) => p.chemicalId).filter(Boolean),
    );
    const packagingIds = new Set(
      supplier.purchases.map((p) => p.packagingMaterialId).filter(Boolean),
    );

    // This is a naive fetch of ALL stock logic, but scoped to these IDs if we filtered.
    // Actually, let's just fetch all stock. It's usually small.
    // Or better, filtered.

    let stockMap: Record<
      string,
      { current: number; min: number; warehouse: string }
    > = {};

    // We will just do a client-side (server-side here) merge for simplicity if the DB tool API allows easy raw queries or if we just fetch the stock table.
    // Given we don't have easy `inArray` import here without adding it, let's use `db.query.materialStock` if valid, or just simple raw query.

    // Let's rely on the components to fetch stock? No, user wants it in the table "Current Stock".
    // Let's modify the response to include `currentStock` in the purchase items.
    // Since we are using TanStack Start, we can just return enriched objects.

    const allStocks = await db.query.materialStock.findMany({
      with: {
        warehouse: true,
      },
    });

    const enrichedPurchases = supplier.purchases.map((p) => {
      let stock = 0;
      let lowStock = false;
      let minStock = 0;

      // Calculate total stock for this item across all warehouses (or specific?)
      // Usually "Current Stock" implies "Total Available".

      if (p.chemicalId) {
        const stocks = allStocks.filter((s) => s.chemicalId === p.chemicalId);
        const rawStock = stocks.reduce(
          (sum, s) => sum + parseFloat(s.quantity),
          0,
        );
        stock = Math.max(0, rawStock);
        minStock = parseFloat(p.chemical?.minimumStockLevel || "0");
      } else if (p.packagingMaterialId) {
        const stocks = allStocks.filter(
          (s) => s.packagingMaterialId === p.packagingMaterialId,
        );
        const rawStock = stocks.reduce(
          (sum, s) => sum + parseFloat(s.quantity),
          0,
        );
        stock = Math.max(0, rawStock);
        minStock = parseFloat(
          p.packagingMaterial?.minimumStockLevel?.toString() || "0",
        );
      }

      lowStock = stock < minStock;

      // Also find related payments for this purchase to get "Last Payment" details
      const relatedPayments = supplier.payments.filter(
        (pay) => pay.purchaseId === p.id,
      );
      const lastPayment =
        relatedPayments.length > 0 ? relatedPayments[0] : null; // Sorted by desc createdAt already

      return {
        ...p,
        currentStock: stock,
        isLowStock: lowStock,
        minStockLevel: minStock,
        lastPayment: lastPayment,
      };
    });

    return {
      ...supplier,
      purchases: enrichedPurchases,
      balance,
      totalPurchases,
      totalPayments,
    };
  });
