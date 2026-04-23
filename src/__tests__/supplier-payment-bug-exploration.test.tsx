/**
 * Bug Condition Exploration Tests
 *
 * These tests MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the tests or the code when they fail.
 * GOAL: Surface counterexamples that demonstrate each bug on the current code.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ─── Mock external dependencies that require server/network context ───────────

// Mock TanStack Query
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

// Mock TanStack Router
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
  useRouter: vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock server functions (they require HTTP context)
vi.mock("@/server-functions/suppliers/update-purchase-record-fn", () => ({
  updatePurchaseRecordFn: vi.fn(),
}));

vi.mock("@/server-functions/suppliers/add-payment-fn", () => ({
  addPaymentFn: vi.fn(),
}));

vi.mock("@/server-functions/finance-fn", () => ({
  getWalletsListFn: vi.fn(() => Promise.resolve([])),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { EditPurchaseDialog } from "@/components/suppliers/edit-purchase-dialog";
import { RecordPaymentDialog } from "@/components/suppliers/record-payment-dialog";
import { PaymentMethodSelect } from "@/components/suppliers/payment-method-select";

// ─── Test data ────────────────────────────────────────────────────────────────

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

// ─── Bug 2: isBugCondition_PaymentFieldsInEditDialog ─────────────────────────

describe("isBugCondition_PaymentFieldsInEditDialog", () => {
  /**
   * Bug 2: EditPurchaseDialog renders paymentMethod and paymentStatus fields.
   * These fields should NOT be present — payment initiation belongs only in RecordPaymentDialog.
   *
   * This test MUST FAIL on unfixed code (the fields ARE present).
   * Validates: Requirements 1.2, 2.2
   */
  it("EditPurchaseDialog should NOT render Payment Method or Payment Status fields", () => {
    render(
      <EditPurchaseDialog
        open={true}
        onOpenChange={vi.fn()}
        purchase={mockPurchase}
      />,
    );

    // These assertions will FAIL on unfixed code because the fields ARE rendered
    const paymentMethodLabel = screen.queryByText(/payment method/i);
    const paymentStatusLabel = screen.queryByText(/payment status/i);

    expect(
      paymentMethodLabel,
      "BUG 2 DETECTED: EditPurchaseDialog renders a 'Payment Method' field — it should not",
    ).toBeNull();

    expect(
      paymentStatusLabel,
      "BUG 2 DETECTED: EditPurchaseDialog renders a 'Payment Status' field — it should not",
    ).toBeNull();
  });
});

// ─── Bug 3: isBugCondition_LegacyPaymentDialog ───────────────────────────────

describe("isBugCondition_LegacyPaymentDialog", () => {
  /**
   * Bug 3: RecordPaymentDialog shows a static cash/bank_transfer/cheque select
   * and a "Paid By" free-text field instead of PaymentMethodSelect.
   *
   * This test MUST FAIL on unfixed code (legacy select IS present, PaymentMethodSelect is NOT).
   * Validates: Requirements 1.3, 1.4, 2.3, 2.4
   */
  it("RecordPaymentDialog should use PaymentMethodSelect and NOT render static Cash/Bank Transfer/Cheque options or Paid By field", () => {
    render(
      <RecordPaymentDialog
        open={true}
        onOpenChange={vi.fn()}
        supplierId="supplier-1"
        supplierName="Test Supplier"
        outstandingBalance={5000}
        purchaseId="purchase-1"
      />,
    );

    // Assert: "Paid By" field should NOT be present
    const paidByLabel = screen.queryByText(/paid by/i);
    expect(
      paidByLabel,
      "BUG 3 DETECTED: RecordPaymentDialog renders a 'Paid By' field — it should not",
    ).toBeNull();

    // Assert: Static "Cash" SelectItem should NOT be present
    // The legacy select renders SelectItem with text "Cash", "Bank Transfer", "Cheque"
    const cashOption = screen.queryByText(/^cash$/i);
    expect(
      cashOption,
      "BUG 3 DETECTED: RecordPaymentDialog renders a static 'Cash' option — should use PaymentMethodSelect instead",
    ).toBeNull();

    const bankTransferOption = screen.queryByText(/^bank transfer$/i);
    expect(
      bankTransferOption,
      "BUG 3 DETECTED: RecordPaymentDialog renders a static 'Bank Transfer' option — should use PaymentMethodSelect instead",
    ).toBeNull();

    const chequeOption = screen.queryByText(/^cheque$/i);
    expect(
      chequeOption,
      "BUG 3 DETECTED: RecordPaymentDialog renders a static 'Cheque' option — should use PaymentMethodSelect instead",
    ).toBeNull();

    // Assert: PaymentMethodSelect IS present (it renders "Pay Later" as the first option)
    // PaymentMethodSelect always renders a "Pay Later" SelectItem
    // Use queryAllByText because the select renders both a visible span and a hidden option element
    const payLaterOptions = screen.queryAllByText(/pay later/i);
    expect(
      payLaterOptions.length,
      "BUG 3 DETECTED: RecordPaymentDialog does NOT render PaymentMethodSelect (no 'Pay Later' option found)",
    ).toBeGreaterThan(0);
  });
});

// ─── Bug 1: isBugCondition_PartialZeroDeduction ──────────────────────────────

describe("isBugCondition_PartialZeroDeduction", () => {
  /**
   * Bug 1: addPaymentFn never debits the wallet or creates an expense.
   * The function only inserts a supplierPayments row and increments paidAmount.
   *
   * We test this by inspecting the addPaymentFn handler source logic:
   * the handler in add-payment-fn.ts has NO wallet debit or expense insert code.
   *
   * This test MUST FAIL on unfixed code (addPaymentFn never debits wallet).
   * Validates: Requirements 1.5, 2.1, 2.5
   */
  it("addPaymentFn handler should contain wallet debit and expense creation logic", async () => {
    // Read the actual source of add-payment-fn.ts to verify it contains
    // wallet debit and expense creation logic.
    // On unfixed code, this logic is ABSENT — confirming Bug 1.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const handlerSource = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/add-payment-fn.ts"),
      "utf-8",
    );

    // These assertions will FAIL on unfixed code because the logic is absent

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn does not contain wallet debit logic (no 'wallets' import or update)",
    ).toMatch(/wallets/);

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn does not contain expense creation logic (no 'expenses' insert)",
    ).toMatch(/expenses/);

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn does not contain wallet balance deduction (no 'balance' update)",
    ).toMatch(/balance.*-.*amount|balance\s*-\s*data\.amount/);

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn does not check for 'pay_later' sentinel (no wallet-based branching)",
    ).toMatch(/pay_later/);
  });

  it("addPaymentFn schema should use walletId (not legacy method/bankName/paidBy)", async () => {
    // The unfixed schema uses method/bankName/paidBy — not walletId.
    // This test confirms the schema bug exists.
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const handlerSource = readFileSync(
      resolve(process.cwd(), "src/server-functions/suppliers/add-payment-fn.ts"),
      "utf-8",
    );

    // These assertions will FAIL on unfixed code because the schema uses legacy fields

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn schema still uses legacy 'method' field (cash/bank_transfer/cheque enum) instead of walletId",
    ).not.toMatch(/method:\s*z\.enum\(\["cash"/);

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn schema still uses legacy 'paidBy' field instead of walletId",
    ).not.toMatch(/paidBy:\s*z\.string/);

    expect(
      handlerSource,
      "BUG 1 DETECTED: addPaymentFn schema does not have walletId field",
    ).toMatch(/walletId:\s*z\.string/);
  });
});
