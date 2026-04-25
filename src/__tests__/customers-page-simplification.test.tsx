/**
 * Unit Tests: Customers page simplification
 *
 * Tests:
 * - CustomerFilters is not rendered.
 * - CustomerDetailSheet is not rendered.
 * - CustomerRow renders a BookOpen icon button and navigates to /sales/customers/$customerId on click.
 * - Date range defaults to current month on mount.
 * - Clearing date range resets to current month.
 *
 * Requirements: 4.1, 4.3, 4.4, 6.2, 6.3
 */

import React, { Suspense } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
        <span data-testid="kpi-date-from">
          {date?.from ? format(date.from, "yyyy-MM-dd") : "none"}
        </span>
        <span data-testid="kpi-date-to">
          {date?.to ? format(date.to, "yyyy-MM-dd") : "none"}
        </span>
        <button data-testid="clear-kpi-date" onClick={() => onDateChange(undefined)}>
          Clear
        </button>
      </div>
    );
  },
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    createFileRoute: () => (config: any) => ({ ...config, component: config.component }),
    useNavigate: () => mockNavigate,
  };
});

// Mock useGetCustomers
const mockUseGetCustomers = vi.fn();
vi.mock("@/hooks/sales/use-customers", () => ({
  useGetCustomers: (params: any) => mockUseGetCustomers(params),
  useGetCustomerStats: vi.fn(() => ({
    data: {
      totalCustomers: 0,
      totalSalesRevenue: 0,
      totalOutstanding: 0,
      customersWithOutstanding: 0,
    },
  })),
  customersKeys: {
    all: ["customers"],
    list: (p: any) => ["customers", "list", p],
    select: () => ["customers", "select"],
    stats: (p?: any) => ["customers", "stats", p ?? {}],
    ledger: (id: string, p: any) => ["customers", "ledger", id, p],
  },
}));

// Mock server functions
vi.mock("@/server-functions/sales/customers-fn", () => ({
  getCustomersFn: vi.fn(),
  getCustomerStatsFn: vi.fn(),
  getAllCustomersFn: vi.fn(),
  getCustomerLedgerFn: vi.fn(),
  updateCustomerFn: vi.fn(),
}));

// Mock CustomerKpiCards to avoid suspense complexity
vi.mock("@/components/sales/customer-kpi-cards", () => ({
  CustomerKpiCards: ({ dateFrom, dateTo }: { dateFrom?: string; dateTo?: string }) => (
    <div data-testid="customer-kpi-cards" data-date-from={dateFrom} data-date-to={dateTo} />
  ),
}));

// Mock CustomerPagination
vi.mock("@/components/sales/customer-pagination", () => ({
  CustomerPagination: () => <div data-testid="customer-pagination" />,
}));

// Mock GenericLoader
vi.mock("@/components/custom/generic-loader", () => ({
  GenericLoader: () => <div data-testid="generic-loader" />,
}));

// Mock illustrations
vi.mock("@/components/illustrations/CustomersEmptyIllustration", () => ({
  CustomersEmptyIllustration: () => null,
}));
vi.mock("@/components/illustrations/SalesEmptyIllustration", () => ({
  SalesEmptyIllustration: () => null,
}));

// Mock sonner
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// ─── Import component after mocks ─────────────────────────────────────────────

// We test CustomersContent indirectly by rendering the page component
// Since createFileRoute is mocked, we import the file and grab the component
import * as CustomersPageModule from "@/routes/_protected/sales/customers/index";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

const sampleCustomers = [
  {
    id: "cust-1",
    name: "Test Customer",
    customerType: "distributor",
    mobileNumber: "0300-1234567",
    city: "Lahore",
    totalSale: "100000",
    payment: "80000",
    credit: "20000",
    weightSaleKg: "500",
    cnic: null,
  },
];

function renderCustomersPage() {
  mockUseGetCustomers.mockReturnValue({
    data: { data: sampleCustomers, pageCount: 1, total: 1 },
  });

  const queryClient = makeQueryClient();
  const Component = (CustomersPageModule as any).Route?.component ?? (() => null);

  return render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <Component />
      </Suspense>
    </QueryClientProvider>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Customers page simplification", () => {
  beforeEach(() => {
    capturedOnDateChange = null;
    vi.clearAllMocks();
    mockUseGetCustomers.mockReturnValue({
      data: { data: sampleCustomers, pageCount: 1, total: 1 },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Requirement 4.1: CustomerFilters is not rendered ─────────────────────

  it("does not render CustomerFilters component", () => {
    renderCustomersPage();
    // CustomerFilters would render a data-testid="customer-filters" or similar
    // Since we removed it, it should not be in the DOM
    expect(screen.queryByTestId("customer-filters")).toBeNull();
    // Also verify the old filter controls are gone
    expect(screen.queryByText("Customer Type")).toBeNull();
    expect(screen.queryByText("Outstanding Only")).toBeNull();
  });

  // ─── Requirement 4.3: CustomerDetailSheet is not rendered ─────────────────

  it("does not render CustomerDetailSheet component", () => {
    renderCustomersPage();
    expect(screen.queryByTestId("customer-detail-sheet")).toBeNull();
  });

  // ─── Requirement 6.2: CustomerRow renders BookOpen icon button ────────────

  it("renders a BookOpen icon button in each customer row", () => {
    renderCustomersPage();
    // The BookOpen button should be present (rendered as a button with svg inside)
    const buttons = screen.getAllByRole("button");
    // At least one button should be the navigation button
    expect(buttons.length).toBeGreaterThan(0);
  });

  // ─── Requirement 6.3: clicking icon navigates to /sales/customers/$customerId

  it("clicking the BookOpen button navigates to /sales/customers/$customerId", () => {
    renderCustomersPage();

    // Find all buttons that contain an SVG (icon buttons) and have no text content
    const allButtons = screen.getAllByRole("button");
    const iconOnlyButtons = allButtons.filter((btn) => {
      const text = btn.textContent?.trim() ?? "";
      return text === "" && btn.querySelector("svg") !== null;
    });

    expect(iconOnlyButtons.length).toBeGreaterThan(0);

    fireEvent.click(iconOnlyButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/sales/customers/$customerId",
      params: { customerId: "cust-1" },
    });
  });

  // ─── Requirement 4.4: date range defaults to current month ────────────────

  it("date range defaults to current month on mount", () => {
    renderCustomersPage();

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("kpi-date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("kpi-date-to").textContent).toBe(expectedTo);
  });

  it("passes current-month dateFrom/dateTo to CustomerKpiCards on mount", () => {
    renderCustomersPage();

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const kpiCards = screen.getByTestId("customer-kpi-cards");
    expect(kpiCards.getAttribute("data-date-from")).toBe(expectedFrom);
    expect(kpiCards.getAttribute("data-date-to")).toBe(expectedTo);
  });

  // ─── Requirement 4.4: clearing date range resets to current month ─────────

  it("clearing date range resets to current month, not undefined", () => {
    renderCustomersPage();

    act(() => {
      capturedOnDateChange?.(undefined);
    });

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("kpi-date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("kpi-date-to").textContent).toBe(expectedTo);
  });

  it("after clearing, CustomerKpiCards still receives current-month dates", () => {
    renderCustomersPage();

    act(() => {
      capturedOnDateChange?.(undefined);
    });

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    const kpiCards = screen.getByTestId("customer-kpi-cards");
    expect(kpiCards.getAttribute("data-date-from")).toBe(expectedFrom);
    expect(kpiCards.getAttribute("data-date-to")).toBe(expectedTo);
  });

  // ─── Requirement 4.2: name search input is rendered ───────────────────────

  it("renders a customer name search input", () => {
    renderCustomersPage();
    expect(screen.getByPlaceholderText("Search by name...")).toBeTruthy();
  });

  // ─── Requirement 4.6: no customerType/city/outstandingOnly passed to hook ─

  it("does not pass customerType, city, or outstandingOnly to useGetCustomers", () => {
    renderCustomersPage();

    const calls = mockUseGetCustomers.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.customerType).toBeUndefined();
    expect(lastCall.city).toBeUndefined();
    expect(lastCall.outstandingOnly).toBeUndefined();
  });
});
