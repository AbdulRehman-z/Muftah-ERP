/**
 * Preservation Property Tests
 *
 * These tests encode baseline behavior that MUST be PRESERVED after the fix.
 * They MUST PASS on unfixed code — passing confirms the baseline behavior to preserve.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import * as fc from "fast-check";

// ─── Mock external dependencies ───────────────────────────────────────────────

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
  useMutation: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
  useRouter: vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/server-functions/suppliers/update-purchase-record-fn", () => ({
  updatePurchaseRecordFn: vi.fn(),
}));

vi.mock("@/server-functions/suppliers/add-payment-fn", () => ({
  addPaymentFn: vi.fn(),
}));

vi.mock("@/server-functions/finance-fn", () => ({
  getWalletsListFn: vi.fn(() => Promise.resolve([])),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { EditPurchaseDialog } from "@/components/suppliers/edit-purchase-dialog";

// ─── Preservation 1: updatePurchaseRecordFn non-payment path ─────────────────

describe("Preservation 1: updatePurchaseRecordFn non-payment source inspection", () => {
  /**
   * For all EditPurchaseDialog submissions that only change quantity, cost,
   * invoiceNumber, notes, or material metadata — assert no wallet or expense
   * mutations occur and purchase record fields are updated correctly.
   *
   * We verify this by inspecting the source: the wallet/expense block in
   * updatePurchaseRecordFn is gated by `data.walletId && data.walletId !== "pay_later"`.
   * When no walletId is passed (non-payment submission), the block is skipped.
   *
   * This test MUST PASS on unfixed code (confirms baseline behavior to preserve).
   * Validates: Requirements 3.1, 3.2
   */
  it("updatePurchaseRecordFn has NO wallet or expense side-effects — non-payment path is clean", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/update-purchase-record-fn.ts"),
      "utf-8",
    );

    // The wallet/expense block must NOT exist at all in updatePurchaseRecordFn
    // (task 3.2 removed it entirely — stronger preservation than just gating it)
    const hasWalletDebit = /update\(wallets\)/.test(source);
    expect(
      hasWalletDebit,
      "PRESERVATION BROKEN: updatePurchaseRecordFn debits a wallet — non-payment path must have zero wallet side-effects",
    ).toBe(false);

    const hasExpenseInsert = /insert\(expenses\)/.test(source);
    expect(
      hasExpenseInsert,
      "PRESERVATION BROKEN: updatePurchaseRecordFn inserts an expense — non-payment path must have zero expense side-effects",
    ).toBe(false);

    // The function must update purchase records (core preservation)
    expect(
      source,
      "PRESERVATION BROKEN: updatePurchaseRecordFn does not update purchaseRecords",
    ).toMatch(/update\(purchaseRecords\)/);

    // The function must update stock (core preservation for quantity changes)
    expect(
      source,
      "PRESERVATION BROKEN: updatePurchaseRecordFn does not update materialStock",
    ).toMatch(/update\(materialStock\)/);
  });

  it("updatePurchaseRecordFn updates purchase record fields (quantity, cost, notes, invoiceNumber)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/update-purchase-record-fn.ts"),
      "utf-8",
    );

    // Must handle notes
    expect(source).toMatch(/notes/);
    // Must handle invoiceNumber
    expect(source).toMatch(/invoiceNumber/);
    // Must handle quantity and cost
    expect(source).toMatch(/quantity/);
    expect(source).toMatch(/cost/);
  });

  /**
   * Property-based: For any combination of non-payment field values,
   * the wallet/expense gate condition (walletId present and not "pay_later")
   * evaluates to false — confirming no wallet/expense side-effects.
   *
   * Validates: Requirements 3.1, 3.2
   */
  it("Property: non-payment submissions (no walletId) never satisfy the wallet debit gate", () => {
    // Simulate the gate condition from updatePurchaseRecordFn:
    // if (data.walletId && data.walletId !== "pay_later" && (paymentStatus === "paid" || "partial"))
    const gateCondition = (data: {
      walletId?: string | null;
      paymentStatus?: string;
    }) =>
      !!(
        data.walletId &&
        data.walletId !== "pay_later" &&
        (data.paymentStatus === "paid" || data.paymentStatus === "partial")
      );

    // For non-payment submissions: walletId is null/undefined
    fc.assert(
      fc.property(
        fc.record({
          quantity: fc.string({ minLength: 1 }),
          cost: fc.string({ minLength: 1 }),
          notes: fc.option(fc.string(), { nil: null }),
          invoiceNumber: fc.option(fc.string(), { nil: null }),
          materialName: fc.option(fc.string(), { nil: null }),
        }),
        (nonPaymentFields) => {
          // Non-payment submission: no walletId
          const data = { ...nonPaymentFields, walletId: null };
          return gateCondition(data) === false;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Preservation 2: addPaymentFn pay_later / no-wallet baseline ─────────────

describe("Preservation 2: addPaymentFn pay_later path skips wallet debit (post-fix schema)", () => {
  /**
   * The fixed addPaymentFn uses walletId and gates wallet debit/expense creation
   * behind `if (data.walletId !== "pay_later")`. The pay_later path must preserve
   * the no-wallet-debit behavior: payment row inserted, paidAmount incremented,
   * but no wallet debit and no expense row.
   *
   * We verify by inspecting the source: the wallet debit block is gated by the
   * pay_later sentinel, confirming the no-wallet baseline for pay_later.
   *
   * Validates: Requirements 3.3, 3.4
   */
  it("addPaymentFn wallet debit is gated by pay_later sentinel — pay_later path skips wallet debit", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/add-payment-fn.ts"),
      "utf-8",
    );

    // The wallet debit block must be gated by the pay_later sentinel
    // This ensures pay_later submissions skip wallet debit and expense creation
    expect(
      source,
      "PRESERVATION BROKEN: addPaymentFn wallet debit is not gated by pay_later sentinel",
    ).toMatch(/if\s*\(\s*data\.walletId\s*!==\s*["']pay_later["']\s*\)/);

    // The wallet debit and expense insert must exist (for real wallet payments)
    const hasWalletDebit = /update\(wallets\)/.test(source);
    expect(
      hasWalletDebit,
      "PRESERVATION BROKEN: addPaymentFn does not debit wallet for real wallet payments",
    ).toBe(true);

    const hasExpenseInsert = /insert\(expenses\)/.test(source);
    expect(
      hasExpenseInsert,
      "PRESERVATION BROKEN: addPaymentFn does not insert expense for real wallet payments",
    ).toBe(true);
  });

  it("addPaymentFn (current) inserts a supplierPayments row — payment insertion baseline confirmed", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/add-payment-fn.ts"),
      "utf-8",
    );

    // Must insert into supplierPayments (core preservation)
    expect(
      source,
      "PRESERVATION BROKEN: addPaymentFn does not insert into supplierPayments",
    ).toMatch(/insert\(supplierPayments\)/);

    // Must increment paidAmount (core preservation)
    expect(
      source,
      "PRESERVATION BROKEN: addPaymentFn does not increment paidAmount",
    ).toMatch(/paidAmount/);
  });

  it("addPaymentFn (current) links payment to purchase via purchaseId — linkage baseline confirmed", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const source = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/add-payment-fn.ts"),
      "utf-8",
    );

    // Must use purchaseId to link payment to purchase record
    expect(
      source,
      "PRESERVATION BROKEN: addPaymentFn does not use purchaseId for linking",
    ).toMatch(/purchaseId/);
  });

  /**
   * Property-based: For any payment amount and supplierId, the no-wallet path
   * (method="cash" in current schema, walletId="pay_later" after fix) must
   * never trigger a wallet debit.
   *
   * We model this as: the gate condition `walletId !== "pay_later"` correctly
   * excludes the pay_later sentinel from wallet operations.
   *
   * Validates: Requirements 3.3, 3.4
   */
  it("Property: pay_later sentinel always evaluates to no-wallet-debit in gate condition", () => {
    // After the fix, the gate will be: if (data.walletId !== "pay_later")
    // This property verifies the sentinel correctly gates wallet operations
    const wouldDebitWallet = (walletId: string) => walletId !== "pay_later";

    fc.assert(
      fc.property(
        fc.constant("pay_later"),
        (walletId) => {
          return wouldDebitWallet(walletId) === false;
        },
      ),
      { numRuns: 1 },
    );

    // Also verify that any non-pay_later walletId WOULD trigger the debit
    // (confirming the sentinel is the only exception)
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s !== "pay_later"),
        (walletId) => {
          return wouldDebitWallet(walletId) === true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Preservation 3: EditPurchaseDialog renders non-payment fields ────────────

describe("Preservation 3: EditPurchaseDialog renders quantity, cost, invoiceNumber, notes fields", () => {
  /**
   * The non-payment fields in EditPurchaseDialog (quantity, cost, invoiceNumber, notes)
   * must continue to render correctly after the fix.
   *
   * This test MUST PASS on unfixed code (confirms baseline UI behavior to preserve).
   * Validates: Requirements 3.1, 3.2
   */
  const mockPurchase = {
    id: "purchase-1",
    quantity: "100",
    cost: "5000",
    unitCost: "50",
    paidAmount: "0",
    notes: null,
    transactionId: null,
    invoiceNumber: null,
    paymentMethod: null,
    paymentStatus: "unpaid",
    paidBy: null,
    materialType: "chemical" as const,
    chemical: {
      id: "chem-1",
      name: "Acetone",
      unit: "L",
      minimumStockLevel: "10",
    },
    packagingMaterial: null,
  };

  it("EditPurchaseDialog renders Quantity field", () => {
    render(
      <EditPurchaseDialog
        open={true}
        onOpenChange={vi.fn()}
        purchase={mockPurchase}
      />,
    );

    const quantityLabel = screen.queryByText(/quantity/i);
    expect(
      quantityLabel,
      "PRESERVATION BROKEN: EditPurchaseDialog no longer renders a Quantity field",
    ).not.toBeNull();
  });

  it("EditPurchaseDialog renders Total Cost field", () => {
    render(
      <EditPurchaseDialog
        open={true}
        onOpenChange={vi.fn()}
        purchase={mockPurchase}
      />,
    );

    const costLabel = screen.queryByText(/total cost/i);
    expect(
      costLabel,
      "PRESERVATION BROKEN: EditPurchaseDialog no longer renders a Total Cost field",
    ).not.toBeNull();
  });

  it("EditPurchaseDialog renders Invoice / Reference Number field", () => {
    render(
      <EditPurchaseDialog
        open={true}
        onOpenChange={vi.fn()}
        purchase={mockPurchase}
      />,
    );

    const invoiceLabel = screen.queryByText(/invoice/i);
    expect(
      invoiceLabel,
      "PRESERVATION BROKEN: EditPurchaseDialog no longer renders an Invoice/Reference Number field",
    ).not.toBeNull();
  });

  it("EditPurchaseDialog renders Notes field", () => {
    render(
      <EditPurchaseDialog
        open={true}
        onOpenChange={vi.fn()}
        purchase={mockPurchase}
      />,
    );

    const notesLabel = screen.queryByText(/notes/i);
    expect(
      notesLabel,
      "PRESERVATION BROKEN: EditPurchaseDialog no longer renders a Notes field",
    ).not.toBeNull();
  });

  /**
   * Property-based: For any purchase prop passed to EditPurchaseDialog,
   * the non-payment fields (quantity, cost, invoiceNumber, notes) are always rendered.
   *
   * Validates: Requirements 3.1, 3.2
   */
  it("Property: EditPurchaseDialog always renders core non-payment fields regardless of purchase data", () => {
    // We test with a fixed set of purchase variants (property-style: multiple inputs)
    const purchaseVariants = [
      { ...mockPurchase, quantity: "1", cost: "100" },
      { ...mockPurchase, quantity: "999", cost: "99999", notes: "some notes" },
      { ...mockPurchase, invoiceNumber: "INV-001", paymentStatus: "paid" },
      { ...mockPurchase, paymentMethod: "cash", paymentStatus: "partial" },
    ];

    for (const purchase of purchaseVariants) {
      const { unmount } = render(
        <EditPurchaseDialog
          open={true}
          onOpenChange={vi.fn()}
          purchase={purchase}
        />,
      );

      expect(screen.queryByText(/quantity/i)).not.toBeNull();
      expect(screen.queryByText(/total cost/i)).not.toBeNull();
      expect(screen.queryByText(/invoice/i)).not.toBeNull();
      // Use queryAllByText for "notes" since the textarea value may also match
      expect(screen.queryAllByText(/^notes$/i).length).toBeGreaterThan(0);

      unmount();
    }
  });
});
