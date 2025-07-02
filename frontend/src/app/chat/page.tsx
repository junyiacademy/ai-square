'use client';

import { useState, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { ChevronLeft, ChevronRight, GripVertical, MessageCircle, BookOpen, Send } from 'lucide-react';
import type { ImperativePanelHandle } from 'react-resizable-panels';
import { Header } from '@/components/layout/Header'

export default function ChatPage() {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  
  const leftPanelRef = useRef<ImperativePanelHandle>(null);
  const rightPanelRef = useRef<ImperativePanelHandle>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setMessage('');
    
    // TODO: Send to API and get response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'This is a placeholder response. The chat API will be implemented soon.' }]);
    }, 1000);
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Chat History
                </h2>
                <div className="space-y-2">
                  {/* Placeholder chat history items */}
                  <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="font-medium text-gray-900">Previous Chat 1</div>
                    <div className="text-sm text-gray-500 truncate">Last message preview...</div>
                  </div>
                  <div className="p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="font-medium text-gray-900">Previous Chat 2</div>
                    <div className="text-sm text-gray-500 truncate">Another message preview...</div>
                  </div>
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
                  {messages.length === 0 ? (
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
                          {msg.content}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messageEndRef} />
                </div>
              </div>
              
              {/* Input Area */}
              <div className="border-t border-gray-200 p-4">
                <div className="max-w-3xl mx-auto">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
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
                  {/* Placeholder learning resources */}
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Related Topics</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• AI Literacy Fundamentals</li>
                      <li>• Machine Learning Basics</li>
                      <li>• Ethics in AI</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-medium text-gray-900 mb-2">Suggested Reading</h3>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>• Understanding Neural Networks</li>
                      <li>• AI in Education</li>
                      <li>• Future of AI</li>
                    </ul>
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