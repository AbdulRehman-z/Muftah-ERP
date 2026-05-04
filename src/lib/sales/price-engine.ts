export type PriceAgreement = {
  id: string;
  customerId: string;
  productId: string;
  pricingType: "fixed" | "margin_off_tp" | "flat_discount";
  agreedValue: string | number;
  tpBaseline: string | number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export type PriceResolution = {
  cartonPrice: number;
  perUnitPrice: number;
  source: "agreement" | "default";
  agreementId: string | null;
  agreementType: "fixed" | "margin_off_tp" | "flat_discount" | null;
  tpBaseline: number | null;
  marginPercent: number | null;
};

/**
 * Single source of truth for pricing resolution across the ERP.
 * Resolves the correct price based on customer-specific agreements or falls back to defaults.
 */
export function resolvePrice(
  customerId: string,
  productId: string,
  requestedPackSize: number,
  basePackSize: number,
  defaultUnitPrice: number,
  agreements: PriceAgreement[],
  customerDefaultMargin?: number | null,
  tpBaseline?: number | null,
): PriceResolution {
  const now = new Date();

  // Find active agreement
  const activeAgreement = agreements.find(
    (a) =>
      a.customerId === customerId &&
      a.productId === productId &&
      a.effectiveFrom <= now &&
      (!a.effectiveTo || a.effectiveTo > now)
  );

  const packRatio = requestedPackSize / (basePackSize || 1);

  if (activeAgreement) {
    const agreedValue = Number(activeAgreement.agreedValue);

    if (activeAgreement.pricingType === "fixed") {
      // Fixed price for the base pack size, scaled
      const scaledPrice = packRatio * agreedValue;
      return {
        cartonPrice: scaledPrice,
        perUnitPrice: scaledPrice / (requestedPackSize || 1),
        source: "agreement",
        agreementId: activeAgreement.id,
        agreementType: "fixed",
        tpBaseline: null,
        marginPercent: null,
      };
    }

    if (activeAgreement.pricingType === "margin_off_tp") {
      // TP Baseline scaled, then margin deducted
      const baseTp = Number(activeAgreement.tpBaseline || 0);
      const scaledTp = packRatio * baseTp;
      const marginPercent = agreedValue;
      const cartonPrice = scaledTp * (1 - marginPercent / 100);

      return {
        cartonPrice: cartonPrice,
        perUnitPrice: cartonPrice / (requestedPackSize || 1),
        source: "agreement",
        agreementId: activeAgreement.id,
        agreementType: "margin_off_tp",
        tpBaseline: scaledTp,
        marginPercent: marginPercent,
      };
    }

    if (activeAgreement.pricingType === "flat_discount") {
      // Default price scaled, minus flat discount
      const baseCartonPrice = defaultUnitPrice * requestedPackSize;
      const cartonPrice = Math.max(0, baseCartonPrice - agreedValue);

      return {
        cartonPrice: cartonPrice,
        perUnitPrice: cartonPrice / (requestedPackSize || 1),
        source: "agreement",
        agreementId: activeAgreement.id,
        agreementType: "flat_discount",
        tpBaseline: null,
        marginPercent: null,
      };
    }
  }

  // Fallback to customer default margin if available
  if (customerDefaultMargin && customerDefaultMargin > 0 && tpBaseline) {
    const scaledTp = packRatio * tpBaseline;
    const cartonPrice = scaledTp * (1 - customerDefaultMargin / 100);
    return {
      cartonPrice: cartonPrice,
      perUnitPrice: cartonPrice / (requestedPackSize || 1),
      source: "default",
      agreementId: null,
      agreementType: null,
      tpBaseline: scaledTp,
      marginPercent: customerDefaultMargin,
    };
  }

  // Fallback to default
  const defaultCartonPrice = defaultUnitPrice * requestedPackSize;
  return {
    cartonPrice: defaultCartonPrice,
    perUnitPrice: defaultUnitPrice,
    source: "default",
    agreementId: null,
    agreementType: null,
    tpBaseline: null,
    marginPercent: null,
  };
}
