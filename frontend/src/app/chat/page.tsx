'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical, MessageCircle, BookOpen } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Header } from '@/components/layout/Header';
import { authenticatedFetch } from '@/lib/utils/authenticated-fetch';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { ResourcePanel } from '@/components/chat/ResourcePanel';
import type {
  ChatSession,
  ChatMessage,
  AssessmentResult,
  UserProgress,
  PBLHistory,
  RecommendedScenario,
  QuickAction,
  User,
} from '@/types/chat';

type MobileTab = 'history' | 'chat' | 'resources';

function ChatPageContent() {
  const searchParams = useSearchParams();
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [assessmentResult] = useState<AssessmentResult | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [recommendedScenarios] = useState<RecommendedScenario[]>([]);
  const [pblHistory, setPblHistory] = useState<PBLHistory[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('chat');
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);

  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserAndSessions();
  }, []);

  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('session');
    if (sessionIdFromUrl && sessionIdFromUrl !== sessionId && currentUser) {
      loadChatSession(sessionIdFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadUserAssessmentAndProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    setQuickActions(getContextualQuickActions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  useEffect(() => {
    if (!isTyping) {
      setQuickActions(getContextualQuickActions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping]);

  useEffect(() => {
    const handleClickOutside = () => {
      if (dropdownOpen) {
        setDropdownOpen(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  const loadUserAndSessions = async () => {
    try {
      const authResponse = await authenticatedFetch('/api/auth/check');
      const authData = await authResponse.json();

      if (!authData.authenticated) {
        setIsLoading(false);
        return;
      }

      setCurrentUser(authData.user);

      const response = await authenticatedFetch('/api/chat/sessions', {
        headers: {
          'x-user-info': JSON.stringify(authData.user),
        },
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
      if (currentUser) {
        try {
          const response = await authenticatedFetch('/api/pbl/history');
          const data = await response.json();

          if (data.success && data.history) {
            const history: PBLHistory[] = data.history.map((item: {
              scenario_id: string;
              scenario_title?: string;
              completed_at: string;
              overall_score?: number;
              domain?: string;
              time_spent?: number;
            }) => ({
              scenarioId: item.scenario_id,
              scenarioTitle: item.scenario_title || 'Unknown Scenario',
              completedAt: item.completed_at,
              score: item.overall_score || 0,
              domain: item.domain || 'General',
              timeSpent: item.time_spent || 0,
            }));
            setPblHistory(history);

            setUserProgress({
              completedScenarios: history.length,
              totalScenarios: 12,
              learningHours: history.reduce((acc, h) => acc + h.timeSpent / 60, 0),
              currentStreak: calculateStreak(history),
            });
          }
        } catch (error) {
          console.error('Failed to load PBL history:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load assessment and progress:', error);
    }
  };

  const calculateStreak = (history: PBLHistory[]): number => {
    if (history.length === 0) return 0;

    const sorted = [...history].sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sorted.length; i++) {
      const completedDate = new Date(sorted[i].completedAt);
      completedDate.setHours(0, 0, 0, 0);

      const daysDiff = Math.floor(
        (today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const loadChatSession = async (sessionId: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedFetch(`/api/chat/sessions/${sessionId}`, {
        headers: {
          'x-user-info': JSON.stringify(currentUser),
        },
      });
      const data = await response.json();
      setMessages(data.messages || []);
      setSelectedChat(sessionId);
      setSessionId(sessionId);

      const newUrl = `/chat?session=${sessionId}`;
      window.history.pushState({}, '', newUrl);
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
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessage('');
    setIsSending(true);
    setIsTyping(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const response = await authenticatedFetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify(currentUser),
        },
        body: JSON.stringify({
          message: message,
          sessionId: sessionId,
          context: {},
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsTyping(false);
        const assistantMessage: ChatMessage = {
          id: `${Date.now()}-assistant`,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (!sessionId && data.sessionId) {
          setSessionId(data.sessionId);
          setSelectedChat(data.sessionId);

          const newUrl = `/chat?session=${data.sessionId}`;
          window.history.pushState({}, '', newUrl);

          await loadUserAndSessions();
        } else if (data.title) {
          setChatSessions((prev) =>
            prev.map((session) =>
              session.id === sessionId ? { ...session, title: data.title } : session
            )
          );
        }
      } else {
        setIsTyping(false);
        const errorMessage: ChatMessage = {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      const errorMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getContextualQuickActions = (): QuickAction[] => {
    const defaultActions: QuickAction[] = [
      { icon: '💡', label: 'Explain simply', prompt: 'Can you explain this concept in simple terms?' },
      { icon: '🔍', label: 'Examples', prompt: 'Can you give me real-world examples?' },
      { icon: '📝', label: 'Practice', prompt: 'Can you create a practice exercise for me?' },
      { icon: '🎯', label: 'What next?', prompt: 'What should I learn next based on my progress?' },
    ];

    if (messages.length === 0) {
      return [
        { icon: '👋', label: 'Get started', prompt: 'Hi! Can you help me understand my current AI literacy level?' },
        { icon: '🎯', label: 'Learning goals', prompt: 'What should I focus on based on my assessment results?' },
        { icon: '📚', label: 'Recommend scenarios', prompt: 'Which PBL scenarios would you recommend for me?' },
        { icon: '❓', label: 'How it works', prompt: 'How does AI Square help me improve my AI literacy?' },
      ];
    }

    return defaultActions;
  };

  const deleteSession = async (sessionId: string) => {
    if (!currentUser) return;

    try {
      const response = await authenticatedFetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-info': JSON.stringify(currentUser),
        },
      });

      if (response.ok) {
        setChatSessions((prev) => prev.filter((session) => session.id !== sessionId));

        if (selectedChat === sessionId) {
          setMessages([]);
          setSelectedChat(null);
          setSessionId(null);
          window.history.pushState({}, '', '/chat');
        }
      } else {
        console.error('Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }

    setDropdownOpen(null);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedChat(null);
    setSessionId(null);
    window.history.pushState({}, '', '/chat');
    setMobileActiveTab('chat');
  };

  const handleLoadSession = (sessionId: string) => {
    loadChatSession(sessionId);
    setMobileActiveTab('chat');
  };

  const renderMobileLayout = () => (
    <div className="flex flex-col h-screen">
      <Header />

      <div className="flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-50 relative">
        <div className={`absolute inset-0 ${mobileActiveTab === 'history' ? 'block' : 'hidden'}`}>
          <ChatSidebar
            sessions={chatSessions}
            selectedChat={selectedChat}
            isLoading={isLoading}
            currentUser={currentUser}
            dropdownOpen={dropdownOpen}
            onNewChat={handleNewChat}
            onLoadSession={handleLoadSession}
            onDeleteSession={deleteSession}
            onToggleDropdown={setDropdownOpen}
          />
        </div>

        <div className={`absolute inset-0 ${mobileActiveTab === 'chat' ? 'block' : 'hidden'}`}>
          <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-sm">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">
                  AI Assistant
                  {sessionId && chatSessions.find((s) => s.id === sessionId)?.title
                    ? ` - ${chatSessions.find((s) => s.id === sessionId)?.title}`
                    : ''}
                </h1>
                <a
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Dashboard
                </a>
              </div>
            </div>

            <ChatMessages
              messages={messages}
              isTyping={isTyping}
              currentUser={currentUser}
              showScrollButton={showScrollButton}
              messagesContainerRef={messagesContainerRef}
              messageEndRef={messageEndRef}
              onScrollToBottom={scrollToBottom}
            />

            <ChatInput
              message={message}
              isSending={isSending}
              currentUser={currentUser}
              quickActions={quickActions}
              textareaRef={textareaRef}
              onMessageChange={setMessage}
              onSend={handleSendMessage}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        <div className={`absolute inset-0 ${mobileActiveTab === 'resources' ? 'block' : 'hidden'}`}>
          <ResourcePanel
            currentUser={currentUser}
            assessmentResult={assessmentResult}
            userProgress={userProgress}
            pblHistory={pblHistory}
            recommendedScenarios={recommendedScenarios}
          />
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-center items-center space-x-8">
          <button
            onClick={() => setMobileActiveTab('history')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              mobileActiveTab === 'history'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MessageCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">History</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('chat')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              mobileActiveTab === 'chat'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span className="text-xs font-medium">Chat</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('resources')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
              mobileActiveTab === 'resources'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">Resources</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderDesktopLayout = () => (
    <div className="flex flex-col h-screen">
      <Header />
      <div className="flex flex-1 overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <PanelGroup direction="horizontal" className="flex-1">
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
            <ChatSidebar
              sessions={chatSessions}
              selectedChat={selectedChat}
              isLoading={isLoading}
              currentUser={currentUser}
              dropdownOpen={dropdownOpen}
              onNewChat={handleNewChat}
              onLoadSession={loadChatSession}
              onDeleteSession={deleteSession}
              onToggleDropdown={setDropdownOpen}
            />
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
          </Panel>

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

          <Panel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col bg-white/95 backdrop-blur-sm shadow-sm">
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold text-gray-900">
                    AI Assistant
                    {sessionId && chatSessions.find((s) => s.id === sessionId)?.title
                      ? ` - ${chatSessions.find((s) => s.id === sessionId)?.title}`
                      : ''}
                  </h1>
                  <a
                    href="/dashboard"
                    className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back to Dashboard
                  </a>
                </div>
              </div>

              <ChatMessages
                messages={messages}
                isTyping={isTyping}
                currentUser={currentUser}
                showScrollButton={showScrollButton}
                messagesContainerRef={messagesContainerRef}
                messageEndRef={messageEndRef}
                onScrollToBottom={scrollToBottom}
              />

              <ChatInput
                message={message}
                isSending={isSending}
                currentUser={currentUser}
                quickActions={quickActions}
                textareaRef={textareaRef}
                onMessageChange={setMessage}
                onSend={handleSendMessage}
                onKeyDown={handleKeyDown}
              />
            </div>
          </Panel>

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
            <ResourcePanel
              currentUser={currentUser}
              assessmentResult={assessmentResult}
              userProgress={userProgress}
              pblHistory={pblHistory}
              recommendedScenarios={recommendedScenarios}
            />
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
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );

  return (
    <>
      <div className="block md:hidden">{renderMobileLayout()}</div>
      <div className="hidden md:block">{renderDesktopLayout()}</div>
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
