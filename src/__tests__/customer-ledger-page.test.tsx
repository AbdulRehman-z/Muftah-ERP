/**
 * Unit Tests: CustomerLedgerPage
 *
 * Tests:
 * - Renders overdue alert when overdueInvoices > 0, hides it when overdueInvoices === 0.
 * - Outstanding balance card is red when credit > 0, green when credit === 0.
 * - Date range defaults to current month on mount.
 * - Changing date range resets page to 1.
 * - Clicking an invoice row opens InvoiceDetailSheet with the correct invoiceId.
 *
 * Requirements: 8.2, 8.3, 8.5, 8.6, 9.1, 9.3, 10.3, 10.5
 *
 * Strategy: We test the CustomerLedgerPage component directly by mocking
 * Route.useParams via the @tanstack/react-router mock, and mocking all
 * external dependencies.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import type { DateRange } from "react-day-picker";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Track onDateChange for DatePickerWithRange
let capturedOnDateChange: ((date: DateRange | undefined) => void) | null = null;

vi.mock("@/components/custom/date-range-picker", () => ({
  DatePickerWithRange: ({
    date,
    onDateChange,
  }: {
    date: DateRange | undefined;
    onDateChange: (date: DateRange | undefined) => void;
  }) => {
    capturedOnDateChange = onDateChange;
    return (
      <div data-testid="date-range-picker">
        <span data-testid="ledger-date-from">
          {date?.from ? format(date.from, "yyyy-MM-dd") : "none"}
        </span>
        <span data-testid="ledger-date-to">
          {date?.to ? format(date.to, "yyyy-MM-dd") : "none"}
        </span>
        <button data-testid="clear-ledger-date" onClick={() => onDateChange(undefined)}>
          Clear
        </button>
      </div>
    );
  },
}));

// Track InvoiceDetailSheet state
let capturedInvoiceSheetOpen = false;
let capturedInvoiceId: string | null = null;

vi.mock("@/components/sales/invoice-detail-sheet", () => ({
  InvoiceDetailSheet: ({
    open,
    invoiceId,
  }: {
    open: boolean;
    invoiceId: string | null;
    onOpenChange: (open: boolean) => void;
  }) => {
    capturedInvoiceSheetOpen = open;
    capturedInvoiceId = invoiceId;
    return open ? (
      <div data-testid="invoice-detail-sheet" data-invoice-id={invoiceId}>
        Invoice Sheet
      </div>
    ) : null;
  },
}));

vi.mock("@/components/sales/customer-pagination", () => ({
  CustomerPagination: ({
    page,
    onPageChange,
  }: {
    page: number;
    onPageChange: (p: number) => void;
  }) => (
    <div data-testid="customer-pagination" data-page={page}>
      <button onClick={() => onPageChange(2)}>Page 2</button>
    </div>
  ),
}));

// Mock useRouter and Route.useParams
const mockBack = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: (_path: string) => (config: any) => ({
      ...config,
      useParams: () => ({ customerId: "cust-1" }),
      component: config.component,
    }),
    useRouter: () => ({ history: { back: mockBack } }),
  };
});

// Mock useGetCustomerLedger
const mockUseGetCustomerLedger = vi.fn();
vi.mock("@/hooks/sales/use-customers", () => ({
  useGetCustomerLedger: (customerId: string, params: any) =>
    mockUseGetCustomerLedger(customerId, params),
  customersKeys: {
    all: ["customers"],
    list: (p: any) => ["customers", "list", p],
    select: () => ["customers", "select"],
    stats: (p?: any) => ["customers", "stats", p ?? {}],
    ledger: (id: string, p: any) => ["customers", "ledger", id, p],
  },
}));

vi.mock("@/server-functions/sales/customers-fn", () => ({
  getCustomerLedgerFn: vi.fn(),
  getCustomersFn: vi.fn(),
  getCustomerStatsFn: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ─── Import component AFTER mocks ─────────────────────────────────────────────

// We import the component function directly — it's exported as the `component`
// property of the Route config. Since createFileRoute is mocked to return the
// config object, we can access the component via Route.component.
import { Route } from "@/routes/_protected/sales/customers/$customerId/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const baseCustomer = {
  id: "cust-1",
  name: "Test Customer",
  customerType: "distributor",
  mobileNumber: "0300-1234567",
  city: "Lahore",
  bankAccount: "HBL-001",
  credit: "20000",
  totalSale: "100000",
  payment: "80000",
  weightSaleKg: "500",
  cnic: null,
};

const baseInvoices = [
  {
    id: "inv-1",
    date: new Date("2024-04-10"),
    totalPrice: "5000",
    cash: "3000",
    credit: "2000",
    warehouse: { name: "Main WH" },
  },
  {
    id: "inv-2",
    date: new Date("2024-04-15"),
    totalPrice: "8000",
    cash: "8000",
    credit: "0",
    warehouse: { name: "Main WH" },
  },
];

function makeLedgerData(
  overrides: Partial<{
    credit: string;
    overdueInvoices: number;
    nextDueDate: Date | null;
    invoices: any[];
  }> = {},
) {
  return {
    customer: { ...baseCustomer, credit: overrides.credit ?? "20000" },
    invoices: overrides.invoices ?? baseInvoices,
    total: (overrides.invoices ?? baseInvoices).length,
    pageCount: 1,
    periodRevenue: 13000,
    periodCash: 11000,
    periodCredit: 2000,
    overdueInvoices: overrides.overdueInvoices ?? 0,
    nextDueDate: overrides.nextDueDate ?? null,
  };
}

function renderLedgerPage() {
  const queryClient = makeQueryClient();
  // Route.component is the CustomerLedgerPage function
  const Component = (Route as any).component;

  return render(
    <QueryClientProvider client={queryClient}>
      <Component />
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("CustomerLedgerPage", () => {
  beforeEach(() => {
    capturedOnDateChange = null;
    capturedInvoiceSheetOpen = false;
    capturedInvoiceId = null;
    vi.clearAllMocks();

    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ overdueInvoices: 2, credit: "20000" }),
      isLoading: false,
      isError: false,
    });
  });

  // ─── Requirement 8.5: overdue alert renders when overdueInvoices > 0 ──────

  it("renders overdue alert when overdueInvoices > 0", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ overdueInvoices: 3 }),
      isLoading: false,
      isError: false,
    });

    renderLedgerPage();

    expect(screen.getByText(/3 invoice/i)).toBeTruthy();
    expect(screen.getByText(/overdue/i)).toBeTruthy();
  });

  // ─── Requirement 8.6: overdue alert hidden when overdueInvoices === 0 ─────

  it("hides overdue alert when overdueInvoices === 0", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ overdueInvoices: 0 }),
      isLoading: false,
      isError: false,
    });

    renderLedgerPage();

    expect(screen.queryByText(/overdue/i)).toBeNull();
  });

  // ─── Requirement 8.2: outstanding balance card shows Unpaid when credit > 0

  it("outstanding balance card shows Unpaid badge when credit > 0", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ credit: "20000" }),
      isLoading: false,
      isError: false,
    });

    renderLedgerPage();

    expect(screen.getByText("Unpaid")).toBeTruthy();
    // "Clear" badge should not be present (the date picker "Clear" button is separate)
    const clearBadges = screen.queryAllByText("Clear").filter(
      (el) => el.getAttribute("data-slot") === "badge",
    );
    expect(clearBadges).toHaveLength(0);
  });

  // ─── Requirement 8.3: outstanding balance card shows Clear when credit === 0

  it("outstanding balance card shows Clear badge when credit === 0", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ credit: "0" }),
      isLoading: false,
      isError: false,
    });

    renderLedgerPage();

    // Find the Clear badge specifically (data-slot="badge"), not the date picker button
    const clearBadges = screen.getAllByText("Clear").filter(
      (el) => el.getAttribute("data-slot") === "badge",
    );
    expect(clearBadges).toHaveLength(1);
    expect(screen.queryByText("Unpaid")).toBeNull();
  });

  // ─── Requirement 9.1: date range defaults to current month ────────────────

  it("date range defaults to current month on mount", () => {
    renderLedgerPage();

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("ledger-date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("ledger-date-to").textContent).toBe(expectedTo);
  });

  // ─── Requirement 9.3: clearing date range resets to current month ─────────

  it("clearing date range resets to current month, not undefined", () => {
    renderLedgerPage();

    act(() => {
      capturedOnDateChange?.(undefined);
    });

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("ledger-date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("ledger-date-to").textContent).toBe(expectedTo);
  });

  // ─── Requirement 10.5: changing date range resets page to 1 ──────────────

  it("changing date range resets page to 1", () => {
    renderLedgerPage();

    // Advance to page 2
    const page2Button = screen.getByText("Page 2");
    fireEvent.click(page2Button);

    const callsAfterPageChange = mockUseGetCustomerLedger.mock.calls;
    const lastCallPage = callsAfterPageChange[callsAfterPageChange.length - 1][1].page;
    expect(lastCallPage).toBe(2);

    // Change the date range
    act(() => {
      capturedOnDateChange?.({ from: new Date("2024-01-01"), to: new Date("2024-01-31") });
    });

    // Page should reset to 1
    const callsAfterDateChange = mockUseGetCustomerLedger.mock.calls;
    const lastCallAfterDate = callsAfterDateChange[callsAfterDateChange.length - 1][1].page;
    expect(lastCallAfterDate).toBe(1);
  });

  // ─── Requirement 10.3: clicking invoice row opens InvoiceDetailSheet ──────

  it("clicking an invoice row opens InvoiceDetailSheet with the correct invoiceId", () => {
    renderLedgerPage();

    const dateCell = screen.getByText("10 Apr 2024");
    const row = dateCell.closest("tr");
    expect(row).toBeTruthy();

    fireEvent.click(row!);

    expect(capturedInvoiceSheetOpen).toBe(true);
    expect(capturedInvoiceId).toBe("inv-1");
  });

  it("clicking a different invoice row opens InvoiceDetailSheet with that invoiceId", () => {
    renderLedgerPage();

    const dateCell = screen.getByText("15 Apr 2024");
    const row = dateCell.closest("tr");
    fireEvent.click(row!);

    expect(capturedInvoiceSheetOpen).toBe(true);
    expect(capturedInvoiceId).toBe("inv-2");
  });

  // ─── Requirement 10.6: empty state when no invoices ───────────────────────

  it("shows empty state message when no invoices in the selected period", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: makeLedgerData({ invoices: [] }),
      isLoading: false,
      isError: false,
    });

    renderLedgerPage();

    expect(screen.getByText(/no invoices found for the selected period/i)).toBeTruthy();
  });

  // ─── Loading state ────────────────────────────────────────────────────────

  it("renders loading skeleton when isLoading is true", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderLedgerPage();

    expect(screen.queryByText("Test Customer")).toBeNull();
  });

  // ─── Error state ──────────────────────────────────────────────────────────

  it("renders error state when isError is true", () => {
    mockUseGetCustomerLedger.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Customer not found"),
    });

    renderLedgerPage();

    expect(screen.getByText(/customer not found/i)).toBeTruthy();
  });
});
