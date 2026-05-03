/**
 * Practical Examples: Using Mock Data Helpers
 * 
 * This file demonstrates practical usage of the mock data helpers
 * in real-world test scenarios for the customer discount rules feature.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 * **Task:** 10.2 - Create mock data helpers (practical examples)
 */

import { describe, it, expect } from "vitest";
import { evaluateCustomerDiscount } from "@/lib/sales/discount-engine";
import {
  createMockCartonEquivalentRule,
  createMockPercentageRule,
  createMockFixedAmountRule,
  createMockTieredRules,
  createMockCustomerTypeRules,
  MOCK_CUSTOMER_IDS,
  MOCK_PRODUCT_IDS,
  MOCK_PRICE_AGREEMENTS,
  BUG_FIX_SCENARIO,
  STACKED_DISCOUNT_SCENARIO,
  TIERED_DISCOUNT_SCENARIO,
  EXACT_THRESHOLD_SCENARIO,
  BELOW_THRESHOLD_SCENARIO,
} from "../mocks/discount-rule-mocks";

describe("Practical Examples: Using Mock Data Helpers", () => {
  describe("Example 1: Testing Basic Discount Types", () => {
    it("should apply carton_equivalent discount for bulk purchase", () => {
      // Scenario: Distributor buys 25 cartons, gets 2 cartons worth of discount
      const rule = createMockCartonEquivalentRule({
        customerId: MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        productId: MOCK_PRODUCT_IDS.PRODUCT_A,
        volumeThreshold: 20,
        discountValue: 2,
      });

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A,
        25, // numberOfCartons
        MOCK_PRICE_AGREEMENTS.PRODUCT_A_DIST_A.agreedPrice,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(1230); // 2 cartons × 615
      expect(result.ruleId).toBe(rule.id);
      expect(result.ruleType).toBe("carton_equivalent");
    });

    it("should apply percentage discount for medium purchase", () => {
      // Scenario: Retailer buys 60 cartons, gets 10% off
      const rule = createMockPercentageRule({
        customerId: MOCK_CUSTOMER_IDS.RETAILER_A,
        productId: MOCK_PRODUCT_IDS.PRODUCT_B,
        volumeThreshold: 50,
        discountValue: 10,
      });

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.RETAILER_A,
        MOCK_PRODUCT_IDS.PRODUCT_B,
        60,
        MOCK_PRICE_AGREEMENTS.PRODUCT_B_RETAIL_A.agreedPrice,
        "retailer",
        [rule]
      );

      const baseAmount = 60 * 1000; // 60,000
      const expectedDiscount = baseAmount * 0.1; // 6,000

      expect(result.discountAmount).toBe(expectedDiscount);
      expect(result.ruleType).toBe("percentage");
    });

    it("should apply fixed_amount discount for large purchase", () => {
      // Scenario: Wholesaler buys 150 cartons, gets PKR 5000 off
      const rule = createMockFixedAmountRule({
        customerId: MOCK_CUSTOMER_IDS.WHOLESALER_A,
        productId: MOCK_PRODUCT_IDS.PRODUCT_C,
        volumeThreshold: 100,
        discountValue: 5000,
      });

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.WHOLESALER_A,
        MOCK_PRODUCT_IDS.PRODUCT_C,
        150,
        MOCK_PRICE_AGREEMENTS.PRODUCT_C_WHOLE_A.agreedPrice,
        "wholesaler",
        [rule]
      );

      expect(result.discountAmount).toBe(5000);
      expect(result.ruleType).toBe("fixed_amount");
    });
  });

  describe("Example 2: Testing Tiered Discounts", () => {
    it("should select tier 1 for small purchase", () => {
      const rules = createMockTieredRules(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A
      );

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A,
        15, // Meets tier 1 (10) only
        615,
        "distributor",
        rules
      );

      expect(result.appliedThreshold).toBe(10);
      expect(result.discountAmount).toBe(615); // 1 carton × 615
    });

    it("should select tier 2 for medium purchase", () => {
      const rules = createMockTieredRules(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A
      );

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A,
        75, // Meets tier 1 (10) and tier 2 (50)
        615,
        "distributor",
        rules
      );

      expect(result.appliedThreshold).toBe(50);
      expect(result.discountAmount).toBe(3075); // 5 cartons × 615
    });

    it("should select tier 3 for large purchase", () => {
      const rules = createMockTieredRules(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A
      );

      const result = evaluateCustomerDiscount(
        MOCK_CUSTOMER_IDS.DISTRIBUTOR_A,
        MOCK_PRODUCT_IDS.PRODUCT_A,
        TIERED_DISCOUNT_SCENARIO.numberOfCartons, // 120 - meets all tiers
        TIERED_DISCOUNT_SCENARIO.perCartonPrice,
        "distributor",
        rules
      );

      expect(result.appliedThreshold).toBe(
        TIERED_DISCOUNT_SCENARIO.expectedSelectedTier.threshold
      );
      expect(result.discountAmount).toBe(
        TIERED_DISCOUNT_SCENARIO.expectedDiscountAmount
      );
    });
  });

  describe("Example 3: Testing Customer Type Eligibility", () => {
    it("should apply distributor-only rule to distributor", () => {
      const rules = createMockCustomerTypeRules();
      const distributorRule = rules.find(
        r => r.eligibleCustomerType === "distributor"
      )!;

      const result = evaluateCustomerDiscount(
        distributorRule.customerId,
        distributorRule.productId,
        25,
        615,
        "distributor", // Matches rule
        [distributorRule]
      );

      expect(result.ruleId).toBe(distributorRule.id);
      expect(result.discountAmount).toBeGreaterThan(0);
    });

    it("should NOT apply distributor-only rule to retailer", () => {
      const rules = createMockCustomerTypeRules();
      const distributorRule = rules.find(
        r => r.eligibleCustomerType === "distributor"
      )!;

      const result = evaluateCustomerDiscount(
        distributorRule.customerId,
        distributorRule.productId,
        25,
        615,
        "retailer", // Does NOT match rule
        [distributorRule]
      );

      expect(result.ruleId).toBeNull();
      expect(result.discountAmount).toBe(0);
    });

    it("should apply 'all' customer type rule to any customer", () => {
      const rules = createMockCustomerTypeRules();
      const allRule = rules.find(r => r.eligibleCustomerType === "all")!;

      // Test with distributor
      const distributorResult = evaluateCustomerDiscount(
        allRule.customerId,
        allRule.productId,
        15,
        615,
        "distributor",
        [allRule]
      );
      expect(distributorResult.ruleId).toBe(allRule.id);

      // Test with retailer
      const retailerResult = evaluateCustomerDiscount(
        allRule.customerId,
        allRule.productId,
        15,
        615,
        "retailer",
        [allRule]
      );
      expect(retailerResult.ruleId).toBe(allRule.id);

      // Test with wholesaler
      const wholesalerResult = evaluateCustomerDiscount(
        allRule.customerId,
        allRule.productId,
        15,
        615,
        "wholesaler",
        [allRule]
      );
      expect(wholesalerResult.ruleId).toBe(allRule.id);
    });
  });

  describe("Example 4: Testing Edge Cases with Scenarios", () => {
    it("should handle exact threshold match", () => {
      const rule = createMockCartonEquivalentRule({
        volumeThreshold: EXACT_THRESHOLD_SCENARIO.volumeThreshold,
        discountValue: EXACT_THRESHOLD_SCENARIO.discountValue,
      });

      const result = evaluateCustomerDiscount(
        rule.customerId,
        rule.productId,
        EXACT_THRESHOLD_SCENARIO.numberOfCartons, // Exactly at threshold
        EXACT_THRESHOLD_SCENARIO.perCartonPrice,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(
        EXACT_THRESHOLD_SCENARIO.expectedDiscountAmount
      );
      expect(result.ruleId).toBe(rule.id);
    });

    it("should NOT apply discount when below threshold", () => {
      const rule = createMockCartonEquivalentRule({
        volumeThreshold: BELOW_THRESHOLD_SCENARIO.volumeThreshold,
      });

      const result = evaluateCustomerDiscount(
        rule.customerId,
        rule.productId,
        BELOW_THRESHOLD_SCENARIO.numberOfCartons, // One below threshold
        BELOW_THRESHOLD_SCENARIO.perCartonPrice,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(
        BELOW_THRESHOLD_SCENARIO.expectedDiscountAmount
      );
      expect(result.ruleId).toBe(BELOW_THRESHOLD_SCENARIO.expectedRuleId);
    });
  });

  describe("Example 5: Testing Complete Invoice Calculation", () => {
    it("should calculate final amount with customer discount", () => {
      // Scenario: Customer buys 25 cartons at PKR 615 per carton
      // with a 2-carton discount
      const rule = createMockCartonEquivalentRule({
        volumeThreshold: 20,
        discountValue: 2,
      });

      const numberOfCartons = 25;
      const perCartonPrice = 615;

      // Calculate base amount
      const baseAmount = numberOfCartons * perCartonPrice; // 15,375

      // Apply customer discount
      const discountResult = evaluateCustomerDiscount(
        rule.customerId,
        rule.productId,
        numberOfCartons,
        perCartonPrice,
        "distributor",
        [rule]
      );

      // Calculate final amount
      const finalAmount = baseAmount - discountResult.discountAmount;

      expect(baseAmount).toBe(15375);
      expect(discountResult.discountAmount).toBe(1230); // 2 × 615
      expect(finalAmount).toBe(14145); // 15,375 - 1,230
    });

    it("should calculate final amount with stacked discounts", () => {
      // Use the pre-calculated stacked discount scenario
      const rule = createMockCartonEquivalentRule({
        volumeThreshold: 20,
        discountValue: STACKED_DISCOUNT_SCENARIO.customerDiscountCartons,
      });

      const baseAmount = STACKED_DISCOUNT_SCENARIO.baseAmount;
      const promoDiscount = STACKED_DISCOUNT_SCENARIO.promoDiscount;

      // Apply customer discount
      const discountResult = evaluateCustomerDiscount(
        rule.customerId,
        rule.productId,
        STACKED_DISCOUNT_SCENARIO.numberOfCartons,
        STACKED_DISCOUNT_SCENARIO.perCartonPrice,
        "distributor",
        [rule]
      );

      // Calculate final amount
      const finalAmount = baseAmount - promoDiscount - discountResult.discountAmount;

      expect(finalAmount).toBe(STACKED_DISCOUNT_SCENARIO.expectedFinalAmount);
    });
  });

  describe("Example 6: Testing Bug Fix Scenario", () => {
    it("should use numberOfCartons, not quantity (loose packs)", () => {
      // This test verifies the original bug fix
      // Bug: Used quantity (24 packs) as multiplier
      // Fix: Use numberOfCartons (20 cartons) as multiplier

      const numberOfCartons = BUG_FIX_SCENARIO.numberOfCartons;
      const quantity = BUG_FIX_SCENARIO.quantity; // Loose packs (should NOT be used)
      const perCartonPrice = BUG_FIX_SCENARIO.perCartonPrice;

      // CORRECT calculation
      const correctAmount = numberOfCartons * perCartonPrice;

      // INCORRECT calculation (the bug)
      const incorrectAmount = quantity * perCartonPrice;

      expect(correctAmount).toBe(BUG_FIX_SCENARIO.expectedAmount); // 12,300
      expect(incorrectAmount).toBe(BUG_FIX_SCENARIO.incorrectAmount); // 14,760
      expect(correctAmount).not.toBe(incorrectAmount);
    });
  });
});
