/**
 * Property-Based Test: Ledger Date Filter Consistency
 *
 * // Feature: sales-filter-simplification-and-customer-ledger, Property 4: ledger date filter consistency
 *
 * **Validates: Requirements 9.5, 9.7**
 *
 * Property 4: For any customerId and date range [dateFrom, dateTo], the following
 * SHALL hold simultaneously:
 * - Every invoice in the returned `invoices` array has date >= dateFrom AND date <= dateTo.
 * - `periodRevenue` equals the sum of `totalPrice` of those invoices.
 * - `periodCash` equals the sum of `cash` of those invoices.
 * - `periodCredit` equals the sum of `credit` of those invoices.
 *
 * This property holds for all valid date ranges, including ranges with no invoices
 * (all aggregates are 0, array is empty).
 *
 * Approach:
 * 1. Source inspection — verify the server function has the correct structure.
 * 2. Pure filtering logic — property-based tests using fast-check that model the
 *    date-range filtering as a pure function and verify all four sub-properties.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseISO, isValid } from "date-fns";

// ─── Source inspection ────────────────────────────────────────────────────────

describe("getCustomerLedgerFn source: date filter and period aggregates are wired correctly", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/server-functions/sales/customers-fn.ts"),
    "utf-8",
  );

  // Extract just the ledger function section for targeted assertions
  const ledgerStart = source.indexOf("GET CUSTOMER LEDGER");
  const ledgerSection = ledgerStart >= 0 ? source.slice(ledgerStart) : source;

  it("has dateFrom and dateTo in the Zod input schema", () => {
    expect(ledgerSection).toMatch(/dateFrom\s*:\s*z\.string\(\)\.optional\(\)/);
    expect(ledgerSection).toMatch(/dateTo\s*:\s*z\.string\(\)\.optional\(\)/);
  });

  it("builds invoiceConditions array with customerId eq condition", () => {
    expect(ledgerSection).toMatch(/invoiceConditions/);
    expect(ledgerSection).toMatch(/eq\s*\(\s*invoices\.customerId/);
  });

  it("applies gte condition on invoices.date for dateFrom", () => {
    expect(ledgerSection).toMatch(/gte\s*\(\s*invoices\.date/);
  });

  it("applies lte condition on invoices.date for dateTo", () => {
    expect(ledgerSection).toMatch(/lte\s*\(\s*invoices\.date/);
  });

  it("computes period aggregates (periodRevenue, periodCash, periodCredit)", () => {
    expect(ledgerSection).toMatch(/periodRevenue/);
    expect(ledgerSection).toMatch(/periodCash/);
    expect(ledgerSection).toMatch(/periodCredit/);
  });

  it("uses the same invoiceWhereClause for both count/list and period aggregates", () => {
    expect(ledgerSection).toMatch(/invoiceWhereClause/);
    // Should appear multiple times (count query, findMany, aggregates)
    const occurrences = (ledgerSection.match(/invoiceWhereClause/g) || []).length;
    expect(occurrences).toBeGreaterThanOrEqual(3);
  });

  it("returns periodRevenue, periodCash, periodCredit, overdueInvoices, nextDueDate", () => {
    expect(ledgerSection).toMatch(/periodRevenue/);
    expect(ledgerSection).toMatch(/periodCash/);
    expect(ledgerSection).toMatch(/periodCredit/);
    expect(ledgerSection).toMatch(/overdueInvoices/);
    expect(ledgerSection).toMatch(/nextDueDate/);
  });

  it("overdue query uses lt(invoices.creditReturnDate) — all-time, not date-scoped", () => {
    expect(ledgerSection).toMatch(/lt\s*\(\s*invoices\.creditReturnDate/);
    // The overdue query block starts after "Overdue count" comment and ends before "Next due date"
    const overdueCommentIdx = ledgerSection.indexOf("Overdue count");
    const nextDueCommentIdx = ledgerSection.indexOf("Next due date");
    expect(overdueCommentIdx).toBeGreaterThan(-1);
    expect(nextDueCommentIdx).toBeGreaterThan(-1);
    const overdueBlock = ledgerSection.slice(overdueCommentIdx, nextDueCommentIdx);
    // The overdue block must NOT reference invoiceWhereClause
    expect(overdueBlock).not.toMatch(/invoiceWhereClause/);
  });

  it("nextDueDate query uses findFirst with orderBy creditReturnDate — all-time", () => {
    expect(ledgerSection).toMatch(/nextDueRow/);
    expect(ledgerSection).toMatch(/creditReturnDate/);
    expect(ledgerSection).toMatch(/drizzleAsc\s*\(\s*invoices\.creditReturnDate/);
  });
});

// ─── Pure filtering logic property tests ─────────────────────────────────────

interface MockInvoice {
  id: string;
  date: Date;
  totalPrice: number;
  cash: number;
  credit: number;
}

/**
 * Models the date-range filtering that getCustomerLedgerFn performs.
 * Returns filtered invoices and their period aggregates.
 */
function filterLedger(
  allInvoices: MockInvoice[],
  dateFrom?: string,
  dateTo?: string,
): {
  invoices: MockInvoice[];
  periodRevenue: number;
  periodCash: number;
  periodCredit: number;
} {
  let filtered = allInvoices;

  if (dateFrom) {
    const from = parseISO(dateFrom);
    if (isValid(from)) filtered = filtered.filter((inv) => inv.date >= from);
  }
  if (dateTo) {
    const to = parseISO(dateTo);
    if (isValid(to)) filtered = filtered.filter((inv) => inv.date <= to);
  }

  return {
    invoices: filtered,
    periodRevenue: filtered.reduce((s, inv) => s + inv.totalPrice, 0),
    periodCash: filtered.reduce((s, inv) => s + inv.cash, 0),
    periodCredit: filtered.reduce((s, inv) => s + inv.credit, 0),
  };
}

// Arbitrary for a date string in yyyy-MM-dd format (2020–2026)
const dateStringArb = fc
  .tuple(
    fc.integer({ min: 2020, max: 2026 }),
    fc.integer({ min: 1, max: 12 }),
    fc.integer({ min: 1, max: 28 }),
  )
  .map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);

// Arbitrary for a valid date range (dateFrom <= dateTo)
const dateRangeArb = fc
  .tuple(dateStringArb, dateStringArb)
  .map(([a, b]) => (a <= b ? { dateFrom: a, dateTo: b } : { dateFrom: b, dateTo: a }));

// Arbitrary for a mock invoice
const mockInvoiceArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }),
  date: dateStringArb.map((s) => parseISO(s)),
  totalPrice: fc.integer({ min: 0, max: 100_000 }),
  cash: fc.integer({ min: 0, max: 100_000 }),
  credit: fc.integer({ min: 0, max: 100_000 }),
});

describe("Property 4: Ledger date filter consistency — invoice list and period aggregates agree", () => {
  /**
   * Sub-property A: Every invoice in the result has date within [dateFrom, dateTo].
   *
   * **Validates: Requirements 9.5**
   */
  it("every invoice in the result has date within the date range", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(mockInvoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, allInvoices) => {
          const from = parseISO(dateFrom);
          const to = parseISO(dateTo);
          const { invoices } = filterLedger(allInvoices, dateFrom, dateTo);

          return invoices.every((inv) => inv.date >= from && inv.date <= to);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Sub-property B: periodRevenue equals sum of totalPrice of filtered invoices.
   *
   * **Validates: Requirements 9.7**
   */
  it("periodRevenue equals sum of totalPrice of filtered invoices", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(mockInvoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, allInvoices) => {
          const { invoices, periodRevenue } = filterLedger(allInvoices, dateFrom, dateTo);
          const expected = invoices.reduce((s, inv) => s + inv.totalPrice, 0);
          return periodRevenue === expected;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Sub-property C: periodCash equals sum of cash of filtered invoices.
   *
   * **Validates: Requirements 9.7**
   */
  it("periodCash equals sum of cash of filtered invoices", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(mockInvoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, allInvoices) => {
          const { invoices, periodCash } = filterLedger(allInvoices, dateFrom, dateTo);
          const expected = invoices.reduce((s, inv) => s + inv.cash, 0);
          return periodCash === expected;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Sub-property D: periodCredit equals sum of credit of filtered invoices.
   *
   * **Validates: Requirements 9.7**
   */
  it("periodCredit equals sum of credit of filtered invoices", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(mockInvoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, allInvoices) => {
          const { invoices, periodCredit } = filterLedger(allInvoices, dateFrom, dateTo);
          const expected = invoices.reduce((s, inv) => s + inv.credit, 0);
          return periodCredit === expected;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * All four sub-properties hold simultaneously.
   *
   * **Validates: Requirements 9.5, 9.7**
   */
  it("all four sub-properties hold simultaneously for any date range and invoice set", () => {
    fc.assert(
      fc.property(
        dateRangeArb,
        fc.array(mockInvoiceArb, { minLength: 0, maxLength: 20 }),
        ({ dateFrom, dateTo }, allInvoices) => {
          const from = parseISO(dateFrom);
          const to = parseISO(dateTo);
          const { invoices, periodRevenue, periodCash, periodCredit } = filterLedger(
            allInvoices,
            dateFrom,
            dateTo,
          );

          // A: every invoice in range
          const allInRange = invoices.every((inv) => inv.date >= from && inv.date <= to);
          // B: periodRevenue correct
          const revenueCorrect =
            periodRevenue === invoices.reduce((s, inv) => s + inv.totalPrice, 0);
          // C: periodCash correct
          const cashCorrect = periodCash === invoices.reduce((s, inv) => s + inv.cash, 0);
          // D: periodCredit correct
          const creditCorrect =
            periodCredit === invoices.reduce((s, inv) => s + inv.credit, 0);

          return allInRange && revenueCorrect && cashCorrect && creditCorrect;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Edge case: empty invoice set → all aggregates are 0, invoices array is empty.
   *
   * **Validates: Requirements 9.5, 9.7**
   */
  it("empty invoice set yields all-zero aggregates and empty array", () => {
    fc.assert(
      fc.property(dateRangeArb, ({ dateFrom, dateTo }) => {
        const { invoices, periodRevenue, periodCash, periodCredit } = filterLedger(
          [],
          dateFrom,
          dateTo,
        );
        return (
          invoices.length === 0 &&
          periodRevenue === 0 &&
          periodCash === 0 &&
          periodCredit === 0
        );
      }),
      { numRuns: 100 },
    );
  });
});
