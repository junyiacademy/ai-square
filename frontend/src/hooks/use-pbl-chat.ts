/**
 * PBL Chat Hook
 *
 * Manages chat state and message handling for PBL task pages.
 * Extracted from page.tsx for reusability and testability.
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Task, Scenario } from "@/types/pbl";
import { ConversationEntry } from "./use-task-data";
import {
  createProgramIfNeeded,
  saveInteraction,
  getAIResponse,
} from "@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/message-handlers";

export interface UsePBLChatParams {
  programId: string;
  scenarioId: string;
  currentTask: Task | null;
  scenario: Scenario | null;
  conversations: ConversationEntry[];
  onProgramIdChange?: (newProgramId: string) => void;
}

export interface UsePBLChatReturn {
  userInput: string;
  isProcessing: boolean;
  setUserInput: (value: string) => void;
  handleSendMessage: () => Promise<ConversationEntry[] | null>;
}

export function usePBLChat({
  programId,
  scenarioId,
  currentTask,
  scenario,
  conversations,
  onProgramIdChange,
}: UsePBLChatParams): UsePBLChatReturn {
  const { t, i18n } = useTranslation(["pbl", "common"]);
  const [userInput, setUserInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSendMessage = useCallback(async (): Promise<ConversationEntry[] | null> => {
    if (!userInput.trim() || isProcessing || !currentTask || !currentTask.id) {
      return null;
    }

    const userMessage = userInput.trim();
    setUserInput("");
    setIsProcessing(true);

    // Create user message entry
    const newUserEntry: ConversationEntry = {
      id: Date.now().toString(),
      type: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    try {
      // Handle program ID conversion: temp ID or draft -> active program
      let actualProgramId = programId;

      if (programId.startsWith("temp_")) {
        actualProgramId = await createProgramIfNeeded(programId, {
          scenarioId,
          language: i18n.language,
        });

        if (actualProgramId !== programId && onProgramIdChange) {
          onProgramIdChange(actualProgramId);
          // Update URL without navigation
          const newUrl = `/pbl/scenarios/${scenarioId}/program/${actualProgramId}/tasks/${currentTask.id}`;
          window.history.replaceState({}, "", newUrl);
        }
      }

      // Save user interaction
      const taskIdToUse = currentTask?.id;
      await saveInteraction({
        taskId: taskIdToUse,
        interaction: {
          type: "user",
          content: userMessage,
          timestamp: newUserEntry.timestamp,
        },
        language: i18n.language,
      });

      // Get AI response
      const aiMessage = await getAIResponse({
        message: userMessage,
        sessionId: actualProgramId,
        currentTask,
        scenario,
        scenarioId,
        conversations,
        language: i18n.language,
      });

      // Hide thinking indicator first
      setIsProcessing(false);

      // Small delay to ensure thinking indicator is hidden before showing response
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create AI message entry
      const aiEntry: ConversationEntry = {
        id: (Date.now() + 1).toString(),
        type: "ai",
        content: aiMessage,
        timestamp: new Date().toISOString(),
      };

      // Save AI interaction
      await saveInteraction({
        taskId: currentTask.id,
        interaction: {
          type: "ai",
          content: aiMessage,
          timestamp: aiEntry.timestamp,
        },
        language: i18n.language,
      });

      return [newUserEntry, aiEntry];
    } catch (error) {
      console.error("Error processing message:", error);

      // Hide thinking indicator first
      setIsProcessing(false);

      // Small delay before showing error
      await new Promise((resolve) => setTimeout(resolve, 100));

      const errorEntry: ConversationEntry = {
        id: (Date.now() + 2).toString(),
        type: "system",
        content: t("pbl:learn.errorProcessing"),
        timestamp: new Date().toISOString(),
      };

      return [newUserEntry, errorEntry];
    }
  }, [
    userInput,
    isProcessing,
    currentTask,
    programId,
    scenarioId,
    scenario,
    conversations,
    i18n.language,
    t,
    onProgramIdChange,
  ]);

  return {
    userInput,
    isProcessing,
    setUserInput,
    handleSendMessage,
  };
}
