import { db } from "@/db";
import { commissionTiers, commissionRecords, orderBookers } from "@/db/schemas/sales-erp-schema";
import { eq, and } from "drizzle-orm";

export async function calculateCommissionForOrder(
  tx: any,
  orderBookerId: string,
  orderId: string,
  fulfilledAmount: number,
) {
  const dbOrTx = tx || db;

  // Guard: skip if commission record already exists for this order
  const existing = await dbOrTx.query.commissionRecords.findFirst({
    where: and(
      eq(commissionRecords.orderBookerId, orderBookerId),
      eq(commissionRecords.orderId, orderId),
    ),
  });
  if (existing) return existing;

  const tiers = await dbOrTx.query.commissionTiers.findMany({
    where: eq(commissionTiers.isActive, true),
    orderBy: [commissionTiers.minAmount],
  });

  let totalCommission = 0;
  let appliedRate = 0;

  for (const tier of tiers) {
    const min = parseFloat(tier.minAmount);
    const max = tier.maxAmount ? parseFloat(tier.maxAmount) : Infinity;
    const rate = parseFloat(tier.rate);

    if (fulfilledAmount > min) {
      const bandAmount = Math.min(fulfilledAmount, max) - min;
      if (bandAmount > 0) {
        // Use integer math to avoid floating-point artifacts
        totalCommission += Math.round(bandAmount * rate * 100) / 10000;
        appliedRate = rate;
      }
    }
  }

  // If no tiers match, fall back to flat commissionRate on orderBooker
  if (totalCommission === 0) {
    const ob = await dbOrTx.query.orderBookers.findFirst({
      where: eq(orderBookers.id, orderBookerId),
    });
    if (ob && ob.commissionRate) {
      const flatRate = parseFloat(ob.commissionRate);
      totalCommission = Math.round(fulfilledAmount * flatRate * 100) / 10000;
      appliedRate = flatRate;
    }
  }

  const [record] = await dbOrTx
    .insert(commissionRecords)
    .values({
      orderBookerId,
      orderId,
      fulfilledAmount: fulfilledAmount.toString(),
      appliedRate: appliedRate.toString(),
      commissionAmount: totalCommission.toFixed(2),
      status: "accrued",
    })
    .returning();

  return record;
}
