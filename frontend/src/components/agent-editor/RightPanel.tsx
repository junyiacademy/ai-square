"use client";

import {
  Bot,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Send,
  Upload,
  User,
} from "lucide-react";
import { useRef, useEffect } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface RightPanelProps {
  rightPanelCollapsed: boolean;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  hasChanges: boolean;
  discardChanges: () => void;
  publish: () => Promise<void>;
  isPublishing: boolean;
  chatMessages: ChatMessage[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSendMessage: () => void;
  isProcessing: boolean;
}

export function RightPanel({
  rightPanelCollapsed,
  setRightPanelCollapsed,
  language,
  setLanguage,
  hasChanges,
  discardChanges,
  publish,
  isPublishing,
  chatMessages,
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isProcessing,
}: RightPanelProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  return (
    <div
      className={`${rightPanelCollapsed ? "w-16" : "w-96"} bg-white border-l border-gray-200 transition-all duration-300 flex flex-col overflow-hidden`}
    >
      {/* Action Buttons - Above AI Agent Header */}
      {!rightPanelCollapsed && (
        <div className="flex-shrink-0 p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
          <button
            onClick={() => setLanguage(language === "zh" ? "en" : "zh")}
            className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg transition-all text-xs font-medium border border-gray-200"
          >
            {language === "zh" ? "EN" : "中文"}
          </button>

          {hasChanges && (
            <button
              onClick={discardChanges}
              className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded-lg transition-all text-gray-700 text-xs font-medium border border-gray-200"
            >
              <RotateCcw className="h-3 w-3 inline mr-1" />
              放棄
            </button>
          )}

          <button
            onClick={async () => {
              try {
                await publish();
                alert("發布成功！");
              } catch (error) {
                console.error("Publish failed:", error);
              }
            }}
            disabled={!hasChanges || isPublishing}
            className={`px-4 py-1.5 rounded-lg font-medium transition-all text-xs ${
              hasChanges && !isPublishing
                ? "bg-gradient-to-r from-green-500 to-teal-500 text-white hover:shadow-lg"
                : "bg-gray-200 text-gray-400"
            }`}
          >
            <Upload className="h-3 w-3 inline mr-1" />
            {isPublishing ? "發布中..." : "發布"}
          </button>
        </div>
      )}

      {/* AI Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          {!rightPanelCollapsed && (
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6" />
              <h3 className="font-bold">AI 編輯助手</h3>
            </div>
          )}
          <button
            onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            {rightPanelCollapsed ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Chat Messages - Scrollable */}
      <div
        className={`flex-1 overflow-y-auto p-4 space-y-4 ${rightPanelCollapsed ? "hidden" : ""}`}
      >
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] ${message.role === "user" ? "order-2" : "order-1"}`}
            >
              <div
                className={`flex items-start gap-2 ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user" ? "bg-blue-100" : "bg-purple-100"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-600" />
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <p className="text-sm whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input - Fixed at Bottom */}
      {!rightPanelCollapsed && (
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="輸入指令..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={isProcessing || !inputMessage.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isProcessing || !inputMessage.trim()
                  ? "bg-gray-200 text-gray-400"
                  : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:shadow-lg"
              }`}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-1">
            {["修改標題", "新增任務", "設定難度"].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => setInputMessage(suggestion)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
