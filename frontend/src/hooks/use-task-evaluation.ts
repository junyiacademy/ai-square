import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TaskEvaluation } from '@/types/pbl-completion';
import { Task, Scenario } from '@/types/pbl';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { ConversationEntry } from './use-task-data';
import { getLocalizedField } from '@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers';

export interface UseTaskEvaluationParams {
  taskId: string;
  programId: string;
  scenarioId: string;
  currentTask: Task | null;
  scenario: Scenario | null;
  conversations: ConversationEntry[];
}

export interface UseTaskEvaluationReturn {
  evaluation: TaskEvaluation | null;
  isEvaluating: boolean;
  isEvaluateDisabled: boolean;
  showEvaluateButton: boolean;
  taskEvaluations: Record<string, TaskEvaluation>;
  programTasks: Array<{ id: string; taskIndex: number }>;
  isTranslating: boolean;
  handleEvaluate: () => Promise<void>;
  handleTranslateEvaluation: () => Promise<void>;
  loadProgramTaskEvaluations: () => Promise<void>;
  enableEvaluateButtonAfterNewMessages: (updatedConversations: ConversationEntry[]) => void;
}

export function useTaskEvaluation({
  taskId,
  programId,
  scenarioId,
  currentTask,
  scenario,
  conversations
}: UseTaskEvaluationParams): UseTaskEvaluationReturn {
  const { t, i18n } = useTranslation(['pbl', 'common']);

  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isEvaluateDisabled, setIsEvaluateDisabled] = useState(false);
  const [showEvaluateButton, setShowEvaluateButton] = useState(false);
  const [taskEvaluations, setTaskEvaluations] = useState<Record<string, TaskEvaluation>>({});
  const [programTasks, setProgramTasks] = useState<Array<{ id: string; taskIndex: number }>>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  // Load evaluation when conversations change
  useEffect(() => {
    const loadEvaluation = async () => {
      // Show evaluate button if there are conversations
      if (conversations.length > 0) {
        setShowEvaluateButton(true);

        // Load evaluation if exists and currentTask is present
        if (taskId && currentTask && !programId.startsWith('temp_')) {
          try {
            const evalRes = await authenticatedFetch(`/api/pbl/tasks/${taskId}/evaluate`, {
              headers: {
                'Accept-Language': i18n.language
              }
            });
            if (evalRes.ok) {
              const evalData = await evalRes.json();
              if (evalData.data?.evaluation) {
                setEvaluation(evalData.data.evaluation);

                const currentUserMessageCount = conversations.filter((c) => c.type === 'user').length;
                const evaluationUserMessageCount = evalData.data.evaluation.metadata?.conversationCount || 0;

                // If evaluation is up to date, disable button
                if (evaluationUserMessageCount >= currentUserMessageCount) {
                  setIsEvaluateDisabled(true);
                } else {
                  setIsEvaluateDisabled(false);
                }
              }
            }
          } catch (error) {
            console.error('Error loading evaluation:', error);
          }
        }
      }
    };

    loadEvaluation();
  }, [conversations, taskId, programId, currentTask, i18n.language]);

  const handleEvaluate = async () => {
    if (!currentTask || conversations.length === 0) return;

    setIsEvaluating(true);

    try {
      // Get last 10 conversations
      const recentConversations = conversations.slice(-10);

      // Call evaluate API
      const response = await authenticatedFetch('/api/pbl/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversations: recentConversations,
          task: currentTask,
          targetDomains: scenario?.targetDomains || [],
          focusKSA: [
            ...(currentTask.assessmentFocus?.primary || []),
            ...(currentTask.assessmentFocus?.secondary || [])
          ],
          language: i18n.language
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Evaluation API error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to evaluate`);
      }

      const data = await response.json();
      console.log('Evaluation response:', data);

      if (data.success) {
        setEvaluation(data.evaluation);
        // Disable the evaluate button after successful evaluation
        setIsEvaluateDisabled(true);

        // Update task evaluations map
        setTaskEvaluations(prev => ({
          ...prev,
          [currentTask.id]: data.evaluation
        }));

        // Save evaluation to database
        try {
          const saveResponse = await authenticatedFetch(`/api/pbl/tasks/${currentTask.id}/evaluate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': i18n.language
            },
            body: JSON.stringify({
              programId,
              evaluation: data.evaluation
            })
          });

          if (!saveResponse.ok) {
            console.error('Failed to save evaluation to database');
          } else {
            const saveData = await saveResponse.json();
            if (saveData.success && saveData.data?.evaluationId) {
              // Update the evaluation with the ID from backend
              const evalWithId = {
                ...data.evaluation,
                id: saveData.data.evaluationId
              };
              setEvaluation(evalWithId);
              // Also update task evaluations map
              setTaskEvaluations(prev => ({
                ...prev,
                [currentTask.id]: evalWithId
              }));
            }
          }
        } catch (saveError) {
          console.error('Error saving evaluation:', saveError);
          // Don't fail the whole evaluation if saving fails
        }
      } else {
        throw new Error(data.error || 'Evaluation failed');
      }
    } catch (error) {
      console.error('Error evaluating:', error);
      alert(`${t('pbl:learn.evaluationFailed')}: ${error instanceof Error ? error.message : t('pbl:learn.unknownError')}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleTranslateEvaluation = async () => {
    if (!currentTask || !evaluation || isTranslating) return;

    setIsTranslating(true);
    try {
      const response = await authenticatedFetch(`/api/pbl/tasks/${currentTask.id}/translate-evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        }
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      if (data.success && data.data?.evaluation) {
        // Update evaluation with translated content
        setEvaluation({
          ...evaluation,
          ...data.data.evaluation,
          needsTranslation: false
        });

        // Update taskEvaluations map as well
        setTaskEvaluations(prev => ({
          ...prev,
          [currentTask.id]: {
            ...prev[currentTask.id],
            ...data.data.evaluation,
            needsTranslation: false
          }
        }));
      }
    } catch (error) {
      console.error('Error translating evaluation:', error);
      alert(t('pbl:learn.translationFailed', 'Failed to translate evaluation'));
    } finally {
      setIsTranslating(false);
    }
  };

  const loadProgramTaskEvaluations = async () => {
    // Don't load for temp programs
    if (programId.startsWith('temp_')) {
      return;
    }

    try {
      const tasksRes = await authenticatedFetch(`/api/pbl/programs/${programId}/tasks`);
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        const sortedTasks = tasksData.sort((a: { taskIndex: number }, b: { taskIndex: number }) => a.taskIndex - b.taskIndex);
        setProgramTasks(sortedTasks.map((t: { id: string; taskIndex: number }) => ({ id: t.id, taskIndex: t.taskIndex })));

        const evaluations: Record<string, TaskEvaluation> = {};
        const evalPromises = sortedTasks.map(async (task: { id: string }) => {
          try {
            const evalRes = await authenticatedFetch(`/api/pbl/tasks/${task.id}/evaluate`);
            if (evalRes.ok) {
              const evalData = await evalRes.json();
              if (evalData.success && evalData.data?.evaluation) {
                return { taskId: task.id, evaluation: evalData.data.evaluation };
              }
            }
          } catch (err) {
            console.error(`Error loading evaluation for task ${task.id}:`, err);
          }
          return null;
        });

        const evalResults = await Promise.all(evalPromises);
        evalResults.forEach(result => {
          if (result) {
            evaluations[result.taskId] = result.evaluation;
          }
        });

        setTaskEvaluations(evaluations);
      }
    } catch (error) {
      console.error('Error loading task evaluations:', error);
    }
  };

  const enableEvaluateButtonAfterNewMessages = (updatedConversations: ConversationEntry[]) => {
    const userMessageCount = updatedConversations.filter(c => c.type === 'user').length;

    // Enable button if there are user messages and no evaluation yet, or if new messages were added
    if (userMessageCount > 0 && (!evaluation || userMessageCount > 1)) {
      setIsEvaluateDisabled(false);
    }
  };

  return {
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
    enableEvaluateButtonAfterNewMessages
  };
}
