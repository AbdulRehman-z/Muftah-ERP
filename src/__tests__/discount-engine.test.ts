import { describe, it, expect } from "vitest";
import {
  evaluateCustomerDiscount,
  type CustomerDiscountRule,
} from "@/lib/sales/discount-engine";

describe("Discount Engine", () => {
  const mockRule: CustomerDiscountRule = {
    id: "rule-1",
    customerId: "customer-1",
    productId: "product-1",
    volumeThreshold: 20,
    discountType: "carton_equivalent",
    discountValue: 2,
    eligibleCustomerType: "all",
    effectiveFrom: new Date("2024-01-01"),
    effectiveTo: null,
  };

  it("should return zero discount when no rules match", () => {
    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      10, // Below threshold
      615,
      "distributor",
      [mockRule]
    );

    expect(result.discountAmount).toBe(0);
    expect(result.ruleId).toBeNull();
    expect(result.ruleType).toBeNull();
    expect(result.appliedThreshold).toBeNull();
  });

  it("should apply carton_equivalent discount correctly", () => {
    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25, // Meets threshold
      615,
      "distributor",
      [mockRule]
    );

    expect(result.discountAmount).toBe(1230); // 2 cartons × 615
    expect(result.ruleId).toBe("rule-1");
    expect(result.ruleType).toBe("carton_equivalent");
    expect(result.appliedThreshold).toBe(20);
  });

  it("should apply percentage discount correctly", () => {
    const percentageRule: CustomerDiscountRule = {
      ...mockRule,
      id: "rule-2",
      discountType: "percentage",
      discountValue: 10, // 10%
    };

    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      1000,
      "distributor",
      [percentageRule]
    );

    expect(result.discountAmount).toBe(2500); // 10% of (25 × 1000)
    expect(result.ruleType).toBe("percentage");
  });

  it("should apply fixed_amount discount correctly", () => {
    const fixedRule: CustomerDiscountRule = {
      ...mockRule,
      id: "rule-3",
      discountType: "fixed_amount",
      discountValue: 5000,
    };

    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      1000,
      "distributor",
      [fixedRule]
    );

    expect(result.discountAmount).toBe(5000);
    expect(result.ruleType).toBe("fixed_amount");
  });

  it("should select rule with highest threshold when multiple apply", () => {
    const rules: CustomerDiscountRule[] = [
      { ...mockRule, id: "rule-1", volumeThreshold: 10, discountValue: 1 },
      { ...mockRule, id: "rule-2", volumeThreshold: 50, discountValue: 5 },
      { ...mockRule, id: "rule-3", volumeThreshold: 100, discountValue: 10 },
    ];

    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      120, // Meets all thresholds
      615,
      "distributor",
      rules
    );

    expect(result.ruleId).toBe("rule-3"); // Highest threshold (100)
    expect(result.appliedThreshold).toBe(100);
    expect(result.discountAmount).toBe(6150); // 10 cartons × 615
  });

  it("should filter by customer type eligibility", () => {
    const distributorRule: CustomerDiscountRule = {
      ...mockRule,
      id: "rule-dist",
      eligibleCustomerType: "distributor",
    };

    // Should apply for distributor
    const distributorResult = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      615,
      "distributor",
      [distributorRule]
    );
    expect(distributorResult.ruleId).toBe("rule-dist");

    // Should not apply for retailer
    const retailerResult = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      615,
      "retailer",
      [distributorRule]
    );
    expect(retailerResult.ruleId).toBeNull();
  });

  it("should apply rule with 'all' customer type to any customer", () => {
    const allRule: CustomerDiscountRule = {
      ...mockRule,
      eligibleCustomerType: "all",
    };

    const distributorResult = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      615,
      "distributor",
      [allRule]
    );
    expect(distributorResult.ruleId).toBe("rule-1");

    const retailerResult = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      615,
      "retailer",
      [allRule]
    );
    expect(retailerResult.ruleId).toBe("rule-1");
  });

  it("should filter by customerId and productId", () => {
    const result = evaluateCustomerDiscount(
      "customer-2", // Different customer
      "product-1",
      25,
      615,
      "distributor",
      [mockRule]
    );

    expect(result.ruleId).toBeNull();
  });

  it("should never return negative discount amount", () => {
    const result = evaluateCustomerDiscount(
      "customer-1",
      "product-1",
      25,
      615,
      "distributor",
      [mockRule]
    );

    expect(result.discountAmount).toBeGreaterThanOrEqual(0);
  });
});
