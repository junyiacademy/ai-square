import React from "react";
import { render, waitFor } from "@testing-library/react";
import Page from "../page";

// Helper to create mock params Promise
const createMockParams = (id: string = "test-scenario-id") =>
  Promise.resolve({ id });

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/discovery/scenarios/test-scenario-id",
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: jest.fn(), language: "en" },
  }),
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isLoggedIn: true,
    isLoading: false,
    user: { email: "test@example.com" },
  }),
}));

global.fetch = jest.fn();

describe("Discovery Scenario Detail Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(() => "test-session-token"),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        scenario: {
          id: "test-scenario-id",
          title: { en: "Test Scenario" },
          description: { en: "Test Description" },
          careerType: "technology",
          skillsTree: [],
        },
      }),
    });
  });

  it("should render without errors", async () => {
    const { container } = render(<Page params={createMockParams()} />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });

  it("should fetch scenario data", async () => {
    render(<Page params={createMockParams()} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it("should handle API errors", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));
    const { container } = render(<Page params={createMockParams()} />);
    await waitFor(() => {
      expect(container).toBeTruthy();
    });
  });
});
