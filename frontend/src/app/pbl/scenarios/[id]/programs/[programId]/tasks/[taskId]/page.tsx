'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { PBLLearningContentSkeleton } from '@/components/pbl/loading-skeletons';
import {
  Program,
  Scenario,
  Task,
  DomainType,

} from '@/types/pbl';
import { TaskEvaluation } from '@/types/pbl-completion';
import { formatDateWithLocale } from '@/utils/locale';
import { processInstructions } from '@/utils/pbl-instructions';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { StarRating } from '@/components/shared/StarRating';
import { getQualitativeRating, getLocalizedField } from './utils/task-helpers';
import { useTaskData, type ConversationEntry } from '@/hooks/use-task-data';
import { useTaskEvaluation } from '@/hooks/use-task-evaluation';
import { TaskHeader } from '@/components/pbl/task/TaskHeader';
import { TaskProgressSidebar } from '@/components/pbl/task/TaskProgressSidebar';
import { TaskInfoPanel } from '@/components/pbl/task/TaskInfoPanel';
import { TaskChatPanel } from '@/components/pbl/task/TaskChatPanel';

export default function ProgramLearningPage() {
  const params = useParams();
  const router = useRouter();
  // Note: searchParams removed as it was unused
  const { t, i18n } = useTranslation(['pbl', 'common']);

  const [programId, setProgramId] = useState(params.programId as string);
  const scenarioId = params.id as string;
  const taskId = params.taskId as string;

  // Use the custom hook for data fetching
  const {
    programData,
    taskData,
    taskHistory,
    isLoading: isLoadingTaskData,
    loadProgram,
    loadTask,
    loadHistory,
    reload: reloadTaskData
  } = useTaskData(scenarioId, programId, taskId);

  // States
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'progress' | 'task' | 'chat'>('chat');

  // Use the evaluation hook
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
    enableEvaluateButtonAfterNewMessages
  } = useTaskEvaluation({
    taskId,
    programId,
    scenarioId,
    currentTask,
    scenario,
    conversations
  });

  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Sync hook data to local state
  useEffect(() => {
    if (programData) {
      setProgram(programData);
    }
  }, [programData]);

  useEffect(() => {
    if (taskData) {
      setCurrentTask(taskData);
    }
  }, [taskData]);

  useEffect(() => {
    setConversations(taskHistory);
  }, [taskHistory]);

  // Load program and scenario data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load scenario data
        const scenarioRes = await authenticatedFetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        if (!scenarioRes.ok) throw new Error('Failed to load scenario');
        const scenarioData = await scenarioRes.json();
        if (scenarioData.success && scenarioData.data) {
          setScenario(scenarioData.data);
        } else if (scenarioData.id) {
          setScenario(scenarioData);
        }

        // Load program data using hook
        await loadProgram();

        // Load task evaluations for non-temp programs
        await loadProgramTaskEvaluations();
      } catch (error) {
        console.error('Error loading program data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, scenarioId, i18n.language]);

  // Load task data when taskId or language changes
  useEffect(() => {
    if (taskId) {
      loadTask();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, i18n.language]);

  // Load task history after task is loaded
  useEffect(() => {
    if (taskData && taskId) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskData, taskId]);

  // Scroll to bottom when conversations change
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !currentTask || !currentTask.id) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    // Add user message to conversation
    const newUserEntry: ConversationEntry = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setConversations(prev => [...prev, newUserEntry]);

    try {
      // Handle program ID conversion: temp ID or draft → active program
      let actualProgramId = programId;

      if (programId.startsWith('temp_')) {
        // Legacy temp ID - create new program (fallback)
        const createRes = await authenticatedFetch(`/api/pbl/scenarios/${scenarioId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            language: i18n.language
          })
        });

        if (!createRes.ok) throw new Error('Failed to create program');

        const createData = await createRes.json();
        if (createData.success && createData.programId) {
          actualProgramId = createData.programId;
          setProgramId(actualProgramId);

          // Update URL without navigation
          const newUrl = `/pbl/scenarios/${scenarioId}/program/${actualProgramId}/tasks/${taskId}`;
          window.history.replaceState({}, '', newUrl);

          // Force update the params to ensure consistency
          // Note: params from useParams are readonly, so we update programId state instead
        } else {
          throw new Error('Failed to create program');
        }
      }

      // Save user interaction - skip if no valid task ID yet
      const taskIdToUse = currentTask?.id || taskId;

      // Only try to save interaction if we have a valid UUID task ID
      let saveUserRes: Response | { ok: true } = { ok: true }; // Default to OK to not block flow

      if (taskIdToUse && taskIdToUse.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        saveUserRes = await authenticatedFetch(`/api/pbl/tasks/${taskIdToUse}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({
          interaction: {
            type: 'user',
            content: userMessage,
            timestamp: newUserEntry.timestamp
          }
        })
      });
      } else {
        console.log('Skipping interaction save - no valid task ID yet');
      }

      if (!saveUserRes.ok) {
        // Only process as Response if it's actually a Response object
        if ('text' in saveUserRes) {
          const errorText = await saveUserRes.text().catch(() => 'Unknown error');
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: errorText };
          }

          // Only log as error if it's not a 404 (task not found is expected for new tasks)
          if ('status' in saveUserRes && saveUserRes.status === 404) {
            console.log('Task not found yet - this is normal for new programs');
          } else {
            console.error('Failed to save user interaction:', {
              status: 'status' in saveUserRes ? saveUserRes.status : 'unknown',
              error: errorData.error || errorText,
              taskId: currentTask?.id || 'no-task-id',
              programId: actualProgramId
            });
          }
        }
        // Don't stop the flow, interactions might still be saved in the database
      }

      // Get AI response
      const aiRes = await authenticatedFetch(`/api/pbl/chat?lang=${i18n.language}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: actualProgramId,
          context: {
            scenarioId: scenario?.id || scenarioId,  // Use actual UUID from scenario object
            taskId: currentTask.id,
            taskTitle: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language),
            taskDescription: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'description', i18n.language),
            instructions: Array.isArray(currentTask.instructions) ? currentTask.instructions : [],
            expectedOutcome: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'expectedOutcome', i18n.language),
            conversationHistory: conversations.slice(-10).map(conv => ({
              role: conv.type === 'user' ? 'user' : 'assistant',
              content: conv.content
            }))
          }
        })
      });

      if (!aiRes.ok) {
        const errorData = await aiRes.json().catch(() => ({}));
        console.error('Chat API error:', {
          status: aiRes.status,
          statusText: aiRes.statusText,
          error: errorData.error || errorData,
          url: aiRes.url
        });
        throw new Error(`Failed to get AI response: ${aiRes.status} ${errorData.error || aiRes.statusText}`);
      }

      const aiData = await aiRes.json();
      const aiMessage = aiData.response;

      // Hide thinking indicator first
      setIsProcessing(false);

      // Small delay to ensure thinking indicator is hidden before showing response
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add AI response to conversation
      const aiEntry: ConversationEntry = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiMessage,
        timestamp: new Date().toISOString()
      };
      setConversations(prev => [...prev, aiEntry]);

      // Enable evaluate button after new messages
      const updatedConversations = [...conversations, newUserEntry, aiEntry];
      enableEvaluateButtonAfterNewMessages(updatedConversations);

      // Save AI interaction
      await authenticatedFetch(`/api/pbl/tasks/${currentTask.id}/interactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({
          interaction: {
            type: 'ai',
            content: aiMessage,
            timestamp: aiEntry.timestamp
          }
        })
      });

    } catch (error) {
      console.error('Error processing message:', error);

      // Hide thinking indicator first
      setIsProcessing(false);

      // Small delay before showing error
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorEntry: ConversationEntry = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: t('pbl:learn.errorProcessing'),
        timestamp: new Date().toISOString()
      };
      setConversations(prev => [...prev, errorEntry]);
    } finally {
      inputRef.current?.focus();
    }
  };

  const handleCompleteTask = async () => {
    if (!currentTask || !program) {
      console.log('handleCompleteTask: Missing currentTask or program', { currentTask, program });
      return;
    }

    // Fetch all tasks for the program to find the current and next task
    try {
      const tasksRes = await authenticatedFetch(`/api/pbl/programs/${programId}/tasks`);
      if (tasksRes.ok) {
        const tasks = await tasksRes.json();
        const sortedTasks = tasks.sort((a: { taskIndex: number }, b: { taskIndex: number }) => a.taskIndex - b.taskIndex);
        const currentIndex = sortedTasks.findIndex((t: { id: string }) => t.id === currentTask.id);

        console.log('handleCompleteTask:', {
          currentTaskId: currentTask.id,
          totalTaskCount: sortedTasks.length,
          currentIndex,
          hasNextTask: currentIndex !== -1 && currentIndex < sortedTasks.length - 1
        });

        if (currentIndex !== -1 && currentIndex < sortedTasks.length - 1) {
          // Navigate to next task
          const nextTaskId = sortedTasks[currentIndex + 1].id;
          console.log('Navigating to next task:', nextTaskId);
          router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${nextTaskId}`);
        } else {
          // All tasks completed or current task not found
          console.log('All tasks completed or task not found, going to complete page');
          router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`);
        }
      } else {
        // Fallback to complete page if tasks fetch fails
        console.log('Failed to fetch tasks, going to complete page');
        router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`);
    }
  };

  const switchTask = (newTaskId: string) => {
    // Navigate to the new task
    router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${newTaskId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PBLLearningContentSkeleton />
        </div>
      </main>
    );
  }

  if (!scenario || !currentTask) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">{t('pbl:learn.noTaskFound')}</p>
        </div>
      </div>
    );
  }

  const taskIndex = (currentTask as unknown as Record<string, unknown>)?.scenarioTaskIndex as number ?? scenario.tasks.findIndex(t => t.id === currentTask.id);
  // const progress = ((taskIndex + 1) / scenario.tasks.length) * 100;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <TaskHeader scenario={scenario} language={i18n.language} />

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full">
          {/* Left Sidebar - Progress (Collapsible) */}
          <TaskProgressSidebar
            scenario={scenario}
            currentTaskId={currentTask?.id || ''}
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
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('pbl:learn.task')} {taskIndex + 1}: {(() => {
                const title = currentTask.title;
                if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
                  // Handle multilingual object format {en: "...", zh: "..."}
                  const titleObj = title as Record<string, string>;
                  return titleObj[i18n.language] || titleObj['en'] || Object.values(titleObj)[0] || '';
                }
                // Fallback to suffix-based format
                return getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language);
              })()}
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('pbl:learn.description')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {getLocalizedField(currentTask as unknown as Record<string, unknown>, 'description', i18n.language)}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('pbl:learn.instructions')}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  {Array.isArray(currentTask.instructions) ? currentTask.instructions.map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  )) : (
                    <li>{t('pbl:learn.noInstructionsAvailable')}</li>
                  )}
                </ul>
              </div>

              {currentTask.expectedOutcome && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {t('pbl:details.expectedOutcome')}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {getLocalizedField(currentTask as unknown as Record<string, unknown>, 'expectedOutcome', i18n.language)}
                  </p>
                </div>
              )}
            </div>

            {/* Evaluation Results */}
            {evaluation && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                  {t('pbl:learn.evaluationResults', 'Evaluation Results')}
                </h3>

                {/* Section 1: Overall Score */}
                <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {t('pbl:learn.overallScore')}
                    </h4>
                    {(() => {
                      const rating = getQualitativeRating(evaluation.score);
                      return (
                        <span className={`text-3xl font-bold ${rating.color}`}>
                          {t(rating.i18nKey)}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Section 2: Domain Scores */}
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {t('pbl:complete.domainScores')}
                  </h4>
                  <div className="space-y-2">
                    {evaluation.domainScores && (() => {
                      const domainOrder: DomainType[] = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
                      const targetDomainsList = scenario?.targetDomains || [];

                      // Show all domains, but mark non-target ones as NA
                      return domainOrder.map(domain => {
                        const isTargetDomain = targetDomainsList.length === 0 || targetDomainsList.includes(domain);
                        const score = isTargetDomain ? evaluation.domainScores![domain] : undefined;
                        const isNA = !isTargetDomain || score === undefined || score === null;
                        return (
                      <div key={domain} className={`flex items-center justify-between ${!isTargetDomain ? 'opacity-50' : ''}`}>
                        <span className={`text-sm ${!isTargetDomain ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
                          {t(`assessment:domains.${domain}`)}
                        </span>
                        <div className="flex items-center">
                          {isNA ? (
                            <span className="text-sm text-gray-400 dark:text-gray-500 w-36 text-right italic">
                              N/A
                            </span>
                          ) : (
                            <StarRating score={Number(score)} size="sm" />
                          )}
                        </div>
                      </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Section 3: KSA Scores */}
                {evaluation.ksaScores && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {t('pbl:complete.ksaScores', 'KSA Scores')}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('pbl:complete.knowledge')}
                      </span>
                      <StarRating score={evaluation.ksaScores.knowledge} size="sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('pbl:complete.skills')}
                      </span>
                      <StarRating score={evaluation.ksaScores.skills} size="sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t('pbl:complete.attitudes')}
                      </span>
                      <StarRating score={evaluation.ksaScores.attitudes} size="sm" />
                    </div>
                  </div>
                </div>
                )}

                {/* Translation Notice & Button */}
                {evaluation?.needsTranslation && (
                  <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                      {t('pbl:learn.evaluationNeedsTranslation', 'This evaluation is in a different language.')}
                    </p>
                    <button
                      onClick={handleTranslateEvaluation}
                      disabled={isTranslating}
                      className="w-full px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-yellow-400 transition-colors flex items-center justify-center"
                    >
                      {isTranslating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t('pbl:learn.translating', 'Translating...')}
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                          </svg>
                          {t('pbl:learn.translateToCurrentLanguage', 'Translate to Current Language')}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Conversation Insights - Only show if there are meaningful insights */}
                {evaluation.conversationInsights &&
                 ((evaluation.conversationInsights.effectiveExamples &&
                   Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
                   evaluation.conversationInsights.effectiveExamples.length > 0) ||
                  (evaluation.conversationInsights.improvementAreas &&
                   Array.isArray(evaluation.conversationInsights.improvementAreas) &&
                   evaluation.conversationInsights.improvementAreas.length > 0)) && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                      {t('pbl:learn.conversationInsights', 'Conversation Insights')}
                    </h4>

                    {evaluation.conversationInsights.effectiveExamples &&
                     Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
                     evaluation.conversationInsights.effectiveExamples.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                          {t('pbl:learn.effectiveExamples', 'What worked well:')}
                        </h5>
                        <div className="space-y-2">
                          {evaluation.conversationInsights.effectiveExamples.map((example, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                &ldquo;{example.quote}&rdquo;
                              </p>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                ✓ {example.suggestion}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evaluation.conversationInsights.improvementAreas &&
                     Array.isArray(evaluation.conversationInsights.improvementAreas) &&
                     evaluation.conversationInsights.improvementAreas.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                          {t('pbl:learn.improvementExamples', 'Areas for improvement:')}
                        </h5>
                        <div className="space-y-2">
                          {evaluation.conversationInsights.improvementAreas.map((area, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                              <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                &ldquo;{area.quote}&rdquo;
                              </p>
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                → {area.suggestion}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Strengths & Improvements */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('pbl:complete.strengths')}
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {evaluation.strengths && evaluation.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-green-500 mr-2">✓</span>
                          {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('pbl:complete.improvements')}
                    </h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      {evaluation.improvements && evaluation.improvements.map((improvement, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-yellow-500 mr-2">•</span>
                          {improvement}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleCompleteTask}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {program && currentTask && programTasks.findIndex(t => t.id === currentTask.id) < programTasks.length - 1
                  ? t('pbl:learn.nextTask', 'Next Task')
                  : t('pbl:learn.completeProgram', 'Complete Program')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Chatbot */}
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700 h-full overflow-hidden">
          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            <div className="space-y-4">
              {conversations.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      entry.type === 'user'
                        ? 'bg-purple-600 text-white ml-12'
                        : entry.type === 'ai'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white mr-12'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 mr-12'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {formatDateWithLocale(new Date(entry.timestamp), i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}

              {/* AI thinking indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-3xl px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 mr-12">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('pbl:learn.thinking')}
                      </span>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={conversationEndRef} />
            </div>
          </div>

          {/* Evaluate Button */}
          {showEvaluateButton && !isEvaluating && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <button
                onClick={handleEvaluate}
                disabled={isEvaluateDisabled}
                className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                  isEvaluateDisabled
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isEvaluateDisabled
                  ? t('pbl:learn.evaluationUpToDate', 'Evaluation Up to Date')
                  : t('pbl:learn.evaluate', 'Evaluate Performance')}
              </button>
            </div>
          )}

          {/* Evaluating indicator */}
          {isEvaluating && (
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-gray-600 dark:text-gray-400">
                  {t('pbl:learn.evaluating', 'Evaluating...')}
                </span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-6 sm:p-8 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
            <div className="flex gap-4">
              <textarea
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={t('pbl:learn.inputPlaceholder')}
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={2}
                disabled={isProcessing}
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isProcessing}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit"
              >
                {isProcessing ? t('pbl:learn.sending') : t('pbl:learn.send')}
              </button>
            </div>
            {/* Bottom safe area - accounting for header and visual balance */}
            <div className="h-8 sm:h-12 md:h-16"></div>
          </div>
        </div>
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          {/* Mobile Content Area */}
          <div className="flex-1 overflow-hidden">
            {/* Progress View */}
            {mobileView === 'progress' && (
              <div className="h-full bg-white dark:bg-gray-800 p-4 overflow-y-auto">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  {t('pbl:learn.progress')}
                </h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="space-y-6 relative">
                    {scenario.tasks.map((task, index) => {
                      // Get the actual task UUID from programTasks
                      const programTask = programTasks[index];
                      const actualTaskId = programTask?.id || task.id;
                      const isCurrent = currentTask && currentTask.id === actualTaskId;
                      const taskEvaluation = taskEvaluations[actualTaskId];
                      const hasEvaluation = !!taskEvaluation;

                      return (
                        <button
                          key={task.id}
                          onClick={() => {
                            switchTask(actualTaskId);
                            setMobileView('chat');
                          }}
                          className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        >
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                            hasEvaluation
                              ? 'border-green-600 dark:border-green-500'
                              : isCurrent
                              ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {hasEvaluation ? (
                              <svg className="h-5 w-5 text-green-600 dark:text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className={`text-sm font-medium ${
                                isCurrent
                                  ? 'text-purple-600 dark:text-purple-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {index + 1}
                              </span>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <p className={`text-sm font-medium ${
                              isCurrent
                                ? 'text-purple-600 dark:text-purple-400'
                                : hasEvaluation
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {getLocalizedField(task as unknown as Record<string, unknown>, 'title', i18n.language)}
                            </p>
                            {hasEvaluation && taskEvaluation.score !== undefined && (() => {
                              const rating = getQualitativeRating(taskEvaluation.score);
                              return (
                                <p className={`text-xs font-medium mt-0.5 ${rating.color}`}>
                                  {t(rating.i18nKey)}
                                </p>
                              );
                            })()}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* View Report Link for Mobile */}
                {Object.keys(taskEvaluations).length > 0 && (
                  <div className="mt-6">
                    <Link
                      href={`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`}
                      className="flex items-center justify-center w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {t('pbl:complete.viewReport', 'View Report')}
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Task Info View */}
            {mobileView === 'task' && (
              <div className="h-full bg-white dark:bg-gray-800 p-6 overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('pbl:learn.task')} {taskIndex + 1}: {(() => {
                    const title = currentTask.title;
                    if (typeof title === 'object' && title !== null && !Array.isArray(title)) {
                      // Handle multilingual object format {en: "...", zh: "..."}
                      const titleObj = title as Record<string, string>;
                      return titleObj[i18n.language] || titleObj['en'] || Object.values(titleObj)[0] || '';
                    }
                    // Fallback to suffix-based format
                    return getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language);
                  })()}
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.description')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {(() => {
                        const description = currentTask.description;
                        if (typeof description === 'object' && description !== null && !Array.isArray(description)) {
                          // Handle multilingual object format {en: "...", zh: "..."}
                          const descObj = description as Record<string, string>;
                          return descObj[i18n.language] || descObj['en'] || Object.values(descObj)[0] || '';
                        }
                        // Fallback to suffix-based format
                        return i18n.language === 'zhTW'
                          ? (currentTask.description_zhTW || currentTask.description || '')
                          : (currentTask.description || '');
                      })()}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.instructions')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      {Array.isArray(currentTask.instructions) ? currentTask.instructions.map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      )) : (
                        <li>{t('pbl:learn.noInstructionsAvailable')}</li>
                      )}
                    </ul>
                  </div>

                  {currentTask.expectedOutcome && (
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                        {t('pbl:details.expectedOutcome')}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {i18n.language === 'zhTW'
                          ? (currentTask.expectedOutcome_zhTW || currentTask.expectedOutcome)
                          : currentTask.expectedOutcome}
                      </p>
                    </div>
                  )}
                </div>

                {/* Evaluation Results for Mobile */}
                {evaluation && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                      {t('pbl:learn.evaluationResults', 'Evaluation Results')}
                    </h3>

                    {/* Section 1: Overall Score */}
                    <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {t('pbl:learn.overallScore')}
                        </h4>
                        {(() => {
                          const rating = getQualitativeRating(evaluation.score);
                          return (
                            <span className={`text-3xl font-bold ${rating.color}`}>
                              {t(rating.i18nKey)}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Section 2: Domain Scores */}
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {t('pbl:complete.domainScores')}
                      </h4>
                      <div className="space-y-2">
                        {evaluation.domainScores && (() => {
                          const domainOrder: DomainType[] = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
                          const targetDomainsList = scenario?.targetDomains || [];

                          // Show all domains, but mark non-target ones as NA
                          return domainOrder.map(domain => {
                            const isTargetDomain = targetDomainsList.length === 0 || targetDomainsList.includes(domain);
                            const score = isTargetDomain ? evaluation.domainScores![domain] : undefined;
                            const isNA = !isTargetDomain || score === undefined || score === null;
                            return (
                          <div key={domain} className={`flex items-center justify-between ${!isTargetDomain ? 'opacity-50' : ''}`}>
                            <span className={`text-sm ${!isTargetDomain ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-gray-600 dark:text-gray-400'}`}>
                              {t(`assessment:domains.${domain}`)}
                            </span>
                            <div className="flex items-center">
                              {isNA ? (
                                <span className="text-sm text-gray-400 dark:text-gray-500 w-36 text-right italic">
                                  N/A
                                </span>
                              ) : (
                                <StarRating score={Number(score)} size="sm" />
                              )}
                            </div>
                          </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Section 3: KSA Scores */}
                    {evaluation.ksaScores && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        {t('pbl:complete.ksaScores', 'KSA Scores')}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('pbl:complete.knowledge')}
                          </span>
                          <StarRating score={evaluation.ksaScores.knowledge} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('pbl:complete.skills')}
                          </span>
                          <StarRating score={evaluation.ksaScores.skills} size="sm" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t('pbl:complete.attitudes')}
                          </span>
                          <StarRating score={evaluation.ksaScores.attitudes} size="sm" />
                        </div>
                      </div>
                    </div>
                    )}

                    {/* Conversation Insights - Only show if there are meaningful insights */}
                    {evaluation.conversationInsights &&
                     ((evaluation.conversationInsights.effectiveExamples &&
                       Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
                       evaluation.conversationInsights.effectiveExamples.length > 0) ||
                      (evaluation.conversationInsights.improvementAreas &&
                       Array.isArray(evaluation.conversationInsights.improvementAreas) &&
                       evaluation.conversationInsights.improvementAreas.length > 0)) && (
                      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                          {t('pbl:learn.conversationInsights', 'Conversation Insights')}
                        </h4>

                        {evaluation.conversationInsights.effectiveExamples &&
                         Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
                         evaluation.conversationInsights.effectiveExamples.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                              {t('pbl:learn.effectiveExamples', 'What worked well:')}
                            </h5>
                            <div className="space-y-2">
                              {evaluation.conversationInsights.effectiveExamples.map((example, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                    &ldquo;{example.quote}&rdquo;
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    ✓ {example.suggestion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {evaluation.conversationInsights.improvementAreas &&
                         Array.isArray(evaluation.conversationInsights.improvementAreas) &&
                         evaluation.conversationInsights.improvementAreas.length > 0 && (
                          <div>
                            <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                              {t('pbl:learn.improvementExamples', 'Areas for improvement:')}
                            </h5>
                            <div className="space-y-2">
                              {evaluation.conversationInsights.improvementAreas.map((area, idx) => (
                                <div key={idx} className="bg-white dark:bg-gray-800 p-2 rounded">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                                    &ldquo;{area.quote}&rdquo;
                                  </p>
                                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                    → {area.suggestion}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Strengths & Improvements */}
                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('pbl:complete.strengths')}
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {evaluation.strengths && evaluation.strengths.map((strength, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('pbl:complete.improvements')}
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {evaluation.improvements && evaluation.improvements.map((improvement, idx) => (
                            <li key={idx} className="flex items-start">
                              <span className="text-yellow-500 mr-2">•</span>
                              {improvement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCompleteTask}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {scenario && taskIndex < scenario.tasks.length - 1
                      ? t('pbl:learn.nextTask', 'Next Task')
                      : t('pbl:learn.completeProgram', 'Complete Program')}
                  </button>
                </div>
              </div>
            )}

            {/* Chat View */}
            {mobileView === 'chat' && (
              <div className="h-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="space-y-4">
                    {conversations.map((entry) => (
                      <div
                        key={entry.id}
                        className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] px-4 py-3 rounded-lg ${
                            entry.type === 'user'
                              ? 'bg-purple-600 text-white'
                              : entry.type === 'ai'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{entry.content}</p>
                          <p className="text-xs mt-1 opacity-70">
                            {formatDateWithLocale(new Date(entry.timestamp), i18n.language, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* AI thinking indicator */}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 dark:text-gray-400">
                              {t('pbl:learn.thinking')}
                            </span>
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div ref={conversationEndRef} />
                  </div>
                </div>

                {/* Evaluate Button for Mobile */}
                {showEvaluateButton && !isEvaluating && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <button
                      onClick={handleEvaluate}
                      disabled={isEvaluateDisabled}
                      className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
                        isEvaluateDisabled
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isEvaluateDisabled
                        ? t('pbl:learn.evaluationUpToDate', 'Evaluation Up to Date')
                        : t('pbl:learn.evaluate', 'Evaluate Performance')}
                    </button>
                  </div>
                )}

                {/* Evaluating indicator for Mobile */}
                {isEvaluating && (
                  <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        {t('pbl:learn.evaluating', 'Evaluating...')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                  <div className="flex gap-2">
                    <textarea
                      ref={inputRef}
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={t('pbl:learn.inputPlaceholder')}
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={2}
                      disabled={isProcessing}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isProcessing}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit"
                    >
                      {isProcessing ? t('pbl:learn.sending') : t('pbl:learn.send')}
                    </button>
                  </div>
                  {/* Bottom safe area - accounting for header and visual balance */}
                  <div className="h-8"></div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Bottom Navigation */}
          <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-around">
              <button
                onClick={() => setMobileView('progress')}
                className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
                  mobileView === 'progress'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="text-xs font-medium">{t('pbl:learn.progress')}</span>
              </button>

              <button
                onClick={() => setMobileView('task')}
                className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
                  mobileView === 'task'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-xs font-medium">{t('pbl:learn.taskInfo')}</span>
              </button>

              <button
                onClick={() => setMobileView('chat')}
                className={`flex-1 py-4 flex flex-col items-center justify-center transition-colors ${
                  mobileView === 'chat'
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-xs font-medium">{t('pbl:learn.chat')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
