"use client";

/**
 * Chat Page
 *
 * AI-powered chat interface for learning assistance.
 * Refactored to use extracted components and hooks for maintainability.
 * Original file: 1885 lines -> Target: < 500 lines
 */

import { Suspense, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Brain,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { useChatState } from "@/hooks/use-chat-state";

// Extracted components
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ResourcePanel } from "@/components/chat/ResourcePanel";

function ChatPageContent() {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const {
    // State
    messages,
    message,
    chatSessions,
    selectedChat,
    currentUser,
    isLoading,
    isSending,
    isTyping,
    userProgress,
    pblHistory,
    showScrollButton,
    dropdownOpen,
    mobileActiveTab,

    // Refs
    leftPanelRef,
    rightPanelRef,
    messagesContainerRef,
    messageEndRef,
    textareaRef,

    // Setters
    setMessage,
    setDropdownOpen,
    setMobileActiveTab,

    // Actions
    handleSendMessage,
    handleKeyDown,
    loadChatSession,
    startNewChat,
    deleteSession,
    scrollToBottom,
    getContextualQuickActions,
  } = useChatState();

  const toggleLeftPanel = () => {
    const panel = leftPanelRef.current;
    if (panel) {
      if (leftPanelCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
      setLeftPanelCollapsed(!leftPanelCollapsed);
    }
  };

  const toggleRightPanel = () => {
    const panel = rightPanelRef.current;
    if (panel) {
      if (rightPanelCollapsed) {
        panel.expand();
      } else {
        panel.collapse();
      }
      setRightPanelCollapsed(!rightPanelCollapsed);
    }
  };

  const quickActions = getContextualQuickActions();

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      <div className="sticky top-0 z-50">
        <Header />
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col flex-1 overflow-hidden">
        <MobileTabBar
          activeTab={mobileActiveTab}
          onTabChange={setMobileActiveTab}
        />

        <div className="flex-1 overflow-hidden">
          {mobileActiveTab === "history" && (
            <ChatSidebar
              sessions={chatSessions}
              selectedChat={selectedChat}
              isLoading={isLoading}
              currentUser={currentUser}
              dropdownOpen={dropdownOpen}
              onNewChat={startNewChat}
              onLoadSession={loadChatSession}
              onDeleteSession={deleteSession}
              onToggleDropdown={setDropdownOpen}
            />
          )}

          {mobileActiveTab === "chat" && (
            <div className="flex flex-col h-full">
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
          )}

          {mobileActiveTab === "resources" && (
            <ResourcePanel
              currentUser={currentUser}
              assessmentResult={null}
              userProgress={userProgress}
              pblHistory={pblHistory}
              recommendedScenarios={[]}
            />
          )}
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <PanelGroup direction="horizontal">
          {/* Left Sidebar - Chat History */}
          <Panel
            ref={leftPanelRef}
            defaultSize={20}
            minSize={0}
            maxSize={30}
            collapsible={true}
            onCollapse={() => setLeftPanelCollapsed(true)}
            onExpand={() => setLeftPanelCollapsed(false)}
          >
            <ChatSidebar
              sessions={chatSessions}
              selectedChat={selectedChat}
              isLoading={isLoading}
              currentUser={currentUser}
              dropdownOpen={dropdownOpen}
              onNewChat={startNewChat}
              onLoadSession={loadChatSession}
              onDeleteSession={deleteSession}
              onToggleDropdown={setDropdownOpen}
            />
          </Panel>

          {/* Left Resize Handle */}
          <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-blue-400 transition-colors duration-200 relative group">
            <button
              onClick={toggleLeftPanel}
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full shadow-md border border-gray-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {leftPanelCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-gray-600" />
              )}
            </button>
            <GripVertical className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-3 text-gray-400" />
          </PanelResizeHandle>

          {/* Main Chat Area */}
          <Panel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col bg-white/50 backdrop-blur-sm">
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

          {/* Right Resize Handle */}
          <PanelResizeHandle className="w-1.5 bg-gray-100 hover:bg-blue-400 transition-colors duration-200 relative group">
            <button
              onClick={toggleRightPanel}
              className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full shadow-md border border-gray-200 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {rightPanelCollapsed ? (
                <ChevronLeft className="w-3 h-3 text-gray-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-600" />
              )}
            </button>
            <GripVertical className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-3 text-gray-400" />
          </PanelResizeHandle>

          {/* Right Sidebar - Resources */}
          <Panel
            ref={rightPanelRef}
            defaultSize={20}
            minSize={0}
            maxSize={30}
            collapsible={true}
            onCollapse={() => setRightPanelCollapsed(true)}
            onExpand={() => setRightPanelCollapsed(false)}
          >
            <ResourcePanel
              currentUser={currentUser}
              assessmentResult={null}
              userProgress={userProgress}
              pblHistory={pblHistory}
              recommendedScenarios={[]}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}

// Mobile Tab Bar Component
interface MobileTabBarProps {
  activeTab: "history" | "chat" | "resources";
  onTabChange: (tab: "history" | "chat" | "resources") => void;
}

function MobileTabBar({ activeTab, onTabChange }: MobileTabBarProps) {
  const tabs = [
    { id: "history" as const, label: "History", icon: "clock" },
    { id: "chat" as const, label: "Chat", icon: "chat" },
    { id: "resources" as const, label: "Resources", icon: "book" },
  ];

  return (
    <div className="flex border-b border-gray-200 bg-white">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// Main Export
export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center">
          <Brain className="w-12 h-12 text-blue-500 animate-pulse" />
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
