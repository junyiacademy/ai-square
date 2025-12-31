/**
 * Tests for useHybridScenarios.ts
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useHybridScenarios } from "../useHybridScenarios";
import React from "react";

// Mock dependencies
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: "en",
      changeLanguage: jest.fn(),
    },
  }),
}));

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe("useHybridScenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ scenarios: [] }),
    } as Response);
  });

  it("should be defined", () => {
    expect(useHybridScenarios).toBeDefined();
  });

  it("should return initial state correctly", () => {
    const { result } = renderHook(() => useHybridScenarios());

    expect(result.current.scenarios).toEqual([]);
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("should handle loading state", async () => {
    const { result } = renderHook(() => useHybridScenarios());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it("should handle errors gracefully", async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error("Network error"),
    );

    const { result } = renderHook(() => useHybridScenarios());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });
});
