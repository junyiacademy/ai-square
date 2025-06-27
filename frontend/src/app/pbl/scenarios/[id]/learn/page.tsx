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
  ActionType,
  StageResult
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
  const [stageAnalysis, setStageAnalysis] = useState<StageResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [existingLogs, setExistingLogs] = useState<Array<{
    sessionId: string;
    createdAt: string;
    metadata: {
      conversationCount: number;
      timeSpent: number;
    };
  }>>([]);
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [lastInteractionTime, setLastInteractionTime] = useState<number>(Date.now());
  
  // Ref for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check for existing stage analysis when session or current stage changes
  useEffect(() => {
    if (session && scenario) {
      const currentStageId = scenario.stages[session.currentStage]?.id;
      if (currentStageId) {
        const existingAnalysis = session.stageResults?.find(r => r.stageId === currentStageId);
        if (existingAnalysis) {
          console.log('Found existing stage analysis for stage:', currentStageId);
          setStageAnalysis(existingAnalysis);
        } else {
          console.log('No existing stage analysis for stage:', currentStageId);
          setStageAnalysis(null);
        }
      }
    }
  }, [session, scenario]);

  // Fetch existing logs when task changes
  useEffect(() => {
    const fetchExistingLogs = async () => {
      if (!currentTask || !scenario) return;
      
      // Get user info from localStorage or cookie
      let userId = 'user-demo';
      try {
        // First check localStorage (consistent with history page)
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        const userData = localStorage.getItem('user');
        
        if (isLoggedIn === 'true' && userData) {
          const user = JSON.parse(userData);
          userId = user.email || userId;
        } else {
          // Check mockUser
          const mockUser = localStorage.getItem('mockUser');
          if (mockUser) {
            const mock = JSON.parse(mockUser);
            userId = mock.id || userId;
          } else {
            // Fallback to cookie
            const userCookie = document.cookie
              .split('; ')
              .find(row => row.startsWith('user='))
              ?.split('=')[1];
            
            if (userCookie) {
              const user = JSON.parse(decodeURIComponent(userCookie));
              userId = user.email || userId;
            }
          }
        }
      } catch (e) {
        console.log('Error getting user info, using demo user:', e);
      }
      
      // Find current stage ID
      const currentStageIndex = scenario.stages.findIndex(stage => 
        stage.tasks.some(task => task.id === currentTask?.id)
      );
      const currentStageId = scenario.stages[currentStageIndex]?.id;
      
      if (currentStageId) {
        try {
          const url = `/api/pbl/logs?userId=${userId}&scenarioId=${scenarioId}&stageId=${currentStageId}&taskId=${currentTask.id}`;
          console.log('Fetching logs with URL:', url);
          console.log('Parameters:', {
            userId,
            scenarioId,
            stageId: currentStageId,
            taskId: currentTask.id
          });
          
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            setExistingLogs(data.data.logs);
            console.log(`Found ${data.data.logs.length} existing logs for task ${currentTask.id}`);
          } else {
            console.error('Failed to fetch logs:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error fetching existing logs:', error);
        }
      }
    };

    fetchExistingLogs();
  }, [currentTask, scenario, scenarioId]);

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
        
        // Get user info from localStorage or cookie (consistent with history page)
        let userId = 'user-demo';
        try {
          // First check localStorage (consistent with history page)
          const isLoggedIn = localStorage.getItem('isLoggedIn');
          const userData = localStorage.getItem('user');
          
          if (isLoggedIn === 'true' && userData) {
            const user = JSON.parse(userData);
            userId = user.email || userId;
          } else {
            // Check mockUser
            const mockUser = localStorage.getItem('mockUser');
            if (mockUser) {
              const mock = JSON.parse(mockUser);
              userId = mock.id || userId;
            } else {
              // Fallback to cookie
              const userCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('user='))
                ?.split('=')[1];
              
              if (userCookie) {
                const user = JSON.parse(decodeURIComponent(userCookie));
                userId = user.email || userId;
              }
            }
          }
        } catch (e) {
          console.log('Error getting user info, using demo user:', e);
        }
        
        // Check for existing active session
        const sessionsResponse = await fetch(`/api/pbl/sessions?userId=${userId}&scenarioId=${scenarioId}&status=active`);
        if (sessionsResponse.ok) {
          const sessionsData = await sessionsResponse.json();
          if (sessionsData.success && sessionsData.data.sessions.length > 0) {
            // Use the most recent active session
            const existingSession = sessionsData.data.sessions[0];
            console.log('Found existing session:', existingSession.id);
            setSession(existingSession);
            // Set currentLogId from the existing session's ID
            setCurrentLogId(existingSession.id);
            // Reset session start time for time tracking
            setSessionStartTime(Date.now());
            
            // Set current task based on session progress
            const stageIndex = existingSession.currentStage || 0;
            const stage = scenarioData.data.stages[stageIndex];
            if (stage && stage.tasks && stage.tasks.length > 0) {
              // Use currentTaskIndex from session or default to 0
              const taskIndex = existingSession.currentTaskIndex || 0;
              setCurrentTask(stage.tasks[taskIndex]);
            }
            
            // Load conversation history for current stage
            const currentStageId = stage?.id;
            if (currentStageId) {
              const stageLogs = existingSession.processLogs
                .filter((log: ProcessLog) => log.stageId === currentStageId && log.detail?.aiInteraction)
                .map((log: ProcessLog) => ({
                  user: {
                    id: `user-${log.timestamp}`,
                    timestamp: log.timestamp,
                    role: 'user' as const,
                    content: log.detail.aiInteraction?.prompt || log.detail.userInput || ''
                  },
                  ai: {
                    id: `ai-${log.timestamp}`,
                    timestamp: log.timestamp,
                    role: 'ai' as const,
                    content: log.detail.aiInteraction?.response || ''
                  }
                }));
              
              // Flatten to array of conversation turns
              const conversationTurns: ConversationTurn[] = [];
              stageLogs.forEach((log: { user: ConversationTurn; ai: ConversationTurn }) => {
                if (log.user.content) conversationTurns.push(log.user);
                if (log.ai.content) conversationTurns.push(log.ai);
              });
              setConversation(conversationTurns);
            }
          } else {
            // No existing session, set initial task
            const currentStage = scenarioData.data.stages[0];
            if (currentStage && currentStage.tasks && currentStage.tasks.length > 0) {
              setCurrentTask(currentStage.tasks[0]);
            }
          }
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

  // Load conversation from an existing log
  const loadLogConversation = async (logSessionId: string) => {
    try {
      console.log('Loading conversation from log:', logSessionId);
      
      // Fetch the session data
      const response = await fetch(`/api/pbl/sessions/${logSessionId}`);
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        const loadedSession = data.data;
        
        // Set the loaded session as current
        setSession(loadedSession);
        setCurrentLogId(logSessionId);
        // Reset session start time for time tracking
        setSessionStartTime(Date.now());
        
        // Load conversation history for current stage
        const currentStageId = scenario?.stages[loadedSession.currentStage]?.id;
        if (currentStageId) {
          const stageLogs = loadedSession.processLogs
            .filter((log: ProcessLog) => log.stageId === currentStageId && log.detail?.aiInteraction)
            .map((log: ProcessLog) => ({
              user: {
                id: `user-${log.timestamp}`,
                timestamp: log.timestamp,
                role: 'user' as const,
                content: log.detail.aiInteraction?.prompt || log.detail.userInput || ''
              },
              ai: {
                id: `ai-${log.timestamp}`,
                timestamp: log.timestamp,
                role: 'ai' as const,
                content: log.detail.aiInteraction?.response || ''
              }
            }));
          
          // Flatten to array of conversation turns
          const conversationTurns: ConversationTurn[] = [];
          stageLogs.forEach((log: { user: ConversationTurn; ai: ConversationTurn }) => {
            if (log.user.content) conversationTurns.push(log.user);
            if (log.ai.content) conversationTurns.push(log.ai);
          });
          setConversation(conversationTurns);
        }
      }
    } catch (error) {
      console.error('Error loading log conversation:', error);
    }
  };

  const saveProgress = useCallback(async () => {
    // Only save if session exists (i.e., user has started chatting)
    if (!session) {
      console.log('No session to save - user hasn\'t started chatting yet');
      return Promise.resolve();
    }
    
    setSaving(true);
    try {
      // Calculate total time spent
      const currentTime = Date.now();
      const sessionDuration = Math.floor((currentTime - sessionStartTime) / 1000); // Convert to seconds
      
      console.log('Saving progress - Time spent:', sessionDuration, 'seconds');
      
      const response = await fetch(`/api/pbl/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progress: {
            ...session.progress,
            timeSpent: sessionDuration
          },
          lastActiveAt: new Date().toISOString()
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save progress');
      }
      
      // Update local session state
      setSession(prev => prev ? {
        ...prev,
        progress: {
          ...prev.progress,
          timeSpent: sessionDuration
        }
      } : null);
      
      console.log('Progress saved successfully');
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  }, [session, sessionStartTime]);

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
        // Use the actual current stage based on the current task
        const currentStageIndex = scenario.stages.findIndex(stage => 
          stage.tasks.some(task => task.id === currentTask?.id)
        );
        
        // Fallback to 0 if not found
        const actualStageIndex = currentStageIndex >= 0 ? currentStageIndex : 0;
        
        console.log(`Creating new session for stage ${actualStageIndex} (task: ${currentTask?.id})...`);
        
        // Get user info from localStorage or cookie (consistent with history page)
        let userId = 'user-demo';
        try {
          // First check localStorage (consistent with history page)
          const isLoggedIn = localStorage.getItem('isLoggedIn');
          const userData = localStorage.getItem('user');
          
          if (isLoggedIn === 'true' && userData) {
            const user = JSON.parse(userData);
            userId = user.email || userId;
          } else {
            // Check mockUser
            const mockUser = localStorage.getItem('mockUser');
            if (mockUser) {
              const mock = JSON.parse(mockUser);
              userId = mock.id || userId;
            } else {
              // Fallback to cookie
              const userCookie = document.cookie
                .split('; ')
                .find(row => row.startsWith('user='))
                ?.split('=')[1];
              
              if (userCookie) {
                const user = JSON.parse(decodeURIComponent(userCookie));
                userId = user.email || userId;
              }
            }
          }
        } catch (e) {
          console.log('Error getting user info, using demo user:', e);
        }
        
        const sessionResponse = await fetch('/api/pbl/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioId,
            scenarioTitle: scenario.title,
            userId,
            language: i18n.language,
            stageIndex: actualStageIndex,
            stageId: scenario.stages[actualStageIndex].id,
            taskId: currentTask?.id || scenario.stages[actualStageIndex].tasks[0]?.id
          })
        });

        const sessionData = await sessionResponse.json();
        if (sessionData.success) {
          currentSession = sessionData.data.sessionData;
          setSession(currentSession);
          setCurrentLogId(sessionData.data.logId); // Set the log ID
          setSessionStartTime(Date.now()); // Reset session start time
          console.log('Session created:', currentSession?.id, 'Log ID:', sessionData.data.logId);
        } else {
          throw new Error('Failed to create session');
        }
      }

      if (!currentSession) {
        throw new Error('No session available');
      }

      // Calculate time spent since last interaction
      const currentTime = Date.now();
      const timeSinceLastInteraction = Math.floor((currentTime - lastInteractionTime) / 1000); // Convert to seconds
      setLastInteractionTime(currentTime);

      // Log user action with task ID
      const processLog: ProcessLog = {
        id: `log-${Date.now()}`,
        timestamp: new Date(),
        sessionId: currentSession.id,
        stageId: scenario.stages[currentSession.currentStage].id || '',
        actionType: 'write' as ActionType,
        detail: {
          userInput: currentUserInput,
          timeSpent: timeSinceLastInteraction
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
            taskId: currentTask?.id || '',
            taskTitle: currentTask?.title || '',
            taskInstructions: currentTask?.instructions || []
          },
          userProcessLog: processLog // Send the user's process log to be saved together with AI response
        })
      });

      const responseData = await response.json();
      
      if (responseData.success) {
        setConversation(prev => [...prev, responseData.data.conversation]);
        
        // Update local session state
        // Both user and AI process logs are saved by the chat API to avoid race conditions
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

  const handleAnalyzeStage = async () => {
    if (!session || !scenario) return;
    
    setIsAnalyzing(true);
    const currentStageId = scenario.stages[session.currentStage].id;
    
    try {
      const evaluateResponse = await fetch('/api/pbl/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          stageId: currentStageId,
          language: i18n.language
        })
      });
      
      if (evaluateResponse.ok) {
        const evaluationData = await evaluateResponse.json();
        console.log('Stage analysis data:', evaluationData.data.stageResult);
        setStageAnalysis(evaluationData.data.stageResult);
        
        // Update session with the new stage result but DON'T mark as completed yet
        setSession(prev => {
          if (!prev) return null;
          
          // Find and replace existing stage result or add new one
          const updatedStageResults = [...(prev.stageResults || [])];
          const existingIndex = updatedStageResults.findIndex(r => r.stageId === currentStageId);
          
          if (existingIndex >= 0) {
            // Replace existing evaluation
            updatedStageResults[existingIndex] = evaluationData.data.stageResult;
          } else {
            // Add new evaluation
            updatedStageResults.push(evaluationData.data.stageResult);
          }
          
          return {
            ...prev,
            stageResults: updatedStageResults
          };
        });
      } else {
        console.error('Evaluation response not ok:', evaluateResponse.status);
        const errorData = await evaluateResponse.json();
        console.error('Error data:', errorData);
      }
    } catch (error) {
      console.error('Error analyzing stage:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNextTask = async () => {
    if (!session || !scenario || isTransitioning) return;

    const stageIndex = session.currentStage || 0;
    const currentStage = scenario.stages[stageIndex];
    if (!currentStage) return;
    const currentTaskIndex = currentStage.tasks.findIndex(t => t.id === currentTask?.id);
    
    if (currentTaskIndex < currentStage.tasks.length - 1) {
      // Next task in current stage
      setCurrentTask(currentStage.tasks[currentTaskIndex + 1]);
      // Update session with new task index
      if (session) {
        setSession(prev => prev ? {
          ...prev,
          currentTaskIndex: currentTaskIndex + 1
        } : null);
      }
    } else if (session.currentStage < scenario.stages.length - 1) {
      // Check if current stage is the last task and needs analysis
      if (currentTask && currentStage && 
          currentTask.id === currentStage.tasks[currentStage.tasks.length - 1].id &&
          !stageAnalysis) {
        // Alert user they need to analyze the stage first
        alert(t('learn.analyzeRequired'));
        return;
      }
      
      // Set transitioning state immediately
      setIsTransitioning(true);
      
      // Save current progress before moving to next stage
      await saveProgress();
      
      // Move to next stage - complete current stage session first
      const newStageIndex = session.currentStage + 1;
      
      // Mark current stage session as completed (non-blocking)
      if (session) {
        // Complete the session in the background
        fetch(`/api/pbl/sessions/${session.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete' })
        })
        .then(() => console.log(`Stage ${session.currentStage} session completed`))
        .catch(error => console.error('Error completing stage session:', error));
      }
      
      // Update progress in localStorage before clearing session
      const updatedCompletedStages = [...(session.progress.completedStages || [])];
      if (!updatedCompletedStages.includes(session.currentStage)) {
        updatedCompletedStages.push(session.currentStage);
      }
      
      const overallProgress = {
        scenarioId,
        completedStages: updatedCompletedStages,
        currentStage: newStageIndex
      };
      localStorage.setItem(`pbl-progress-${scenarioId}`, JSON.stringify(overallProgress));
      
      // Clear current session and conversation for new stage
      setSession(null);
      setConversation([]);
      setCurrentTask(scenario.stages[newStageIndex].tasks[0]);
      setStageAnalysis(null); // Clear stage analysis for new stage
      setCurrentLogId(null); // Clear log ID for new stage
      setIsTransitioning(false); // Reset transitioning state
      
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

    // Set transitioning state for visual feedback
    setIsTransitioning(true);

    // Save final progress before completing
    await saveProgress();

    // Navigate immediately
    router.push(`/pbl/scenarios/${scenarioId}/complete`);

    // Complete the session in the background
    fetch(`/api/pbl/sessions/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' })
    })
    .then(() => console.log('Scenario completed successfully'))
    .catch(error => console.error('Error completing scenario:', error));
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

  // Get the actual stage index based on current task
  const actualStageIndex = scenario.stages.findIndex(stage => 
    stage.tasks.some(task => task.id === currentTask?.id)
  );
  const stageIndex = actualStageIndex >= 0 ? actualStageIndex : (session?.currentStage || 0);
  const currentStage = scenario.stages[stageIndex];
  const completedStages = session?.progress?.completedStages || [];
  const progress = scenario ? ((completedStages.length / scenario.stages.length) * 100) : 0;

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
            <div className="flex items-center gap-8 flex-1">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {scenario.title}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentStage.name} - {currentTask?.title}
                </p>
              </div>
              
              {/* Progress Bar - Horizontal with title */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  {/* Stage indicators with names */}
                  <div className="flex items-center flex-1">
                    {scenario.stages.map((stage, index) => (
                      <div key={stage.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div 
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                              completedStages.includes(index)
                                ? 'bg-green-500 text-white' // Completed
                                : index === stageIndex
                                ? 'bg-blue-600 text-white ring-4 ring-blue-200 dark:ring-blue-900' // Current
                                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400' // Not started
                            }`}
                          >
                            {completedStages.includes(index) ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              index + 1
                            )}
                          </div>
                          <span className={`text-xs mt-1 whitespace-nowrap ${
                            index === stageIndex 
                              ? 'text-blue-600 dark:text-blue-400 font-medium' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {stage.name}
                          </span>
                        </div>
                        {index < scenario.stages.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 ${completedStages.includes(index) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Progress percentage */}
                  <span className="ml-4 text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push('/pbl')}
              className="ml-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
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
              
              {/* Stage Analysis Results - Always show template, populate when data exists */}
              <div className="mt-6 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-800 shadow-md">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t('learn.stageAnalysisResults')}
                </h3>
                
                {stageAnalysis ? (
                  <div className="space-y-4">
                    {/* Overall Score */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('learn.overallScore')}</span>
                        <div className="text-right">
                          <span className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                            {stageAnalysis.score}%
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            {(stageAnalysis.score ?? 0) >= 80 ? t('learn.excellent') : 
                             (stageAnalysis.score ?? 0) >= 60 ? t('learn.good') : t('learn.needsImprovement')}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Domain Scores */}
                    {stageAnalysis.domainScores && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">AI Literacy Domains</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(stageAnalysis.domainScores).map(([domain, score]) => (
                            <div key={domain} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                {domain.replace(/_/g, ' ')}
                              </span>
                              <span className={`text-lg font-bold ${
                                score >= 70 ? 'text-green-600 dark:text-green-400' :
                                score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* KSA Achievement */}
                    {stageAnalysis.ksaAchievement && Object.keys(stageAnalysis.ksaAchievement).length > 0 && (
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t('learn.ksaBreakdown')}</h4>
                        <div className="grid grid-cols-4 gap-2">
                          {Object.entries(stageAnalysis.ksaAchievement).map(([ksa, achievement]) => (
                            <div key={ksa} className={`text-center p-2 rounded-lg ${
                              ksa.startsWith('K') ? 'bg-blue-50 dark:bg-blue-900/20' :
                              ksa.startsWith('S') ? 'bg-green-50 dark:bg-green-900/20' :
                              'bg-purple-50 dark:bg-purple-900/20'
                            }`}>
                              <div className="text-xs font-medium text-gray-600 dark:text-gray-400">{ksa}</div>
                              <div className={`text-lg font-bold ${
                                ksa.startsWith('K') ? 'text-blue-600 dark:text-blue-400' :
                                ksa.startsWith('S') ? 'text-green-600 dark:text-green-400' :
                                'text-purple-600 dark:text-purple-400'
                              }`}>
                                {achievement.score}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Strengths */}
                    {stageAnalysis.feedback?.strengths && stageAnalysis.feedback.strengths.length > 0 && (
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          {t('learn.strengths')}
                        </h4>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {stageAnalysis.feedback.strengths.map((strength: string, i: number) => {
                            // Extract KSA codes from the strength text (e.g., "Good effort (K1.1, S2.1)")
                            const ksaMatch = strength.match(/\(([^)]+)\)/);
                            const text = strength.replace(/\s*\([^)]+\)/, '');
                            const ksaCodes = ksaMatch ? ksaMatch[1].split(',').map(code => code.trim()) : [];
                            
                            return (
                              <li key={i} className="flex items-start">
                                <span className="text-green-500 mr-2">•</span>
                                <span className="flex-1">
                                  {text}
                                  {ksaCodes.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                      ({ksaCodes.map((code, idx) => (
                                        <span key={idx} className="inline-flex items-center">
                                          <span className="font-medium text-green-600 dark:text-green-400">{code}</span>
                                          {idx < ksaCodes.length - 1 && ', '}
                                        </span>
                                      ))})
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {/* Improvements */}
                    {stageAnalysis.feedback?.improvements && stageAnalysis.feedback.improvements.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          {t('learn.improvements', '需要改進')}
                        </h4>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {stageAnalysis.feedback.improvements.map((improvement: string, i: number) => {
                            // Extract KSA codes from the improvement text
                            const ksaMatch = improvement.match(/\(([^)]+)\)/);
                            const text = improvement.replace(/\s*\([^)]+\)/, '');
                            const ksaCodes = ksaMatch ? ksaMatch[1].split(',').map(code => code.trim()) : [];
                            
                            return (
                              <li key={i} className="flex items-start">
                                <span className="text-amber-500 mr-2">•</span>
                                <span className="flex-1">
                                  {text}
                                  {ksaCodes.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                      ({ksaCodes.map((code, idx) => (
                                        <span key={idx} className="inline-flex items-center">
                                          <span className="font-medium text-amber-600 dark:text-amber-400">{code}</span>
                                          {idx < ksaCodes.length - 1 && ', '}
                                        </span>
                                      ))})
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    
                    {/* Suggestions */}
                    {stageAnalysis.feedback?.nextSteps && stageAnalysis.feedback.nextSteps.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          {t('learn.suggestions')}
                        </h4>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          {stageAnalysis.feedback.nextSteps.map((step: string, i: number) => {
                            // Extract KSA codes from the suggestion text
                            const ksaMatch = step.match(/\(([^)]+)\)/);
                            const text = step.replace(/\s*\([^)]+\)/, '');
                            const ksaCodes = ksaMatch ? ksaMatch[1].split(',').map(code => code.trim()) : [];
                            
                            return (
                              <li key={i} className="flex items-start">
                                <span className="text-blue-500 mr-2">•</span>
                                <span className="flex-1">
                                  {text}
                                  {ksaCodes.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                      ({ksaCodes.map((code, idx) => (
                                        <span key={idx} className="inline-flex items-center">
                                          <span className="font-medium text-blue-600 dark:text-blue-400">{code}</span>
                                          {idx < ksaCodes.length - 1 && ', '}
                                        </span>
                                      ))})
                                    </span>
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      {t('learn.noAnalysisYet')}
                    </p>
                  </div>
                )}
                
              </div>
            </div>
          </div>

          {/* Conversation Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Conversation Logs Dropdown */}
            {existingLogs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="conversation-logs" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Conversation Logs
                  </label>
                  <select
                    id="conversation-logs"
                    value={currentLogId || ''}
                    onChange={(e) => {
                      if (e.target.value) {
                        loadLogConversation(e.target.value);
                      }
                    }}
                    className="flex-1 ml-4 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a conversation log...</option>
                    {existingLogs.map((log) => (
                      <option key={log.sessionId} value={log.sessionId}>
                        {new Date(log.createdAt).toLocaleString()} - {log.metadata.conversationCount} messages ({Math.round(log.metadata.timeSpent / 60)}m)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            
            {/* Chat Interface */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md h-[calc(100vh-350px)] min-h-[400px] flex flex-col">
              {/* Log filename header with New Conversation button */}
              <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  {currentLogId ? (
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-mono">{currentLogId}.json</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>New Conversation</span>
                    </div>
                  )}
                  
                  {/* New Conversation Button - Show different states */}
                  {(currentLogId || conversation.length > 0) && (
                    <div className="relative group">
                      <button
                        onClick={() => {
                          // Confirm before clearing if there's an active conversation
                          if (conversation.length > 0 && !currentLogId) {
                            if (!confirm('Start a new conversation? Current conversation will be cleared.')) {
                              return;
                            }
                          }
                          // Clear loaded session data
                          setSession(null);
                          setConversation([]);
                          setCurrentLogId(null);
                          setStageAnalysis(null);
                          console.log('Starting new conversation');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-all duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>New</span>
                      </button>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                        {currentLogId ? 'Start fresh conversation' : 'Clear current chat and start over'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
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
            <div className="mt-4 flex justify-between items-center">
              {/* Stage Analysis Info */}
              {stageAnalysis && (
                <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{t('learn.stageAnalyzed')}</span>
                  {/* Show re-analyze hint if conversation continued */}
                  {conversation.filter(msg => msg.role === 'user').length > 
                    (stageAnalysis.performanceMetrics?.interactionCount || 0) && (
                    <span className="ml-1 text-xs text-gray-500">
                      ({t('learn.reanalyzeAvailable', '可重新分析')})
                    </span>
                  )}
                </div>
              )}
              {!stageAnalysis && <div></div>}
              
              <div className="flex gap-2">
                {/* Show analyze button if AI has responded and (not analyzed OR conversation continued after analysis) */}
                {session && conversation.some(msg => msg.role === 'ai') && (
                  !stageAnalysis || 
                  (stageAnalysis && conversation.filter(msg => msg.role === 'user').length > 
                    (stageAnalysis.performanceMetrics?.interactionCount || 0))
                ) && (
                  <button
                    onClick={handleAnalyzeStage}
                    disabled={isAnalyzing || !session}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isAnalyzing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {t('learn.analyzing')}
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        {t('learn.analyzeStage')}
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleNextTask}
                  disabled={!session || isTransitioning || !!(
                    // Disable if it's the last task of a stage and not analyzed
                    currentTask && currentStage && 
                    currentTask.id === currentStage.tasks[currentStage.tasks.length - 1].id &&
                    session.currentStage < scenario.stages.length - 1 &&
                    !stageAnalysis
                  )}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isTransitioning ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </>
                  ) : (
                    session && session.currentStage === scenario.stages.length - 1 && 
                    currentTask?.id === currentStage.tasks[currentStage.tasks.length - 1].id
                      ? t('learn.completeScenario')
                      : t('learn.nextTask')
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}