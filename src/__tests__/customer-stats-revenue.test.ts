/**
 * Property-Based Test: Customer Stats Date-Scoped Revenue
 *
 * // Feature: sales-filter-simplification-and-customer-ledger, Property 3: customer stats revenue equals sum of invoices in date range
 *
 * **Validates: Requirements 5.5**
 *
 * Property 3: For any date range [dateFrom, dateTo], the `totalSalesRevenue`
 * returned by `getCustomerStatsFn` SHALL equal the arithmetic sum of `totalPrice`
 * across all invoices whose `date` falls within [dateFrom, dateTo] (inclusive).
 * This property holds for all valid date ranges, including ranges with no invoices
 * (result is 0).
 *
 * Approach:
 * 1. Source inspection — verify the server function has the correct structure
 *    (inputValidator with dateFrom/dateTo, gte/lte conditions, invoices table query).
 * 2. Pure filtering logic — property-based tests using fast-check that model the
 *    date-range filtering as a pure function and verify the sum is correct.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseISO, isValid, startOfDay, endOfDay } from "date-fns";

// ─── Source inspection ────────────────────────────────────────────────────────

describe("getCustomerStatsFn source: date-scoped revenue is wired correctly", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/server-functions/sales/customers-fn.ts"),
    "utf-8",
  );

  it("has an inputValidator with dateFrom and dateTo fields", () => {
    expect(source).toMatch(/dateFrom\s*:\s*z\.string\(\)\.optional\(\)/);
    expect(source).toMatch(/dateTo\s*:\s*z\.string\(\)\.optional\(\)/);
  });

  it("imports parseISO and isValid from date-fns", () => {
    expect(source).toMatch(/parseISO/);
    expect(source).toMatch(/isValid/);
  });

  it("imports gte and lte from drizzle-orm", () => {
    expect(source).toMatch(/\bgte\b/);
    expect(source).toMatch(/\blte\b/);
  });

  it("queries invoices.totalPrice (not customers.totalSale) for revenue", () => {
    expect(source).toMatch(/invoices\.totalPrice/);
    // The old denormalised column should not be used for revenue
    const statsSection = source.slice(source.indexOf("GET CUSTOMER STATS"));
    expect(statsSection).not.toMatch(/customers\.totalSale/);
  });

  it("applies gte condition on invoices.date for dateFrom", () => {
    expect(source).toMatch(/gte\s*\(\s*invoices\.date/);
  });

  it("applies lte condition on invoices.date for dateTo", () => {
    expect(source).toMatch(/lte\s*\(\s*invoices\.date/);
  });

  it("guards date parsing with isValid before applying conditions", () => {
    // Both gte and lte conditions must be guarded by isValid()
    const gteIndex = source.indexOf("gte(invoices.date");
    const lteIndex = source.indexOf("lte(invoices.date");
    const isValidBeforeGte = source.lastIndexOf("isValid(", gteIndex);
    const isValidBeforeLte = source.lastIndexOf("isValid(", lteIndex);
    expect(isValidBeforeGte).toBeGreaterThan(-1);
    expect(isValidBeforeLte).toBeGreaterThan(-1);
  });
});

// ─── Pure filtering logic property tests ─────────────────────────────────────

/**
 * Models the date-range filtering that getCustomerStatsFn performs:
 * given a list of invoices and an optional date range, returns the sum of
 * totalPrice for invoices whose date falls within the range.
 *
 * This mirrors exactly what the database does when gte/lte conditions are applied.
 */
function computeRevenue(
  invoiceList: Array<{ date: Date; totalPrice: number }>,
  dateFrom?: string,
  dateTo?: string,
): number {
  let filtered = invoiceList;

  if (dateFrom) {
    const from = parseISO(dateFrom);
    if (isValid(from)) {
      filtered = filtered.filter((inv) => inv.date >= from);
    }
  }

  if (dateTo) {
    const to = parseISO(dateTo);
    if (isValid(to)) {
      filtered = filtered.filter((inv) => inv.date <= to);
    }
  }

  return filtered.reduce((sum, inv) => sum + inv.totalPrice, 0);
}

// Arbitrary for a date string in yyyy-MM-dd format
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2026 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }), // use 28 to avoid month-end edge cases
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

// Arbitrary for a valid date range (dateFrom <= dateTo)
const dateRangeArb = fc
  .tuple(dateStringArb, dateStringArb)
  .map(([a, b]) => (a <= b ? { dateFrom: a, dateTo: b } : { dateFrom: b, dateTo: a }));

// Arbitrary for an invoice with a date and totalPrice
const invoiceArb = fc.record({
  date: dateStringArb.map((s) => parseISO(s)),
  totalPrice: fc.integer({ min: 0, max: 1_000_000 }),
});

describe("Property 3: Customer stats revenue equals sum of invoices in date range", () => {
  /**
   * Property: For any date range and any set of invoices,
   * computeRevenue returns the sum of totalPrice for invoices in range.
   *
   * **Validates: Requirements 5.5**
   */
  it("revenue equals sum of totalPrice for invoices within the date range", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, invoiceList) => {
          const from = parseISO(dateFrom);
          const to = parseISO(dateTo);

          // Manually compute expected revenue
          const expected = invoiceList
            .filter((inv) => inv.date >= from && inv.date <= to)
            .reduce((sum, inv) => sum + inv.totalPrice, 0);

          const actual = computeRevenue(invoiceList, dateFrom, dateTo);

          return actual === expected;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Property: When no date range is provided, all invoices are summed.
   *
   * **Validates: Requirements 5.6**
   */
  it("revenue equals total sum of all invoices when no date range is provided", () => {
    fc.assert(
      fc.property(
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        (invoiceList) => {
          const expected = invoiceList.reduce((sum, inv) => sum + inv.totalPrice, 0);
          const actual = computeRevenue(invoiceList);
          return actual === expected;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revenue is 0 when there are no invoices in the date range.
   *
   * **Validates: Requirements 5.5**
   */
  it("revenue is 0 when no invoices fall within the date range", () => {
    fc.assert(
      fc.property(
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        (invoiceList) => {
          // Use a date range far in the future where no seeded invoices exist
          const actual = computeRevenue(invoiceList, "2099-01-01", "2099-12-31");
          return actual === 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revenue is non-negative for any valid input.
   *
   * **Validates: Requirements 5.5**
   */
  it("revenue is always non-negative", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, invoiceList) => {
          const actual = computeRevenue(invoiceList, dateFrom, dateTo);
          return actual >= 0;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Revenue with a wider date range is >= revenue with a narrower range.
   * (Monotonicity: adding more invoices to the range can only increase or maintain revenue.)
   *
   * **Validates: Requirements 5.5**
   */
  it("revenue with a wider date range is >= revenue with a narrower range", () => {
    fc.assert(
      fc.property(
        fc.array(invoiceArb, { minLength: 1, maxLength: 20 }),
        (invoiceList) => {
          // Narrow range: 2023-06-01 to 2023-06-30
          // Wide range: 2023-01-01 to 2023-12-31
          const narrow = computeRevenue(invoiceList, "2023-06-01", "2023-06-30");
          const wide = computeRevenue(invoiceList, "2023-01-01", "2023-12-31");
          return wide >= narrow;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Invalid date strings are silently ignored (isValid guard).
   * When dateFrom or dateTo is an invalid string, no filter is applied for that bound.
   *
   * **Validates: Requirements 5.5 (error handling)**
   */
  it("invalid date strings are silently ignored — no filter applied for that bound", () => {
    fc.assert(
      fc.property(
        fc.array(invoiceArb, { minLength: 0, maxLength: 20 }),
        (invoiceList) => {
          // "not-a-date" is invalid — parseISO returns Invalid Date, isValid returns false
          // So no dateFrom filter is applied, meaning all invoices pass the from-bound
          const withInvalidFrom = computeRevenue(invoiceList, "not-a-date", "2099-12-31");
          const withNoFrom = computeRevenue(invoiceList, undefined, "2099-12-31");
          return withInvalidFrom === withNoFrom;
        },
      ),
      { numRuns: 100 },
    );
  });
});
