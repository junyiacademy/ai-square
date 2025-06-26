'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { 
  SessionData, 
  ScenarioProgram, 
  Task,
  ConversationTurn,
  ProcessLog,
  ActionType
} from '@/types/pbl';

export default function PBLLearnPage() {
  const { t, i18n, ready } = useTranslation(['pbl']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Keep for auto-save functionality
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load scenario only (don't create session until first message)
  useEffect(() => {
    const loadScenario = async () => {
      let scenarioData = null;
      try {
        // Load scenario details
        const scenarioResponse = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        
        if (!scenarioResponse.ok) {
          throw new Error(`HTTP error! status: ${scenarioResponse.status}`);
        }
        
        scenarioData = await scenarioResponse.json();
        console.log('Scenario data received:', scenarioData);
        
        if (!scenarioData.success) {
          throw new Error(`API error: ${scenarioData.error?.message || 'Failed to load scenario'}`);
        }
        
        setScenario(scenarioData.data);
        
        // Set initial current task (stage 0, task 0)
        const currentStage = scenarioData.data.stages[0];
        if (currentStage && currentStage.tasks && currentStage.tasks.length > 0) {
          setCurrentTask(currentStage.tasks[0]);
        }
      } catch (error) {
        console.error('Error loading scenario:', error);
        if (scenarioData) {
          console.error('Scenario response data:', scenarioData);
        }
        // Set error state so user can see what went wrong
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };

    loadScenario();
  }, [scenarioId, i18n.language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: 'smooth',
      block: 'end'
    });
  };

  const saveProgress = useCallback(async () => {
    // Only save if session exists (i.e., user has started chatting)
    if (!session) {
      console.log('No session to save - user hasn\'t started chatting yet');
      return;
    }
    
    setSaving(true);
    try {
      await fetch(`/api/pbl/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: session.progress,
          lastActiveAt: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  }, [session]);

  // Auto-save session progress
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (session && !saving) {
        saveProgress();
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [session, saving, saveProgress]);

  // Auto-scroll to bottom when conversation updates
  useEffect(() => {
    scrollToBottom();
  }, [conversation, isAIThinking]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || isAIThinking || !currentTask || !scenario) return;

    const userMessage: ConversationTurn = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'user',
      content: userInput
    };

    setConversation(prev => [...prev, userMessage]);
    const currentUserInput = userInput;
    setUserInput('');
    setIsAIThinking(true);

    try {
      let currentSession = session;
      
      // Create session on first message if not exists
      if (!currentSession) {
        // Get current stage index from localStorage or default to 0
        const savedProgress = localStorage.getItem(`pbl-progress-${scenarioId}`);
        const currentStageIndex = savedProgress ? JSON.parse(savedProgress).currentStage : 0;
        
        console.log(`Creating new session for stage ${currentStageIndex}...`);
        
        // Try to get user info from cookie
        let userId = 'user-demo';
        try {
          const userCookie = document.cookie
            .split('; ')
            .find(row => row.startsWith('user='))
            ?.split('=')[1];
          
          if (userCookie) {
            const user = JSON.parse(decodeURIComponent(userCookie));
            userId = user.email || userId;
          }
        } catch (e) {
          console.log('No user cookie found, using demo user');
        }
        
        const sessionResponse = await fetch('/api/pbl/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId,
            scenarioTitle: scenario.title,
            userId,
            language: i18n.language,
            stageIndex: currentStageIndex,
            stageId: scenario.stages[currentStageIndex].id
          })
        });

        const sessionData = await sessionResponse.json();
        if (sessionData.success) {
          currentSession = sessionData.data.sessionData;
          setSession(currentSession);
          console.log('Session created:', currentSession.id);
        } else {
          throw new Error('Failed to create session');
        }
      }

      if (!currentSession) {
        throw new Error('No session available');
      }

      // Log user action
      const processLog: ProcessLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        sessionId: currentSession.id,
        stageId: scenario.stages[currentSession.currentStage].id || '',
        actionType: 'write' as ActionType,
        detail: {
          userInput: currentUserInput,
          timeSpent: 0 // TODO: Track actual time
        }
      };

      // Send to AI API
      const stageIndex = currentSession.currentStage || 0;
      const currentStage = scenario.stages[stageIndex];
      if (!currentStage) {
        console.error('Current stage not found');
        return;
      }
      
      const response = await fetch('/api/pbl/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSession.id,
          message: currentUserInput,
          userId: currentSession.userId,
          language: i18n.language,
          aiModule: currentStage.aiModules[0], // Use first AI module for now
          stageContext: {
            stageId: currentStage.id,
            stageName: currentStage.name,
            stageType: currentStage.stageType,
            taskTitle: currentTask.title,
            taskInstructions: currentTask.instructions
          }
        })
      });

      const responseData = await response.json();
      
      if (responseData.success) {
        setConversation(prev => [...prev, responseData.data.conversation]);
        
        // Update session with new process log
        setSession(prev => prev ? {
          ...prev,
          processLogs: [...prev.processLogs, processLog]
        } : null);
      } else {
        // Fallback response if API fails
        const aiMessage: ConversationTurn = {
          id: `msg-${Date.now()}`,
          timestamp: new Date(),
          role: 'ai',
          content: t('learn.aiResponse.error')
        };
        setConversation(prev => [...prev, aiMessage]);
      }
      
      // Always reset AI thinking state
      setIsAIThinking(false);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to conversation
      const errorMessage: ConversationTurn = {
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        role: 'ai',
        content: t('learn.aiResponse.error')
      };
      setConversation(prev => [...prev, errorMessage]);
      setIsAIThinking(false);
    }
  };

  const handleNextTask = async () => {
    if (!session || !scenario) return;

    const stageIndex = session.currentStage || 0;
    const currentStage = scenario.stages[stageIndex];
    if (!currentStage) return;
    const currentTaskIndex = currentStage.tasks.findIndex(t => t.id === currentTask?.id);
    
    if (currentTaskIndex < currentStage.tasks.length - 1) {
      // Next task in current stage
      setCurrentTask(currentStage.tasks[currentTaskIndex + 1]);
    } else if (session.currentStage < scenario.stages.length - 1) {
      // Move to next stage - complete current stage session first
      const newStageIndex = session.currentStage + 1;
      
      // Mark current stage session as completed
      if (session) {
        try {
          await fetch(`/api/pbl/sessions/${session.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete' })
          });
          console.log(`Stage ${session.currentStage} session completed`);
        } catch (error) {
          console.error('Error completing stage session:', error);
        }
      }
      
      // Update progress in localStorage before clearing session
      const overallProgress = {
        scenarioId,
        completedStages: [...(session.progress.completedStages || []), session.currentStage],
        currentStage: newStageIndex
      };
      localStorage.setItem(`pbl-progress-${scenarioId}`, JSON.stringify(overallProgress));
      
      // Clear current session and conversation for new stage
      setSession(null);
      setConversation([]);
      setCurrentTask(scenario.stages[newStageIndex].tasks[0]);
      
      // The next session will be created with the new stage index when user sends first message
    } else {
      // Scenario completed
      handleCompleteScenario();
    }
  };

  const handleCompleteScenario = async () => {
    if (!session) {
      // If no session exists, just redirect (no conversation happened)
      router.push(`/pbl/scenarios/${scenarioId}/complete`);
      return;
    }

    try {
      await fetch(`/api/pbl/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete' })
      });

      router.push(`/pbl/scenarios/${scenarioId}/complete`);
    } catch (error) {
      console.error('Error completing scenario:', error);
    }
  };

  if (loading || !ready || !i18n.isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">{t('learn.errorLoading')}</p>
          <button
            onClick={() => router.push('/pbl')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('learn.backToPBL')}
          </button>
        </div>
      </div>
    );
  }

  const stageIndex = session?.currentStage || 0;
  const currentStage = scenario.stages[stageIndex];
  const progress = session ? ((stageIndex + 1) / scenario.stages.length) * 100 : 0;

  // Safety check for currentStage
  if (!currentStage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Invalid stage configuration</p>
          <button
            onClick={() => router.push('/pbl')}
            className="text-blue-600 hover:text-blue-700"
          >
            {t('learn.backToPBL')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {scenario.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {currentStage.name} - {currentTask?.title}
              </p>
            </div>
            <button
              onClick={() => router.push('/pbl')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Compact Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              {/* Stage indicators with progress info */}
              <div className="flex items-center space-x-2">
                {scenario.stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center">
                    <div 
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                        index < stageIndex
                          ? 'bg-green-500 text-white' // Completed
                          : index === stageIndex
                          ? 'bg-blue-600 text-white' // Current
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400' // Not started
                      }`}
                      title={stage.name}
                    >
                      {index < stageIndex ? (
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < scenario.stages.length - 1 && (
                      <div className={`w-8 h-0.5 mx-1 ${index < stageIndex ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Progress percentage */}
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Task Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {t('learn.currentTask')}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {currentTask?.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentTask?.description}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {t('learn.instructions')}
                  </h4>
                  <ul className="space-y-2">
                    {currentTask?.instructions.map((instruction, index) => (
                      <li key={index} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-blue-500 mr-2">{index + 1}.</span>
                        {instruction}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                    {t('learn.expectedOutcome')}
                  </h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {currentTask?.expectedOutcome}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[calc(100vh-280px)] min-h-[500px] flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
                    <p>{t('learn.startConversation')}</p>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="text-sm">
                          {message.role === 'ai' ? (
                            <div className="max-w-none">
                              <ReactMarkdown 
                                components={{
                                  p: ({children}) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                                  ul: ({children}) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                                  ol: ({children}) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
                                  li: ({children}) => <li className="mb-1">{children}</li>
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p>{message.content}</p>
                          )}
                        </div>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                {isAIThinking && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Invisible element for auto-scrolling */}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={t('learn.inputPlaceholder')}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    disabled={isAIThinking}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isAIThinking}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('learn.send')}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleNextTask}
                disabled={!session}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {session && session.currentStage === scenario.stages.length - 1 && 
                 currentTask?.id === currentStage.tasks[currentStage.tasks.length - 1].id
                  ? t('learn.completeScenario')
                  : t('learn.nextTask')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}