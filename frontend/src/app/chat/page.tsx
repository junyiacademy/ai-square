'use client';

import { useState, useRef, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical, MessageCircle, BookOpen, Send, Sparkles, Brain, Lightbulb, Code, Users, Shield } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Header } from '@/components/layout/Header'

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
  
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load user and chat sessions on mount
  useEffect(() => {
    loadUserAndSessions();
  }, []);

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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat History
                  </h2>
                  {currentUser && (
                    <button
                      onClick={() => {
                        setMessages([]);
                        setSelectedChat(null);
                        setSessionId(null);
                      }}
                      className="p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                      title="New Chat"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
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
                className="absolute top-4 right-2 p-1.5 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-all duration-200 z-10"
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
                          <div className="whitespace-pre-wrap">{msg.content}</div>
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
                  {/* Quick Actions */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      Quick Actions
                    </h3>
                    <div className="space-y-2">
                      <button className="w-full text-left p-2 text-sm rounded hover:bg-white/50 transition-colors">
                        💡 Explain this concept simply
                      </button>
                      <button className="w-full text-left p-2 text-sm rounded hover:bg-white/50 transition-colors">
                        🔍 Give me real-world examples
                      </button>
                      <button className="w-full text-left p-2 text-sm rounded hover:bg-white/50 transition-colors">
                        📝 Create a practice exercise
                      </button>
                    </div>
                  </div>
                  
                  {/* AI Literacy Topics */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Brain className="w-4 h-4 text-blue-500" />
                      AI Literacy Topics
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2 hover:text-blue-600 cursor-pointer">
                        <Code className="w-4 h-4 mt-0.5 text-blue-400" />
                        <span>How AI Models Learn</span>
                      </li>
                      <li className="flex items-start gap-2 hover:text-blue-600 cursor-pointer">
                        <Users className="w-4 h-4 mt-0.5 text-blue-400" />
                        <span>AI in Society & Ethics</span>
                      </li>
                      <li className="flex items-start gap-2 hover:text-blue-600 cursor-pointer">
                        <Shield className="w-4 h-4 mt-0.5 text-blue-400" />
                        <span>AI Safety & Reliability</span>
                      </li>
                      <li className="flex items-start gap-2 hover:text-blue-600 cursor-pointer">
                        <Lightbulb className="w-4 h-4 mt-0.5 text-blue-400" />
                        <span>Creative AI Applications</span>
                      </li>
                    </ul>
                  </div>
                  
                  {/* Suggested Learning Path */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-green-500" />
                      Your Learning Path
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-200 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">AI Fundamentals</div>
                          <div className="text-xs text-gray-500">Understanding basic concepts</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">Machine Learning Basics</div>
                          <div className="text-xs text-gray-500">How machines learn from data</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">AI Applications</div>
                          <div className="text-xs text-gray-500">Real-world use cases</div>
                        </div>
                      </div>
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