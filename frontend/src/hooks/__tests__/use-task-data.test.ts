/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from "@testing-library/react";
import { useTaskData } from "../use-task-data";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";

// Mock dependencies
jest.mock("@/lib/utils/authenticated-fetch");
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "en",
    },
  }),
}));

const mockAuthenticatedFetch = authenticatedFetch as jest.MockedFunction<
  typeof authenticatedFetch
>;

describe("useTaskData", () => {
  const scenarioId = "test-scenario-123";
  const programId = "test-program-456";
  const taskId = "test-task-789";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should initialize with null data and loading false", () => {
      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      expect(result.current.programData).toBeNull();
      expect(result.current.taskData).toBeNull();
      expect(result.current.taskHistory).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("should have all required functions", () => {
      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      expect(typeof result.current.loadProgram).toBe("function");
      expect(typeof result.current.loadTask).toBe("function");
      expect(typeof result.current.loadHistory).toBe("function");
      expect(typeof result.current.reload).toBe("function");
    });
  });

  describe("loadProgram", () => {
    const mockScenarioResponse = {
      success: true,
      data: {
        id: scenarioId,
        title: "Test Scenario",
        tasks: [
          { id: "task-1", title: "Task 1" },
          { id: "task-2", title: "Task 2" },
        ],
      },
    };

    const mockProgramResponse = {
      id: programId,
      scenarioId: scenarioId,
      userId: "user-123",
      startedAt: "2024-01-01T00:00:00Z",
      status: "in_progress",
      totalTaskCount: 2,
      taskIds: ["task-1", "task-2"],
      currentTaskIndex: 0,
    };

    it("should set loading true during fetch and false after", async () => {
      let resolveScenario: (value: Response) => void;
      const scenarioPromise = new Promise<Response>((resolve) => {
        resolveScenario = resolve;
      });

      mockAuthenticatedFetch
        .mockReturnValueOnce(scenarioPromise)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [] }),
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // Start loading
      const loadPromise = result.current.loadProgram();

      // Should be loading immediately after call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the scenario fetch
      resolveScenario!({
        ok: true,
        json: async () => mockScenarioResponse,
      } as Response);

      // Wait for loading to complete
      await loadPromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should update programData on success", async () => {
      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockScenarioResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [] }),
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.programData).not.toBeNull();
        expect(result.current.programData?.id).toBe(programId);
        expect(result.current.programData?.scenarioId).toBe(scenarioId);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set loading false after completion", async () => {
      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockScenarioResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [] }),
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should clear any previous errors on success", async () => {
      mockAuthenticatedFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockScenarioResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [] }),
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // First call fails
      await result.current.loadProgram();
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      await result.current.loadProgram();
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.programData).not.toBeNull();
      });
    });

    it("should update error state on failure", async () => {
      const errorMessage = "Failed to load scenario";
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: errorMessage,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain(
          "Failed to load scenario",
        );
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should keep programData as null on failure", async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.programData).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle temp program IDs by creating mock program", async () => {
      const tempProgramId = "temp_123";

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockScenarioResponse,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, tempProgramId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.programData).not.toBeNull();
        expect(result.current.programData?.id).toBe(tempProgramId);
        expect(result.current.programData?.status).toBe("in_progress");
      });
    });
  });

  describe("loadTask", () => {
    const mockTaskResponse = {
      id: taskId,
      title: "Test Task",
      type: "pbl_task",
      status: "in_progress",
      content: {
        context: {
          taskTemplate: {
            description: {
              en: "Task description",
              zh: "任務描述",
            },
            instructions: {
              en: ["Step 1", "Step 2"],
              zh: ["步驟 1", "步驟 2"],
            },
            expectedOutcome: {
              en: "Expected outcome",
              zh: "預期結果",
            },
            category: "research",
          },
        },
      },
      interactions: [],
    };

    it("should set loading true during fetch and false after", async () => {
      let resolvePromise: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      mockAuthenticatedFetch.mockReturnValue(fetchPromise);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // Start loading
      const loadPromise = result.current.loadTask();

      // Should be loading immediately after call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => mockTaskResponse,
      } as Response);

      // Wait for loading to complete
      await loadPromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should update taskData on success", async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaskResponse,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadTask();

      await waitFor(() => {
        expect(result.current.taskData).not.toBeNull();
        expect(result.current.taskData?.id).toBe(taskId);
        expect(result.current.taskData?.title).toBe("Test Task");
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set loading false after completion", async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTaskResponse,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadTask();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should clear any previous errors on success", async () => {
      mockAuthenticatedFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTaskResponse,
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // First call fails
      await result.current.loadTask();
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      await result.current.loadTask();
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.taskData).not.toBeNull();
      });
    });

    it("should update error state on failure", async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error("Failed to load task"),
      );

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadTask();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain("Failed to load task");
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should keep taskData as null on failure", async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error("Failed to load task"),
      );

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadTask();

      await waitFor(() => {
        expect(result.current.taskData).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should not load if taskId is missing", async () => {
      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, ""),
      );

      await result.current.loadTask();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.taskData).toBeNull();
    });
  });

  describe("loadHistory", () => {
    const mockHistoryResponse = {
      data: {
        interactions: [
          {
            id: "1",
            type: "user",
            content: "Hello",
            timestamp: "2024-01-01T00:00:00Z",
          },
          {
            id: "2",
            type: "ai",
            content: "Hi there!",
            timestamp: "2024-01-01T00:00:01Z",
          },
        ],
        evaluationId: "eval-123",
      },
    };

    const mockEvaluationResponse = {
      data: {
        evaluation: {
          score: 85,
          domainScores: { knowledge: 90, skills: 80 },
          metadata: {
            conversationCount: 2,
          },
        },
      },
    };

    it("should set loading true during fetch and false after", async () => {
      let resolvePromise: (value: Response) => void;
      const fetchPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve;
      });

      mockAuthenticatedFetch.mockReturnValue(fetchPromise);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // Start loading
      const loadPromise = result.current.loadHistory();

      // Should be loading immediately after call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: async () => mockHistoryResponse,
      } as Response);

      // Wait for loading to complete
      await loadPromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should update taskHistory on success", async () => {
      mockAuthenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistoryResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvaluationResponse,
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadHistory();

      await waitFor(() => {
        expect(result.current.taskHistory).toHaveLength(2);
        expect(result.current.taskHistory[0].type).toBe("user");
        expect(result.current.taskHistory[1].type).toBe("ai");
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set loading false after completion", async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistoryResponse,
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadHistory();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should clear any previous errors on success", async () => {
      mockAuthenticatedFetch
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistoryResponse,
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      // First call fails
      await result.current.loadHistory();
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second call succeeds
      await result.current.loadHistory();
      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.taskHistory.length).toBeGreaterThan(0);
      });
    });

    it("should update error state on failure", async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error("Failed to load history"),
      );

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadHistory();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain(
          "Failed to load history",
        );
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should keep taskHistory as empty array on failure", async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(
        new Error("Failed to load history"),
      );

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadHistory();

      await waitFor(() => {
        expect(result.current.taskHistory).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should skip loading for temp programs", async () => {
      const tempProgramId = "temp_123";

      const { result } = renderHook(() =>
        useTaskData(scenarioId, tempProgramId, taskId),
      );

      await result.current.loadHistory();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.taskHistory).toEqual([]);
    });

    it("should skip loading for invalid taskIds", async () => {
      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, "undefined"),
      );

      await result.current.loadHistory();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
      expect(result.current.taskHistory).toEqual([]);
    });
  });

  describe("reload", () => {
    const mockScenarioResponse = {
      success: true,
      data: {
        id: scenarioId,
        title: "Test Scenario",
        tasks: [{ id: "task-1", title: "Task 1" }],
      },
    };

    const mockProgramResponse = {
      id: programId,
      scenarioId: scenarioId,
      userId: "user-123",
      startedAt: "2024-01-01T00:00:00Z",
      status: "in_progress",
      totalTaskCount: 1,
    };

    const mockTaskResponse = {
      id: taskId,
      title: "Test Task",
      type: "pbl_task",
      status: "in_progress",
      content: { context: { taskTemplate: {} } },
      interactions: [],
    };

    const mockHistoryResponse = {
      data: {
        interactions: [],
      },
    };

    it("should call all three load functions", async () => {
      mockAuthenticatedFetch
        // loadProgram calls
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockScenarioResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ tasks: [] }),
        } as Response)
        // loadTask call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTaskResponse,
        } as Response)
        // loadHistory call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockHistoryResponse,
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.reload();

      await waitFor(() => {
        expect(mockAuthenticatedFetch).toHaveBeenCalledTimes(5);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle errors gracefully and complete loading", async () => {
      // Mock scenario fetch to fail for loadProgram
      mockAuthenticatedFetch
        .mockRejectedValueOnce(new Error("Failed to load scenario"))
        // Mock task fetch (will be called by loadTask)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTaskResponse,
        } as Response)
        // Mock history fetch (will be called by loadHistory)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { interactions: [] } }),
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.reload();

      // Even if one function fails, reload should complete and set loading to false
      // And successfully loaded data should be available
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.taskData).not.toBeNull();
      });
    });

    it("should update loading state correctly", async () => {
      let resolveScenario: (value: Response) => void;
      const scenarioPromise = new Promise<Response>((resolve) => {
        resolveScenario = resolve;
      });

      mockAuthenticatedFetch
        .mockReturnValueOnce(scenarioPromise)
        .mockResolvedValue({
          ok: true,
          json: async () => mockProgramResponse,
        } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      const reloadPromise = result.current.reload();

      // Should be loading during execution
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Resolve the scenario fetch
      resolveScenario!({
        ok: true,
        json: async () => mockScenarioResponse,
      } as Response);

      await reloadPromise;

      // Should not be loading after completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty scenario response", async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should handle network errors", async () => {
      mockAuthenticatedFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, taskId),
      );

      await result.current.loadProgram();

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
        expect(result.current.error?.message).toContain("Network error");
      });
    });

    it("should handle missing taskId", async () => {
      const { result } = renderHook(() =>
        useTaskData(scenarioId, programId, ""),
      );

      await result.current.loadTask();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });

    it("should handle missing programId", async () => {
      const { result } = renderHook(() => useTaskData(scenarioId, "", taskId));

      await result.current.loadTask();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });

    it("should handle missing scenarioId", async () => {
      const { result } = renderHook(() => useTaskData("", programId, taskId));

      await result.current.loadTask();

      expect(mockAuthenticatedFetch).not.toHaveBeenCalled();
    });
  });
});
