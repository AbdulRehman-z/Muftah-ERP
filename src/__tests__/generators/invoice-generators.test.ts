/**
 * Test: Invoice Generators
 * 
 * Verifies that the invoice test data generators produce valid data
 * for property-based testing.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  invoiceItemArbitrary,
  customerDiscountRuleArbitrary,
  customerDiscountRuleWithTypeArbitrary,
  activeCustomerDiscountRuleArbitrary,
  inactiveCustomerDiscountRuleArbitrary,
  tieredDiscountRulesArbitrary,
} from "./invoice-generators";

describe("Invoice Generators", () => {
  describe("invoiceItemArbitrary", () => {
    it("generates valid invoice item data", () => {
      fc.assert(
        fc.property(invoiceItemArbitrary, (item) => {
          expect(item.numberOfCartons).toBeGreaterThanOrEqual(0);
          expect(item.numberOfCartons).toBeLessThanOrEqual(1000);
          expect(item.quantity).toBeGreaterThanOrEqual(0);
          expect(item.quantity).toBeLessThanOrEqual(100);
          expect(item.perCartonPrice).toBeGreaterThanOrEqual(1);
          expect(item.perCartonPrice).toBeLessThanOrEqual(10000);
          expect(item.packsPerCarton).toBeGreaterThanOrEqual(1);
          expect(item.packsPerCarton).toBeLessThanOrEqual(50);
          expect(item.discountCartons).toBeGreaterThanOrEqual(0);
          expect(item.discountCartons).toBeLessThanOrEqual(50);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("customerDiscountRuleArbitrary", () => {
    it("generates valid customer discount rules", () => {
      fc.assert(
        fc.property(customerDiscountRuleArbitrary, (rule) => {
          expect(rule.id).toBeTruthy();
          expect(rule.customerId).toBeTruthy();
          expect(rule.productId).toBeTruthy();
          expect(rule.volumeThreshold).toBeGreaterThanOrEqual(1);
          expect(rule.volumeThreshold).toBeLessThanOrEqual(1000);
          expect(["carton_equivalent", "percentage", "fixed_amount"]).toContain(
            rule.discountType
          );
          expect(["distributor", "retailer", "wholesaler", "all"]).toContain(
            rule.eligibleCustomerType
          );
          expect(rule.effectiveFrom).toBeInstanceOf(Date);
          if (rule.effectiveTo !== null) {
            expect(rule.effectiveTo).toBeInstanceOf(Date);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("generates appropriate discountValue based on discountType", () => {
      fc.assert(
        fc.property(customerDiscountRuleArbitrary, (rule) => {
          const value = Number(rule.discountValue);
          
          if (rule.discountType === "percentage") {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
          } else if (rule.discountType === "carton_equivalent") {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(50);
          } else if (rule.discountType === "fixed_amount") {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(5000);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("customerDiscountRuleWithTypeArbitrary", () => {
    it("generates rules with the specified discount type", () => {
      fc.assert(
        fc.property(
          customerDiscountRuleWithTypeArbitrary("percentage"),
          (rule) => {
            expect(rule.discountType).toBe("percentage");
            const value = Number(rule.discountValue);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 50 }
      );

      fc.assert(
        fc.property(
          customerDiscountRuleWithTypeArbitrary("carton_equivalent"),
          (rule) => {
            expect(rule.discountType).toBe("carton_equivalent");
            const value = Number(rule.discountValue);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 50 }
      );

      fc.assert(
        fc.property(
          customerDiscountRuleWithTypeArbitrary("fixed_amount"),
          (rule) => {
            expect(rule.discountType).toBe("fixed_amount");
            const value = Number(rule.discountValue);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(5000);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe("activeCustomerDiscountRuleArbitrary", () => {
    it("generates only active rules", () => {
      fc.assert(
        fc.property(activeCustomerDiscountRuleArbitrary, (rule) => {
          const now = new Date();
          expect(rule.effectiveFrom.getTime()).toBeLessThanOrEqual(now.getTime());
          if (rule.effectiveTo !== null) {
            expect(rule.effectiveTo.getTime()).toBeGreaterThanOrEqual(now.getTime());
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("inactiveCustomerDiscountRuleArbitrary", () => {
    it("generates only inactive rules", () => {
      fc.assert(
        fc.property(inactiveCustomerDiscountRuleArbitrary, (rule) => {
          const now = new Date();
          const isInactive =
            rule.effectiveFrom.getTime() > now.getTime() ||
            (rule.effectiveTo !== null && rule.effectiveTo.getTime() < now.getTime());
          expect(isInactive).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("tieredDiscountRulesArbitrary", () => {
    it("generates multiple rules with different volume thresholds", () => {
      const customerId = "test-customer-id";
      const productId = "test-product-id";

      fc.assert(
        fc.property(
          tieredDiscountRulesArbitrary(customerId, productId),
          (rules) => {
            expect(rules.length).toBeGreaterThanOrEqual(2);
            expect(rules.length).toBeLessThanOrEqual(5);

            // All rules should have the same customer and product
            rules.forEach((rule) => {
              expect(rule.customerId).toBe(customerId);
              expect(rule.productId).toBe(productId);
            });

            // All volume thresholds should be unique
            const thresholds = rules.map((r) => r.volumeThreshold);
            const uniqueThresholds = new Set(thresholds);
            expect(uniqueThresholds.size).toBe(thresholds.length);

            // Thresholds should be in ascending order
            for (let i = 1; i < thresholds.length; i++) {
              expect(thresholds[i]).toBeGreaterThan(thresholds[i - 1]);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
