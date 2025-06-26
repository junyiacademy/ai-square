'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { 
  SessionData, 
  ScenarioProgram, 
  Task,
  ConversationTurn,
  ProcessLog,
  ActionType
} from '@/types/pbl';

export default function PBLLearnPage() {
  const { t, i18n } = useTranslation(['pbl']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);

  // Load scenario and start/resume session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // 1. Load scenario details
        const scenarioResponse = await fetch(`/api/pbl/scenarios/${scenarioId}?lang=${i18n.language}`);
        const scenarioData = await scenarioResponse.json();
        
        if (!scenarioData.success) {
          throw new Error('Failed to load scenario');
        }
        
        setScenario(scenarioData.data);

        // 2. Check for existing session or create new one
        const sessionResponse = await fetch('/api/pbl/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId,
            userId: 'user-demo', // TODO: Get from auth
            language: i18n.language
          })
        });

        const sessionData = await sessionResponse.json();
        if (sessionData.success) {
          setSession(sessionData.data);
          
          // Set current task based on progress
          const currentStage = scenarioData.data.stages[sessionData.data.currentStage];
          if (currentStage && currentStage.tasks.length > 0) {
            setCurrentTask(currentStage.tasks[0]);
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [scenarioId, i18n.language]);

  // Auto-save session progress
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (session && !saving) {
        saveProgress();
      }
    }, 30000); // Save every 30 seconds

    return () => clearInterval(saveInterval);
  }, [session, saving]);

  const saveProgress = async () => {
    if (!session) return;
    
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
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isAIThinking || !session || !currentTask) return;

    const userMessage: ConversationTurn = {
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      role: 'user',
      content: userInput
    };

    setConversation(prev => [...prev, userMessage]);
    setUserInput('');
    setIsAIThinking(true);

    try {
      // Log user action
      const processLog: ProcessLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        sessionId: session.id,
        stageId: scenario?.stages[session.currentStage].id || '',
        actionType: 'write' as ActionType,
        detail: {
          userInput: userInput,
          timeSpent: 0 // TODO: Track actual time
        }
      };

      // Send to Gemini API
      const currentStage = scenario.stages[session.currentStage];
      const response = await fetch('/api/pbl/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          message: userInput,
          userId: session.userId,
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
    } catch (error) {
      console.error('Error sending message:', error);
      setIsAIThinking(false);
    }
  };

  const handleNextTask = () => {
    if (!session || !scenario) return;

    const currentStage = scenario.stages[session.currentStage];
    const currentTaskIndex = currentStage.tasks.findIndex(t => t.id === currentTask?.id);
    
    if (currentTaskIndex < currentStage.tasks.length - 1) {
      // Next task in current stage
      setCurrentTask(currentStage.tasks[currentTaskIndex + 1]);
    } else if (session.currentStage < scenario.stages.length - 1) {
      // Move to next stage
      const newStageIndex = session.currentStage + 1;
      setSession({
        ...session,
        currentStage: newStageIndex,
        progress: {
          ...session.progress,
          completedStages: [...session.progress.completedStages, session.currentStage]
        }
      });
      setCurrentTask(scenario.stages[newStageIndex].tasks[0]);
      setConversation([]); // Clear conversation for new stage
    } else {
      // Scenario completed
      handleCompleteScenario();
    }
  };

  const handleCompleteScenario = async () => {
    if (!session) return;

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!scenario || !session) {
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

  const currentStage = scenario.stages[session.currentStage];
  const progress = ((session.currentStage + 1) / scenario.stages.length) * 100;

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
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>{t('learn.progress')}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
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
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[600px] flex flex-col">
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
                        <p className="text-sm">{message.content}</p>
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
            <div className="mt-4 flex justify-end space-x-3">
              <button
                onClick={saveProgress}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {saving ? t('learn.saving') : t('learn.saveProgress')}
              </button>
              <button
                onClick={handleNextTask}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {session.currentStage === scenario.stages.length - 1 && 
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