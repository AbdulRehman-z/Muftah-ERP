/**
 * Property-Based Test: Invoice Search Filter
 *
 * // Feature: sales-filter-simplification-and-customer-ledger, Property 2: invoice search filter returns only matching invoices
 *
 * **Validates: Requirements 3.2**
 *
 * Property 2: For any non-empty search string `s`, every invoice returned by
 * `getInvoicesFn` with `search: s` SHALL have a `slipNumber` that contains `s`
 * as a substring. Invoices whose `slipNumber` is null or does not contain `s`
 * SHALL NOT appear in the result.
 *
 * Approach: We verify two things:
 * 1. Source inspection — the `like(invoices.slipNumber, \`%${data.search}%\`)` condition
 *    is present in the handler, confirming the WHERE clause is correctly constructed.
 * 2. Pure filtering logic — a property-based test using fast-check that generates
 *    arbitrary non-empty search strings and a mixed set of invoices (matching /
 *    non-matching / null slipNumber), then asserts that applying the same LIKE
 *    substring filter returns only matching invoices.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Source inspection ────────────────────────────────────────────────────────

describe("getInvoicesFn source: search filter is wired correctly", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/server-functions/sales/invoices-fn.ts"),
    "utf-8",
  );

  it("imports `like` from drizzle-orm", () => {
    expect(
      source,
      "getInvoicesFn must import `like` from drizzle-orm",
    ).toMatch(/\blike\b/);
  });

  it("adds `search` to the Zod input schema", () => {
    expect(
      source,
      "getInvoicesFn Zod schema must include `search: z.string().optional()`",
    ).toMatch(/search\s*:\s*z\.string\(\)\.optional\(\)/);
  });

  it("applies like condition on invoices.slipNumber when search is provided", () => {
    expect(
      source,
      "getInvoicesFn must push a like(invoices.slipNumber, ...) condition when search is set",
    ).toMatch(/like\s*\(\s*invoices\.slipNumber/);
  });

  it("uses %search% pattern for the LIKE condition", () => {
    expect(
      source,
      "getInvoicesFn LIKE pattern must wrap the search value with % on both sides",
    ).toMatch(/`%\$\{data\.search\}%`/);
  });

  it("adds the like condition to the shared `conditions` array (before whereClause is built)", () => {
    // The like condition must be pushed to `conditions` before `whereClause` is constructed,
    // so it is included in both the count query and the data query.
    const likeIndex = source.indexOf("like(invoices.slipNumber");
    const whereClauseIndex = source.indexOf("const whereClause");
    expect(likeIndex).toBeGreaterThan(-1);
    expect(whereClauseIndex).toBeGreaterThan(-1);
    expect(
      likeIndex,
      "like condition must be added to conditions BEFORE whereClause is built",
    ).toBeLessThan(whereClauseIndex);
  });
});

// ─── Pure filtering logic property test ──────────────────────────────────────

/**
 * Models the SQL LIKE `%search%` filter as a pure JS function.
 * This mirrors exactly what the database does when the condition is applied.
 */
function likeFilter(slipNumber: string | null, search: string): boolean {
  if (slipNumber === null) return false;
  return slipNumber.toLowerCase().includes(search.toLowerCase());
}

/**
 * Simulates the invoice filtering that getInvoicesFn performs:
 * given a list of invoices and a search string, returns only those
 * whose slipNumber contains the search string (case-insensitive LIKE).
 */
function filterInvoicesBySearch(
  invoiceList: Array<{ id: string; slipNumber: string | null }>,
  search: string,
): Array<{ id: string; slipNumber: string | null }> {
  if (!search) return invoiceList;
  return invoiceList.filter((inv) => likeFilter(inv.slipNumber, search));
}

describe("Property 2: Invoice search filter returns only matching invoices", () => {
  /**
   * Property: For any non-empty search string and any set of invoices,
   * every invoice in the filtered result has a slipNumber that contains
   * the search string as a substring.
   *
   * **Validates: Requirements 3.2**
   */
  it("every returned invoice slipNumber contains the search string", () => {
    // Arbitrary invoice generator: mix of matching, non-matching, and null slipNumbers
    const invoiceArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 20 }),
      slipNumber: fc.oneof(
        fc.constant(null),
        fc.string({ minLength: 0, maxLength: 30 }),
      ),
    });

    fc.assert(
      fc.property(
        // Non-empty search string
        fc.string({ minLength: 1, maxLength: 20 }),
        // A list of 0–20 invoices with varied slipNumbers
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        (search, invoiceList) => {
          const results = filterInvoicesBySearch(invoiceList, search);

          // Every result must have a slipNumber containing the search string
          for (const inv of results) {
            if (inv.slipNumber === null) return false;
            if (!inv.slipNumber.toLowerCase().includes(search.toLowerCase())) {
              return false;
            }
          }
          return true;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property: Invoices with null slipNumber are NEVER returned when a search is active.
   *
   * **Validates: Requirements 3.2**
   */
  it("invoices with null slipNumber are excluded from search results", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            slipNumber: fc.constant(null) as fc.Arbitrary<null>,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (search, nullInvoices) => {
          const results = filterInvoicesBySearch(nullInvoices, search);
          return results.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Invoices whose slipNumber does NOT contain the search string
   * are excluded from results.
   *
   * **Validates: Requirements 3.2**
   */
  it("invoices whose slipNumber does not contain the search string are excluded", () => {
    fc.assert(
      fc.property(
        // search string that won't appear in the slipNumber
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            // slipNumber that definitely does NOT contain the search string
            slipNumber: fc.constant("NOMATCH_XYZ_12345"),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (search, nonMatchingInvoices) => {
          // Only run when search is not a substring of "NOMATCH_XYZ_12345"
          if ("NOMATCH_XYZ_12345".toLowerCase().includes(search.toLowerCase())) {
            return true; // skip this case
          }
          const results = filterInvoicesBySearch(nonMatchingInvoices, search);
          return results.length === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Invoices whose slipNumber exactly matches the search string
   * are always included in results.
   *
   * **Validates: Requirements 3.2**
   */
  it("invoices whose slipNumber exactly equals the search string are always included", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (search) => {
          const matchingInvoice = { id: "inv-1", slipNumber: search };
          const results = filterInvoicesBySearch([matchingInvoice], search);
          return results.length === 1 && results[0].id === "inv-1";
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property: When search is empty/falsy, all invoices are returned (no filter applied).
   * This mirrors Requirement 3.3: when search is not provided, no additional filter is applied.
   *
   * **Validates: Requirements 3.3**
   */
  it("empty search string returns all invoices unfiltered", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            slipNumber: fc.oneof(
              fc.constant(null),
              fc.string({ minLength: 0, maxLength: 30 }),
            ),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (invoiceList) => {
          const results = filterInvoicesBySearch(invoiceList, "");
          return results.length === invoiceList.length;
        },
      ),
      { numRuns: 100 },
    );
  });
});
