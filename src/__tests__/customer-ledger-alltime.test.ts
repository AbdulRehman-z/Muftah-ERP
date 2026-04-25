/**
 * Unit Tests: Overdue and nextDueDate all-time behaviour
 *
 * Tests:
 * - `overdueInvoices` count is not affected by `dateFrom`/`dateTo` filter.
 * - `nextDueDate` is not affected by `dateFrom`/`dateTo` filter.
 *
 * Requirements: 9.8, 9.9
 *
 * Approach: Source inspection to verify the overdue and nextDueDate queries
 * use their own WHERE clauses (not invoiceWhereClause) so they are all-time.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("getCustomerLedgerFn: overdue and nextDueDate are all-time (not date-scoped)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/server-functions/sales/customers-fn.ts"),
    "utf-8",
  );

  const ledgerStart = source.indexOf("GET CUSTOMER LEDGER");
  const ledgerSection = ledgerStart >= 0 ? source.slice(ledgerStart) : source;

  // ─── Requirement 9.8: overdueInvoices is not date-scoped ─────────────────

  it("overdueInvoices query does NOT use invoiceWhereClause (all-time)", () => {
    // Find the overdueResult block
    const overdueIdx = ledgerSection.indexOf("overdueResult");
    expect(overdueIdx).toBeGreaterThan(-1);

    // Extract ~300 chars around the overdue query
    const overdueBlock = ledgerSection.slice(
      Math.max(0, overdueIdx - 50),
      overdueIdx + 300,
    );

    // The overdue query must NOT reference invoiceWhereClause
    expect(overdueBlock).not.toMatch(/invoiceWhereClause/);
  });

  it("overdueInvoices query uses lt(invoices.creditReturnDate, new Date()) condition", () => {
    expect(ledgerSection).toMatch(/lt\s*\(\s*invoices\.creditReturnDate\s*,\s*new Date\(\)/);
  });

  it("overdueInvoices query uses gt(invoices.credit, '0') condition", () => {
    const overdueIdx = ledgerSection.indexOf("overdueResult");
    const overdueBlock = ledgerSection.slice(overdueIdx - 50, overdueIdx + 400);
    expect(overdueBlock).toMatch(/gt\s*\(\s*invoices\.credit\s*,\s*["']0["']/);
  });

  it("overdueInvoices query uses eq(invoices.customerId, data.customerId) — scoped to customer", () => {
    const overdueIdx = ledgerSection.indexOf("overdueResult");
    const overdueBlock = ledgerSection.slice(overdueIdx - 50, overdueIdx + 400);
    expect(overdueBlock).toMatch(/eq\s*\(\s*invoices\.customerId\s*,\s*data\.customerId/);
  });

  // ─── Requirement 9.9: nextDueDate is not date-scoped ─────────────────────

  it("nextDueDate query does NOT use invoiceWhereClause (all-time)", () => {
    const nextDueIdx = ledgerSection.indexOf("nextDueRow");
    expect(nextDueIdx).toBeGreaterThan(-1);

    const nextDueBlock = ledgerSection.slice(
      Math.max(0, nextDueIdx - 50),
      nextDueIdx + 400,
    );

    // The nextDueDate query must NOT reference invoiceWhereClause
    expect(nextDueBlock).not.toMatch(/invoiceWhereClause/);
  });

  it("nextDueDate query uses findFirst ordered by creditReturnDate ascending", () => {
    expect(ledgerSection).toMatch(/drizzleAsc\s*\(\s*invoices\.creditReturnDate/);
  });

  it("nextDueDate query filters for credit > 0 and creditReturnDate isNotNull", () => {
    const nextDueIdx = ledgerSection.indexOf("nextDueRow");
    const nextDueBlock = ledgerSection.slice(nextDueIdx - 50, nextDueIdx + 400);
    expect(nextDueBlock).toMatch(/gt\s*\(\s*invoices\.credit\s*,\s*["']0["']/);
    expect(nextDueBlock).toMatch(/isNotNull\s*\(\s*invoices\.creditReturnDate/);
  });

  it("nextDueDate query is scoped to the customer via eq(invoices.customerId)", () => {
    const nextDueIdx = ledgerSection.indexOf("nextDueRow");
    const nextDueBlock = ledgerSection.slice(nextDueIdx - 50, nextDueIdx + 400);
    expect(nextDueBlock).toMatch(/eq\s*\(\s*invoices\.customerId\s*,\s*data\.customerId/);
  });

  // ─── Structural separation: date-scoped vs all-time ──────────────────────

  it("invoiceWhereClause is used for invoice list and period aggregates but NOT for overdue/nextDue", () => {
    // invoiceWhereClause should appear for: count query, findMany, aggResult
    // but NOT in the overdueResult or nextDueRow blocks
    const whereClauseMatches = (ledgerSection.match(/invoiceWhereClause/g) || []).length;
    // At minimum 3 uses: count, findMany, aggResult
    expect(whereClauseMatches).toBeGreaterThanOrEqual(3);

    // Verify overdue block is separate
    const overdueIdx = ledgerSection.indexOf("overdueResult");
    const overdueBlock = ledgerSection.slice(overdueIdx - 50, overdueIdx + 400);
    expect(overdueBlock).not.toMatch(/invoiceWhereClause/);

    // Verify nextDue block is separate
    const nextDueIdx = ledgerSection.indexOf("nextDueRow");
    const nextDueBlock = ledgerSection.slice(nextDueIdx - 50, nextDueIdx + 400);
    expect(nextDueBlock).not.toMatch(/invoiceWhereClause/);
  });
});
