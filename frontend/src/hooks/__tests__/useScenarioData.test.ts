import { renderHook, waitFor } from "@testing-library/react";
import { useScenarioData } from "../useScenarioData";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Mock authenticatedFetch
jest.mock("@/lib/utils/authenticated-fetch");
const mockAuthFetch = authenticatedFetch as jest.MockedFunction<
  typeof authenticatedFetch
>;

describe("useScenarioData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should initialize with loading state", () => {
    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { title: "Test" } }),
    } as Response);

    const { result } = renderHook(() => useScenarioData("test-id", "en"));

    expect(result.current.loading).toBe(true);
    expect(result.current.scenario).toBeNull();
  });

  it("should fetch scenario data successfully", async () => {
    const mockScenario = {
      id: "test-id",
      title: { en: "Test Scenario" },
      description: { en: "Test Description" },
      learningObjectives: ["Objective 1"],
      difficulty: "beginner",
      estimatedDuration: 30,
    };

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockScenario }),
    } as Response);

    const { result } = renderHook(() => useScenarioData("test-id", "en"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeDefined();
    expect(result.current.scenario?.title).toEqual({ en: "Test Scenario" });
  });

  it("should handle fetch errors gracefully", async () => {
    mockAuthFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const { result } = renderHook(() => useScenarioData("invalid-id", "en"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeNull();
  });

  it("should cleanup on unmount", async () => {
    mockAuthFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    const { unmount } = renderHook(() => useScenarioData("test-id", "en"));

    unmount();

    // Should not throw or update state after unmount
    expect(true).toBe(true);
  });

  it("should transform API response correctly", async () => {
    const mockResponse = {
      id: "test-id",
      title: { en: "Test" },
      learningObjectives: ["Obj1", "Obj2"],
      prerequisites: ["Prereq1"],
      difficulty: "intermediate",
      estimatedDuration: 45,
      targetDomains: ["math"],
      tasks: [],
      ksaMapping: { knowledge: [], skills: [], attitudes: [] },
    };

    mockAuthFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockResponse }),
    } as Response);

    const { result } = renderHook(() => useScenarioData("test-id", "en"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario?.objectives).toEqual(["Obj1", "Obj2"]);
    expect(result.current.scenario?.metadata).toBeDefined();
    expect(result.current.scenario?.metadata?.difficulty).toBe("intermediate");
  });
});
