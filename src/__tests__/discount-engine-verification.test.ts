/**
 * Verification tests for Task 5.2: Implement discount evaluation function
 * 
 * This test suite verifies that the evaluateCustomerDiscount() function
 * correctly implements all requirements specified in Task 5.2.
 */

import { describe, it, expect } from "vitest";
import {
  evaluateCustomerDiscount,
  type CustomerDiscountRule,
} from "@/lib/sales/discount-engine";

describe("Task 5.2: Discount Evaluation Function", () => {
  const baseRule: CustomerDiscountRule = {
    id: "rule-1",
    customerId: "customer-1",
    productId: "product-1",
    volumeThreshold: 10,
    discountType: "carton_equivalent",
    discountValue: 2,
    eligibleCustomerType: "all",
    effectiveFrom: new Date("2024-01-01"),
    effectiveTo: null,
  };

  describe("Requirement 2.2: Filter rules by customerId, productId, customerType", () => {
    it("should return no discount when customerId does not match", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "different-customer",
        "product-1",
        20,
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
    });

    it("should return no discount when productId does not match", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "customer-1",
        "different-product",
        20,
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
    });

    it("should apply discount when customerId and productId match", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.ruleId).toBe("rule-1");
    });
  });

  describe("Requirement 2.3: Filter rules by volumeThreshold", () => {
    it("should return no discount when numberOfCartons is below threshold", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        5, // Below threshold of 10
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
    });

    it("should apply discount when numberOfCartons meets threshold", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        10, // Exactly at threshold
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.ruleId).toBe("rule-1");
    });

    it("should apply discount when numberOfCartons exceeds threshold", () => {
      const rules = [baseRule];
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20, // Above threshold
        100,
        "distributor",
        rules
      );

      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.ruleId).toBe("rule-1");
    });
  });

  describe("Requirement 2.4: Select rule with highest volumeThreshold", () => {
    it("should select the rule with highest threshold when multiple rules apply", () => {
      const rules: CustomerDiscountRule[] = [
        { ...baseRule, id: "rule-1", volumeThreshold: 10, discountValue: 1 },
        { ...baseRule, id: "rule-2", volumeThreshold: 20, discountValue: 3 },
        { ...baseRule, id: "rule-3", volumeThreshold: 15, discountValue: 2 },
      ];

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        25, // Meets all thresholds
        100,
        "distributor",
        rules
      );

      expect(result.ruleId).toBe("rule-2"); // Highest threshold (20)
      expect(result.appliedThreshold).toBe(20);
    });

    it("should only consider rules that meet the volume threshold", () => {
      const rules: CustomerDiscountRule[] = [
        { ...baseRule, id: "rule-1", volumeThreshold: 10, discountValue: 1 },
        { ...baseRule, id: "rule-2", volumeThreshold: 30, discountValue: 5 }, // Too high
        { ...baseRule, id: "rule-3", volumeThreshold: 15, discountValue: 2 },
      ];

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20, // Meets 10 and 15, but not 30
        100,
        "distributor",
        rules
      );

      expect(result.ruleId).toBe("rule-3"); // Highest applicable threshold (15)
      expect(result.appliedThreshold).toBe(15);
    });
  });

  describe("Requirement 3.1-3.5: Calculate discount based on discountType", () => {
    it("should calculate carton_equivalent discount correctly", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        discountType: "carton_equivalent",
        discountValue: 2, // 2 cartons worth
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100, // perCartonPrice
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(200); // 2 cartons × 100
      expect(result.ruleType).toBe("carton_equivalent");
    });

    it("should calculate percentage discount correctly", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        discountType: "percentage",
        discountValue: 10, // 10%
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100, // perCartonPrice
        "distributor",
        [rule]
      );

      // 10% of (20 cartons × 100) = 10% of 2000 = 200
      expect(result.discountAmount).toBe(200);
      expect(result.ruleType).toBe("percentage");
    });

    it("should calculate fixed_amount discount correctly", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        discountType: "fixed_amount",
        discountValue: 500, // Fixed 500
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(500);
      expect(result.ruleType).toBe("fixed_amount");
    });
  });

  describe("Requirement 4.2-4.3: Customer type eligibility", () => {
    it("should apply rule when eligibleCustomerType is 'all'", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        eligibleCustomerType: "all",
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.ruleId).toBe("rule-1");
    });

    it("should apply rule when eligibleCustomerType matches customer type", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        eligibleCustomerType: "distributor",
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBeGreaterThan(0);
      expect(result.ruleId).toBe("rule-1");
    });

    it("should not apply rule when eligibleCustomerType does not match", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        eligibleCustomerType: "retailer",
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor", // Different from rule's eligibleCustomerType
        [rule]
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
    });
  });

  describe("Return DiscountResolution with metadata", () => {
    it("should return complete metadata when discount is applied", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        id: "test-rule-123",
        volumeThreshold: 15,
        discountType: "percentage",
        discountValue: 5,
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(100); // 5% of 2000
      expect(result.ruleId).toBe("test-rule-123");
      expect(result.ruleType).toBe("percentage");
      expect(result.appliedThreshold).toBe(15);
    });

    it("should return null metadata when no discount is applied", () => {
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        5, // Below threshold
        100,
        "distributor",
        [baseRule]
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
      expect(result.ruleType).toBeNull();
      expect(result.appliedThreshold).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle empty rules array", () => {
      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        []
      );

      expect(result.discountAmount).toBe(0);
      expect(result.ruleId).toBeNull();
    });

    it("should handle string discountValue by converting to number", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        discountType: "carton_equivalent",
        discountValue: "3", // String value
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(300); // 3 cartons × 100
    });

    it("should ensure discount amount is never negative", () => {
      const rule: CustomerDiscountRule = {
        ...baseRule,
        discountType: "fixed_amount",
        discountValue: -100, // Negative value (shouldn't happen, but test defensive code)
      };

      const result = evaluateCustomerDiscount(
        "customer-1",
        "product-1",
        20,
        100,
        "distributor",
        [rule]
      );

      expect(result.discountAmount).toBe(0); // Math.max(0, -100) = 0
    });
  });
});
