/**
 * History Page - Authentication Tests
 */

import React from "react";
import { renderWithProviders, screen } from "@/test-utils";
import "@testing-library/jest-dom";
import UnifiedHistoryPage from "../page";

// Mock navigation
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  prefetch: jest.fn(),
};

jest.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/history",
}));

// Mock i18n
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "assessment:history.notLoggedIn": "Please log in to view your history",
        "assessment:history.takeAssessment": "Take Assessment",
        "pbl:history.startLearning": "Start Learning",
      };
      return translations[key] || key;
    },
    i18n: { language: "en", changeLanguage: jest.fn() },
  }),
}));

jest.mock("@/components/ui/history-skeletons", () => ({
  HistoryPageSkeleton: () => (
    <div data-testid="history-skeleton">Loading...</div>
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

describe("UnifiedHistoryPage - Authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReset();
    mockFetch.mockReset();
  });

  it("should render page when user is not logged in", () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "isLoggedIn") return "false";
      if (key === "user") return null;
      return null;
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<UnifiedHistoryPage />);

    // When not logged in (isLoggedIn = false), page shows not logged in state
    expect(
      screen.getByText("Please log in to view your history"),
    ).toBeInTheDocument();
  });

  it("should render page when localStorage has no user data", () => {
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "isLoggedIn") return "true";
      if (key === "user") return null;
      return null;
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<UnifiedHistoryPage />);

    // When user data is null, page shows not logged in state
    expect(
      screen.getByText("Please log in to view your history"),
    ).toBeInTheDocument();
  });

  it("should handle invalid JSON in user data gracefully", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === "isLoggedIn") return "true";
      if (key === "user") return "invalid json";
      return null;
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });

    renderWithProviders(<UnifiedHistoryPage />);

    // When user data is invalid, page shows not logged in state
    expect(
      screen.getByText("Please log in to view your history"),
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
