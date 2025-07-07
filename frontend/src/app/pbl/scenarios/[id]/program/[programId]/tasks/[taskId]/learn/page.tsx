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
  TaskInteraction,
  TaskProgress 
} from '@/types/pbl';
import { TaskEvaluation } from '@/types/pbl-completion';
import { formatDateWithLocale } from '@/utils/locale';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ConversationEntry {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
}

// Helper function to get localized field
function getLocalizedField<T extends Record<string, unknown>>(obj: T | null | undefined, fieldName: string, language: string): string {
  if (!obj) return '';
  
  // Use language code directly as suffix
  const langSuffix = language;
  
  const fieldWithLang = `${fieldName}_${langSuffix}`;
  
  // Return localized field if exists, otherwise return default
  const value = obj[fieldWithLang] || obj[fieldName] || '';
  return String(value);
}

// Helper function to get localized array field
function getLocalizedArrayField<T extends Record<string, unknown>>(obj: T | null | undefined, fieldName: string, language: string): string[] {
  if (!obj) return [];
  
  // Use language code directly as suffix
  const langSuffix = language;
  
  const fieldWithLang = `${fieldName}_${langSuffix}`;
  
  // Return localized field if exists, otherwise return default
  const value = obj[fieldWithLang] || obj[fieldName] || [];
  return Array.isArray(value) ? value.map(String) : [];
}

export default function ProgramLearningPage() {
  const params = useParams();
  const router = useRouter();
  // Note: searchParams removed as it was unused
  const { t, i18n } = useTranslation(['pbl', 'common']);
  
  const [programId, setProgramId] = useState(params.programId as string);
  const scenarioId = params.id as string;
  const taskId = params.taskId as string;
  // const isNewProgram = searchParams.get('isNew') === 'true';
  
  // States
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [programTasks, setProgramTasks] = useState<any[]>([]); // Actual tasks from the program
  const [taskMapping, setTaskMapping] = useState<Map<string, string>>(new Map()); // Map scenario task ID to actual UUID
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProgressCollapsed, setIsProgressCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<'progress' | 'task' | 'chat'>('chat');
  const [showEvaluateButton, setShowEvaluateButton] = useState(false);
  const [isEvaluateDisabled, setIsEvaluateDisabled] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<TaskEvaluation | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [taskEvaluations, setTaskEvaluations] = useState<Record<string, TaskEvaluation>>({});
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load program and scenario data
  useEffect(() => {
    loadProgramData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, scenarioId, i18n.language]);

  // Load task data when taskId changes
  useEffect(() => {
    if (scenario && taskId) {
      // For temp programs, use scenario tasks directly
      if (programId.startsWith('temp_')) {
        const task = scenario.tasks.find(t => t.id === taskId);
        if (task) {
          setCurrentTask(task);
          loadTaskHistory();
        }
      } else {
        // For real programs, find task by UUID or by mapping
        let task = null;
        
        // First try to find by scenario task ID (for backward compatibility)
        for (const [scenarioTaskId, actualTaskId] of taskMapping.entries()) {
          if (actualTaskId === taskId) {
            task = scenario.tasks.find(t => t.id === scenarioTaskId);
            break;
          }
        }
        
        // If not found, try direct match (in case taskId is still scenario format)
        if (!task) {
          task = scenario.tasks.find(t => t.id === taskId);
        }
        
        if (task) {
          setCurrentTask(task);
          loadTaskHistory();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, scenario, taskMapping, programId]);

  // Scroll to bottom when conversations change
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      
      // Load scenario data with language parameter
      const scenarioRes = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
      if (!scenarioRes.ok) throw new Error('Failed to load scenario');
      const scenarioData = await scenarioRes.json();
      setScenario(scenarioData.data);
      
      // Load program data (skip for temp programs)
      let loadedProgram: Program | null = null;
      if (!programId.startsWith('temp_')) {
        try {
          const programRes = await fetch(`/api/pbl/programs/${programId}?scenarioId=${scenarioId}`);
          if (programRes.ok) {
            const programData = await programRes.json();
            if (programData.success && programData.program) {
              loadedProgram = programData.program;
              
              // If this is a draft program being accessed, update its timestamps
              if (loadedProgram && loadedProgram.status === 'draft') {
                try {
                  const updateRes = await fetch(`/api/pbl/programs/${programId}/update-timestamps`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      scenarioId
                    })
                  });
                  
                  if (updateRes.ok) {
                    const updatedData = await updateRes.json();
                    if (updatedData.success && updatedData.program) {
                      loadedProgram = updatedData.program;
                    }
                  }
                } catch (error) {
                  console.error('Error updating draft timestamps:', error);
                }
              }
              
              setProgram(loadedProgram);
            }
          }
        } catch (error) {
          console.error('Error loading program data:', error);
        }
      }
      
      // Fallback: create mock program for temp IDs or if loading failed
      if (!loadedProgram) {
        const mockProgram: Program = {
          id: programId,
          scenarioId: scenarioId,
          userId: 'user@example.com',
          userEmail: 'user@example.com',
          startedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: programId.startsWith('temp_') ? 'in_progress' : 'draft',
          totalTasks: scenarioData.data.tasks.length,
          currentTaskId: taskId || scenarioData.data.tasks[0]?.id,
          language: i18n.language
        };
        setProgram(mockProgram);
      }
      
      // Load actual program tasks (only for non-temp programs)
      if (!programId.startsWith('temp_')) {
        try {
          // Load program tasks to get actual UUIDs
          const tasksRes = await fetch(`/api/pbl/programs/${programId}/tasks`);
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json();
            if (tasksData.success && tasksData.tasks) {
              setProgramTasks(tasksData.tasks);
              
              // Build mapping from scenario task ID to actual UUID
              const mapping = new Map<string, string>();
              tasksData.tasks.forEach((task: any) => {
                if (task.config?.taskId) {
                  mapping.set(task.config.taskId, task.id);
                }
              });
              setTaskMapping(mapping);
            }
          }
          
          // Load completion data to get all task evaluations
          const completionRes = await fetch(`/api/pbl/completion?programId=${programId}&scenarioId=${scenarioId}`);
          if (completionRes.ok) {
            const completionData = await completionRes.json();
            if (completionData.success && completionData.data) {
              // Build a map of task evaluations
              const evaluations: Record<string, TaskEvaluation> = {};
              completionData.data.tasks?.forEach((task: { taskId: string; evaluation?: TaskEvaluation }) => {
                if (task.evaluation) {
                  evaluations[task.taskId] = task.evaluation;
                }
              });
              setTaskEvaluations(evaluations);
            }
          }
        } catch (error) {
          console.error('Error loading program data:', error);
        }
      }
      
      // If no taskId provided, use the first task
      if (!taskId && scenarioData.data.tasks.length > 0) {
        const firstTaskId = scenarioData.data.tasks[0].id;
        router.replace(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${firstTaskId}/learn`);
      }
      
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskHistory = async () => {
    // Prevent duplicate loading
    if (isLoadingHistory) return;
    
    try {
      // Skip loading history for temp programs
      if (programId.startsWith('temp_')) {
        // Don't clear conversations if we already have some (e.g., during transition)
        if (conversations.length === 0) {
          setConversations([]);
        }
        return;
      }
      
      setIsLoadingHistory(true);
      console.log('Loading task history for:', { programId, taskId, scenarioId });
      
      // Load task conversation history and evaluation
      const res = await fetch(`/api/pbl/task-logs?programId=${programId}&taskId=${taskId}&scenarioId=${scenarioId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Task history response:', data);
        
        if (data.data?.log?.interactions) {
          const loadedConversations = data.data.log.interactions.map((interaction: TaskInteraction, index: number): ConversationEntry => ({
            id: `${index}`,
            type: interaction.type,
            content: interaction.content,
            timestamp: interaction.timestamp
          }));
          console.log('Loaded conversations:', loadedConversations);
          setConversations(loadedConversations);
          
          // Show evaluate button if there are conversations
          if (loadedConversations.length > 0) {
            setShowEvaluateButton(true);
          }
          
          // Check if evaluation exists and is up to date
          if (data.data?.evaluation) {
            console.log('Loaded existing evaluation:', data.data.evaluation);
            setEvaluation(data.data.evaluation);
            
            const currentUserMessageCount = loadedConversations.filter((c: ConversationEntry) => c.type === 'user').length;
            const evaluationUserMessageCount = data.data.evaluation.conversationCount || 0;
            
            console.log('User message count:', currentUserMessageCount, 'Evaluation count:', evaluationUserMessageCount);
            
            // If evaluation is up to date (same or more conversations evaluated), disable button
            if (evaluationUserMessageCount >= currentUserMessageCount) {
              setIsEvaluateDisabled(true);
            } else {
              setIsEvaluateDisabled(false);
            }
          }
        } else {
          console.log('No interactions found in response');
          // Only clear conversations if we don't have any in UI already
          // This prevents clearing during the temp->actual ID transition
          if (conversations.length === 0) {
            setConversations([]);
            setShowEvaluateButton(false);
          }
        }
      } else {
        console.error('Failed to load task history:', res.status);
      }
    } catch (error) {
      console.error('Error loading task history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isProcessing || !currentTask) return;
    
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
        const createRes = await fetch(`/api/pbl/scenarios/${scenarioId}/start`, {
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
          const newUrl = `/pbl/scenarios/${scenarioId}/program/${actualProgramId}/tasks/${taskId}/learn`;
          window.history.replaceState({}, '', newUrl);
          
          // Force update the params to ensure consistency
          // Note: params from useParams are readonly, so we update programId state instead
        } else {
          throw new Error('Failed to create program');
        }
      } else if (program?.status === 'draft') {
        // Convert draft to active program on first message
        const updateRes = await fetch(`/api/pbl/programs/${programId}/activate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scenarioId,
            taskId: currentTask.id,
            taskTitle: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language)
          })
        });
        
        if (!updateRes.ok) {
          console.error('Failed to activate draft program, continuing anyway');
        }
        
        // Update program status in state
        if (program) {
          setProgram({
            ...program,
            status: 'in_progress',
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      // Save user interaction
      const saveUserRes = await fetch('/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId: actualProgramId,
          taskId: currentTask.id,
          scenarioId,
          taskTitle: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language),
          interaction: {
            type: 'user',
            content: userMessage,
            timestamp: newUserEntry.timestamp
          }
        })
      });
      
      if (!saveUserRes.ok) {
        console.error('Failed to save user interaction');
      }
      
      // Small delay to ensure GCS consistency
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get AI response
      const aiRes = await fetch('/api/pbl/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language
        },
        body: JSON.stringify({
          message: userMessage,
          programId: actualProgramId,  // Use new format
          taskId: taskId,               // Use actual UUID taskId
          context: {
            scenarioId,
            taskTitle: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language),
            taskDescription: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'description', i18n.language),
            instructions: getLocalizedArrayField(currentTask as unknown as Record<string, unknown>, 'instructions', i18n.language),
            expectedOutcome: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'expectedOutcome', i18n.language),
            conversationHistory: conversations.slice(-10).map(conv => ({
              role: conv.type === 'user' ? 'user' : 'assistant',
              content: conv.content
            }))
          }
        })
      });
      
      if (!aiRes.ok) throw new Error('Failed to get AI response');
      
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
      
      // Show evaluate button and check if it should be disabled
      setShowEvaluateButton(true);
      
      // Check if we have more user messages than the last evaluation
      const updatedConversations = [...conversations, newUserEntry, aiEntry];
      const userMessageCount = updatedConversations.filter(c => c.type === 'user').length;
      
      // Enable button if there are user messages and no evaluation yet, or if new messages were added
      if (userMessageCount > 0 && (!evaluation || userMessageCount > 1)) {
        setIsEvaluateDisabled(false);
      }
      
      // Save AI interaction
      await fetch('/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId: actualProgramId,
          taskId: currentTask.id,
          scenarioId,
          taskTitle: getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language),
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

  const handleEvaluate = async () => {
    if (!currentTask || conversations.length === 0) return;
    
    setIsEvaluating(true);
    
    try {
      // Get last 10 conversations
      const recentConversations = conversations.slice(-10);
      
      // Call evaluate API
      const response = await fetch('/api/pbl/evaluate', {
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
          language: i18n.language,
          // New unified architecture parameters
          trackId: program?.trackId || '',
          programId: programId,
          taskId: taskId
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
        
        // Save evaluation to GCS
        try {
          const saveResponse = await fetch('/api/pbl/task-logs', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Accept-Language': i18n.language,
              'x-scenario-id': scenarioId
            },
            body: JSON.stringify({
              programId,
              taskId: currentTask.id,
              progress: {
                score: data.evaluation.score,
                evaluation: data.evaluation,
                completedAt: new Date().toISOString(),
                status: 'completed'
              }
            })
          });
          
          if (!saveResponse.ok) {
            console.error('Failed to save evaluation to GCS');
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

  const handleCompleteTask = async () => {
    if (!currentTask || !program) return;
    
    try {
      // Update task progress
      await fetch('/api/pbl/task-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': i18n.language,
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId,
          taskId: currentTask.id,
          scenarioId,
          progress: {
            status: 'completed',
            completedAt: new Date().toISOString(),
            timeSpentSeconds: Math.floor((Date.now() - new Date(program.startedAt).getTime()) / 1000)
          } as Partial<TaskProgress>
        })
      });
      
      // Move to next task or complete
      const currentIndex = scenario?.tasks.findIndex(t => t.id === currentTask.id) || 0;
      if (scenario && currentIndex < scenario.tasks.length - 1) {
        const nextTask = scenario.tasks[currentIndex + 1];
        router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${nextTask.id}/learn`);
      } else {
        // All tasks completed
        router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/complete`);
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const switchTask = (scenarioTaskId: string) => {
    // For temp programs, use scenario task ID directly
    if (programId.startsWith('temp_')) {
      router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${scenarioTaskId}/learn`);
      return;
    }
    
    // For real programs, map scenario task ID to actual UUID
    const actualTaskId = taskMapping.get(scenarioTaskId) || scenarioTaskId;
    router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${actualTaskId}/learn`);
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

  const taskIndex = scenario.tasks.findIndex(t => t.id === currentTask.id);
  // const progress = ((taskIndex + 1) / scenario.tasks.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {getLocalizedField(scenario as unknown as Record<string, unknown>, 'title', i18n.language)}
            </h1>
            
            {/* Action Buttons */}
            <button
              onClick={() => router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/complete`)}
              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              {t('pbl:details.goToCompletion')}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full h-full" style={{ height: 'calc(90vh - 4rem)' }}>
          {/* Left Sidebar - Progress (Collapsible) */}
          <div className={`bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 relative ${
            isProgressCollapsed ? 'w-16' : 'w-64'
          }`}>
            <div className="h-full flex flex-col">
              <div className={`flex items-center justify-between ${isProgressCollapsed ? 'px-2 py-4' : 'p-4'}`}>
                <h3 className={`font-semibold text-gray-900 dark:text-white transition-all duration-300 ${
                  isProgressCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'
                }`}>
                  {t('pbl:learn.progress')}
                </h3>
                <button
                  onClick={() => setIsProgressCollapsed(!isProgressCollapsed)}
                  className={`p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ${
                    isProgressCollapsed ? 'mx-auto' : ''
                  }`}
                >
                  <svg className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                    isProgressCollapsed ? 'rotate-180' : ''
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            
            {/* Vertical Progress */}
            <div className={`flex-1 relative ${isProgressCollapsed ? 'px-2' : 'px-4'}`}>
              {!isProgressCollapsed && (
                <>
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600"></div>
                  <div className="space-y-6 relative">
                    {scenario.tasks.map((task, index) => {
                      const isEvaluated = !!taskEvaluations[task.id];
                      const isCurrent = index === taskIndex;
                      const taskEval = taskEvaluations[task.id];
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => switchTask(task.id)}
                          className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        >
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                            isEvaluated 
                              ? 'border-green-600 dark:border-green-500' 
                              : isCurrent 
                              ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-white dark:ring-offset-gray-800' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isEvaluated ? (
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
                                : isEvaluated
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {getLocalizedField(task as unknown as Record<string, unknown>, 'title', i18n.language)}
                            </p>
                            {isEvaluated && taskEval?.score !== undefined && (
                              <p className={`text-xs ${
                                taskEval.score >= 75 ? 'text-green-600' :
                                taskEval.score >= 60 ? 'text-blue-600' :
                                taskEval.score >= 40 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {taskEval.score}%
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              
              {/* Collapsed State - Show only icons */}
              {isProgressCollapsed && (
                <div className="space-y-4">
                  {scenario.tasks.map((task, index) => {
                    const isEvaluated = !!taskEvaluations[task.id];
                    const isCurrent = index === taskIndex;
                    const taskEval = taskEvaluations[task.id];
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => switchTask(task.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 mx-auto ${
                          isEvaluated 
                            ? 'border-green-600 dark:border-green-500' 
                            : isCurrent 
                            ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={`${getLocalizedField(task as unknown as Record<string, unknown>, 'title', i18n.language)}${isEvaluated && taskEval?.score !== undefined ? ` - ${taskEval.score}%` : ''}`}
                      >
                        {isEvaluated ? (
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
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* View Report Link */}
              {!isProgressCollapsed && Object.keys(taskEvaluations).length > 0 && (
                <div className="mt-6 px-4">
                  <Link
                    href={`/pbl/scenarios/${scenarioId}/program/${programId}/complete`}
                    className="flex items-center justify-center w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('pbl:complete.viewReport', 'View Report')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Panel - Task Info */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-r border-gray-200 dark:border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('pbl:learn.task')} {taskIndex + 1}: {getLocalizedField(currentTask as unknown as Record<string, unknown>, 'title', i18n.language)}
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
                  {getLocalizedArrayField(currentTask as unknown as Record<string, unknown>, 'instructions', i18n.language).map((instruction, index) => (
                    <li key={index}>{instruction}</li>
                  ))}
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
                
                {/* Overall Score */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('pbl:learn.overallScore')}
                    </span>
                    <span className={`text-2xl font-bold ${
                      (evaluation.score || evaluation.overallScore || 0) >= 75 ? 'text-green-600' :
                      (evaluation.score || evaluation.overallScore || 0) >= 60 ? 'text-blue-600' :
                      (evaluation.score || evaluation.overallScore || 0) >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {evaluation.score || evaluation.overallScore || 0}%
                    </span>
                  </div>
                  
                  {/* KSA Scores */}
                  {evaluation.ksaScores && (
                  <div className="space-y-2">
                    {(() => {
                      // Define the correct order: Knowledge, Skills, Attitudes
                      const ksaOrder = ['knowledge', 'skills', 'attitudes'];
                      const orderedKSA = ksaOrder
                        .filter(key => key in evaluation.ksaScores)
                        .map(key => [key, evaluation.ksaScores[key]]);
                      
                      return orderedKSA.map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {t(`pbl:complete.${key}`)}
                          </span>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${typeof value === 'object' && value !== null ? (value.score || 0) : (Number(value) || 0)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {typeof value === 'object' && value !== null ? (value.score || 0) : (Number(value) || 0)}%
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                  )}
                </div>
                
                {/* Domain Scores */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('pbl:complete.domainScores')}
                  </h4>
                  <div className="space-y-2">
                    {evaluation.domainScores && (() => {
                      // Define the correct order: engage, create, manage, design
                      const domainOrder = ['engaging_with_ai', 'creating_with_ai', 'managing_with_ai', 'designing_with_ai'];
                      const orderedDomains = domainOrder
                        .filter(domain => domain in evaluation.domainScores)
                        .map(domain => [domain, evaluation.domainScores[domain]]);
                      
                      return orderedDomains.map(([domain, score]) => (
                        <div key={domain} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t(`assessment:domains.${domain}`)}
                          </span>
                          <div className="flex items-center">
                            <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${Number(score)}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {Number(score)}%
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
                
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
                {t('pbl:learn.completeTask')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Chatbot */}
        <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col relative min-w-0 pb-8">
          {/* Conversation Area - with padding bottom for input */}
          <div className="flex-1 overflow-y-auto p-6" style={{ paddingBottom: '220px' }}>
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
                    <div className={`prose prose-sm max-w-none ${
                      entry.type === 'user' 
                        ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-a:text-blue-200' 
                        : 'dark:prose-invert'
                    }`}>
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Override default styles for better chat appearance
                        p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        h1: ({children}) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                        h4: ({children}) => <h4 className="text-sm font-bold mb-2">{children}</h4>,
                        code: ({inline, children}) => 
                          inline ? (
                            <code className={`px-1 py-0.5 rounded text-sm ${
                              entry.type === 'user' 
                                ? 'bg-purple-500 bg-opacity-50' 
                                : 'bg-gray-200 dark:bg-gray-600'
                            }`}>{children}</code>
                          ) : (
                            <code className="block p-2 bg-gray-200 dark:bg-gray-600 rounded text-sm overflow-x-auto">{children}</code>
                          ),
                        pre: ({children}) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
                        blockquote: ({children}) => (
                          <blockquote className={`border-l-4 pl-3 my-2 ${
                            entry.type === 'user' 
                              ? 'border-purple-400' 
                              : 'border-gray-300 dark:border-gray-500'
                          }`}>{children}</blockquote>
                        ),
                        table: ({children}) => (
                          <div className="overflow-x-auto mb-2">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">{children}</table>
                          </div>
                        ),
                        th: ({children}) => <th className="px-3 py-2 text-left text-sm font-medium">{children}</th>,
                        td: ({children}) => <td className="px-3 py-2 text-sm">{children}</td>,
                        a: ({href, children}) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="underline hover:opacity-80">{children}</a>
                        ),
                        strong: ({children}) => <strong className="font-bold">{children}</strong>,
                        em: ({children}) => <em className="italic">{children}</em>,
                      }}
                    >
                      {entry.content}
                    </ReactMarkdown>
                    </div>
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

          {/* Fixed Bottom Area */}
          <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg z-10 shadow-xl">
            {/* Evaluate Button */}
            {showEvaluateButton && !isEvaluating && (
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
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
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">
                    {t('pbl:learn.evaluating', 'Evaluating...')}
                  </span>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4">
              <div className="flex gap-3">
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
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            </div>
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
                      const isCompleted = index < taskIndex;
                      const isCurrent = index === taskIndex;
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => {
                            switchTask(task.id);
                            setMobileView('chat');
                          }}
                          className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        >
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                            isCompleted 
                              ? 'border-green-600 dark:border-green-500' 
                              : isCurrent 
                              ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2' 
                              : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {isCompleted ? (
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
                                : isCompleted
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {getLocalizedField(task as unknown as Record<string, unknown>, 'title', i18n.language)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Task Info View */}
            {mobileView === 'task' && (
              <div className="h-full bg-white dark:bg-gray-800 p-6 overflow-y-auto">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {t('pbl:learn.task')} {taskIndex + 1}: {i18n.language === 'zhTW' 
                    ? (currentTask.title_zhTW || currentTask.title)
                    : currentTask.title}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.description')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {i18n.language === 'zhTW' 
                        ? (currentTask.description_zhTW || currentTask.description)
                        : currentTask.description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.instructions')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      {(i18n.language === 'zhTW' 
                        ? (currentTask.instructions_zhTW || currentTask.instructions)
                        : currentTask.instructions
                      ).map((instruction, index) => (
                        <li key={index}>{instruction}</li>
                      ))}
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
                
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handleCompleteTask}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    {t('pbl:learn.completeTask')}
                  </button>
                </div>
              </div>
            )}

            {/* Chat View */}
            {mobileView === 'chat' && (
              <div className="h-full bg-white dark:bg-gray-800 flex flex-col">
                {/* Conversation Area */}
                <div className="flex-1 overflow-y-auto p-4">
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

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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