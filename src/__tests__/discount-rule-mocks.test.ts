/**
 * Unit Tests for Mock Data Helpers
 * 
 * This test file demonstrates how to use the mock data helpers
 * for testing customer discount rules functionality.
 * 
 * **Feature:** invoice-pricing-fix-and-customer-rules
 * **Task:** 10.2 - Create mock data helpers (verification)
 */

import { describe, it, expect } from "vitest";
import {
  createMockCartonEquivalentRule,
  createMockPercentageRule,
  createMockFixedAmountRule,
  createMockInactiveRule,
  createMockFutureRule,
  createMockTieredRules,
  createMockTieredPercentageRules,
  createMockCustomerTypeRules,
  createMockRuleSet,
  MOCK_CUSTOMER_IDS,
  MOCK_PRODUCT_IDS,
  MOCK_PRICE_AGREEMENTS,
  MOCK_PROMOTIONAL_RULES,
  BUG_FIX_SCENARIO,
  STACKED_DISCOUNT_SCENARIO,
  TIERED_DISCOUNT_SCENARIO,
  CUSTOMER_TYPE_SCENARIO,
  EXCESSIVE_DISCOUNT_SCENARIO,
  ZERO_CARTONS_SCENARIO,
  EXACT_THRESHOLD_SCENARIO,
  BELOW_THRESHOLD_SCENARIO,
} from "./mocks/discount-rule-mocks";

describe("Mock Data Helpers - Structure Validation", () => {
  describe("Individual Rule Creators", () => {
    it("should create a valid carton_equivalent rule", () => {
      const rule = createMockCartonEquivalentRule();

      expect(rule.id).toBe("rule-carton-equiv-1");
      expect(rule.discountType).toBe("carton_equivalent");
      expect(rule.discountValue).toBe(2);
      expect(rule.volumeThreshold).toBe(20);
      expect(rule.eligibleCustomerType).toBe("all");
      expect(rule.effectiveTo).toBeNull();
    });

    it("should create a valid percentage rule", () => {
      const rule = createMockPercentageRule();

      expect(rule.id).toBe("rule-percentage-1");
      expect(rule.discountType).toBe("percentage");
      expect(rule.discountValue).toBe(10);
      expect(rule.volumeThreshold).toBe(50);
      expect(rule.eligibleCustomerType).toBe("retailer");
    });

    it("should create a valid fixed_amount rule", () => {
      const rule = createMockFixedAmountRule();

      expect(rule.id).toBe("rule-fixed-1");
      expect(rule.discountType).toBe("fixed_amount");
      expect(rule.discountValue).toBe(5000);
      expect(rule.volumeThreshold).toBe(100);
      expect(rule.eligibleCustomerType).toBe("wholesaler");
    });

    it("should create an inactive (expired) rule", () => {
      const rule = createMockInactiveRule();

      expect(rule.effectiveTo).not.toBeNull();
      expect(rule.effectiveTo!.getTime()).toBeLessThan(Date.now());
    });

    it("should create a future (not yet active) rule", () => {
      const rule = createMockFutureRule();

      expect(rule.effectiveFrom.getTime()).toBeGreaterThan(Date.now());
    });

    it("should allow overriding default values", () => {
      const rule = createMockCartonEquivalentRule({
        id: "custom-id",
        volumeThreshold: 100,
        discountValue: 10,
      });

      expect(rule.id).toBe("custom-id");
      expect(rule.volumeThreshold).toBe(100);
      expect(rule.discountValue).toBe(10);
      // Other fields should retain defaults
      expect(rule.discountType).toBe("carton_equivalent");
    });
  });

  describe("Tiered Rule Creators", () => {
    it("should create tiered carton_equivalent rules", () => {
      const rules = createMockTieredRules();

      expect(rules).toHaveLength(3);
      expect(rules[0].volumeThreshold).toBe(10);
      expect(rules[1].volumeThreshold).toBe(50);
      expect(rules[2].volumeThreshold).toBe(100);

      // All should be for the same customer and product
      const customerId = rules[0].customerId;
      const productId = rules[0].productId;
      expect(rules.every(r => r.customerId === customerId)).toBe(true);
      expect(rules.every(r => r.productId === productId)).toBe(true);
    });

    it("should create tiered percentage rules", () => {
      const rules = createMockTieredPercentageRules();

      expect(rules).toHaveLength(3);
      expect(rules[0].discountValue).toBe(5);
      expect(rules[1].discountValue).toBe(10);
      expect(rules[2].discountValue).toBe(15);

      // All should be percentage type
      expect(rules.every(r => r.discountType === "percentage")).toBe(true);
    });

    it("should allow custom customer and product IDs for tiered rules", () => {
      const customerId = "custom-customer";
      const productId = "custom-product";
      const rules = createMockTieredRules(customerId, productId);

      expect(rules.every(r => r.customerId === customerId)).toBe(true);
      expect(rules.every(r => r.productId === productId)).toBe(true);
    });
  });

  describe("Customer Type Rules", () => {
    it("should create rules for all customer types", () => {
      const rules = createMockCustomerTypeRules();

      const types = rules.map(r => r.eligibleCustomerType);
      expect(types).toContain("distributor");
      expect(types).toContain("retailer");
      expect(types).toContain("wholesaler");
      expect(types).toContain("all");
    });

    it("should create rules with different discount types", () => {
      const rules = createMockCustomerTypeRules();

      const discountTypes = rules.map(r => r.discountType);
      expect(discountTypes).toContain("carton_equivalent");
      expect(discountTypes).toContain("percentage");
      expect(discountTypes).toContain("fixed_amount");
    });
  });

  describe("Comprehensive Rule Set", () => {
    it("should create a comprehensive set of rules", () => {
      const rules = createMockRuleSet();

      expect(rules.length).toBeGreaterThan(10);

      // Should include all discount types
      const discountTypes = new Set(rules.map(r => r.discountType));
      expect(discountTypes.has("carton_equivalent")).toBe(true);
      expect(discountTypes.has("percentage")).toBe(true);
      expect(discountTypes.has("fixed_amount")).toBe(true);

      // Should include all customer types
      const customerTypes = new Set(rules.map(r => r.eligibleCustomerType));
      expect(customerTypes.has("distributor")).toBe(true);
      expect(customerTypes.has("retailer")).toBe(true);
      expect(customerTypes.has("wholesaler")).toBe(true);
      expect(customerTypes.has("all")).toBe(true);
    });
  });
});

describe("Mock Data Helpers - Constants", () => {
  it("should provide mock customer IDs", () => {
    expect(MOCK_CUSTOMER_IDS.DISTRIBUTOR_A).toBe("customer-dist-a");
    expect(MOCK_CUSTOMER_IDS.RETAILER_A).toBe("customer-retail-a");
    expect(MOCK_CUSTOMER_IDS.WHOLESALER_A).toBe("customer-whole-a");
  });

  it("should provide mock product IDs", () => {
    expect(MOCK_PRODUCT_IDS.PRODUCT_A).toBe("product-a");
    expect(MOCK_PRODUCT_IDS.PRODUCT_B).toBe("product-b");
    expect(MOCK_PRODUCT_IDS.PRODUCT_C).toBe("product-c");
  });

  it("should provide mock price agreements", () => {
    expect(MOCK_PRICE_AGREEMENTS.PRODUCT_A_DIST_A.agreedPrice).toBe(615);
    expect(MOCK_PRICE_AGREEMENTS.PRODUCT_B_RETAIL_A.agreedPrice).toBe(1000);
    expect(MOCK_PRICE_AGREEMENTS.PRODUCT_C_WHOLE_A.agreedPrice).toBe(850);
  });

  it("should provide mock promotional rules", () => {
    expect(MOCK_PROMOTIONAL_RULES.BUY_20_GET_2_FREE.buyQuantity).toBe(20);
    expect(MOCK_PROMOTIONAL_RULES.BUY_20_GET_2_FREE.freeQuantity).toBe(2);
  });
});

describe("Mock Data Helpers - Test Scenarios", () => {
  it("should provide bug fix scenario data", () => {
    expect(BUG_FIX_SCENARIO.numberOfCartons).toBe(20);
    expect(BUG_FIX_SCENARIO.quantity).toBe(24);
    expect(BUG_FIX_SCENARIO.perCartonPrice).toBe(615);
    expect(BUG_FIX_SCENARIO.expectedAmount).toBe(12300);
    expect(BUG_FIX_SCENARIO.incorrectAmount).toBe(14760);
  });

  it("should provide stacked discount scenario data", () => {
    expect(STACKED_DISCOUNT_SCENARIO.baseAmount).toBe(15375);
    expect(STACKED_DISCOUNT_SCENARIO.promoDiscount).toBe(1230);
    expect(STACKED_DISCOUNT_SCENARIO.customerDiscount).toBe(1230);
    expect(STACKED_DISCOUNT_SCENARIO.expectedFinalAmount).toBe(12915);
  });

  it("should provide tiered discount scenario data", () => {
    expect(TIERED_DISCOUNT_SCENARIO.numberOfCartons).toBe(120);
    expect(TIERED_DISCOUNT_SCENARIO.applicableTiers).toHaveLength(3);
    expect(TIERED_DISCOUNT_SCENARIO.expectedSelectedTier.threshold).toBe(100);
    expect(TIERED_DISCOUNT_SCENARIO.expectedDiscountAmount).toBe(7380);
  });

  it("should provide customer type scenario data", () => {
    expect(CUSTOMER_TYPE_SCENARIO.customerType).toBe("retailer");
    expect(CUSTOMER_TYPE_SCENARIO.eligibleRules).toHaveLength(2);
    expect(CUSTOMER_TYPE_SCENARIO.ineligibleRules).toHaveLength(2);
  });

  it("should provide excessive discount scenario data", () => {
    expect(EXCESSIVE_DISCOUNT_SCENARIO.baseAmount).toBe(500);
    expect(EXCESSIVE_DISCOUNT_SCENARIO.fixedDiscount).toBe(1000);
    expect(EXCESSIVE_DISCOUNT_SCENARIO.expectedFinalAmount).toBe(0);
  });

  it("should provide zero cartons scenario data", () => {
    expect(ZERO_CARTONS_SCENARIO.numberOfCartons).toBe(0);
    expect(ZERO_CARTONS_SCENARIO.expectedDiscountAmount).toBe(0);
    expect(ZERO_CARTONS_SCENARIO.expectedRuleId).toBeNull();
  });

  it("should provide exact threshold scenario data", () => {
    expect(EXACT_THRESHOLD_SCENARIO.numberOfCartons).toBe(20);
    expect(EXACT_THRESHOLD_SCENARIO.volumeThreshold).toBe(20);
    expect(EXACT_THRESHOLD_SCENARIO.expectedDiscountAmount).toBe(1230);
  });

  it("should provide below threshold scenario data", () => {
    expect(BELOW_THRESHOLD_SCENARIO.numberOfCartons).toBe(19);
    expect(BELOW_THRESHOLD_SCENARIO.volumeThreshold).toBe(20);
    expect(BELOW_THRESHOLD_SCENARIO.expectedDiscountAmount).toBe(0);
    expect(BELOW_THRESHOLD_SCENARIO.expectedRuleId).toBeNull();
  });
});

describe("Mock Data Helpers - Usage Examples", () => {
  it("example: testing carton_equivalent discount calculation", () => {
    const rule = createMockCartonEquivalentRule({
      volumeThreshold: 20,
      discountValue: 2,
    });

    const numberOfCartons = 25;
    const perCartonPrice = 615;

    // Expected discount: 2 cartons × 615 = 1230
    const expectedDiscount = rule.discountValue * perCartonPrice;

    expect(expectedDiscount).toBe(1230);
  });

  it("example: testing percentage discount calculation", () => {
    const rule = createMockPercentageRule({
      volumeThreshold: 50,
      discountValue: 10,
    });

    const numberOfCartons = 60;
    const perCartonPrice = 1000;
    const baseAmount = numberOfCartons * perCartonPrice;

    // Expected discount: 10% of 60,000 = 6,000
    const expectedDiscount = (baseAmount * rule.discountValue) / 100;

    expect(expectedDiscount).toBe(6000);
  });

  it("example: testing tiered discount selection", () => {
    const rules = createMockTieredRules();
    const numberOfCartons = 120;

    // Filter rules that meet the threshold
    const applicableRules = rules.filter(
      r => numberOfCartons >= r.volumeThreshold
    );

    // Select the highest threshold
    const selectedRule = applicableRules.reduce((highest, current) =>
      current.volumeThreshold > highest.volumeThreshold ? current : highest
    );

    expect(selectedRule.volumeThreshold).toBe(100);
    expect(selectedRule.discountValue).toBe(12);
  });

  it("example: testing customer type eligibility", () => {
    const rules = createMockCustomerTypeRules();
    const customerType = "retailer";

    // Filter rules eligible for retailer
    const eligibleRules = rules.filter(
      r => r.eligibleCustomerType === "all" || r.eligibleCustomerType === customerType
    );

    // Should include "retailer" and "all" rules only
    expect(eligibleRules.every(
      r => r.eligibleCustomerType === "retailer" || r.eligibleCustomerType === "all"
    )).toBe(true);
  });

  it("example: testing date-based rule activation", () => {
    const activeRule = createMockCartonEquivalentRule();
    const inactiveRule = createMockInactiveRule();
    const futureRule = createMockFutureRule();

    const now = new Date();

    // Active rule should be within date range
    expect(activeRule.effectiveFrom <= now).toBe(true);
    const isActiveRuleValid = activeRule.effectiveTo === null || activeRule.effectiveTo >= now;
    expect(isActiveRuleValid).toBe(true);

    // Inactive rule should be expired
    expect(inactiveRule.effectiveTo).not.toBeNull();
    if (inactiveRule.effectiveTo) {
      expect(inactiveRule.effectiveTo < now).toBe(true);
    }

    // Future rule should not be active yet
    expect(futureRule.effectiveFrom > now).toBe(true);
  });
});
