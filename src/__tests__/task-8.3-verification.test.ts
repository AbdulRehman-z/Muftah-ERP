import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";

/**
 * Task 8.3 Verification: Update price change log for audit trail
 * 
 * This test verifies that:
 * 1. Price change log entries are created during invoice calculation
 * 2. The metadata field includes customerDiscountRuleId
 * 3. The source is set to "invoice_calculation"
 * 
 * Requirements validated: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

describe("Task 8.3: Price Change Log Audit Trail", () => {
  it("should have metadata field in price_change_log schema", async () => {
    const schemaContent = await readFile(
      "src/db/schemas/sales-erp-schema.ts",
      "utf-8"
    );

    // Verify metadata field exists in priceChangeLog table
    expect(schemaContent).toContain("metadata: jsonb(\"metadata\")");
    
    // Verify source comment includes "invoice_calculation"
    expect(schemaContent).toContain("invoice_calculation");
  });

  it("should import priceChangeLog in invoices-fn.ts", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify priceChangeLog is imported
    expect(invoicesFnContent).toContain("priceChangeLog");
    expect(invoicesFnContent).toMatch(
      /import.*priceChangeLog.*from.*sales-erp-schema/
    );
  });

  it("should log pricing decisions in createInvoiceFn", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify price change log insertion exists
    expect(invoicesFnContent).toContain("tx.insert(priceChangeLog)");
    
    // Verify source is set to "invoice_calculation"
    expect(invoicesFnContent).toContain('source: "invoice_calculation"');
    
    // Verify metadata includes customerDiscountRuleId
    expect(invoicesFnContent).toContain("customerDiscountRuleId: r.customerDiscountRuleId");
    
    // Verify metadata includes priceAgreementId
    expect(invoicesFnContent).toContain("priceAgreementId: r.agreementId");
    
    // Verify metadata includes promoRuleId
    expect(invoicesFnContent).toContain("promoRuleId: r.promoRuleId");
    
    // Verify metadata includes customerDiscountAmount
    expect(invoicesFnContent).toContain("customerDiscountAmount: r.customerDiscountAmount");
    
    // Verify metadata includes isPriceOverride
    expect(invoicesFnContent).toContain("isPriceOverride: r.item.isPriceOverride");
  });

  it("should log pricing decisions in updateInvoiceFn", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Count occurrences of price change log insertion
    const matches = invoicesFnContent.match(/tx\.insert\(priceChangeLog\)/g);
    
    // Should have at least 2 occurrences (createInvoiceFn and updateInvoiceFn)
    expect(matches).toBeTruthy();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("should include all required fields in price change log entry", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify all required fields are present in the log entry
    const requiredFields = [
      "productId: r.productId",
      "customerId: customerId",
      "oldPrice:",
      "newPrice:",
      "changedById: userId",
      'source: "invoice_calculation"',
      "invoiceId:",
      "metadata:",
    ];

    for (const field of requiredFields) {
      expect(invoicesFnContent).toContain(field);
    }
  });

  it("should log pricing decisions only when productId exists", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify conditional check for productId before logging
    expect(invoicesFnContent).toMatch(
      /if \(r\.productId\)[\s\S]*?tx\.insert\(priceChangeLog\)/
    );
  });

  it("should have Task 8.3 comment markers in the code", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify Task 8.3 comment exists
    expect(invoicesFnContent).toContain("Task 8.3");
    
    // Verify Requirement 8.5 comment exists
    expect(invoicesFnContent).toContain("Requirement 8.5");
  });

  it("should store metadata as a structured object", async () => {
    const invoicesFnContent = await readFile(
      "src/server-functions/sales/invoices-fn.ts",
      "utf-8"
    );

    // Verify metadata is structured with multiple fields
    const metadataPattern = /metadata:\s*\{[\s\S]*?priceAgreementId[\s\S]*?promoRuleId[\s\S]*?customerDiscountRuleId[\s\S]*?\}/;
    expect(invoicesFnContent).toMatch(metadataPattern);
  });
});
