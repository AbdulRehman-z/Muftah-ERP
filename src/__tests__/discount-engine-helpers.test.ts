import { describe, it, expect } from "vitest";
import {
  isRuleActive,
  meetsVolumeThreshold,
  isCustomerTypeEligible,
  selectApplicableRule,
  type CustomerDiscountRule,
} from "@/lib/sales/discount-engine";

describe("Discount Engine Helper Functions", () => {
  describe("isRuleActive", () => {
    it("should return true when current date is within active range", () => {
      const rule = {
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: new Date("2024-12-31"),
      };
      const currentDate = new Date("2024-06-15");

      expect(isRuleActive(rule, currentDate)).toBe(true);
    });

    it("should return true when effectiveTo is null (indefinite)", () => {
      const rule = {
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: null,
      };
      const currentDate = new Date("2025-06-15");

      expect(isRuleActive(rule, currentDate)).toBe(true);
    });

    it("should return false when current date is before effectiveFrom", () => {
      const rule = {
        effectiveFrom: new Date("2024-06-01"),
        effectiveTo: new Date("2024-12-31"),
      };
      const currentDate = new Date("2024-05-15");

      expect(isRuleActive(rule, currentDate)).toBe(false);
    });

    it("should return false when current date is after effectiveTo", () => {
      const rule = {
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: new Date("2024-06-30"),
      };
      const currentDate = new Date("2024-07-15");

      expect(isRuleActive(rule, currentDate)).toBe(false);
    });

    it("should return true when current date equals effectiveFrom", () => {
      const rule = {
        effectiveFrom: new Date("2024-06-15"),
        effectiveTo: new Date("2024-12-31"),
      };
      const currentDate = new Date("2024-06-15");

      expect(isRuleActive(rule, currentDate)).toBe(true);
    });

    it("should return true when current date equals effectiveTo", () => {
      const rule = {
        effectiveFrom: new Date("2024-01-01"),
        effectiveTo: new Date("2024-06-15"),
      };
      const currentDate = new Date("2024-06-15");

      expect(isRuleActive(rule, currentDate)).toBe(true);
    });

    it("should use current date when not provided", () => {
      const rule = {
        effectiveFrom: new Date("2020-01-01"),
        effectiveTo: null,
      };

      // Should be active since effectiveFrom is in the past and effectiveTo is null
      expect(isRuleActive(rule)).toBe(true);
    });
  });

  describe("meetsVolumeThreshold", () => {
    it("should return true when numberOfCartons equals threshold", () => {
      const rule = { volumeThreshold: 20 };
      expect(meetsVolumeThreshold(rule, 20)).toBe(true);
    });

    it("should return true when numberOfCartons exceeds threshold", () => {
      const rule = { volumeThreshold: 20 };
      expect(meetsVolumeThreshold(rule, 50)).toBe(true);
    });

    it("should return false when numberOfCartons is below threshold", () => {
      const rule = { volumeThreshold: 20 };
      expect(meetsVolumeThreshold(rule, 15)).toBe(false);
    });

    it("should return false when numberOfCartons is zero and threshold is positive", () => {
      const rule = { volumeThreshold: 10 };
      expect(meetsVolumeThreshold(rule, 0)).toBe(false);
    });

    it("should handle threshold of 1", () => {
      const rule = { volumeThreshold: 1 };
      expect(meetsVolumeThreshold(rule, 0)).toBe(false);
      expect(meetsVolumeThreshold(rule, 1)).toBe(true);
      expect(meetsVolumeThreshold(rule, 2)).toBe(true);
    });
  });

  describe("isCustomerTypeEligible", () => {
    it("should return true when eligibleCustomerType is 'all'", () => {
      const rule = { eligibleCustomerType: "all" as const };
      expect(isCustomerTypeEligible(rule, "distributor")).toBe(true);
      expect(isCustomerTypeEligible(rule, "retailer")).toBe(true);
      expect(isCustomerTypeEligible(rule, "wholesaler")).toBe(true);
    });

    it("should return true when customer type matches eligibleCustomerType", () => {
      const rule = { eligibleCustomerType: "distributor" as const };
      expect(isCustomerTypeEligible(rule, "distributor")).toBe(true);
    });

    it("should return false when customer type does not match eligibleCustomerType", () => {
      const rule = { eligibleCustomerType: "distributor" as const };
      expect(isCustomerTypeEligible(rule, "retailer")).toBe(false);
      expect(isCustomerTypeEligible(rule, "wholesaler")).toBe(false);
    });

    it("should handle all customer types correctly", () => {
      const distributorRule = { eligibleCustomerType: "distributor" as const };
      const retailerRule = { eligibleCustomerType: "retailer" as const };
      const wholesalerRule = { eligibleCustomerType: "wholesaler" as const };

      expect(isCustomerTypeEligible(distributorRule, "distributor")).toBe(true);
      expect(isCustomerTypeEligible(retailerRule, "retailer")).toBe(true);
      expect(isCustomerTypeEligible(wholesalerRule, "wholesaler")).toBe(true);

      expect(isCustomerTypeEligible(distributorRule, "retailer")).toBe(false);
      expect(isCustomerTypeEligible(retailerRule, "wholesaler")).toBe(false);
      expect(isCustomerTypeEligible(wholesalerRule, "distributor")).toBe(false);
    });
  });

  describe("selectApplicableRule", () => {
    it("should return null when no rules meet the threshold", () => {
      const rules = [
        { id: "rule1", volumeThreshold: 50 },
        { id: "rule2", volumeThreshold: 100 },
      ];

      expect(selectApplicableRule(rules, 30)).toBeNull();
    });

    it("should return the only rule when one rule meets threshold", () => {
      const rules = [
        { id: "rule1", volumeThreshold: 20 },
        { id: "rule2", volumeThreshold: 100 },
      ];

      const result = selectApplicableRule(rules, 50);
      expect(result?.id).toBe("rule1");
    });

    it("should return rule with highest threshold when multiple rules apply", () => {
      const rules = [
        { id: "rule1", volumeThreshold: 10 },
        { id: "rule2", volumeThreshold: 50 },
        { id: "rule3", volumeThreshold: 100 },
      ];

      const result = selectApplicableRule(rules, 120);
      expect(result?.id).toBe("rule3");
      expect(result?.volumeThreshold).toBe(100);
    });

    it("should handle rules in any order", () => {
      const rules = [
        { id: "rule1", volumeThreshold: 100 },
        { id: "rule2", volumeThreshold: 10 },
        { id: "rule3", volumeThreshold: 50 },
      ];

      const result = selectApplicableRule(rules, 120);
      expect(result?.id).toBe("rule1");
      expect(result?.volumeThreshold).toBe(100);
    });

    it("should return correct rule when numberOfCartons exactly equals threshold", () => {
      const rules = [
        { id: "rule1", volumeThreshold: 10 },
        { id: "rule2", volumeThreshold: 50 },
        { id: "rule3", volumeThreshold: 100 },
      ];

      const result = selectApplicableRule(rules, 50);
      expect(result?.id).toBe("rule2");
      expect(result?.volumeThreshold).toBe(50);
    });

    it("should handle single rule array", () => {
      const rules = [{ id: "rule1", volumeThreshold: 20 }];

      expect(selectApplicableRule(rules, 10)).toBeNull();
      expect(selectApplicableRule(rules, 20)?.id).toBe("rule1");
      expect(selectApplicableRule(rules, 30)?.id).toBe("rule1");
    });

    it("should handle empty rules array", () => {
      const rules: Array<{ id: string; volumeThreshold: number }> = [];
      expect(selectApplicableRule(rules, 50)).toBeNull();
    });

    it("should work with full CustomerDiscountRule objects", () => {
      const rules: CustomerDiscountRule[] = [
        {
          id: "rule1",
          customerId: "cust1",
          productId: "prod1",
          volumeThreshold: 10,
          discountType: "percentage",
          discountValue: 5,
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
        },
        {
          id: "rule2",
          customerId: "cust1",
          productId: "prod1",
          volumeThreshold: 50,
          discountType: "percentage",
          discountValue: 10,
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
        },
      ];

      const result = selectApplicableRule(rules, 60);
      expect(result?.id).toBe("rule2");
      expect(result?.volumeThreshold).toBe(50);
    });
  });

  describe("Integration: Helper functions working together", () => {
    it("should correctly filter and select rules using all helpers", () => {
      const rules: CustomerDiscountRule[] = [
        {
          id: "rule1",
          customerId: "cust1",
          productId: "prod1",
          volumeThreshold: 10,
          discountType: "percentage",
          discountValue: 5,
          eligibleCustomerType: "distributor",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: new Date("2024-06-30"),
        },
        {
          id: "rule2",
          customerId: "cust1",
          productId: "prod1",
          volumeThreshold: 50,
          discountType: "percentage",
          discountValue: 10,
          eligibleCustomerType: "all",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
        },
        {
          id: "rule3",
          customerId: "cust1",
          productId: "prod1",
          volumeThreshold: 100,
          discountType: "percentage",
          discountValue: 15,
          eligibleCustomerType: "retailer",
          effectiveFrom: new Date("2024-01-01"),
          effectiveTo: null,
        },
      ];

      const currentDate = new Date("2024-07-15");
      const numberOfCartons = 120;
      const customerType = "retailer";

      // Filter using all helper functions
      const eligibleRules = rules.filter(
        (rule) =>
          isRuleActive(rule, currentDate) &&
          isCustomerTypeEligible(rule, customerType) &&
          meetsVolumeThreshold(rule, numberOfCartons)
      );

      // rule1 is expired (effectiveTo is 2024-06-30)
      // rule2 is active, eligible (all), and meets threshold
      // rule3 is active, eligible (retailer), and meets threshold
      expect(eligibleRules.length).toBe(2);
      expect(eligibleRules.map((r) => r.id)).toEqual(["rule2", "rule3"]);

      // Select highest threshold
      const selected = selectApplicableRule(eligibleRules, numberOfCartons);
      expect(selected?.id).toBe("rule3");
      expect(selected?.volumeThreshold).toBe(100);
    });
  });
});
