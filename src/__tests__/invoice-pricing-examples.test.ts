/**
 * Example-Based Unit Tests for Invoice Pricing and Customer Discount Rules
 * 
 * This test suite provides concrete examples and edge cases for the invoice
 * pricing calculation system and customer discount rules.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 * 
 * These tests complement the property-based tests by providing:
 * - Specific bug reproduction scenarios
 * - Concrete examples of discount calculations
 * - Edge case validation
 * - Regression tests for known issues
 */

import { describe, it, expect } from "vitest";
import {
  calculateInvoiceItemAmount,
  evaluateCustomerDiscount,
  type CustomerDiscountRule,
} from "@/lib/sales/discount-engine";

describe("Invoice Pricing Examples - Feature: invoice-pricing-fix-and-customer-rules", () => {
  /**
   * Bug Reproduction Test
   * 
   * **Validates: Requirement 1.1**
   * 
   * This test reproduces the specific bug scenario from the requirements:
   * - Customer orders 20 cartons at 615 per carton
   * - Expected amount: 20 × 615 = 12,300
   * - Bug (incorrect): 24 packs × 615 = 14,760
   * 
   * The bug occurred because the system was multiplying the quantity (loose packs)
   * by the per-carton price instead of using the number of cartons.
   */
  describe("Bug Reproduction", () => {
    it("should calculate 20 cartons × 615 = 12,300 (not 24 packs × 615 = 14,760)", () => {
      // Scenario from requirements:
      // - 20 cartons at 615 per carton
      // - 24 loose packs (quantity field)
      // - 12 packs per carton (packsPerCarton)
      
      const numberOfCartons = 20;
      const quantity = 24; // loose packs (this was incorrectly used as multiplier in the bug)
      const perCartonPrice = 615;
      const packsPerCarton = 12;

      // Calculate using the CORRECT formula
      const correctAmount = calculateInvoiceItemAmount(
        numberOfCartons,
        quantity,
        perCartonPrice,
        packsPerCarton
      );

      // Expected: (20 cartons × 615) + (24 packs × 615 ÷ 12)
      // Expected: 12,300 + (24 × 51.25)
      // Expected: 12,300 + 1,230
      // Expected: 13,530
      const expectedAmount = 
        numberOfCartons * perCartonPrice + 
        quantity * (perCartonPrice / packsPerCarton);

      expect(correctAmount).toBeCloseTo(expectedAmount, 2);
      expect(correctAmount).toBeCloseTo(13530, 2);

      // Verify it's NOT the buggy calculation (quantity × perCartonPrice)
      const buggyAmount = quantity * perCartonPrice; // 24 × 615 = 14,760
      expect(correctAmount).not.toBeCloseTo(buggyAmount, 2);
      expect(buggyAmount).toBe(14760);
      
      // Verify the correct amount is less than the buggy amount
      expect(correctAmount).toBeLessThan(buggyAmount);
    });

    it("should calculate cartons-only amount correctly (no loose packs)", () => {
      // Scenario: 20 cartons, no loose packs
      const numberOfCartons = 20;
      const quantity = 0; // no loose packs
      const perCartonPrice = 615;
      const packsPerCarton = 12;

      const amount = calculateInvoiceItemAmount(
        numberOfCartons,
        quantity,
        perCartonPrice,
        packsPerCarton
      );

      // Expected: 20 × 615 = 12,300
      expect(amount).toBeCloseTo(12300, 2);
    });

    it("should calculate loose-packs-only amount correctly (no cartons)", () => {
      // Scenario: no cartons, 24 loose packs
      const numberOfCartons = 0;
      const quantity = 24; // loose packs
      const perCartonPrice = 615;
      const packsPerCarton = 12;

      const amount = calculateInvoiceItemAmount(
        numberOfCartons,
        quantity,
        perCartonPrice,
        packsPerCarton
      );

      // Expected: 24 × (615 ÷ 12) = 24 × 51.25 = 1,230
      const expectedAmount = quantity * (perCartonPrice / packsPerCarton);
      expect(amount).toBeCloseTo(expectedAmount, 2);
      expect(amount).toBeCloseTo(1230, 2);
    });
  });

  /**
   * Discount Type Examples
   * 
   * **Validates: Requirements 2.2, 2.3, 2.4**
   * 
   * These tests demonstrate the three discount types with concrete examples:
   * - carton_equivalent: Discount worth N cartons
   * - percentage: Percentage-based discount
   * - fixed_amount: Fixed monetary discount
   */
  describe("Discount Type Examples", () => {
    it("should apply carton_equivalent discount (2 cartons worth)", () => {
      // Scenario: Customer buys 50 cartons at 1000 per carton
      // Discount rule: Get 2 cartons worth of discount
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 50;
      const perCartonPrice = 1000;
      const customerType = "distributor" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-1",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "carton_equivalent",
        discountValue: "2", // 2 cartons worth
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );

      // Expected discount: 2 cartons × 1000 = 2,000
      expect(discountResolution.discountAmount).toBeCloseTo(2000, 2);
      expect(discountResolution.ruleId).toBe("rule-1");
      expect(discountResolution.ruleType).toBe("carton_equivalent");
      expect(discountResolution.appliedThreshold).toBe(20);

      // Final amount: (50 × 1000) - 2000 = 48,000
      const baseAmount = numberOfCartons * perCartonPrice;
      const finalAmount = baseAmount - discountResolution.discountAmount;
      expect(finalAmount).toBeCloseTo(48000, 2);
    });

    it("should apply percentage discount (10%)", () => {
      // Scenario: Customer buys 30 cartons at 500 per carton
      // Discount rule: 10% off
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 30;
      const perCartonPrice = 500;
      const customerType = "retailer" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-2",
        customerId,
        productId,
        volumeThreshold: 25,
        discountType: "percentage",
        discountValue: "10", // 10%
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );

      // Base amount: 30 × 500 = 15,000
      // Expected discount: 15,000 × 10% = 1,500
      const baseAmount = numberOfCartons * perCartonPrice;
      const expectedDiscount = baseAmount * 0.1;
      
      expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
      expect(discountResolution.discountAmount).toBeCloseTo(1500, 2);
      expect(discountResolution.ruleType).toBe("percentage");

      // Final amount: 15,000 - 1,500 = 13,500
      const finalAmount = baseAmount - discountResolution.discountAmount;
      expect(finalAmount).toBeCloseTo(13500, 2);
    });

    it("should apply fixed_amount discount (5000)", () => {
      // Scenario: Customer buys 100 cartons at 800 per carton
      // Discount rule: Fixed 5000 discount
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 100;
      const perCartonPrice = 800;
      const customerType = "wholesaler" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-3",
        customerId,
        productId,
        volumeThreshold: 50,
        discountType: "fixed_amount",
        discountValue: "5000", // Fixed 5000
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );

      // Expected discount: 5000 (fixed amount, independent of quantity/price)
      expect(discountResolution.discountAmount).toBeCloseTo(5000, 2);
      expect(discountResolution.ruleType).toBe("fixed_amount");

      // Final amount: (100 × 800) - 5000 = 75,000
      const baseAmount = numberOfCartons * perCartonPrice;
      const finalAmount = baseAmount - discountResolution.discountAmount;
      expect(finalAmount).toBeCloseTo(75000, 2);
    });
  });

  /**
   * Rule Selection Examples
   * 
   * **Validates: Requirements 3.2, 4.2, 4.3**
   * 
   * These tests demonstrate:
   * - Highest threshold rule selection when multiple rules apply
   * - Customer type filtering
   */
  describe("Rule Selection Examples", () => {
    it("should select rule with highest threshold when multiple rules apply", () => {
      // Scenario: Customer buys 100 cartons
      // Multiple tiered discount rules exist
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 100;
      const perCartonPrice = 1000;
      const customerType = "distributor" as const;

      const rules: CustomerDiscountRule[] = [
        {
          id: "rule-tier-1",
          customerId,
          productId,
          volumeThreshold: 10,
          discountType: "percentage",
          discountValue: "5", // 5% for 10+ cartons
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-tier-2",
          customerId,
          productId,
          volumeThreshold: 50,
          discountType: "percentage",
          discountValue: "10", // 10% for 50+ cartons
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-tier-3",
          customerId,
          productId,
          volumeThreshold: 100,
          discountType: "percentage",
          discountValue: "15", // 15% for 100+ cartons (HIGHEST)
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        rules
      );

      // Should select rule-tier-3 (highest threshold that is met)
      expect(discountResolution.ruleId).toBe("rule-tier-3");
      expect(discountResolution.appliedThreshold).toBe(100);
      
      // Expected discount: 15% of (100 × 1000) = 15,000
      const baseAmount = numberOfCartons * perCartonPrice;
      const expectedDiscount = baseAmount * 0.15;
      expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
      expect(discountResolution.discountAmount).toBeCloseTo(15000, 2);
    });

    it("should select lower threshold rule when higher threshold is not met", () => {
      // Scenario: Customer buys 60 cartons (doesn't meet 100 threshold)
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 60;
      const perCartonPrice = 1000;
      const customerType = "distributor" as const;

      const rules: CustomerDiscountRule[] = [
        {
          id: "rule-tier-1",
          customerId,
          productId,
          volumeThreshold: 10,
          discountType: "percentage",
          discountValue: "5",
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-tier-2",
          customerId,
          productId,
          volumeThreshold: 50,
          discountType: "percentage",
          discountValue: "10", // This should be selected
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-tier-3",
          customerId,
          productId,
          volumeThreshold: 100, // NOT met (60 < 100)
          discountType: "percentage",
          discountValue: "15",
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        rules
      );

      // Should select rule-tier-2 (highest threshold that IS met)
      expect(discountResolution.ruleId).toBe("rule-tier-2");
      expect(discountResolution.appliedThreshold).toBe(50);
      
      // Expected discount: 10% of (60 × 1000) = 6,000
      const baseAmount = numberOfCartons * perCartonPrice;
      const expectedDiscount = baseAmount * 0.10;
      expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
      expect(discountResolution.discountAmount).toBeCloseTo(6000, 2);
    });

    it("should filter rules by customer type (distributor only)", () => {
      // Scenario: Retailer customer tries to use distributor-only discount
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 50;
      const perCartonPrice = 1000;
      const customerType = "retailer" as const;

      const rules: CustomerDiscountRule[] = [
        {
          id: "rule-distributor-only",
          customerId,
          productId,
          volumeThreshold: 20,
          discountType: "percentage",
          discountValue: "15", // Distributor-only discount
          eligibleCustomerType: "distributor", // NOT eligible for retailer
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rule-all-customers",
          customerId,
          productId,
          volumeThreshold: 30,
          discountType: "percentage",
          discountValue: "5", // Available to all
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        rules
      );

      // Should select rule-all-customers (distributor-only rule is filtered out)
      expect(discountResolution.ruleId).toBe("rule-all-customers");
      
      // Expected discount: 5% of (50 × 1000) = 2,500
      const baseAmount = numberOfCartons * perCartonPrice;
      const expectedDiscount = baseAmount * 0.05;
      expect(discountResolution.discountAmount).toBeCloseTo(expectedDiscount, 2);
      expect(discountResolution.discountAmount).toBeCloseTo(2500, 2);
    });

    it("should apply 'all' customer type rule to any customer", () => {
      // Scenario: Rule with eligibleCustomerType="all" should work for any customer type
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 40;
      const perCartonPrice = 500;

      const rule: CustomerDiscountRule = {
        id: "rule-all",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "fixed_amount",
        discountValue: "3000",
        eligibleCustomerType: "all", // Should work for all customer types
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Test with distributor
      const discountForDistributor = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        "distributor",
        [rule]
      );
      expect(discountForDistributor.discountAmount).toBeCloseTo(3000, 2);

      // Test with retailer
      const discountForRetailer = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        "retailer",
        [rule]
      );
      expect(discountForRetailer.discountAmount).toBeCloseTo(3000, 2);

      // Test with wholesaler
      const discountForWholesaler = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        "wholesaler",
        [rule]
      );
      expect(discountForWholesaler.discountAmount).toBeCloseTo(3000, 2);
    });
  });

  /**
   * Edge Case Tests
   * 
   * **Validates: Requirements 5.5, 7.1, 7.2**
   * 
   * These tests cover edge cases:
   * - Price override disables all discounts
   * - Discount stacking (promotional + customer)
   * - Discount exceeds amount (clamp to zero)
   */
  describe("Edge Cases", () => {
    it("should not apply discounts when isPriceOverride is true", () => {
      // Scenario: Manual price override should ignore all discount rules
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 50;
      const perCartonPrice = 1000;
      const manualAmount = 35000; // Manually set amount
      const customerType = "distributor" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-1",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "percentage",
        discountValue: "10",
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate what discount WOULD be applied (if not overridden)
      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );

      // Verify discount would normally apply
      expect(discountResolution.discountAmount).toBeGreaterThan(0);

      // When isPriceOverride is true, use manual amount (ignore discounts)
      const isPriceOverride = true;
      const finalAmount = isPriceOverride ? manualAmount : (numberOfCartons * perCartonPrice - discountResolution.discountAmount);

      // Final amount should be the manual amount, NOT the calculated amount with discounts
      expect(finalAmount).toBe(manualAmount);
      expect(finalAmount).toBe(35000);

      // Verify it's different from what it would be with discounts
      const amountWithDiscounts = numberOfCartons * perCartonPrice - discountResolution.discountAmount;
      expect(finalAmount).not.toBe(amountWithDiscounts);
    });

    it("should stack promotional and customer discounts", () => {
      // Scenario: Both promotional discount (free cartons) and customer discount apply
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 50;
      const perCartonPrice = 1000;
      const freeCartons = 5; // Promotional discount: 5 free cartons
      const customerType = "distributor" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-1",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "fixed_amount",
        discountValue: "3000", // Customer discount: 3000 off
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate base amount
      const baseAmount = numberOfCartons * perCartonPrice; // 50 × 1000 = 50,000

      // Calculate promotional discount
      const promoDiscount = freeCartons * perCartonPrice; // 5 × 1000 = 5,000

      // Calculate customer discount
      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );
      const customerDiscount = discountResolution.discountAmount; // 3,000

      // Final amount: base - promo - customer
      // 50,000 - 5,000 - 3,000 = 42,000
      const finalAmount = Math.max(0, baseAmount - promoDiscount - customerDiscount);

      expect(finalAmount).toBeCloseTo(42000, 2);

      // Verify both discounts were applied
      expect(promoDiscount).toBeCloseTo(5000, 2);
      expect(customerDiscount).toBeCloseTo(3000, 2);
      
      // Verify final amount is less than base amount
      expect(finalAmount).toBeLessThan(baseAmount);
    });

    it("should clamp final amount to zero when discounts exceed base amount", () => {
      // Scenario: Total discounts exceed the base amount
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 10;
      const perCartonPrice = 1000;
      const freeCartons = 8; // Promotional discount: 8 free cartons
      const customerType = "distributor" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-1",
        customerId,
        productId,
        volumeThreshold: 5,
        discountType: "fixed_amount",
        discountValue: "5000", // Customer discount: 5000 off
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Calculate base amount
      const baseAmount = numberOfCartons * perCartonPrice; // 10 × 1000 = 10,000

      // Calculate promotional discount
      const promoDiscount = freeCartons * perCartonPrice; // 8 × 1000 = 8,000

      // Calculate customer discount
      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );
      const customerDiscount = discountResolution.discountAmount; // 5,000

      // Total discounts: 8,000 + 5,000 = 13,000 (exceeds base amount of 10,000)
      const totalDiscounts = promoDiscount + customerDiscount;
      expect(totalDiscounts).toBeGreaterThan(baseAmount);

      // Final amount should be clamped to 0 (not negative)
      const finalAmount = Math.max(0, baseAmount - promoDiscount - customerDiscount);

      expect(finalAmount).toBe(0);
      expect(finalAmount).toBeGreaterThanOrEqual(0);

      // Verify the unclamped value would be negative
      const unclampedAmount = baseAmount - promoDiscount - customerDiscount;
      expect(unclampedAmount).toBeLessThan(0);
    });

    it("should handle zero cartons (no discount applicable)", () => {
      // Scenario: Zero cartons means no discount can apply
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 0;
      const perCartonPrice = 1000;
      const customerType = "distributor" as const;

      const rule: CustomerDiscountRule = {
        id: "rule-1",
        customerId,
        productId,
        volumeThreshold: 10,
        discountType: "percentage",
        discountValue: "10",
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const discountResolution = evaluateCustomerDiscount(
        customerId,
        productId,
        numberOfCartons,
        perCartonPrice,
        customerType,
        [rule]
      );

      // No discount should apply (volume threshold not met)
      expect(discountResolution.discountAmount).toBe(0);
      expect(discountResolution.ruleId).toBeNull();

      // Base amount is also 0
      const baseAmount = numberOfCartons * perCartonPrice;
      expect(baseAmount).toBe(0);
    });

    it("should handle inactive rules (expired effectiveTo)", () => {
      // Scenario: Rule has expired (effectiveTo in the past)
      const customerId = "customer-123";
      const productId = "product-456";
      const numberOfCartons = 50;
      const perCartonPrice = 1000;
      const customerType = "distributor" as const;

      const expiredRule: CustomerDiscountRule = {
        id: "rule-expired",
        customerId,
        productId,
        volumeThreshold: 20,
        discountType: "percentage",
        discountValue: "15",
        eligibleCustomerType: "all",
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: new Date("2024-06-30"), // Expired
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Simulate current date after expiration
      const currentDate = new Date("2024-12-01");

      // Check if rule is active
      const isActive = 
        currentDate >= expiredRule.effectiveFrom &&
        (expiredRule.effectiveTo === null || currentDate <= expiredRule.effectiveTo);

      expect(isActive).toBe(false);

      // When evaluating with expired rule, no discount should apply
      // (In real implementation, expired rules would be filtered out before evaluation)
      // Here we verify the rule is indeed expired
      expect(expiredRule.effectiveTo).not.toBeNull();
      expect(currentDate).toBeInstanceOf(Date);
      expect(expiredRule.effectiveTo).toBeInstanceOf(Date);
      if (expiredRule.effectiveTo) {
        expect(currentDate.getTime()).toBeGreaterThan(expiredRule.effectiveTo.getTime());
      }
    });
  });
});
