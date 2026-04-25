/**
 * Unit Tests: InvoicesTable filter behaviour
 *
 * Tests:
 * - Mounts with date range = current month (not undefined)
 * - Clearing date range resets to current month, not undefined
 * - Typing in slip-number input and clicking Search commits the search
 * - `hasFilters` is false when search is empty, true when search is non-empty
 *
 * Requirements: 1.3, 1.4, 2.2, 2.5
 */

import { Suspense } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startOfMonth, endOfMonth, format } from "date-fns";
import type { DateRange } from "react-day-picker";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Track the onDateChange callback so tests can invoke it directly
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
        <span data-testid="date-from">
          {date?.from ? format(date.from, "yyyy-MM-dd") : "none"}
        </span>
        <span data-testid="date-to">
          {date?.to ? format(date.to, "yyyy-MM-dd") : "none"}
        </span>
        <button
          data-testid="clear-date"
          onClick={() => onDateChange(undefined)}
        >
          Clear
        </button>
      </div>
    );
  },
}));

// Mock useGetInvoices to avoid actual server calls
vi.mock("@/hooks/sales/use-invoices", () => ({
  useGetInvoices: vi.fn(() => ({
    data: { data: [], pageCount: 1, total: 0 },
  })),
  invoicesKeys: {
    all: ["invoices"],
    list: (params: any) => ["invoices", "list", params],
    detail: (id: string) => ["invoices", "detail", id],
    stats: (params?: any) => ["invoices", "stats", params],
  },
}));

// Mock sonner to avoid issues in test environment
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { InvoicesTable } from "@/components/sales/invoices-table";
import { useGetInvoices } from "@/hooks/sales/use-invoices";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderInvoicesTable() {
  const queryClient = makeQueryClient();
  const result = render(
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div>Loading...</div>}>
        <InvoicesTable />
      </Suspense>
    </QueryClientProvider>,
  );
  return result;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("InvoicesTable filter behaviour", () => {
  beforeEach(() => {
    capturedOnDateChange = null;
    vi.clearAllMocks();
    // Re-apply the default mock return value after clearAllMocks
    vi.mocked(useGetInvoices).mockReturnValue({
      data: { data: [], pageCount: 1, total: 5 },
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Requirement 1.3: mounts with date range = current month ──────────────

  it("mounts with date range initialised to current month (not undefined)", () => {
    renderInvoicesTable();

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("date-to").textContent).toBe(expectedTo);
  });

  it("passes dateFrom and dateTo derived from current month to useGetInvoices on mount", () => {
    renderInvoicesTable();

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(useGetInvoices).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: expectedFrom,
        dateTo: expectedTo,
      }),
    );
  });

  // ─── Requirement 1.4: clearing date range resets to current month ─────────

  it("clearing date range resets to current month, not undefined", () => {
    renderInvoicesTable();

    // Simulate the DatePickerWithRange Clear button calling onDateChange(undefined)
    act(() => {
      capturedOnDateChange?.(undefined);
    });

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    expect(screen.getByTestId("date-from").textContent).toBe(expectedFrom);
    expect(screen.getByTestId("date-to").textContent).toBe(expectedTo);
  });

  it("after clearing, useGetInvoices is called with current-month dates (not undefined)", () => {
    renderInvoicesTable();

    act(() => {
      capturedOnDateChange?.(undefined);
    });

    const expectedFrom = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const expectedTo = format(endOfMonth(new Date()), "yyyy-MM-dd");

    // The most recent call should have current-month dates
    const calls = vi.mocked(useGetInvoices).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.dateFrom).toBe(expectedFrom);
    expect(lastCall.dateTo).toBe(expectedTo);
  });

  // ─── Requirement 2.2: slip-number input commits on Search click ────────────

  it("typing in slip-number input does NOT immediately update the query (manual search)", () => {
    renderInvoicesTable();

    const input = screen.getByPlaceholderText("e.g. INV-42");

    // Clear previous calls
    vi.mocked(useGetInvoices).mockClear();

    act(() => {
      fireEvent.change(input, { target: { value: "SLP-001" } });
    });

    // Before clicking Search, search should still be empty string
    const callsBeforeSearch = vi.mocked(useGetInvoices).mock.calls;
    const lastCallBeforeSearch =
      callsBeforeSearch[callsBeforeSearch.length - 1][0];
    expect(lastCallBeforeSearch.search).toBeUndefined();
  });

  it("typing in slip-number input and clicking Search updates the query", () => {
    renderInvoicesTable();

    const input = screen.getByPlaceholderText("e.g. INV-42");
    const searchButton = screen.getByRole("button", { name: /search/i });

    act(() => {
      fireEvent.change(input, { target: { value: "SLP-001" } });
    });

    act(() => {
      fireEvent.click(searchButton);
    });

    const calls = vi.mocked(useGetInvoices).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.search).toBe("SLP-001");
  });

  it("pressing Enter in the search input commits the search", () => {
    renderInvoicesTable();

    const input = screen.getByPlaceholderText("e.g. INV-42");

    act(() => {
      fireEvent.change(input, { target: { value: "SLP-002" } });
    });

    act(() => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    const calls = vi.mocked(useGetInvoices).mock.calls;
    const lastCall = calls[calls.length - 1][0];
    expect(lastCall.search).toBe("SLP-002");
  });

  // ─── Requirement 2.5: hasFilters reflects slip-number state ──────────────

  it("hasFilters is false when search is empty — filtered count indicator is hidden", () => {
    renderInvoicesTable();

    // When no search, the "(filtered)" text should not appear in the invoice count
    expect(screen.queryByText(/filtered/i)).toBeNull();
  });

  it("hasFilters is true when search is non-empty — filtered count indicator is shown", () => {
    renderInvoicesTable();

    const input = screen.getByPlaceholderText("e.g. INV-42");
    const searchButton = screen.getByRole("button", { name: /search/i });

    act(() => {
      fireEvent.change(input, { target: { value: "SLP-001" } });
    });

    act(() => {
      fireEvent.click(searchButton);
    });

    // After Search click, hasFilters = true → "(filtered)" text appears
    expect(screen.getByText(/filtered/i)).toBeTruthy();
  });

  it("hasFilters returns to false when search is cleared", () => {
    renderInvoicesTable();

    const input = screen.getByPlaceholderText("e.g. INV-42");
    const searchButton = screen.getByRole("button", { name: /search/i });

    // Type something and click Search
    act(() => {
      fireEvent.change(input, { target: { value: "SLP-001" } });
    });
    act(() => {
      fireEvent.click(searchButton);
    });

    expect(screen.getByText(/filtered/i)).toBeTruthy();

    // Clear the input and click Search again
    act(() => {
      fireEvent.change(input, { target: { value: "" } });
    });
    act(() => {
      fireEvent.click(searchButton);
    });

    expect(screen.queryByText(/filtered/i)).toBeNull();
  });
});
