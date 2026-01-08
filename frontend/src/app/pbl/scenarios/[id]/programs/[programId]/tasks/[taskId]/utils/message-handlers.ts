import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
import { Task, Scenario } from "@/types/pbl";
import { ConversationEntry } from "@/hooks/use-task-data";
import { getLocalizedField } from "./task-helpers";

interface CreateProgramParams {
  scenarioId: string;
  language: string;
}

export async function createProgramIfNeeded(
  programId: string,
  params: CreateProgramParams,
): Promise<string> {
  if (!programId.startsWith("temp_")) {
    return programId;
  }

  const createRes = await authenticatedFetch(
    `/api/pbl/scenarios/${params.scenarioId}/start`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: params.language,
      }),
    },
  );

  if (!createRes.ok) throw new Error("Failed to create program");

  const createData = await createRes.json();
  if (createData.success && createData.programId) {
    return createData.programId;
  }

  throw new Error("Failed to create program");
}

interface SaveInteractionParams {
  taskId: string;
  interaction: {
    type: "user" | "ai";
    content: string;
    timestamp: string;
  };
  language: string;
}

export async function saveInteraction(
  params: SaveInteractionParams,
): Promise<void> {
  // Only try to save interaction if we have a valid UUID task ID
  if (
    !params.taskId.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  ) {
    console.log("Skipping interaction save - no valid task ID yet");
    return;
  }

  const saveRes = await authenticatedFetch(
    `/api/pbl/tasks/${params.taskId}/interactions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": params.language,
      },
      body: JSON.stringify({
        interaction: params.interaction,
      }),
    },
  );

  if (!saveRes.ok) {
    const errorText = await saveRes.text().catch(() => "Unknown error");
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText };
    }

    if (saveRes.status === 404) {
      console.log("Task not found yet - this is normal for new programs");
    } else {
      console.error("Failed to save interaction:", {
        status: saveRes.status,
        error: errorData.error || errorText,
        taskId: params.taskId,
      });
    }
  }
}

interface GetAIResponseParams {
  message: string;
  sessionId: string;
  currentTask: Task;
  scenario: Scenario | null;
  scenarioId: string;
  conversations: ConversationEntry[];
  language: string;
}

export async function getAIResponse(
  params: GetAIResponseParams,
): Promise<string> {
  const aiRes = await authenticatedFetch(
    `/api/pbl/chat?lang=${params.language}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-Language": params.language,
      },
      body: JSON.stringify({
        message: params.message,
        sessionId: params.sessionId,
        context: {
          scenarioId: params.scenario?.id || params.scenarioId,
          taskId: params.currentTask.id,
          taskTitle: getLocalizedField(
            params.currentTask as unknown as Record<string, unknown>,
            "title",
            params.language,
          ),
          taskDescription: getLocalizedField(
            params.currentTask as unknown as Record<string, unknown>,
            "description",
            params.language,
          ),
          instructions: Array.isArray(params.currentTask.instructions)
            ? params.currentTask.instructions
            : [],
          expectedOutcome: getLocalizedField(
            params.currentTask as unknown as Record<string, unknown>,
            "expectedOutcome",
            params.language,
          ),
          conversationHistory: params.conversations.slice(-10).map((conv) => ({
            role: conv.type === "user" ? "user" : "assistant",
            content: conv.content,
          })),
        },
      }),
    },
  );

  if (!aiRes.ok) {
    const errorData = await aiRes.json().catch(() => ({}));
    console.error("Chat API error:", {
      status: aiRes.status,
      statusText: aiRes.statusText,
      error: errorData.error || errorData,
      url: aiRes.url,
    });
    throw new Error(
      `Failed to get AI response: ${aiRes.status} ${errorData.error || aiRes.statusText}`,
    );
  }

  const aiData = await aiRes.json();
  return aiData.response;
}

interface NavigateToNextTaskParams {
  programId: string;
  currentTask: Task;
  scenarioId: string;
  router: {
    push: (url: string) => void;
  };
}

export async function navigateToNextTask(
  params: NavigateToNextTaskParams,
): Promise<void> {
  try {
    const tasksRes = await authenticatedFetch(
      `/api/pbl/programs/${params.programId}/tasks`,
    );
    if (tasksRes.ok) {
      const tasks = await tasksRes.json();
      const sortedTasks = tasks.sort(
        (a: { taskIndex: number }, b: { taskIndex: number }) =>
          a.taskIndex - b.taskIndex,
      );
      const currentIndex = sortedTasks.findIndex(
        (t: { id: string }) => t.id === params.currentTask.id,
      );

      console.log("navigateToNextTask:", {
        currentTaskId: params.currentTask.id,
        totalTaskCount: sortedTasks.length,
        currentIndex,
        hasNextTask:
          currentIndex !== -1 && currentIndex < sortedTasks.length - 1,
      });

      if (currentIndex !== -1 && currentIndex < sortedTasks.length - 1) {
        const nextTaskId = sortedTasks[currentIndex + 1].id;
        console.log("Navigating to next task:", nextTaskId);
        params.router.push(
          `/pbl/scenarios/${params.scenarioId}/programs/${params.programId}/tasks/${nextTaskId}`,
        );
      } else {
        console.log(
          "All tasks completed or task not found, going to complete page",
        );
        params.router.push(
          `/pbl/scenarios/${params.scenarioId}/programs/${params.programId}/complete`,
        );
      }
    } else {
      console.log("Failed to fetch tasks, going to complete page");
      params.router.push(
        `/pbl/scenarios/${params.scenarioId}/programs/${params.programId}/complete`,
      );
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    params.router.push(
      `/pbl/scenarios/${params.scenarioId}/programs/${params.programId}/complete`,
    );
  }
}
