"use client";

/**
 * PBL Task Learning Page
 *
 * Main page for PBL task-based learning with AI chat interaction.
 * Refactored to use extracted components and hooks for maintainability.
 *
 * Components used:
 * - TaskProgressSidebar: Left sidebar showing task progress
 * - TaskInfoPanel: Middle panel with task details and evaluation
 * - TaskChatPanel: Right panel with chat interface
 * - Mobile components: MobileProgressView, MobileTaskInfoView, MobileChatView, MobileBottomNavigation
 *
 * Hooks used:
 * - useTaskData: Loads program, task, and history data
 * - useTaskEvaluation: Manages evaluation state and actions
 * - usePBLChat: Manages chat state and message handling
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { PBLLearningContentSkeleton } from "@/components/pbl/loading-skeletons";
import { Program, Scenario, Task } from "@/types/pbl";
import { TaskEvaluation } from "@/types/pbl-completion";
import { authenticatedFetch } from "@/lib/utils/authenticated-fetch";
import { processInstructions } from "@/utils/pbl-instructions";
import { ConversationEntry } from "@/hooks/use-task-data";
import { useTaskEvaluation } from "@/hooks/use-task-evaluation";
import { usePBLChat } from "@/hooks/use-pbl-chat";
import { getLocalizedField } from "./utils/task-helpers";
import { navigateToNextTask } from "./utils/message-handlers";

// Component imports
import { TaskProgressSidebar } from "@/components/pbl/task/TaskProgressSidebar";
import { TaskInfoPanel } from "@/components/pbl/task/TaskInfoPanel";
import { TaskChatPanel } from "@/components/pbl/task/TaskChatPanel";
import { MobileBottomNavigation } from "@/components/pbl/task/mobile/MobileBottomNavigation";
import { MobileProgressView } from "@/components/pbl/task/mobile/MobileProgressView";
import { MobileTaskInfoView } from "@/components/pbl/task/mobile/MobileTaskInfoView";
import { MobileChatView } from "@/components/pbl/task/mobile/MobileChatView";

// Page header component
function PageHeader({
  scenario,
  language,
}: {
  scenario: Scenario;
  language: string;
}) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getLocalizedField(
              scenario as unknown as Record<string, unknown>,
              "title",
              language
            )}
          </h1>
        </div>
      </div>
    </header>
  );
}

export default function ProgramLearningPage({
  params,
}: {
  params: Promise<{ id: string; programId: string; taskId: string }>;
}) {
  const router = useRouter();
  const { t, i18n } = useTranslation(["pbl", "common"]);

  // URL params state
  const [programId, setProgramId] = useState<string>("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");

  // Core data state
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);

  // UI state
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<"progress" | "task" | "chat">(
    "chat"
  );

  // Unwrap the params Promise
  useEffect(() => {
    params.then((p) => {
      setScenarioId(p.id);
      setProgramId(p.programId);
      setTaskId(p.taskId);
    });
  }, [params]);

  // Use evaluation hook
  const {
    evaluation,
    isEvaluating,
    isEvaluateDisabled,
    showEvaluateButton,
    taskEvaluations,
    programTasks,
    isTranslating,
    handleEvaluate,
    handleTranslateEvaluation,
    loadProgramTaskEvaluations,
    enableEvaluateButtonAfterNewMessages,
  } = useTaskEvaluation({
    taskId,
    programId,
    scenarioId,
    currentTask,
    scenario,
    conversations,
  });

  // Use chat hook
  const { userInput, isProcessing, setUserInput, handleSendMessage } =
    usePBLChat({
      programId,
      scenarioId,
      currentTask,
      scenario,
      conversations,
      onProgramIdChange: setProgramId,
    });

  // Load program and scenario data
  useEffect(() => {
    if (!programId || !scenarioId || !taskId) return;
    loadProgramData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, scenarioId, taskId, i18n.language]);

  // Load task data when taskId or language changes
  useEffect(() => {
    if (scenario && taskId) {
      loadTaskData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, scenario, i18n.language]);

  const loadProgramData = async () => {
    try {
      setLoading(true);

      // Load scenario data
      const scenarioRes = await authenticatedFetch(
        `/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`
      );
      if (!scenarioRes.ok) throw new Error("Failed to load scenario");
      const scenarioData = await scenarioRes.json();

      if (scenarioData.success && scenarioData.data) {
        setScenario(scenarioData.data);
      } else if (scenarioData.id) {
        setScenario(scenarioData);
      }

      // Load program data
      let loadedProgram: Program | null = null;

      if (!programId.startsWith("temp_")) {
        try {
          const programRes = await authenticatedFetch(
            `/api/pbl/scenarios/${scenarioId}/programs/${programId}`
          );
          if (programRes.ok) {
            const programData = await programRes.json();
            if (programData) {
              loadedProgram = {
                id: programData.id,
                scenarioId: scenarioId,
                userId: programData.userId,
                userEmail: "",
                startedAt: programData.startedAt,
                updatedAt: programData.startedAt,
                status: programData.status,
                totalTasks: programData.totalTaskCount || 0,
                currentTaskId: taskId,
                language: i18n.language,
              } as Program;

              // Update draft program timestamps
              if (loadedProgram.status === "draft") {
                try {
                  const updateRes = await authenticatedFetch(
                    `/api/pbl/programs/${programId}/update-timestamps`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ scenarioId }),
                    }
                  );
                  if (updateRes.ok) {
                    const updatedData = await updateRes.json();
                    if (updatedData.success && updatedData.program) {
                      loadedProgram = updatedData.program;
                    }
                  }
                } catch (error) {
                  console.error("Error updating draft timestamps:", error);
                }
              }

              setProgram(loadedProgram);
            }
          }
        } catch (error) {
          console.error("Error loading program data:", error);
        }
      }

      // Fallback: create mock program
      if (!loadedProgram) {
        const mockProgram: Program = {
          id: programId,
          scenarioId: scenarioId,
          userId: "",
          userEmail: "",
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: programId.startsWith("temp_") ? "in_progress" : "draft",
          totalTasks: scenarioData.data?.tasks?.length || 0,
          currentTaskId: taskId || scenarioData.data?.tasks?.[0]?.id,
          language: i18n.language,
        };
        setProgram(mockProgram);
      }

      // Load task evaluations for the program
      await loadProgramTaskEvaluations();

      // Navigate to first task if no taskId
      if (!taskId && scenarioData.data?.tasks?.length > 0) {
        const firstTaskId = scenarioData.data.tasks[0].id;
        router.replace(
          `/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${firstTaskId}`
        );
      }
    } catch (error) {
      console.error("Error loading program data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskData = async () => {
    if (!taskId || !scenarioId || !programId) return;

    try {
      const taskRes = await authenticatedFetch(
        `/api/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`
      );
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        if (taskData) {
          const taskTemplate = taskData.content?.context?.taskTemplate || {};
          const originalTaskData =
            taskData.content?.context?.originalTaskData || {};

          const loadedTask = {
            id: taskData.id || taskId,
            title: taskData.title,
            type: taskData.type,
            content: taskData.content,
            interactions: taskData.interactions || [],
            status: taskData.status,
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
            instructions: processInstructions(
              taskTemplate.instructions || originalTaskData.instructions,
              i18n.language
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
            scenarioTaskIndex: taskData.scenarioTaskIndex,
            category:
              taskTemplate.category || originalTaskData.category || "task",
            assessmentFocus:
              taskTemplate.assessmentFocus ||
              originalTaskData.assessmentFocus ||
              null,
          } as unknown as Task;

          setCurrentTask(loadedTask);
          await loadTaskHistory(loadedTask);
        }
      }
    } catch (error) {
      console.error("Error loading task data:", error);
    }
  };

  const loadTaskHistory = async (taskToLoad?: Task) => {
    const task = taskToLoad || currentTask;

    if (programId.startsWith("temp_") || !taskId || taskId === "undefined") {
      if (conversations.length === 0) setConversations([]);
      return;
    }

    if (!task || !task.id) return;

    try {
      const res = await authenticatedFetch(
        `/api/pbl/tasks/${task.id}/interactions`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.data?.interactions) {
          const loadedConversations = data.data.interactions.map(
            (interaction: Record<string, unknown>): ConversationEntry => ({
              id: String(
                interaction.id ||
                  `${interaction.timestamp}_${interaction.type}`
              ),
              type: interaction.type as "user" | "ai" | "system",
              content: String(interaction.content),
              timestamp: String(interaction.timestamp),
            })
          );
          setConversations(loadedConversations);
        } else if (conversations.length === 0) {
          setConversations([]);
        }
      }
    } catch (error) {
      console.error("Error loading task history:", error);
    }
  };

  // Handle sending message and updating state
  const handleSendMessageWrapper = useCallback(async () => {
    const newEntries = await handleSendMessage();
    if (newEntries) {
      setConversations((prev) => [...prev, ...newEntries]);
      enableEvaluateButtonAfterNewMessages([...conversations, ...newEntries]);
    }
  }, [
    handleSendMessage,
    conversations,
    enableEvaluateButtonAfterNewMessages,
  ]);

  // Handle completing task and navigating
  const handleCompleteTask = useCallback(async () => {
    if (!currentTask || !program) return;

    await navigateToNextTask({
      programId,
      currentTask,
      scenarioId,
      router,
    });
  }, [currentTask, program, programId, scenarioId, router]);

  // Handle switching tasks
  const switchTask = useCallback(
    (newTaskId: string) => {
      router.push(
        `/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${newTaskId}`
      );
    },
    [router, scenarioId, programId]
  );

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PBLLearningContentSkeleton />
        </div>
      </main>
    );
  }

  // No data state
  if (!scenario || !currentTask) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t("pbl:learn.noTaskFound")}
          </p>
        </div>
      </div>
    );
  }

  const taskIndex =
    ((currentTask as unknown as Record<string, unknown>)
      ?.scenarioTaskIndex as number) ??
    scenario.tasks.findIndex((t) => t.id === currentTask.id);

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <PageHeader scenario={scenario} language={i18n.language} />

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full">
          {/* Left Sidebar - Progress */}
          <TaskProgressSidebar
            scenario={scenario}
            currentTaskId={currentTask.id}
            programTasks={programTasks}
            taskEvaluations={taskEvaluations}
            isCollapsed={isProgressCollapsed}
            onToggleCollapse={() => setIsProgressCollapsed(!isProgressCollapsed)}
            onSwitchTask={switchTask}
            language={i18n.language}
            scenarioId={scenarioId}
            programId={programId}
            t={t}
          />

          {/* Middle Panel - Task Info */}
          <TaskInfoPanel
            currentTask={currentTask}
            scenario={scenario}
            program={program}
            taskIndex={taskIndex}
            evaluation={evaluation}
            isTranslating={isTranslating}
            programTasks={programTasks}
            language={i18n.language}
            onCompleteTask={handleCompleteTask}
            onTranslateEvaluation={handleTranslateEvaluation}
            t={t}
          />

          {/* Right Panel - Chat */}
          <TaskChatPanel
            conversations={conversations}
            userInput={userInput}
            isProcessing={isProcessing}
            isEvaluating={isEvaluating}
            showEvaluateButton={showEvaluateButton}
            isEvaluateDisabled={isEvaluateDisabled}
            language={i18n.language}
            onUserInputChange={setUserInput}
            onSendMessage={handleSendMessageWrapper}
            onEvaluate={handleEvaluate}
            t={t}
          />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          <div className="flex-1 overflow-hidden">
            {mobileView === "progress" && (
              <MobileProgressView
                scenario={scenario}
                currentTask={currentTask}
                programTasks={programTasks}
                taskEvaluations={taskEvaluations}
                scenarioId={scenarioId}
                programId={programId}
                language={i18n.language}
                onSwitchTask={switchTask}
                onViewChange={setMobileView}
                t={t}
              />
            )}

            {mobileView === "task" && (
              <MobileTaskInfoView
                currentTask={currentTask}
                scenario={scenario}
                taskIndex={taskIndex}
                evaluation={evaluation as TaskEvaluation | null}
                language={i18n.language}
                onCompleteTask={handleCompleteTask}
                t={t}
              />
            )}

            {mobileView === "chat" && (
              <MobileChatView
                conversations={conversations}
                userInput={userInput}
                isProcessing={isProcessing}
                isEvaluating={isEvaluating}
                showEvaluateButton={showEvaluateButton}
                isEvaluateDisabled={isEvaluateDisabled}
                language={i18n.language}
                onUserInputChange={setUserInput}
                onSendMessage={handleSendMessageWrapper}
                onEvaluate={handleEvaluate}
                t={t}
              />
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNavigation
            currentView={mobileView}
            onViewChange={setMobileView}
            t={t}
          />
        </div>
      </div>
    </div>
  );
}
