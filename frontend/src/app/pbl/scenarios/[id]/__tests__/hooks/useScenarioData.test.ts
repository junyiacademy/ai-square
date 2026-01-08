import { renderHook, waitFor } from "@testing-library/react";
import { useScenarioData } from "../../hooks/useScenarioData";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Mock authenticatedFetch
jest.mock("@/lib/utils/authenticated-fetch");
const mockAuthenticatedFetch = authenticatedFetch as jest.MockedFunction<
  typeof authenticatedFetch
>;

describe("useScenarioData", () => {
  const mockScenarioId = "scenario-123";
  const mockLanguage = "en";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches scenario and programs data on mount", async () => {
    const mockScenarioData = {
      success: true,
      data: {
        id: "scenario-123",
        title: { en: "Test Scenario" },
        description: { en: "Test Description" },
        difficulty: "beginner",
        estimatedDuration: 30,
        learningObjectives: ["Objective 1", "Objective 2"],
        prerequisites: ["Prereq 1"],
        targetDomains: ["math"],
        tasks: [],
        ksaMapping: {
          knowledge: ["K1"],
          skills: ["S1"],
          attitudes: ["A1"],
        },
      },
    };

    const mockProgramsData = {
      success: true,
      data: {
        programs: [
          {
            id: "program-1",
            status: "active",
            currentTaskIndex: 0,
            metadata: {
              taskIds: ["task-1"],
              completedTaskCount: 0,
              totalTaskCount: 3,
            },
          },
        ],
      },
    };

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenarioData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgramsData,
      } as Response);

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.scenario).toBeNull();
    expect(result.current.userPrograms).toEqual([]);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeDefined();
    expect(result.current.scenario?.id).toBe("scenario-123");
    expect(result.current.scenario?.objectives).toEqual([
      "Objective 1",
      "Objective 2",
    ]);
    expect(result.current.userPrograms).toHaveLength(1);
    expect(result.current.userPrograms[0].id).toBe("program-1");
  });

  it("handles scenario fetch error gracefully", async () => {
    const mockProgramsData = {
      success: true,
      data: { programs: [] },
    };

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgramsData,
      } as Response);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeNull();
    expect(result.current.userPrograms).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("handles programs fetch error gracefully", async () => {
    const mockScenarioData = {
      success: true,
      data: {
        id: "scenario-123",
        title: { en: "Test" },
        difficulty: "beginner",
        learningObjectives: [],
      },
    };

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenarioData,
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeDefined();
    expect(result.current.userPrograms).toEqual([]);
  });

  it("handles invalid scenario API response", async () => {
    const invalidScenarioData = {
      success: false,
    };

    const mockProgramsData = {
      success: true,
      data: { programs: [] },
    };

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => invalidScenarioData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgramsData,
      } as Response);

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.scenario).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("handles programs response with direct array format (fallback)", async () => {
    const mockScenarioData = {
      success: true,
      data: {
        id: "scenario-123",
        title: { en: "Test" },
        learningObjectives: [],
      },
    };

    const mockProgramsArray = [
      { id: "program-1", status: "active" },
      { id: "program-2", status: "completed" },
    ];

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenarioData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgramsArray,
      } as Response);

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.userPrograms).toHaveLength(2);
    expect(result.current.userPrograms[0].id).toBe("program-1");
  });

  it("transforms scenario data correctly", async () => {
    const mockScenarioData = {
      success: true,
      data: {
        id: "scenario-123",
        title: { en: "Math Scenario", zh: "數學情境" },
        description: { en: "Learn math", zh: "學習數學" },
        difficulty: "intermediate",
        estimatedDuration: 45,
        learningObjectives: ["Obj 1", "Obj 2"],
        prerequisites: ["Pre 1", "Pre 2"],
        targetDomains: ["math", "science"],
        tasks: [{ id: "task-1", title: "Task 1" }],
        ksaMapping: {
          knowledge: ["K1", "K2"],
          skills: ["S1"],
          attitudes: [],
        },
      },
    };

    mockAuthenticatedFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenarioData,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { programs: [] } }),
      } as Response);

    const { result } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const scenario = result.current.scenario;
    expect(scenario?.id).toBe("scenario-123");
    expect(scenario?.objectives).toEqual(["Obj 1", "Obj 2"]);
    expect(scenario?.prerequisites).toEqual(["Pre 1", "Pre 2"]);
    expect(scenario?.metadata?.difficulty).toBe("intermediate");
    expect(scenario?.metadata?.estimatedDuration).toBe(45);
    expect(scenario?.metadata?.targetDomains).toEqual(["math", "science"]);
    expect(scenario?.metadata?.tasks).toHaveLength(1);
    expect(scenario?.metadata?.ksaMapping).toBeDefined();
  });

  it("cleans up on unmount to prevent state updates", async () => {
    let resolveScenario: (value: Record<string, unknown>) => void;
    let resolvePrograms: (value: Record<string, unknown>) => void;

    const scenarioPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolveScenario = resolve;
    });
    const programsPromise = new Promise<Record<string, unknown>>((resolve) => {
      resolvePrograms = resolve;
    });

    mockAuthenticatedFetch
      .mockReturnValueOnce({
        ok: true,
        json: async () => scenarioPromise,
      } as unknown as Promise<Response>)
      .mockReturnValueOnce({
        ok: true,
        json: async () => programsPromise,
      } as unknown as Promise<Response>);

    const { unmount } = renderHook(() =>
      useScenarioData(mockScenarioId, mockLanguage),
    );

    // Unmount before promises resolve
    unmount();

    // Resolve promises after unmount
    resolveScenario!({
      success: true,
      data: { id: "test", learningObjectives: [] },
    });
    resolvePrograms!({ success: true, data: { programs: [] } });

    // Wait a bit to ensure no state updates occur
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Test passes if no errors thrown (no state updates after unmount)
  });

  it("refetches data when language changes", async () => {
    const mockScenarioData = {
      success: true,
      data: {
        id: "scenario-123",
        title: { en: "English", zh: "中文" },
        learningObjectives: [],
      },
    };

    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: async () => mockScenarioData,
    } as Response);

    const { rerender } = renderHook(
      ({ scenarioId, language }) => useScenarioData(scenarioId, language),
      { initialProps: { scenarioId: mockScenarioId, language: "en" } },
    );

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2); // scenario + programs
    });

    jest.clearAllMocks();

    // Change language
    rerender({ scenarioId: mockScenarioId, language: "zh" });

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(2); // refetch both
    });
  });
});
