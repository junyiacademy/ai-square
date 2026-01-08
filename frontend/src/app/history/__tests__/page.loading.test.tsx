/**
 * History Page - Loading State Tests
 */

import React from "react";
import { waitFor } from "@testing-library/react";
import { renderWithProviders, screen } from "@/test-utils";
import "@testing-library/jest-dom";
import UnifiedHistoryPage from "../page";

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/history",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("@/components/ui/history-skeletons", () => ({
  HistoryPageSkeleton: () => (
    <div data-testid="history-skeleton">Loading history...</div>
  ),
}));

jest.mock("@/utils/locale", () => ({
  formatDateWithLocale: jest.fn((date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("en-US");
  }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("UnifiedHistoryPage - Loading States", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "isLoggedIn") return "true";
      if (key === "user")
        return JSON.stringify({ id: "user-123", email: "test@example.com" });
      return null;
    });
  });

  it("should show loading skeleton while fetching data", async () => {
    mockFetch.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );

    renderWithProviders(<UnifiedHistoryPage />);

    expect(screen.getByTestId("history-skeleton")).toBeInTheDocument();
    expect(screen.getByText("Loading history...")).toBeInTheDocument();
  });

  it("should hide skeleton after data loads", async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes("/api/assessment/results")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });
      }
      if (url.includes("/api/pbl/history")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, programs: [] }),
        });
      }
      if (url.includes("/api/discovery/my-programs")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

    renderWithProviders(<UnifiedHistoryPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("history-skeleton")).not.toBeInTheDocument();
    });
  });
});
