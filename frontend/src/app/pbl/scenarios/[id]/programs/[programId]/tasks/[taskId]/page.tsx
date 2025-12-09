'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { PBLLearningContentSkeleton } from '@/components/pbl/loading-skeletons';
import {
  Program,
  Scenario,
  Task,
} from '@/types/pbl';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { getLocalizedField } from './utils/task-helpers';
import { useTaskData, type ConversationEntry } from '@/hooks/use-task-data';
import { useTaskEvaluation } from '@/hooks/use-task-evaluation';
import {
  createProgramIfNeeded,
  saveInteraction,
  getAIResponse,
  navigateToNextTask
} from './utils/message-handlers';
import { TaskHeader } from '@/components/pbl/task/TaskHeader';
import { TaskProgressSidebar } from '@/components/pbl/task/TaskProgressSidebar';
import { TaskInfoPanel } from '@/components/pbl/task/TaskInfoPanel';
import { TaskChatPanel } from '@/components/pbl/task/TaskChatPanel';
import { MobileProgressView } from '@/components/pbl/task/mobile/MobileProgressView';
import { MobileTaskInfoView } from '@/components/pbl/task/mobile/MobileTaskInfoView';
import { MobileChatView } from '@/components/pbl/task/mobile/MobileChatView';
import { MobileBottomNavigation } from '@/components/pbl/task/mobile/MobileBottomNavigation';

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

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !currentTask || !currentTask.id) return;

    const userMessage = userInput.trim();
    setUserInput('');
    setIsProcessing(true);

    const newUserEntry: ConversationEntry = {
      id: Date.now().toString(),
      type: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };
    setConversations(prev => [...prev, newUserEntry]);

    try {
      // Create program if needed
      const actualProgramId = await createProgramIfNeeded(programId, {
        scenarioId,
        language: i18n.language
      });

      if (actualProgramId !== programId) {
        setProgramId(actualProgramId);
        const newUrl = `/pbl/scenarios/${scenarioId}/program/${actualProgramId}/tasks/${taskId}`;
        window.history.replaceState({}, '', newUrl);
      }

      // Save user interaction
      await saveInteraction({
        taskId: currentTask.id,
        interaction: {
          type: 'user',
          content: userMessage,
          timestamp: newUserEntry.timestamp
        },
        language: i18n.language
      });

      // Get AI response
      const aiMessage = await getAIResponse({
        message: userMessage,
        sessionId: actualProgramId,
        currentTask,
        scenario,
        scenarioId,
        conversations,
        language: i18n.language
      });

      setIsProcessing(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      const aiEntry: ConversationEntry = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: aiMessage,
        timestamp: new Date().toISOString()
      };
      setConversations(prev => [...prev, aiEntry]);

      enableEvaluateButtonAfterNewMessages([...conversations, newUserEntry, aiEntry]);

      // Save AI interaction
      await saveInteraction({
        taskId: currentTask.id,
        interaction: {
          type: 'ai',
          content: aiMessage,
          timestamp: aiEntry.timestamp
        },
        language: i18n.language
      });

    } catch (error) {
      console.error('Error processing message:', error);
      setIsProcessing(false);
      await new Promise(resolve => setTimeout(resolve, 100));

      const errorEntry: ConversationEntry = {
        id: (Date.now() + 2).toString(),
        type: 'system',
        content: t('pbl:learn.errorProcessing'),
        timestamp: new Date().toISOString()
      };
      setConversations(prev => [...prev, errorEntry]);
    }
  };

  const handleCompleteTask = async () => {
    if (!currentTask || !program) {
      console.log('handleCompleteTask: Missing currentTask or program', { currentTask, program });
      return;
    }

    await navigateToNextTask({
      programId,
      currentTask,
      scenarioId,
      router
    });
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

        {/* Right Panel - Chatbot */}
          <TaskChatPanel
            conversations={conversations}
            userInput={userInput}
            isProcessing={isProcessing}
            isEvaluating={isEvaluating}
            showEvaluateButton={showEvaluateButton}
            isEvaluateDisabled={isEvaluateDisabled}
            language={i18n.language}
            onUserInputChange={setUserInput}
            onSendMessage={handleSendMessage}
            onEvaluate={handleEvaluate}
            t={t}
          />
        </div>

        {/* Mobile Layout */}
        <div className="md:hidden flex flex-col h-full">
          {/* Mobile Content Area */}
          <div className="flex-1 overflow-hidden">
            {mobileView === 'progress' && (
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

            {mobileView === 'task' && (
              <MobileTaskInfoView
                currentTask={currentTask}
                scenario={scenario}
                taskIndex={taskIndex}
                evaluation={evaluation}
                language={i18n.language}
                onCompleteTask={handleCompleteTask}
                t={t}
              />
            )}

            {mobileView === 'chat' && (
              <MobileChatView
                conversations={conversations}
                userInput={userInput}
                isProcessing={isProcessing}
                isEvaluating={isEvaluating}
                showEvaluateButton={showEvaluateButton}
                isEvaluateDisabled={isEvaluateDisabled}
                language={i18n.language}
                onUserInputChange={setUserInput}
                onSendMessage={handleSendMessage}
                onEvaluate={handleEvaluate}
                t={t}
              />
            )}
          </div>

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
