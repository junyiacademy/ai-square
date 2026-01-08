import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Program, Task } from "@/types/pbl";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
import { processInstructions } from "@/utils/pbl-instructions";

export interface ConversationEntry {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: string;
}

export interface UseTaskDataReturn {
  programData: Program | null;
  taskData: Task | null;
  taskHistory: ConversationEntry[];
  isLoading: boolean;
  error: Error | null;
  loadProgram: () => Promise<void>;
  loadTask: () => Promise<void>;
  loadHistory: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useTaskData(
  scenarioId: string,
  programId: string,
  taskId: string,
): UseTaskDataReturn {
  const { i18n } = useTranslation();
  const [programData, setProgramData] = useState<Program | null>(null);
  const [taskData, setTaskData] = useState<Task | null>(null);
  const [taskHistory, setTaskHistory] = useState<ConversationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isLoadingHistoryRef = useRef(false);

  const loadProgram = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load scenario data with language parameter using PBL API
      const scenarioRes = await authenticatedFetch(
        `/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`,
      );
      if (!scenarioRes.ok) throw new Error("Failed to load scenario");
      const scenarioData = await scenarioRes.json();

      let loadedProgram: Program | null = null;

      // Handle temp program IDs
      if (programId.startsWith("temp_")) {
        const mockProgram: Program = {
          id: programId,
          scenarioId: scenarioId,
          userId: "",
          userEmail: "",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "in_progress",
          totalTasks: scenarioData?.data?.tasks?.length || 0,
          currentTaskId: taskId,
          language: i18n.language,
        };
        loadedProgram = mockProgram;
      } else {
        // Load actual program data
        try {
          const programRes = await authenticatedFetch(
            `/api/pbl/scenarios/${scenarioId}/programs/${programId}`,
          );
          if (programRes.ok) {
            const programResponseData = await programRes.json();
            if (programResponseData) {
              loadedProgram = {
                id: programResponseData.id,
                scenarioId: scenarioId,
                userId: programResponseData.userId,
                userEmail: "",
                startedAt: programResponseData.startedAt,
                updatedAt: programResponseData.startedAt,
                status: programResponseData.status,
                totalTasks: programResponseData.totalTaskCount || 0,
                currentTaskId: taskId,
                language: i18n.language,
              } as Program;

              // If this is a draft program, update its timestamps
              if (loadedProgram.status === "draft") {
                try {
                  const updateRes = await authenticatedFetch(
                    `/api/pbl/programs/${programId}/update-timestamps`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        scenarioId,
                      }),
                    },
                  );

                  if (updateRes.ok) {
                    const updatedData = await updateRes.json();
                    if (updatedData.success && updatedData.program) {
                      loadedProgram = updatedData.program;
                    }
                  }
                } catch (updateError) {
                  console.error(
                    "Error updating draft timestamps:",
                    updateError,
                  );
                }
              }
            }
          }

          // Load task evaluations for program
          if (loadedProgram && !programId.startsWith("temp_")) {
            const tasksRes = await authenticatedFetch(
              `/api/pbl/programs/${programId}/tasks`,
            );
            if (tasksRes.ok) {
              const tasksData = await tasksRes.json();
              // Additional processing can be done here if needed
              console.log("Loaded tasks for program:", tasksData);
            }
          }
        } catch (programError) {
          console.error("Error loading program data:", programError);
        }
      }

      // Fallback: create mock program if loading failed
      if (!loadedProgram) {
        const mockProgram: Program = {
          id: programId,
          scenarioId: scenarioId,
          userId: "",
          userEmail: "",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: programId.startsWith("temp_") ? "in_progress" : "draft",
          totalTasks: scenarioData?.data?.tasks?.length || 0,
          currentTaskId: taskId,
          language: i18n.language,
        };
        loadedProgram = mockProgram;
      }

      setProgramData(loadedProgram);
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load program");
      setError(error);
      console.error("Error loading program data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [scenarioId, programId, taskId, i18n.language]);

  const loadTask = useCallback(async () => {
    if (!taskId || !scenarioId || !programId) return;

    try {
      setIsLoading(true);
      setError(null);

      const taskRes = await authenticatedFetch(
        `/api/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`,
      );
      if (taskRes.ok) {
        const taskResponseData = await taskRes.json();
        if (taskResponseData) {
          // Extract task template data from unified architecture format
          const taskTemplate =
            taskResponseData.content?.context?.taskTemplate || {};
          const originalTaskData =
            taskResponseData.content?.context?.originalTaskData || {};

          const loadedTask = {
            id: taskResponseData.id || taskId,
            title: taskResponseData.title,
            type: taskResponseData.type,
            content: taskResponseData.content,
            interactions: taskResponseData.interactions || [],
            status: taskResponseData.status,
            // Add fields from task template for rendering
            description: (() => {
              const templateDescription =
                taskTemplate.description || originalTaskData.description;
              if (
                typeof templateDescription === "object" &&
                !Array.isArray(templateDescription)
              ) {
                return (
                  templateDescription[i18n.language] ||
                  templateDescription.en ||
                  ""
                );
              }
              return typeof templateDescription === "string"
                ? templateDescription
                : "";
            })(),
            // Extract instructions based on current language
            instructions: processInstructions(
              taskTemplate.instructions || originalTaskData.instructions,
              i18n.language,
            ),
            expectedOutcome: (() => {
              const templateOutcome =
                originalTaskData.expectedOutcome ||
                taskTemplate.expectedOutcome;
              if (
                typeof templateOutcome === "object" &&
                !Array.isArray(templateOutcome)
              ) {
                return (
                  templateOutcome[i18n.language] || templateOutcome.en || ""
                );
              }
              return typeof templateOutcome === "string" ? templateOutcome : "";
            })(),
            // Store the scenario task index for matching
            scenarioTaskIndex: taskResponseData.scenarioTaskIndex,
            category:
              taskTemplate.category || originalTaskData.category || "task",
            assessmentFocus:
              taskTemplate.assessmentFocus ||
              originalTaskData.assessmentFocus ||
              null,
          } as unknown as Task;

          setTaskData(loadedTask);
        }
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load task");
      setError(error);
      console.error("Error loading task data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [taskId, scenarioId, programId, i18n.language]);

  const loadHistory = useCallback(async () => {
    // Prevent duplicate loading
    if (isLoadingHistoryRef.current) return;

    try {
      // Skip loading history for temp programs or invalid taskIds
      if (programId.startsWith("temp_") || !taskId || taskId === "undefined") {
        setTaskHistory([]);
        return;
      }

      setIsLoading(true);
      isLoadingHistoryRef.current = true;
      setError(null);

      console.log("Loading task history for:", {
        programId,
        taskId,
        scenarioId,
      });

      // Load task conversation history and evaluation
      const res = await authenticatedFetch(
        `/api/pbl/tasks/${taskId}/interactions`,
      );
      if (res.ok) {
        const data = await res.json();
        console.log("Task history response:", data);

        if (data.data?.interactions) {
          const loadedConversations = data.data.interactions.map(
            (interaction: Record<string, unknown>): ConversationEntry => ({
              id: String(
                interaction.id ||
                  `${interaction.timestamp}_${interaction.type}`,
              ),
              type: interaction.type as "user" | "ai" | "system",
              content: String(interaction.content),
              timestamp: String(interaction.timestamp),
            }),
          );
          console.log("Loaded conversations:", loadedConversations);
          setTaskHistory(loadedConversations);

          // Check if task has an evaluation
          if (data.data?.evaluationId) {
            console.log("Task has evaluationId:", data.data.evaluationId);
            // Fetch the evaluation details if needed
            const evalRes = await authenticatedFetch(
              `/api/pbl/tasks/${taskId}/evaluate`,
              {
                headers: {
                  "Accept-Language": i18n.language,
                },
              },
            );
            if (evalRes.ok) {
              const evalData = await evalRes.json();
              if (evalData.data?.evaluation) {
                console.log(
                  "Loaded existing evaluation:",
                  evalData.data.evaluation,
                );
                // Evaluation data available if needed
              }
            }
          }
        } else {
          console.log("No interactions found in response");
          setTaskHistory([]);
        }
      } else {
        if (res.status === 401) {
          console.log("Authentication required for task history");
        } else if (res.status === 404) {
          console.log("Task not found");
        } else {
          console.error("Failed to load task history:", res.status);
        }
        setTaskHistory([]);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Failed to load history");
      setError(error);
      console.error("Error loading task history:", error);
      setTaskHistory([]);
    } finally {
      setIsLoading(false);
      isLoadingHistoryRef.current = false;
    }
  }, [taskId, programId, scenarioId, i18n.language]);

  const reload = useCallback(async () => {
    // Call all load functions sequentially
    // Each function manages its own loading and error state
    await loadProgram();
    await loadTask();
    await loadHistory();
  }, [loadProgram, loadTask, loadHistory]);

  return {
    programData,
    taskData,
    taskHistory,
    isLoading,
    error,
    loadProgram,
    loadTask,
    loadHistory,
    reload,
  };
}
