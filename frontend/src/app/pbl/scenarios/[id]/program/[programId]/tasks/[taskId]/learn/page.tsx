'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  Program, 
  Scenario, 
  Task, 
  TaskInteraction,
  TaskProgress 
} from '@/types/pbl';

interface ConversationEntry {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
}

export default function ProgramLearningPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, i18n } = useTranslation(['pbl', 'common']);
  
  const [programId, setProgramId] = useState(params.programId as string);
  const scenarioId = params.id as string;
  const taskId = params.taskId as string;
  const isNewProgram = searchParams.get('isNew') === 'true';
  
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
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load program and scenario data
  useEffect(() => {
    loadProgramData();
  }, [programId, scenarioId]);

  // Load task data when taskId changes
  useEffect(() => {
    if (scenario && taskId) {
      const task = scenario.tasks.find(t => t.id === taskId);
      if (task) {
        setCurrentTask(task);
        loadTaskHistory();
      }
    }
  }, [taskId, scenario]);

  // Scroll to bottom when conversations change
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations]);

  const loadProgramData = async () => {
    try {
      setLoading(true);
      
      // Load scenario data
      const scenarioRes = await fetch(`/api/pbl/scenarios/${scenarioId}`);
      if (!scenarioRes.ok) throw new Error('Failed to load scenario');
      const scenarioData = await scenarioRes.json();
      setScenario(scenarioData.data);
      
      // For now, create a mock program object
      // In production, this would load from the API
      const mockProgram: Program = {
        id: programId,
        scenarioId: scenarioId,
        userId: 'user@example.com',
        userEmail: 'user@example.com',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'in_progress',
        totalTasks: scenarioData.data.tasks.length,
        completedTasks: 0,
        currentTaskId: taskId || scenarioData.data.tasks[0]?.id,
        language: i18n.language
      };
      setProgram(mockProgram);
      
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
    try {
      // Skip loading history for temp programs
      if (programId.startsWith('temp_')) {
        setConversations([]);
        return;
      }
      
      console.log('Loading task history for:', { programId, taskId, scenarioId });
      
      // Load task conversation history
      const res = await fetch(`/api/pbl/task-logs?programId=${programId}&taskId=${taskId}&scenarioId=${scenarioId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Task history response:', data);
        
        if (data.data?.log?.interactions) {
          const loadedConversations = data.data.log.interactions.map((interaction: TaskInteraction, index: number) => ({
            id: `${index}`,
            type: interaction.type,
            content: interaction.content,
            timestamp: interaction.timestamp
          }));
          console.log('Loaded conversations:', loadedConversations);
          setConversations(loadedConversations);
        } else {
          console.log('No interactions found in response');
          setConversations([]);
        }
      } else {
        console.error('Failed to load task history:', res.status);
      }
    } catch (error) {
      console.error('Error loading task history:', error);
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
      // If this is a new program (temp ID), create it now
      let actualProgramId = programId;
      if (isNewProgram && programId.startsWith('temp_')) {
        // Create the actual program
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
        } else {
          throw new Error('Failed to create program');
        }
      }
      
      // Save user interaction
      await fetch('/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId: actualProgramId,
          taskId: currentTask.id,
          scenarioId,
          taskTitle: i18n.language === 'zh' || i18n.language === 'zh-TW' 
            ? (currentTask.title_zh || currentTask.title)
            : currentTask.title,
          interaction: {
            type: 'user',
            content: userMessage,
            timestamp: newUserEntry.timestamp
          }
        })
      });
      
      // Get AI response
      const aiRes = await fetch('/api/pbl/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId: actualProgramId,
          context: {
            scenarioId,
            taskId: currentTask.id,
            taskTitle: currentTask.title,
            taskDescription: currentTask.description,
            instructions: currentTask.instructions,
            expectedOutcome: currentTask.expectedOutcome,
            conversationHistory: conversations.slice(-10)
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
      
      // Save AI interaction
      await fetch('/api/pbl/task-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-scenario-id': scenarioId
        },
        body: JSON.stringify({
          programId: actualProgramId,
          taskId: currentTask.id,
          scenarioId,
          taskTitle: i18n.language === 'zh' || i18n.language === 'zh-TW' 
            ? (currentTask.title_zh || currentTask.title)
            : currentTask.title,
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
    if (!currentTask || !program) return;
    
    try {
      // Update task progress
      await fetch('/api/pbl/task-logs', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
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

  const switchTask = (newTaskId: string) => {
    router.push(`/pbl/scenarios/${scenarioId}/program/${programId}/tasks/${newTaskId}/learn`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
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
  const progress = ((taskIndex + 1) / scenario.tasks.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
              {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                ? (scenario.title_zh || scenario.title)
                : scenario.title}
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
      <div className="flex-1 flex relative">
        {/* Desktop Layout */}
        <div className="hidden md:flex w-full">
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
                      const isCompleted = index < taskIndex;
                      const isCurrent = index === taskIndex;
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => switchTask(task.id)}
                          className="flex items-center w-full text-left hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        >
                          <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 flex-shrink-0 ${
                            isCompleted 
                              ? 'border-green-600 dark:border-green-500' 
                              : isCurrent 
                              ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2 dark:ring-offset-white dark:ring-offset-gray-800' 
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
                              {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                                ? (task.title_zh || task.title)
                                : task.title}
                            </p>
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
                    const isCompleted = index < taskIndex;
                    const isCurrent = index === taskIndex;
                    
                    return (
                      <button
                        key={task.id}
                        onClick={() => switchTask(task.id)}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white dark:bg-gray-800 mx-auto ${
                          isCompleted 
                            ? 'border-green-600 dark:border-green-500' 
                            : isCurrent 
                            ? 'border-purple-600 dark:border-purple-500 ring-2 ring-purple-600 ring-offset-2' 
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={i18n.language === 'zh' || i18n.language === 'zh-TW' 
                          ? (task.title_zh || task.title)
                          : task.title}
                      >
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
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Panel - Task Info */}
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('pbl:learn.task')} {taskIndex + 1}: {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                ? (currentTask.title_zh || currentTask.title)
                : currentTask.title}
            </h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('pbl:learn.description')}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                    ? (currentTask.description_zh || currentTask.description)
                    : currentTask.description}
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  {t('pbl:learn.instructions')}
                </h3>
                <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                  {(i18n.language === 'zh' || i18n.language === 'zh-TW' 
                    ? (currentTask.instructions_zh || currentTask.instructions)
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
                    {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                      ? (currentTask.expectedOutcome_zh || currentTask.expectedOutcome)
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
        </div>

        {/* Right Panel - Chatbot */}
        <div className="flex-1 bg-white dark:bg-gray-800 flex flex-col border-l border-gray-200 dark:border-gray-700">
          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              {conversations.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex ${entry.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-3xl px-4 py-3 rounded-lg ${
                      entry.type === 'user'
                        ? 'bg-purple-600 text-white'
                        : entry.type === 'ai'
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{entry.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              
              {/* AI thinking indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="max-w-3xl px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
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
          <div className="p-6 border-t border-gray-200 dark:border-gray-700">
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
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
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
                              {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                                ? (task.title_zh || task.title)
                                : task.title}
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
                  {t('pbl:learn.task')} {taskIndex + 1}: {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                    ? (currentTask.title_zh || currentTask.title)
                    : currentTask.title}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.description')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                        ? (currentTask.description_zh || currentTask.description)
                        : currentTask.description}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {t('pbl:learn.instructions')}
                    </h3>
                    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                      {(i18n.language === 'zh' || i18n.language === 'zh-TW' 
                        ? (currentTask.instructions_zh || currentTask.instructions)
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
                        {i18n.language === 'zh' || i18n.language === 'zh-TW' 
                          ? (currentTask.expectedOutcome_zh || currentTask.expectedOutcome)
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
                            {new Date(entry.timestamp).toLocaleTimeString()}
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