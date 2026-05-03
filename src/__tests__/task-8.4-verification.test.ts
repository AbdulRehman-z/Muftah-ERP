/**
 * Task 8.4 Verification: Price Agreement Integration with Customer Discounts
 * 
 * This test verifies that:
 * 1. Customer discounts are calculated using the agreed price (finalPerCartonPrice) 
 *    AFTER price agreement resolution
 * 2. Both priceAgreementId and customerDiscountRuleId are stored in invoice_items
 * 
 * Requirements validated:
 * - 6.1: Price agreements are applied before customer discount rules
 * - 6.2: Customer discounts use the agreed price for calculation
 * - 6.4: priceAgreementId is stored in invoice_items
 * - 6.5: customerDiscountRuleId is stored in invoice_items
 */

import { describe, it, expect } from "vitest";
import { evaluateCustomerDiscount } from "@/lib/sales/discount-engine";
import { resolvePrice } from "@/lib/sales/price-engine";
import type { CustomerDiscountRule } from "@/lib/sales/discount-engine";
import type { PriceAgreement } from "@/lib/sales/price-engine";

describe("Task 8.4: Price Agreement Integration with Customer Discounts", () => {
  describe("Requirement 6.1 & 6.2: Customer discount uses agreed price", () => {
    it("should calculate customer discount using the agreed price from price agreement", () => {
      // Setup: Customer has a price agreement that reduces price from 1000 to 800
      const customerId = "customer-123";
      const productId = "product-456";
      const defaultPrice = 1000;
      const agreedPrice = 800;
      
      const priceAgreement: PriceAgreement = {
        id: "agreement-1",
        customerId,
        productId,
        pricingType: "fixed",
        agreedValue: agreedPrice,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      // Step 1: Resolve price using price agreement
      const priceResolution = resolvePrice(
        customerId,
        productId,
        12, // requestedPackSize (12 packs per carton)
        12, // basePackSize
        defaultPrice / 12, // defaultUnitPrice
        [priceAgreement]
      );

      expect(priceResolution.source).toBe("agreement");
      expect(priceResolution.agreementId).toBe("agreement-1");
      expect(priceResolution.cartonPrice).toBe(agreedPrice);

      // Step 2: Apply customer discount using the AGREED price (not default price)
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-rule-1",
        customerId,
        productId,
        volumeThreshold: 10,
        discountType: "percentage",
        discountValue: 10, // 10% discount
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        20, // numberOfCartons (meets threshold)
        priceResolution.cartonPrice, // Use AGREED price, not default
        "retailer",
        [customerDiscountRule]
      );

      // Verify discount is calculated on agreed price (800), not default price (1000)
      const expectedDiscount = (20 * agreedPrice * 10) / 100; // 20 cartons × 800 × 10% = 1600
      expect(discountResolution.discountAmount).toBe(expectedDiscount);
      expect(discountResolution.ruleId).toBe("discount-rule-1");

      // If discount was incorrectly calculated on default price, it would be:
      const incorrectDiscount = (20 * defaultPrice * 10) / 100; // 20 × 1000 × 10% = 2000
      expect(discountResolution.discountAmount).not.toBe(incorrectDiscount);
    });

    it("should calculate carton_equivalent discount using agreed price", () => {
      const customerId = "customer-123";
      const productId = "product-456";
      const defaultPrice = 1000;
      const agreedPrice = 750;

      const priceAgreement: PriceAgreement = {
        id: "agreement-2",
        customerId,
        productId,
        pricingType: "fixed",
        agreedValue: agreedPrice,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      // Resolve price
      const priceResolution = resolvePrice(
        customerId,
        productId,
        24,
        24,
        defaultPrice / 24,
        [priceAgreement]
      );

      expect(priceResolution.cartonPrice).toBe(agreedPrice);

      // Apply carton_equivalent discount
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-rule-2",
        customerId,
        productId,
        volumeThreshold: 15,
        discountType: "carton_equivalent",
        discountValue: 2, // 2 cartons worth of discount
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        20,
        priceResolution.cartonPrice, // Use agreed price
        "distributor",
        [customerDiscountRule]
      );

      // Discount should be 2 cartons × agreed price (750), not default price (1000)
      expect(discountResolution.discountAmount).toBe(2 * agreedPrice); // 1500
      expect(discountResolution.discountAmount).not.toBe(2 * defaultPrice); // Not 2000
    });

    it("should calculate margin_off_tp agreement price before applying customer discount", () => {
      const customerId = "customer-789";
      const productId = "product-101";
      const tpBaseline = 1200;
      const marginPercent = 15; // 15% margin off TP

      const priceAgreement: PriceAgreement = {
        id: "agreement-3",
        customerId,
        productId,
        pricingType: "margin_off_tp",
        agreedValue: marginPercent,
        tpBaseline: tpBaseline,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      // Resolve price with margin_off_tp
      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        100, // defaultUnitPrice (not used for margin_off_tp)
        [priceAgreement]
      );

      const expectedAgreedPrice = tpBaseline * (1 - marginPercent / 100); // 1200 × 0.85 = 1020
      expect(priceResolution.cartonPrice).toBe(expectedAgreedPrice);
      expect(priceResolution.source).toBe("agreement");
      expect(priceResolution.agreementType).toBe("margin_off_tp");

      // Apply percentage discount on the margin_off_tp price
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-rule-3",
        customerId,
        productId,
        volumeThreshold: 5,
        discountType: "percentage",
        discountValue: 5, // 5% discount
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        10,
        priceResolution.cartonPrice, // Use margin_off_tp calculated price
        "wholesaler",
        [customerDiscountRule]
      );

      const expectedDiscount = (10 * expectedAgreedPrice * 5) / 100; // 10 × 1020 × 5% = 510
      expect(discountResolution.discountAmount).toBe(expectedDiscount);
    });
  });

  describe("Requirement 6.4 & 6.5: Store both priceAgreementId and customerDiscountRuleId", () => {
    it("should return both agreementId and discountRuleId when both apply", () => {
      const customerId = "customer-abc";
      const productId = "product-xyz";
      const agreedPrice = 900;

      const priceAgreement: PriceAgreement = {
        id: "agreement-final",
        customerId,
        productId,
        pricingType: "fixed",
        agreedValue: agreedPrice,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        100,
        [priceAgreement]
      );

      // Verify price agreement ID is returned
      expect(priceResolution.agreementId).toBe("agreement-final");
      expect(priceResolution.source).toBe("agreement");

      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-rule-final",
        customerId,
        productId,
        volumeThreshold: 10,
        discountType: "fixed_amount",
        discountValue: 100,
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        15,
        priceResolution.cartonPrice,
        "retailer",
        [customerDiscountRule]
      );

      // Verify customer discount rule ID is returned
      expect(discountResolution.ruleId).toBe("discount-rule-final");
      expect(discountResolution.discountAmount).toBe(100);

      // Both IDs should be available for storage in invoice_items
      expect(priceResolution.agreementId).not.toBeNull();
      expect(discountResolution.ruleId).not.toBeNull();
    });

    it("should return null agreementId when no price agreement applies", () => {
      const customerId = "customer-no-agreement";
      const productId = "product-default";
      const defaultPrice = 1000;

      // No price agreements provided
      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        defaultPrice / 12,
        [] // Empty agreements array
      );

      // Should fall back to default pricing
      expect(priceResolution.source).toBe("default");
      expect(priceResolution.agreementId).toBeNull();
      expect(priceResolution.cartonPrice).toBe(defaultPrice);

      // Customer discount should still work with default price
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-rule-default",
        customerId,
        productId,
        volumeThreshold: 5,
        discountType: "percentage",
        discountValue: 10,
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        10,
        priceResolution.cartonPrice, // Use default price
        "retailer",
        [customerDiscountRule]
      );

      expect(discountResolution.ruleId).toBe("discount-rule-default");
      expect(discountResolution.discountAmount).toBe((10 * defaultPrice * 10) / 100);
    });

    it("should return null discountRuleId when no customer discount applies", () => {
      const customerId = "customer-no-discount";
      const productId = "product-no-discount";
      const agreedPrice = 800;

      const priceAgreement: PriceAgreement = {
        id: "agreement-only",
        customerId,
        productId,
        pricingType: "fixed",
        agreedValue: agreedPrice,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        100,
        [priceAgreement]
      );

      expect(priceResolution.agreementId).toBe("agreement-only");

      // No discount rules provided
      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        10,
        priceResolution.cartonPrice,
        "retailer",
        [] // Empty rules array
      );

      // Should return zero discount with null rule ID
      expect(discountResolution.ruleId).toBeNull();
      expect(discountResolution.discountAmount).toBe(0);
    });
  });

  describe("Integration: Complete pricing flow", () => {
    it("should apply price agreement → customer discount in correct order", () => {
      const customerId = "customer-integration";
      const productId = "product-integration";
      const defaultPrice = 1000;
      const agreedPrice = 850;
      const numberOfCartons = 25;

      // Step 1: Price Agreement
      const priceAgreement: PriceAgreement = {
        id: "agreement-integration",
        customerId,
        productId,
        pricingType: "fixed",
        agreedValue: agreedPrice,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        defaultPrice / 12,
        [priceAgreement]
      );

      expect(priceResolution.cartonPrice).toBe(agreedPrice);
      expect(priceResolution.agreementId).toBe("agreement-integration");

      // Step 2: Customer Discount (applied on agreed price)
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-integration",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "percentage",
        discountValue: 8, // 8% discount
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        priceResolution.cartonPrice, // CRITICAL: Use agreed price
        "distributor",
        [customerDiscountRule]
      );

      expect(discountResolution.ruleId).toBe("discount-integration");

      // Step 3: Calculate final amount
      const baseAmount = numberOfCartons * priceResolution.cartonPrice; // 25 × 850 = 21,250
      const customerDiscountAmount = discountResolution.discountAmount; // 21,250 × 8% = 1,700
      const finalAmount = baseAmount - customerDiscountAmount; // 21,250 - 1,700 = 19,550

      expect(baseAmount).toBe(21250);
      expect(customerDiscountAmount).toBe(1700);
      expect(finalAmount).toBe(19550);

      // Verify: If discount was incorrectly calculated on default price
      const incorrectBaseAmount = numberOfCartons * defaultPrice; // 25 × 1000 = 25,000
      const incorrectDiscount = (incorrectBaseAmount * 8) / 100; // 2,000
      expect(customerDiscountAmount).not.toBe(incorrectDiscount);
    });

    it("should handle flat_discount agreement type with customer discount", () => {
      const customerId = "customer-flat";
      const productId = "product-flat";
      const defaultPrice = 1200;
      const flatDiscount = 150;
      const numberOfCartons = 30;

      // Price agreement with flat discount
      const priceAgreement: PriceAgreement = {
        id: "agreement-flat",
        customerId,
        productId,
        pricingType: "flat_discount",
        agreedValue: flatDiscount,
        tpBaseline: null,
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const priceResolution = resolvePrice(
        customerId,
        productId,
        12,
        12,
        defaultPrice / 12,
        [priceAgreement]
      );

      const expectedAgreedPrice = defaultPrice - flatDiscount; // 1200 - 150 = 1050
      expect(priceResolution.cartonPrice).toBe(expectedAgreedPrice);
      expect(priceResolution.agreementType).toBe("flat_discount");

      // Customer discount on the flat_discount price
      const customerDiscountRule: CustomerDiscountRule = {
        id: "discount-flat",
        customerId,
        productId,
        volumeThreshold: 25,
        discountType: "carton_equivalent",
        discountValue: 3, // 3 cartons worth
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        priceResolution.cartonPrice, // Use flat_discount price
        "wholesaler",
        [customerDiscountRule]
      );

      const expectedDiscount = 3 * expectedAgreedPrice; // 3 × 1050 = 3150
      expect(discountResolution.discountAmount).toBe(expectedDiscount);

      // Final calculation
      const baseAmount = numberOfCartons * priceResolution.cartonPrice; // 30 × 1050 = 31,500
      const finalAmount = baseAmount - discountResolution.discountAmount; // 31,500 - 3,150 = 28,350

      expect(baseAmount).toBe(31500);
      expect(finalAmount).toBe(28350);
    });
  });

  describe("Source code verification: invoices-fn.ts implementation", () => {
    it("should verify that createInvoiceFn uses finalPerCartonPrice for customer discount", async () => {
      // Read the source code to verify implementation
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const invoicesFnPath = path.join(process.cwd(), "src/server-functions/sales/invoices-fn.ts");
      const sourceCode = await fs.readFile(invoicesFnPath, "utf-8");

      // Verify that evaluateCustomerDiscount is called with finalPerCartonPrice
      expect(sourceCode).toContain("evaluateCustomerDiscount(");
      expect(sourceCode).toContain("finalPerCartonPrice");
      
      // Verify the correct parameter order: customerId, productId, numberOfCartons, finalPerCartonPrice
      const discountCallPattern = /evaluateCustomerDiscount\s*\(\s*customerId\s*,\s*stock\.recipe\.productId\s*,\s*item\.numberOfCartons\s*,\s*finalPerCartonPrice/;
      expect(sourceCode).toMatch(discountCallPattern);

      // Verify that price resolution happens BEFORE discount evaluation
      const priceResolutionIndex = sourceCode.indexOf("resolvePrice(");
      const discountEvaluationIndex = sourceCode.indexOf("evaluateCustomerDiscount(");
      expect(priceResolutionIndex).toBeGreaterThan(0);
      expect(discountEvaluationIndex).toBeGreaterThan(0);
      expect(priceResolutionIndex).toBeLessThan(discountEvaluationIndex);

      // Verify that both IDs are stored in invoice_items
      expect(sourceCode).toContain("priceAgreementId: r.agreementId");
      expect(sourceCode).toContain("customerDiscountRuleId: r.customerDiscountRuleId");
    });

    it("should verify that updateInvoiceFn also uses finalPerCartonPrice for customer discount", async () => {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const invoicesFnPath = path.join(process.cwd(), "src/server-functions/sales/invoices-fn.ts");
      const sourceCode = await fs.readFile(invoicesFnPath, "utf-8");

      // Find the updateInvoiceFn section
      const updateFnStart = sourceCode.indexOf("export const updateInvoiceFn");
      expect(updateFnStart).toBeGreaterThan(0);

      const updateFnCode = sourceCode.substring(updateFnStart);

      // Verify that updateInvoiceFn also uses finalPerCartonPrice
      expect(updateFnCode).toContain("evaluateCustomerDiscount(");
      expect(updateFnCode).toContain("finalPerCartonPrice");
      
      // Verify both IDs are stored in update flow
      expect(updateFnCode).toContain("priceAgreementId: r.agreementId");
      expect(updateFnCode).toContain("customerDiscountRuleId: r.customerDiscountRuleId");
    });
  });
});
