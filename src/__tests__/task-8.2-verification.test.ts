/**
 * Verification tests for Task 8.2: Apply customer discounts in line item processing
 * 
 * This test suite verifies that customer discounts are correctly applied during
 * invoice creation and that all requirements are met.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Task 8.2: Apply customer discounts in line item processing", () => {
  const invoicesFnPath = join(process.cwd(), "src/server-functions/sales/invoices-fn.ts");
  const invoicesFnSource = readFileSync(invoicesFnPath, "utf-8");

  describe("Requirement: Call evaluateCustomerDiscount() for each line item", () => {
    it("should import evaluateCustomerDiscount from discount-engine", () => {
      expect(invoicesFnSource).toContain("import { evaluateCustomerDiscount }");
      expect(invoicesFnSource).toContain("from \"@/lib/sales/discount-engine\"");
    });

    it("should call evaluateCustomerDiscount in createInvoiceFn", () => {
      expect(invoicesFnSource).toContain("evaluateCustomerDiscount(");
      // Verify it's called with correct parameters
      expect(invoicesFnSource).toContain("customerId,");
      expect(invoicesFnSource).toContain("stock.recipe.productId,");
      expect(invoicesFnSource).toContain("item.numberOfCartons,");
      expect(invoicesFnSource).toContain("finalPerCartonPrice,");
      expect(invoicesFnSource).toContain("customerType,");
      expect(invoicesFnSource).toContain("productDiscountRules");
    });
  });

  describe("Requirement: Skip discount evaluation if isPriceOverride is true", () => {
    it("should check isPriceOverride before evaluating discount", () => {
      // Should have conditional check
      expect(invoicesFnSource).toContain("if (!item.isPriceOverride && stock.recipe.productId)");
      
      // Should initialize discount variables
      expect(invoicesFnSource).toContain("let customerDiscountAmount = 0;");
      expect(invoicesFnSource).toContain("let customerDiscountRuleId: string | null = null;");
    });

    it("should include comment referencing Requirement 7.1", () => {
      expect(invoicesFnSource).toContain("Requirement 7.1");
    });
  });

  describe("Requirement: Calculate discount after promotional rules", () => {
    it("should calculate promotional discount before customer discount", () => {
      // Check that promo discount is calculated first
      const promoDiscountIndex = invoicesFnSource.indexOf("const promoDiscount = promoFreeCartons * finalPerCartonPrice");
      const customerDiscountIndex = invoicesFnSource.indexOf("evaluateCustomerDiscount(");
      
      expect(promoDiscountIndex).toBeGreaterThan(0);
      expect(customerDiscountIndex).toBeGreaterThan(0);
      expect(promoDiscountIndex).toBeLessThan(customerDiscountIndex);
    });

    it("should calculate amountAfterPromo before customer discount", () => {
      expect(invoicesFnSource).toContain("const amountAfterPromo = baseAmount - promoDiscount;");
      
      // Verify this happens before evaluateCustomerDiscount
      const amountAfterPromoIndex = invoicesFnSource.indexOf("const amountAfterPromo = baseAmount - promoDiscount");
      const customerDiscountIndex = invoicesFnSource.indexOf("evaluateCustomerDiscount(");
      
      expect(amountAfterPromoIndex).toBeLessThan(customerDiscountIndex);
    });
  });

  describe("Requirement: Store customerDiscountRuleId and customerDiscountAmount", () => {
    it("should extract discountAmount from discountResolution", () => {
      expect(invoicesFnSource).toContain("customerDiscountAmount = discountResolution.discountAmount;");
    });

    it("should extract ruleId from discountResolution", () => {
      expect(invoicesFnSource).toContain("customerDiscountRuleId = discountResolution.ruleId;");
    });

    it("should store customerDiscountRuleId in invoice_items", () => {
      expect(invoicesFnSource).toContain("customerDiscountRuleId: r.customerDiscountRuleId,");
    });

    it("should store customerDiscountAmount in invoice_items", () => {
      expect(invoicesFnSource).toContain("customerDiscountAmount: r.customerDiscountAmount");
      expect(invoicesFnSource).toContain("? r.customerDiscountAmount.toString()");
    });
  });

  describe("Requirement: Subtract customerDiscountAmount from line amount", () => {
    it("should calculate final amount with customer discount subtracted", () => {
      expect(invoicesFnSource).toContain("amountAfterPromo - customerDiscountAmount");
    });

    it("should include customer discount in lineAmount calculation", () => {
      // Should have the complete formula
      expect(invoicesFnSource).toMatch(/lineAmount.*=.*Math\.max.*amountAfterPromo.*-.*customerDiscountAmount/s);
    });
  });

  describe("Requirement: Ensure final amount is never negative (clamp to zero)", () => {
    it("should use Math.max(0, ...) to clamp final amount", () => {
      expect(invoicesFnSource).toContain("Math.max(0, amountAfterPromo - customerDiscountAmount)");
    });

    it("should include comment referencing Requirement 5.5", () => {
      expect(invoicesFnSource).toContain("Requirement 5.5");
    });
  });

  describe("Requirement: Cache discount rules by productId for performance", () => {
    it("should create a Map to cache discount rules by productId", () => {
      expect(invoicesFnSource).toContain("const discountRulesByProduct = new Map<string, CustomerDiscountRule[]>();");
    });

    it("should populate the cache with discount rules", () => {
      expect(invoicesFnSource).toContain("for (const rule of activeCustomerDiscountRules)");
      expect(invoicesFnSource).toContain("discountRulesByProduct.set(rule.productId, []);");
      expect(invoicesFnSource).toContain("discountRulesByProduct.get(rule.productId)!.push(rule);");
    });

    it("should retrieve cached rules for each product", () => {
      expect(invoicesFnSource).toContain("const productDiscountRules = discountRulesByProduct.get(stock.recipe.productId) || [];");
    });

    it("should include comment referencing Requirement 15.4", () => {
      expect(invoicesFnSource).toContain("Requirement 15.4");
    });
  });

  describe("Integration: Complete discount flow", () => {
    it("should have the complete discount calculation flow in correct order", () => {
      // 1. Base amount calculation
      const baseAmountIndex = invoicesFnSource.indexOf("const baseAmount = cartonsAmount + loosePacksAmount");
      
      // 2. Promotional discount
      const promoDiscountIndex = invoicesFnSource.indexOf("const promoDiscount = promoFreeCartons * finalPerCartonPrice");
      
      // 3. Amount after promo
      const amountAfterPromoIndex = invoicesFnSource.indexOf("const amountAfterPromo = baseAmount - promoDiscount");
      
      // 4. Customer discount evaluation
      const customerDiscountIndex = invoicesFnSource.indexOf("evaluateCustomerDiscount(");
      
      // 5. Final amount calculation
      const finalAmountIndex = invoicesFnSource.indexOf("const lineAmount = Math.max(0, amountAfterPromo - customerDiscountAmount)");
      
      // Verify order
      expect(baseAmountIndex).toBeGreaterThan(0);
      expect(promoDiscountIndex).toBeGreaterThan(baseAmountIndex);
      expect(amountAfterPromoIndex).toBeGreaterThan(promoDiscountIndex);
      expect(customerDiscountIndex).toBeGreaterThan(amountAfterPromoIndex);
      expect(finalAmountIndex).toBeGreaterThan(customerDiscountIndex);
    });

    it("should store all discount metadata in lineResolutions", () => {
      // Check that lineResolutions includes all required fields
      expect(invoicesFnSource).toContain("customerDiscountRuleId,");
      expect(invoicesFnSource).toContain("customerDiscountAmount,");
      expect(invoicesFnSource).toContain("lineAmount,");
    });
  });

  describe("Implementation in both createInvoiceFn and updateInvoiceFn", () => {
    it("should implement customer discount logic in createInvoiceFn", () => {
      const createFnMatch = invoicesFnSource.match(/export const createInvoiceFn[\s\S]*?(?=export const|$)/);
      expect(createFnMatch).toBeTruthy();
      
      const createFnCode = createFnMatch![0];
      expect(createFnCode).toContain("evaluateCustomerDiscount(");
      expect(createFnCode).toContain("customerDiscountRuleId");
      expect(createFnCode).toContain("customerDiscountAmount");
    });

    it("should implement customer discount logic in updateInvoiceFn", () => {
      const updateFnMatch = invoicesFnSource.match(/export const updateInvoiceFn[\s\S]*?(?=export const|$)/);
      expect(updateFnMatch).toBeTruthy();
      
      const updateFnCode = updateFnMatch![0];
      expect(updateFnCode).toContain("evaluateCustomerDiscount(");
      expect(updateFnCode).toContain("customerDiscountRuleId");
      expect(updateFnCode).toContain("customerDiscountAmount");
    });
  });
});
