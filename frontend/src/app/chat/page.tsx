'use client';

import { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical, MessageCircle, BookOpen, Send, Sparkles, Brain, Lightbulb, Code, Users, Shield } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Header } from '@/components/layout/Header';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AssessmentResult {
  overallScore: number;
  domainScores: { [key: string]: number };
  weakDomains?: string[];
}

interface UserProgress {
  completedScenarios: number;
  totalScenarios: number;
  learningHours: number;
  currentStreak: number;
}

interface PBLHistory {
  scenarioId: string;
  scenarioTitle: string;
  completedAt: string;
  score: number;
  domain: string;
  timeSpent: number;
}

interface RecommendedScenario {
  id: string;
  title: string;
  difficulty: string;
  domain: string;
  reason: string;
  estimatedTime: number;
}

export default function ChatPage() {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [recommendedScenarios, setRecommendedScenarios] = useState<RecommendedScenario[]>([]);
  const [pblHistory, setPblHistory] = useState<PBLHistory[]>([]);
  
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user and chat sessions on mount
  useEffect(() => {
    loadUserAndSessions();
  }, []);
  
  // Load assessment and progress when user is loaded
  useEffect(() => {
    if (currentUser) {
      loadUserAssessmentAndProgress();
    }
  }, [currentUser]);

  // Auto-scroll to latest message
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  const loadUserAndSessions = async () => {
    try {
      // First check if user is authenticated
      const authResponse = await fetch('/api/auth/check');
      const authData = await authResponse.json();
      
      if (!authData.authenticated) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUser(authData.user);
      
      // Then load chat sessions
      const response = await fetch('/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(authData.user)
        }
      });
      const data = await response.json();
      setChatSessions(data.sessions || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load user and sessions:', error);
      setIsLoading(false);
    }
  };
  
  const loadUserAssessmentAndProgress = async () => {
    try {
      // Load assessment result from localStorage
      const resultStr = localStorage.getItem('assessmentResult');
      if (resultStr) {
        const result = JSON.parse(resultStr) as AssessmentResult;
        setAssessmentResult(result);
      }
      
      // Load PBL history if user is logged in
      if (currentUser) {
        try {
          const response = await fetch('/api/pbl/history');
          const data = await response.json();
          
          if (data.success && data.history) {
            // Transform history data
            const history: PBLHistory[] = data.history.map((item: any) => ({
              scenarioId: item.scenario_id,
              scenarioTitle: item.scenario_title || 'Unknown Scenario',
              completedAt: item.completed_at,
              score: item.overall_score || 0,
              domain: item.domain || 'General',
              timeSpent: item.time_spent || 0
            }));
            setPblHistory(history);
            
            // Update progress based on actual data
            setUserProgress({
              completedScenarios: history.length,
              totalScenarios: 12, // This should come from API
              learningHours: history.reduce((acc, h) => acc + (h.timeSpent / 60), 0),
              currentStreak: calculateStreak(history)
            });
          }
        } catch (error) {
          console.error('Failed to load PBL history:', error);
        }
      }
      
      // Generate recommendations after loading all data
      if (resultStr) {
        const result = JSON.parse(resultStr) as AssessmentResult;
        generateRecommendations(result);
      }
    } catch (error) {
      console.error('Failed to load assessment and progress:', error);
    }
  };
  
  const calculateStreak = (history: PBLHistory[]): number => {
    if (history.length === 0) return 0;
    
    // Sort by date
    const sorted = [...history].sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sorted.length; i++) {
      const completedDate = new Date(sorted[i].completedAt);
      completedDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  };

  const generateRecommendations = async (result: AssessmentResult) => {
    try {
      // Fetch actual scenarios from API
      const response = await fetch('/api/pbl/scenarios?lang=en');
      const data = await response.json();
      
      if (!data.success || !data.data.scenarios) {
        console.error('Failed to fetch scenarios');
        return;
      }
      
      const scenarios = data.data.scenarios;
      const recommendations: RecommendedScenario[] = [];
      const addedScenarioIds = new Set<string>();
      
      // Get completed scenario IDs
      const completedIds = new Set(pblHistory.map(h => h.scenarioId));
      
      // Find weak domains (score < 60)
      const weakDomains = Object.entries(result.domainScores)
        .filter(([_, score]) => score < 60)
        .map(([domain, _]) => domain);
      
      // For each weak domain, find appropriate scenarios
      weakDomains.forEach(domain => {
        const domainKey = domain.replace('_', ' ');
        
        // Filter scenarios for this domain
        const domainScenarios = scenarios.filter((s: any) => 
          !completedIds.has(s.id) && // Exclude completed scenarios
          !addedScenarioIds.has(s.id) && // Avoid duplicates
          (s.domains?.includes(domain) || s.domains?.includes(domainKey) ||
          s.targetDomain?.includes(domain) || s.targetDomain?.includes(domainKey))
        );
        
        // Prefer beginner/intermediate scenarios for weak domains
        const appropriateScenarios = domainScenarios
          .filter((s: any) => s.difficulty === 'beginner' || s.difficulty === 'intermediate')
          .slice(0, 1);
        
        appropriateScenarios.forEach((scenario: any) => {
          addedScenarioIds.add(scenario.id);
          recommendations.push({
            id: scenario.id,
            title: scenario.title,
            difficulty: scenario.difficulty,
            domain: domain.replace(/_/g, ' '),
            reason: `Improve your ${domain.replace(/_/g, ' ').toLowerCase()} skills (currently at ${result.domainScores[domain]}%)`,
            estimatedTime: scenario.estimatedDuration || 30
          });
        });
      });
      
      // If user is doing well, recommend advanced scenarios
      if (recommendations.length === 0) {
        const advancedScenarios = scenarios
          .filter((s: any) => 
            !completedIds.has(s.id) && // Exclude completed
            !addedScenarioIds.has(s.id) && // Avoid duplicates
            s.difficulty === 'advanced'
          )
          .slice(0, 2);
        
        advancedScenarios.forEach((scenario: any) => {
          if (!addedScenarioIds.has(scenario.id)) {
            addedScenarioIds.add(scenario.id);
            recommendations.push({
              id: scenario.id,
              title: scenario.title,
              difficulty: scenario.difficulty,
              domain: scenario.domains?.[0] || 'Mixed',
              reason: 'Challenge yourself with advanced concepts',
              estimatedTime: scenario.estimatedDuration || 60
            });
          }
        });
      }
      
      setRecommendedScenarios(recommendations.slice(0, 3));
    } catch (error) {
      console.error('Failed to generate recommendations:', error);
    }
  };

  const loadChatSession = async (sessionId: string) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          'x-user-info': JSON.stringify(currentUser)
        }
      });
      const data = await response.json();
      setMessages(data.messages || []);
      setSelectedChat(sessionId);
      setSessionId(sessionId);
    } catch (error) {
      console.error('Failed to load chat session:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isSending || !currentUser) return;
    
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);
    setIsTyping(true);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify(currentUser)
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          context: {}
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsTyping(false);
        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update session ID if it's a new session
        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          setSelectedChat(data.sessionId);
          
          // Reload sessions to show the new one
          await loadUserAndSessions();
        } else if (data.title) {
          // Update session title in list
          setChatSessions(prev => prev.map(session => 
            session.id === sessionId ? { ...session, title: data.title } : session
          ));
        }
      } else {
        setIsTyping(false);
        // Show error message
        const errorMessage: ChatMessage = {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const getContextualQuickActions = () => {
    const defaultActions = [
      { icon: '💡', label: 'Explain simply', prompt: 'Can you explain this concept in simple terms?' },
      { icon: '🔍', label: 'Examples', prompt: 'Can you give me real-world examples?' },
      { icon: '📝', label: 'Practice', prompt: 'Can you create a practice exercise for me?' },
      { icon: '🎯', label: 'What next?', prompt: 'What should I learn next based on my progress?' }
    ];

    // If no messages yet, return onboarding actions
    if (messages.length === 0) {
      return [
        { icon: '👋', label: 'Get started', prompt: 'Hi! Can you help me understand my current AI literacy level?' },
        { icon: '🎯', label: 'Learning goals', prompt: 'What should I focus on based on my assessment results?' },
        { icon: '📚', label: 'Recommend scenarios', prompt: 'Which PBL scenarios would you recommend for me?' },
        { icon: '❓', label: 'How it works', prompt: 'How does AI Square help me improve my AI literacy?' }
      ];
    }

    // Get last AI message to determine context
    const lastAIMessage = [...messages].reverse().find(m => m.role === 'assistant');
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

    if (!lastAIMessage) return defaultActions;

    const aiContent = lastAIMessage.content.toLowerCase();
    const userContent = lastUserMessage?.content.toLowerCase() || '';

    // Context-specific actions based on conversation
    if (aiContent.includes('scenario') || aiContent.includes('pbl')) {
      return [
        { icon: '🎮', label: 'Start scenario', prompt: 'How do I start this scenario?' },
        { icon: '📊', label: 'Difficulty', prompt: 'Is this scenario appropriate for my level?' },
        { icon: '⏱️', label: 'Time needed', prompt: 'How long will this scenario take?' },
        { icon: '🎯', label: 'Learning goals', prompt: 'What will I learn from this scenario?' }
      ];
    }

    if (aiContent.includes('assessment') || aiContent.includes('score')) {
      return [
        { icon: '📈', label: 'Improve score', prompt: 'How can I improve my assessment score?' },
        { icon: '🎯', label: 'Weak areas', prompt: 'What are my weakest areas I should focus on?' },
        { icon: '📚', label: 'Study plan', prompt: 'Can you create a study plan for me?' },
        { icon: '🔄', label: 'Retake info', prompt: 'When should I retake the assessment?' }
      ];
    }

    if (aiContent.includes('code') || aiContent.includes('programming')) {
      return [
        { icon: '💻', label: 'Show example', prompt: 'Can you show me a code example?' },
        { icon: '🐛', label: 'Debug help', prompt: 'Can you help me debug this?' },
        { icon: '📝', label: 'Best practices', prompt: 'What are the best practices for this?' },
        { icon: '🔧', label: 'Alternative', prompt: 'Is there a better way to do this?' }
      ];
    }

    if (aiContent.includes('ai') && (aiContent.includes('ethic') || aiContent.includes('bias') || aiContent.includes('fair'))) {
      return [
        { icon: '⚖️', label: 'Ethical concerns', prompt: 'What are the main ethical concerns here?' },
        { icon: '🛡️', label: 'Mitigation', prompt: 'How can we mitigate these risks?' },
        { icon: '📊', label: 'Real cases', prompt: 'Can you share real-world cases about this?' },
        { icon: '🌍', label: 'Impact', prompt: 'What is the societal impact of this?' }
      ];
    }

    // If discussing concepts or theory
    if (userContent.includes('what') || userContent.includes('how') || userContent.includes('why')) {
      return [
        { icon: '🎯', label: 'Deeper dive', prompt: 'Can you explain this in more detail?' },
        { icon: '🔄', label: 'Different way', prompt: 'Can you explain this differently?' },
        { icon: '📊', label: 'Compare', prompt: 'How does this compare to similar concepts?' },
        { icon: '✅', label: 'Check understanding', prompt: 'Can you quiz me on this concept?' }
      ];
    }

    return defaultActions;
  };

  // Store quick actions in state to control when they update
  const [quickActions, setQuickActions] = useState<Array<{icon: string; label: string; prompt: string}>>([]);

  // Initialize quick actions on mount
  useEffect(() => {
    setQuickActions(getContextualQuickActions());
  }, [messages.length]);

  // Update quick actions only after AI response is complete
  useEffect(() => {
    if (!isTyping) {
      setQuickActions(getContextualQuickActions());
    }
  }, [isTyping]);

  return (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <PanelGroup direction="horizontal" className="flex-1">
          {/* Chat History Panel */}
          <Panel
            ref={leftPanelRef}
            defaultSize={20}
            minSize={15}
            maxSize={30}
            collapsible
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
            className="relative"
          >
            <div className="h-full bg-white/95 backdrop-blur-sm border-r border-gray-100 overflow-y-auto shadow-sm relative">
              <div className="p-4">
                <div className="mb-4">
                  {currentUser && (
                    <button
                      onClick={() => {
                        setMessages([]);
                        setSelectedChat(null);
                        setSessionId(null);
                      }}
                      className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      title="New Chat"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-sm font-medium">New Chat</span>
                    </button>
                  )}
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat History
                  </h2>
                </div>
                <div className="space-y-2">
                  {isLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    </div>
                  ) : chatSessions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No previous chats</p>
                    </div>
                  ) : (
                    chatSessions.map((session) => (
                      <div
                        key={session.id}
                        onClick={() => loadChatSession(session.id)}
                        className={`p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedChat === session.id ? 'bg-blue-50 border-blue-200 border' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">{session.title}</div>
                        <div className="text-sm text-gray-500 truncate">{session.last_message}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(session.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              {/* Collapse button */}
              <button
                onClick={() => {
                  if (leftPanelRef.current) {
                    leftPanelRef.current.collapse();
                    setLeftPanelCollapsed(true);
                  }
                }}
                className="absolute top-16 right-2 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10"
                title="Collapse panel"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </Panel>

          {/* Left Resize Handle */}
          <PanelResizeHandle className="relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors group">
            <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-500/10" />
            {!leftPanelCollapsed && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            )}
            {leftPanelCollapsed && (
              <button
                onClick={() => {
                  if (leftPanelRef.current) {
                    leftPanelRef.current.expand();
                    setLeftPanelCollapsed(false);
                  }
                }}
                className="absolute top-20 left-1 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10 shadow-sm"
                title="Expand panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </PanelResizeHandle>

          {/* Main Chat Panel */}
          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-sm">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {!currentUser ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Please log in to start chatting</p>
                      <a href="/login" className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                        Log In
                      </a>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">Start a conversation...</p>
                    </div>
                  ) : (
                    messages.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] p-4 rounded-lg ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                          ) : (
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              <ReactMarkdown 
                                remarkPlugins={[remarkGfm]}
                                components={{
                                // Custom styling for markdown elements
                                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                                li: ({ children }) => <li className="mb-1">{children}</li>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                em: ({ children }) => <em className="italic">{children}</em>,
                                code: ({ children, className }) => {
                                  const isInline = !className;
                                  return isInline ? (
                                    <code className="px-1 py-0.5 bg-gray-200 text-gray-800 rounded text-sm">{children}</code>
                                  ) : (
                                    <code className="block p-3 bg-gray-800 text-gray-100 rounded-lg overflow-x-auto">{children}</code>
                                  );
                                },
                                pre: ({ children }) => <pre className="mb-2">{children}</pre>,
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">{children}</blockquote>
                                ),
                                h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
                                a: ({ children, href }) => (
                                  <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                                    {children}
                                  </a>
                                ),
                              }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="max-w-[70%] p-4 rounded-lg bg-gray-100 text-gray-900">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messageEndRef} />
                </div>
              </div>
              
              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="max-w-3xl mx-auto">
                  {/* Dynamic Quick Actions */}
                  {currentUser && quickActions.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {quickActions.map((action, index) => (
                        <button
                          key={index}
                          onClick={() => setMessage(action.prompt)}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors flex items-center gap-1.5"
                        >
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea
                      ref={textareaRef}
                      value={message}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message... (Shift+Enter for new line)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none overflow-y-auto"
                      rows={1}
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={isSending || !currentUser}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* Right Resize Handle */}
          <PanelResizeHandle className="relative w-1 bg-gray-200 hover:bg-gray-300 transition-colors group">
            <div className="absolute inset-y-0 -left-2 -right-2 group-hover:bg-blue-500/10" />
            {!rightPanelCollapsed && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center">
                <GripVertical className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
              </div>
            )}
            {rightPanelCollapsed && (
              <button
                onClick={() => {
                  if (rightPanelRef.current) {
                    rightPanelRef.current.expand();
                    setRightPanelCollapsed(false);
                  }
                }}
                className="absolute top-20 right-1 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10 shadow-sm"
                title="Expand panel"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </PanelResizeHandle>

          {/* Learning Resources Panel */}
          <Panel
            ref={rightPanelRef}
            defaultSize={30}
            minSize={20}
            maxSize={40}
            collapsible
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
            className="relative"
          >
            <div className="h-full bg-white/95 backdrop-blur-sm border-l border-gray-100 overflow-y-auto shadow-sm relative">
              <div className="p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Learning Resources
                </h2>
                <div className="space-y-4">
                  {/* User Progress Summary */}
                  {currentUser && assessmentResult && (
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-500" />
                        Your AI Literacy Level
                      </h3>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Overall Score</span>
                            <span className="font-medium">{assessmentResult.overallScore}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all"
                              style={{ width: `${assessmentResult.overallScore}%` }}
                            />
                          </div>
                        </div>
                        {userProgress && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-white/50 p-2 rounded">
                              <div className="text-xs text-gray-500">Scenarios</div>
                              <div className="font-medium">{userProgress.completedScenarios}/{userProgress.totalScenarios}</div>
                            </div>
                            <div className="bg-white/50 p-2 rounded">
                              <div className="text-xs text-gray-500">Learning Hours</div>
                              <div className="font-medium">{userProgress.learningHours.toFixed(1)}h</div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Recent PBL Completions */}
                  {pblHistory.length > 0 && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recent Completions
                      </h3>
                      <div className="space-y-2">
                        {pblHistory.slice(0, 3).map((history, index) => (
                          <div key={`${history.scenarioId}-${index}`} className="bg-white/50 p-2 rounded">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900">{history.scenarioTitle}</div>
                                <div className="text-xs text-gray-500">
                                  {new Date(history.completedAt).toLocaleDateString()} • Score: {history.score}%
                                </div>
                              </div>
                              <div className="text-xs text-green-600 font-medium">
                                ✓
                              </div>
                            </div>
                          </div>
                        ))}
                        {userProgress && userProgress.currentStreak > 0 && (
                          <div className="mt-2 text-center text-sm">
                            <span className="text-orange-500">🔥</span> {userProgress.currentStreak} day streak!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Recommended Scenarios */}
                  {recommendedScenarios.length > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-blue-500" />
                        Recommended for You
                      </h3>
                      <div className="space-y-3">
                        {recommendedScenarios.map((scenario, index) => (
                          <a
                            key={scenario.id}
                            href={`/pbl/scenarios/${scenario.id}`}
                            className="block p-3 bg-white rounded-lg hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-900">{scenario.title}</div>
                                <div className="text-xs text-gray-500 mt-1">{scenario.reason}</div>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  <span className="text-gray-400">{scenario.difficulty}</span>
                                  <span className="text-gray-400">•</span>
                                  <span className="text-gray-400">{scenario.estimatedTime} min</span>
                                </div>
                              </div>
                              <div className="text-blue-500 ml-2">
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Learning Resources */}
                  <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      Quick Links
                    </h3>
                    <div className="space-y-2 text-sm">
                      <a href="/assessment" className="flex items-center gap-2 text-amber-700 hover:text-amber-900">
                        <span>📊</span> Take Assessment
                      </a>
                      <a href="/learning-path" className="flex items-center gap-2 text-amber-700 hover:text-amber-900">
                        <span>🗺️</span> View Learning Path
                      </a>
                      <a href="/pbl" className="flex items-center gap-2 text-amber-700 hover:text-amber-900">
                        <span>🎮</span> Browse Scenarios
                      </a>
                      <a href="/dashboard" className="flex items-center gap-2 text-amber-700 hover:text-amber-900">
                        <span>📈</span> Dashboard
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              {/* Collapse button */}
              <button
                onClick={() => {
                  if (rightPanelRef.current) {
                    rightPanelRef.current.collapse();
                    setRightPanelCollapsed(true);
                  }
                }}
                className="absolute top-4 left-2 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10"
                title="Collapse panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}