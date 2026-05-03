/**
 * Task 8.1 Verification Test
 * 
 * Verifies that createInvoiceFn fetches active customer discount rules
 * at transaction start and caches them by productId.
 * 
 * Requirements validated: 15.1, 15.2, 15.3, 15.4
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("Task 8.1: Update createInvoiceFn to fetch discount rules", () => {
  const invoicesFnPath = join(process.cwd(), "src/server-functions/sales/invoices-fn.ts");
  const invoicesFnSource = readFileSync(invoicesFnPath, "utf-8");

  it("should import customerDiscountRules from sales-erp-schema", () => {
    expect(invoicesFnSource).toContain("customerDiscountRules");
    expect(invoicesFnSource).toMatch(/import.*customerDiscountRules.*from.*sales-erp-schema/);
  });

  it("should import CustomerDiscountRule type from discount-engine", () => {
    expect(invoicesFnSource).toContain("CustomerDiscountRule");
    expect(invoicesFnSource).toMatch(/import.*CustomerDiscountRule.*from.*discount-engine/);
  });

  it("should import or and isNull operators from drizzle-orm", () => {
    expect(invoicesFnSource).toMatch(/import.*\bor\b.*from.*drizzle-orm/);
    expect(invoicesFnSource).toMatch(/import.*\bisNull\b.*from.*drizzle-orm/);
  });

  it("should fetch active customer discount rules in createInvoiceFn", () => {
    // Check that we query customerDiscountRules
    expect(invoicesFnSource).toMatch(/tx\.query\.customerDiscountRules\.findMany/);
    
    // Check that we filter by customerId
    expect(invoicesFnSource).toMatch(/eq\(customerDiscountRules\.customerId,\s*customerId\)/);
    
    // Check that we filter by effectiveFrom (Requirement 15.2)
    expect(invoicesFnSource).toMatch(/lte\(customerDiscountRules\.effectiveFrom,\s*new Date\(\)\)/);
    
    // Check that we filter by effectiveTo with null handling (Requirement 15.2)
    expect(invoicesFnSource).toMatch(/isNull\(customerDiscountRules\.effectiveTo\)/);
    expect(invoicesFnSource).toMatch(/gte\(customerDiscountRules\.effectiveTo,\s*new Date\(\)\)/);
  });

  it("should fetch discount rules in parallel with agreements and promo rules", () => {
    // Check that all three are fetched in Promise.all
    const promiseAllMatch = invoicesFnSource.match(
      /const\s+\[agreements,\s*activePromos,\s*activeCustomerDiscountRules\]\s*=\s*await\s+Promise\.all\(/
    );
    expect(promiseAllMatch).toBeTruthy();
  });

  it("should cache discount rules by productId (Requirement 15.4)", () => {
    // Check for Map creation
    expect(invoicesFnSource).toMatch(/const\s+discountRulesByProduct\s*=\s*new\s+Map<string,\s*CustomerDiscountRule\[\]>\(\)/);
    
    // Check for caching logic
    expect(invoicesFnSource).toMatch(/discountRulesByProduct\.has\(rule\.productId\)/);
    expect(invoicesFnSource).toMatch(/discountRulesByProduct\.set\(rule\.productId,\s*\[\]\)/);
    expect(invoicesFnSource).toMatch(/discountRulesByProduct\.get\(rule\.productId\)/);
  });

  it("should cast query result to CustomerDiscountRule[] type", () => {
    // Check that we cast the result
    expect(invoicesFnSource).toMatch(/\.then\(\(rows\)\s*=>\s*rows\s+as\s+CustomerDiscountRule\[\]\)/);
  });

  it("should also update updateInvoiceFn with the same pattern", () => {
    // Check that updateInvoiceFn also fetches discount rules
    const updateFnMatches = invoicesFnSource.match(/tx\.query\.customerDiscountRules\.findMany/g);
    expect(updateFnMatches).toBeTruthy();
    expect(updateFnMatches!.length).toBeGreaterThanOrEqual(2); // At least in createInvoiceFn and updateInvoiceFn
  });

  it("should include comment referencing Requirement 15.4", () => {
    expect(invoicesFnSource).toMatch(/Requirement 15\.4/);
  });
});
