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
    if (scenario && taskId && currentTask?.id !== taskId) {
      // For unified architecture, we need to fetch the task data
      loadTaskData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, scenario]);

  // Scroll to bottom when conversations change
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      
      // Load scenario data with language parameter using PBL API
      const scenarioRes = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
      if (!scenarioRes.ok) throw new Error('Failed to load scenario');
      const scenarioData = await scenarioRes.json();
      // Handle PBL API response structure
      if (scenarioData.success && scenarioData.data) {
        setScenario(scenarioData.data);
      } else if (scenarioData.id) {
        // Direct scenario object
        setScenario(scenarioData);
      }
      
      // Load program and task data using unified architecture
      let loadedProgram: Program | null = null;
      let loadedTask: Task | null = null;
      
      if (!programId.startsWith('temp_')) {
        try {
          // Use PBL unified architecture API to get program
          const programRes = await fetch(`/api/pbl/scenarios/${scenarioId}/programs/${programId}`);
          if (programRes.ok) {
            const programData = await programRes.json();
            console.log('Loaded program data:', {
              id: programData.id,
              taskIds: programData.taskIds,
              currentTaskIndex: programData.currentTaskIndex
            });
            if (programData) {
              loadedProgram = {
                id: programData.id,
                scenarioId: scenarioId,
                userId: programData.userId,
                userEmail: programData.userId, // Using userId as userEmail for now
                startedAt: programData.startedAt,
                updatedAt: programData.startedAt, // Using startedAt as updatedAt fallback
                status: programData.status,
                totalTasks: programData.taskIds?.length || 0,
                currentTaskId: programData.taskIds?.[programData.currentTaskIndex] || taskId,
                language: i18n.language,
                taskIds: programData.taskIds || []
              } as Program;
              
              // Load task data using PBL unified architecture
              if (taskId) {
                try {
                  const taskRes = await fetch(`/api/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`);
                  if (taskRes.ok) {
                    const taskData = await taskRes.json();
                    if (taskData) {
                      // Extract task template data from unified architecture format
                      const taskTemplate = taskData.content?.context?.taskTemplate || {};
                      const originalTaskData = taskData.content?.context?.originalTaskData || {};
                      
                      loadedTask = {
                        id: taskData.id,
                        title: taskData.title,
                        type: taskData.type,
                        content: taskData.content,
                        interactions: taskData.interactions || [],
                        status: taskData.status,
                        // Add fields from task template for rendering
                        description: taskTemplate.description || originalTaskData.description || taskData.content?.instructions || '',
                        instructions: originalTaskData.instructions || taskTemplate.instructions || [],
                        expectedOutcome: originalTaskData.expectedOutcome || taskTemplate.expectedOutcome || '',
                        // Store the scenario task index for matching
                        scenarioTaskIndex: taskData.scenarioTaskIndex
                      } as Task;
                      setCurrentTask(loadedTask);
                    }
                  }
                } catch (error) {
                  console.error('Error loading task:', error);
                }
              }
              
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
          language: i18n.language,
          taskIds: scenarioData.data.tasks.map((t: any) => t.id) // Map task IDs from scenario
        };
        setProgram(mockProgram);
      }
      
      // Load all task evaluations for this program (only for non-temp programs)
      if (!programId.startsWith('temp_')) {
        try {
          // Get evaluations for all tasks in this program
          const evaluationsRes = await fetch(`/api/pbl/evaluations?programId=${programId}&targetType=task`);
          if (evaluationsRes.ok) {
            const evaluationsData = await evaluationsRes.json();
            if (evaluationsData.success && evaluationsData.data) {
              // Build a map of task evaluations
              const evaluations: Record<string, TaskEvaluation> = {};
              evaluationsData.data.forEach((evaluation: any) => {
                if (evaluation.targetType === 'task' && evaluation.targetId) {
                  evaluations[evaluation.targetId] = evaluation;
                }
              });
              setTaskEvaluations(evaluations);
            }
          }
        } catch (error) {
          console.error('Error loading task evaluations:', error);
        }
      }
      
      // If no taskId provided, use the first task
      if (!taskId && scenarioData.data.tasks.length > 0) {
        const firstTaskId = scenarioData.data.tasks[0].id;
        router.replace(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${firstTaskId}`);
      }
      
    } catch (error) {
      console.error('Error loading program data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskData = async () => {
    if (!taskId || !scenarioId || !programId) return;
    
    try {
      const taskRes = await fetch(`/api/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${taskId}`);
      if (taskRes.ok) {
        const taskData = await taskRes.json();
        if (taskData) {
          // Extract task template data from unified architecture format
          const taskTemplate = taskData.content?.context?.taskTemplate || {};
          const originalTaskData = taskData.content?.context?.originalTaskData || {};
          
          const loadedTask = {
            id: taskData.id,
            title: taskData.title,
            type: taskData.type,
            content: taskData.content,
            interactions: taskData.interactions || [],
            status: taskData.status,
            // Add fields from task template for rendering
            description: taskTemplate.description || originalTaskData.description || taskData.content?.instructions || '',
            instructions: originalTaskData.instructions || taskTemplate.instructions || [],
            expectedOutcome: originalTaskData.expectedOutcome || taskTemplate.expectedOutcome || '',
            // Store the scenario task index for matching
            scenarioTaskIndex: taskData.scenarioTaskIndex
          } as Task;
          
          setCurrentTask(loadedTask);
          loadTaskHistory();
        }
      }
    } catch (error) {
      console.error('Error loading task data:', error);
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
      const res = await fetch(`/api/pbl/tasks/${taskId}/interactions`);
      if (res.ok) {
        const data = await res.json();
        console.log('Task history response:', data);
        
        if (data.data?.interactions) {
          const loadedConversations = data.data.interactions.map((interaction: any): ConversationEntry => ({
            id: interaction.id || `${interaction.timestamp}_${interaction.type}`,
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
          
          // Check if task has an evaluation
          if (data.data?.evaluationId) {
            console.log('Task has evaluationId:', data.data.evaluationId);
            // Fetch the evaluation details
            const evalRes = await fetch(`/api/pbl/tasks/${taskId}/evaluate`);
            if (evalRes.ok) {
              const evalData = await evalRes.json();
              if (evalData.data?.evaluation) {
                console.log('Loaded existing evaluation:', evalData.data.evaluation);
                setEvaluation(evalData.data.evaluation);
                
                const currentUserMessageCount = loadedConversations.filter((c: ConversationEntry) => c.type === 'user').length;
                const evaluationUserMessageCount = evalData.data.evaluation.metadata?.conversationCount || 0;
                
                console.log('User message count:', currentUserMessageCount, 'Evaluation count:', evaluationUserMessageCount);
                
                // If evaluation is up to date (same or more conversations evaluated), disable button
                if (evaluationUserMessageCount >= currentUserMessageCount) {
                  setIsEvaluateDisabled(true);
                } else {
                  setIsEvaluateDisabled(false);
                }
              }
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
          const newUrl = `/pbl/scenarios/${scenarioId}/program/${actualProgramId}/tasks/${taskId}`;
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
      const saveUserRes = await fetch(`/api/pbl/tasks/${currentTask.id}/interactions`, {
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
          sessionId: actualProgramId,
          context: {
            scenarioId,
            taskId: currentTask.id,
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
      await fetch(`/api/pbl/tasks/${currentTask.id}/interactions`, {
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
        
        // Save evaluation to GCS
        try {
          const saveResponse = await fetch(`/api/pbl/tasks/${currentTask.id}/evaluate`, {
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
            console.error('Failed to save evaluation to GCS');
          } else {
            const saveData = await saveResponse.json();
            if (saveData.success && saveData.data?.evaluationId) {
              // Update the evaluation with the ID from backend
              setEvaluation({
                ...data.evaluation,
                id: saveData.data.evaluationId
              });
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

  const handleCompleteTask = async () => {
    if (!currentTask || !program) {
      console.log('handleCompleteTask: Missing currentTask or program', { currentTask, program });
      return;
    }
    
    // Use program.taskIds to find the current and next task
    const taskIds = program.taskIds || [];
    const currentIndex = taskIds.findIndex(id => id === currentTask.id);
    
    console.log('handleCompleteTask:', {
      currentTaskId: currentTask.id,
      taskIds,
      currentIndex,
      hasNextTask: currentIndex !== -1 && currentIndex < taskIds.length - 1
    });
    
    if (currentIndex !== -1 && currentIndex < taskIds.length - 1) {
      // Navigate to next task
      const nextTaskId = taskIds[currentIndex + 1];
      console.log('Navigating to next task:', nextTaskId);
      router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/tasks/${nextTaskId}`);
    } else {
      // All tasks completed or current task not found in taskIds
      console.log('All tasks completed or task not found, going to complete page');
      router.push(`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`);
    }
  };

  const switchTask = (newTaskId: string) => {
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

  const taskIndex = (currentTask as any)?.scenarioTaskIndex ?? scenario.tasks.findIndex(t => t.id === currentTask.id);
  // const progress = ((taskIndex + 1) / scenario.tasks.length) * 100;

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm flex-shrink-0">
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
        <div className="hidden md:flex w-full h-full">
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
                      // Get the actual task UUID from program taskIds
                      const actualTaskId = program?.taskIds?.[index] || task.id;
                      const isEvaluated = !!taskEvaluations[actualTaskId];
                      const isCurrent = currentTask && currentTask.id === actualTaskId;
                      const taskEval = taskEvaluations[actualTaskId];
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => switchTask(actualTaskId)}
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
                    // Get the actual task UUID from program taskIds
                    const actualTaskId = program?.taskIds?.[index] || task.id;
                    const isEvaluated = !!taskEvaluations[actualTaskId];
                    const isCurrent = currentTask && currentTask.id === actualTaskId;
                    const taskEval = taskEvaluations[actualTaskId];
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => switchTask(actualTaskId)}
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
                    href={`/pbl/scenarios/${scenarioId}/programs/${programId}/complete`}
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
                      evaluation.score >= 75 ? 'text-green-600' :
                      evaluation.score >= 60 ? 'text-blue-600' :
                      evaluation.score >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {evaluation.score}%
                    </span>
                  </div>
                  
                  {/* KSA Scores */}
                  {evaluation.ksaScores && (
                  <div className="space-y-2">
                    {Object.entries(evaluation.ksaScores).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {t(`pbl:complete.${key}`)}
                        </span>
                        <div className="flex items-center">
                          <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Number(value)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {Number(value)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
                
                {/* Domain Scores */}
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('pbl:complete.domainScores')}
                  </h4>
                  <div className="space-y-2">
                    {evaluation.domainScores && Object.entries(evaluation.domainScores).map(([domain, score]) => (
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
                    ))}
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
                {program && currentTask && program.taskIds && program.taskIds.indexOf(currentTask.id) < program.taskIds.length - 1
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
          <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
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
            {/* Bottom safe area */}
            <div className="h-4 sm:h-6"></div>
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
                      // Get the actual task UUID from program taskIds
                      const actualTaskId = program?.taskIds?.[index] || task.id;
                      const isCompleted = index < taskIndex;
                      const isCurrent = currentTask && currentTask.id === actualTaskId;
                      
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

                {/* Input Area */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
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
                  {/* Bottom safe area */}
                  <div className="h-4"></div>
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