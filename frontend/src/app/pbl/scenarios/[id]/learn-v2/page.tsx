'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { 
  PBLJourney,
  PBLTaskLog,
  ScenarioProgram, 
  Task,
  ConversationTurn,
  StageResult
} from '@/types/pbl';

export default function PBLLearnV2Page() {
  const { t, i18n } = useTranslation(['pbl']);
  const params = useParams();
  const router = useRouter();
  const scenarioId = params.id as string;

  // Core States
  const [scenario, setScenario] = useState<ScenarioProgram | null>(null);
  const [journey, setJourney] = useState<PBLJourney | null>(null);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);
  const [currentTaskLog, setCurrentTaskLog] = useState<PBLTaskLog | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<StageResult | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    const checkAuth = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          setIsAuthenticated(!!user.email);
        }
      } catch (e) {
        console.log('Error checking auth:', e);
      }
      setAuthChecked(true);
    };
    
    checkAuth();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  // Load scenario and journey
  useEffect(() => {
    const loadScenarioAndJourney = async () => {
      if (!authChecked || !isAuthenticated) return;
      
      try {
        setLoading(true);
        
        // Load scenario
        const scenarioResponse = await fetch(`/api/pbl/scenarios/${scenarioId}`);
        const scenarioData = await scenarioResponse.json();
        
        if (!scenarioData.success) {
          throw new Error('Failed to load scenario');
        }
        
        setScenario(scenarioData.data);
        
        // Check for active journey
        const journeyResponse = await fetch(`/api/pbl/journeys?scenarioId=${scenarioId}`);
        const journeyData = await journeyResponse.json();
        
        let activeJourney = null;
        if (journeyData.success && journeyData.data.journeys.length > 0) {
          // Find active journey
          activeJourney = journeyData.data.journeys.find((j: any) => j.status === 'in_progress');
        }
        
        if (activeJourney) {
          // Load existing journey
          console.log('Loading existing journey:', activeJourney.journeyId);
          const fullJourneyResponse = await fetch(`/api/pbl/journeys/${activeJourney.journeyId}`);
          const fullJourneyData = await fullJourneyResponse.json();
          
          if (fullJourneyData.success) {
            setJourney(fullJourneyData.data);
            // Find current task (first incomplete task)
            const tasks = getAllTasks(scenarioData.data);
            const currentTaskId = findCurrentTask(fullJourneyData.data, tasks);
            const task = tasks.find(t => t.id === currentTaskId);
            if (task) {
              await loadTask(fullJourneyData.data, task);
            }
          }
        } else {
          // Create new journey
          console.log('Creating new journey for scenario:', scenarioId);
          const createResponse = await fetch('/api/pbl/journeys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarioId, language: i18n.language })
          });
          
          const createData = await createResponse.json();
          if (createData.success) {
            setJourney(createData.data);
            // Start with first task
            const firstTask = scenarioData.data.stages[0]?.tasks[0];
            if (firstTask) {
              await loadTask(createData.data, firstTask);
            }
          }
        }
        
      } catch (error) {
        console.error('Error loading scenario and journey:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadScenarioAndJourney();
  }, [authChecked, isAuthenticated, scenarioId, i18n.language]);

  // Helper functions
  const getAllTasks = (scenario: ScenarioProgram): Task[] => {
    return scenario.stages.flatMap(stage => stage.tasks);
  };

  const findCurrentTask = (journey: PBLJourney, allTasks: Task[]): string => {
    // Find first incomplete task
    for (const task of allTasks) {
      const taskLog = journey.taskLogs[task.id];
      if (!taskLog || taskLog.status !== 'completed') {
        return task.id;
      }
    }
    // All tasks completed, return last task
    return allTasks[allTasks.length - 1]?.id || allTasks[0]?.id;
  };

  const loadTask = async (journey: PBLJourney, task: Task) => {
    try {
      setCurrentTask(task);
      
      // Get or create task log
      const stage = scenario?.stages.find(s => s.tasks.some(t => t.id === task.id));
      const stageId = stage?.id || '';
      
      let taskLog = journey.taskLogs[task.id];
      if (!taskLog) {
        // Create new task log
        taskLog = {
          taskId: task.id,
          stageId,
          startedAt: new Date().toISOString(),
          status: 'in_progress',
          conversations: [],
          processLogs: [],
          timeSpent: 0
        };
        journey.taskLogs[task.id] = taskLog;
      }
      
      setCurrentTaskLog(taskLog);
      setConversation(taskLog.conversations);
      setAnalysis(taskLog.analysis || null);
      
    } catch (error) {
      console.error('Error loading task:', error);
    }
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!userInput.trim() || !journey || !currentTask || isAIThinking) return;
    
    try {
      setIsAIThinking(true);
      
      const response = await fetch('/api/pbl/journey-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: journey.journeyId,
          taskId: currentTask.id,
          message: userInput.trim(),
          userId: journey.userId,
          language: journey.language,
          stageContext: {
            stageId: currentTaskLog?.stageId,
            taskTitle: currentTask.title
          }
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setConversation(data.data.taskLog.conversations);
        setCurrentTaskLog(data.data.taskLog);
        setUserInput('');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsAIThinking(false);
    }
  };

  // Analyze task
  const handleAnalyze = async () => {
    if (!journey || !currentTask || !currentTaskLog || isAnalyzing) return;
    
    try {
      setIsAnalyzing(true);
      
      const response = await fetch('/api/pbl/journey-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journeyId: journey.journeyId,
          taskId: currentTask.id,
          stageId: currentTaskLog.stageId,
          taskTitle: currentTask.title,
          conversations: currentTaskLog.conversations
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setAnalysis(data.data.stageResult);
        // Update task log
        const updatedTaskLog = { ...currentTaskLog };
        updatedTaskLog.status = 'completed';
        updatedTaskLog.analysis = data.data.stageResult;
        setCurrentTaskLog(updatedTaskLog);
        
        // Update journey
        const updatedJourney = { ...journey };
        updatedJourney.taskLogs[currentTask.id] = updatedTaskLog;
        setJourney(updatedJourney);
      }
      
    } catch (error) {
      console.error('Error analyzing task:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Navigate to next task
  const handleNextTask = () => {
    if (!scenario || !journey || !currentTask) return;
    
    const allTasks = getAllTasks(scenario);
    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    
    if (currentIndex < allTasks.length - 1) {
      const nextTask = allTasks[currentIndex + 1];
      loadTask(journey, nextTask);
    }
  };

  // Navigate to previous task
  const handlePrevTask = () => {
    if (!scenario || !journey || !currentTask) return;
    
    const allTasks = getAllTasks(scenario);
    const currentIndex = allTasks.findIndex(t => t.id === currentTask.id);
    
    if (currentIndex > 0) {
      const prevTask = allTasks[currentIndex - 1];
      loadTask(journey, prevTask);
    }
  };

  // Loading state
  if (loading || !scenario || !journey || !currentTask) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">載入學習內容中...</p>
        </div>
      </div>
    );
  }

  const allTasks = getAllTasks(scenario);
  const currentTaskIndex = allTasks.findIndex(t => t.id === currentTask.id);
  const completedTasksCount = Object.values(journey.taskLogs).filter(log => log.status === 'completed').length;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/pbl')}
                className="text-blue-600 hover:text-blue-700"
              >
                ← 返回
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {scenario.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  任務 {currentTaskIndex + 1}/{allTasks.length}: {currentTask.title}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                完成: {completedTasksCount}/{allTasks.length}
              </span>
              <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(completedTasksCount / allTasks.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Task Info */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                任務資訊
              </h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    {currentTask.title}
                  </h3>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                    {currentTask.instructions.map((instruction, index) => (
                      <p key={index}>• {instruction}</p>
                    ))}
                  </div>
                </div>
                
                {analysis && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      完成分析
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">分數:</span>
                        <span className={`text-sm font-medium ${
                          analysis.score >= 80 ? 'text-green-600' :
                          analysis.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {analysis.score}/100
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {analysis.feedback}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm flex flex-col h-[600px]">
              
              {/* Conversation */}
              <div className="flex-1 p-4 overflow-y-auto">
                <div className="space-y-4">
                  {conversation.length === 0 ? (
                    <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                      開始與 AI 導師對話來完成任務
                    </div>
                  ) : (
                    conversation.map((turn) => (
                      <div
                        key={turn.id}
                        className={`flex ${turn.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                            turn.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                          }`}
                        >
                          <ReactMarkdown className="text-sm">
                            {turn.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                  
                  {isAIThinking && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="animate-pulse">AI 正在思考中...</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="輸入您的訊息..."
                    disabled={isAIThinking}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!userInput.trim() || isAIThinking}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    發送
                  </button>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <button
                      onClick={handlePrevTask}
                      disabled={currentTaskIndex === 0}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                               rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      上一個
                    </button>
                    <button
                      onClick={handleNextTask}
                      disabled={currentTaskIndex === allTasks.length - 1}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                               rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                    >
                      下一個
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    {conversation.length > 0 && !analysis && (
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                                 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isAnalyzing ? '分析中...' : '完成分析'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => router.push(`/pbl/scenarios/${scenarioId}/history`)}
                      className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                               rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      歷史 ▼
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}