import { describe, it, expect } from "vitest";
import {
  createCustomerDiscountRuleSchema,
  updateCustomerDiscountRuleSchema,
} from "@/db/zod_schemas";

describe("Customer Discount Rule Schemas", () => {
  describe("createCustomerDiscountRuleSchema", () => {
    it("should validate a valid carton_equivalent discount rule", () => {
      const validRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: 10,
        discountType: "carton_equivalent" as const,
        discountValue: 2,
        eligibleCustomerType: "all" as const,
      };

      const result = createCustomerDiscountRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it("should validate a valid percentage discount rule", () => {
      const validRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: 20,
        discountType: "percentage" as const,
        discountValue: 15,
        eligibleCustomerType: "distributor" as const,
      };

      const result = createCustomerDiscountRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it("should reject percentage discount value greater than 100", () => {
      const invalidRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: 20,
        discountType: "percentage" as const,
        discountValue: 150,
        eligibleCustomerType: "all" as const,
      };

      const result = createCustomerDiscountRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Percentage discount must be between 0 and 100"
        );
      }
    });

    it("should reject negative volume threshold", () => {
      const invalidRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: -5,
        discountType: "carton_equivalent" as const,
        discountValue: 2,
        eligibleCustomerType: "all" as const,
      };

      const result = createCustomerDiscountRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Volume threshold must be greater than zero"
        );
      }
    });

    it("should reject effectiveFrom after effectiveTo", () => {
      const invalidRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: 10,
        discountType: "fixed_amount" as const,
        discountValue: 100,
        eligibleCustomerType: "all" as const,
        effectiveFrom: new Date("2024-12-31"),
        effectiveTo: new Date("2024-01-01"),
      };

      const result = createCustomerDiscountRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "effectiveFrom must be before or equal to effectiveTo"
        );
      }
    });

    it("should accept effectiveFrom equal to effectiveTo", () => {
      const validRule = {
        customerId: "cust_123",
        productId: "prod_456",
        volumeThreshold: 10,
        discountType: "fixed_amount" as const,
        discountValue: 100,
        eligibleCustomerType: "all" as const,
        effectiveFrom: new Date("2024-06-01"),
        effectiveTo: new Date("2024-06-01"),
      };

      const result = createCustomerDiscountRuleSchema.safeParse(validRule);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const invalidRule = {
        customerId: "cust_123",
        // missing productId
        volumeThreshold: 10,
        discountType: "carton_equivalent" as const,
        discountValue: 2,
      };

      const result = createCustomerDiscountRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
    });
  });

  describe("updateCustomerDiscountRuleSchema", () => {
    it("should validate a valid update with id", () => {
      const validUpdate = {
        id: "rule_123",
        volumeThreshold: 15,
        discountValue: 3,
      };

      const result = updateCustomerDiscountRuleSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it("should reject update without id", () => {
      const invalidUpdate = {
        volumeThreshold: 15,
        discountValue: 3,
      };

      const result = updateCustomerDiscountRuleSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it("should validate partial updates", () => {
      const validUpdate = {
        id: "rule_123",
        discountValue: 5,
      };

      const result = updateCustomerDiscountRuleSchema.safeParse(validUpdate);
      expect(result.success).toBe(true);
    });

    it("should still enforce percentage validation on updates", () => {
      const invalidUpdate = {
        id: "rule_123",
        discountType: "percentage" as const,
        discountValue: 150,
      };

      const result = updateCustomerDiscountRuleSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Percentage discount must be between 0 and 100"
        );
      }
    });
  });
});
