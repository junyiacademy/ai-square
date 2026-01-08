"use client";

import { useRef, useEffect } from "react";
import { type TFunction } from "i18next";
import { formatDateWithLocale } from "@/utils/locale";

export interface ConversationEntry {
  id: string;
  type: "user" | "ai" | "system";
  content: string;
  timestamp: string;
}

interface MobileChatViewProps {
  conversations: ConversationEntry[];
  userInput: string;
  isProcessing: boolean;
  isEvaluating: boolean;
  showEvaluateButton: boolean;
  isEvaluateDisabled: boolean;
  language: string;
  onUserInputChange: (value: string) => void;
  onSendMessage: () => void;
  onEvaluate: () => void;
  t: TFunction;
}

export function MobileChatView({
  conversations,
  userInput,
  isProcessing,
  isEvaluating,
  showEvaluateButton,
  isEvaluateDisabled,
  language,
  onUserInputChange,
  onSendMessage,
  onEvaluate,
  t,
}: MobileChatViewProps) {
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when conversations update
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, isProcessing]);

  return (
    <div className="h-full bg-white dark:bg-gray-800 flex flex-col overflow-hidden">
      {/* Conversation Area */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        <div className="space-y-4">
          {conversations.map((entry) => (
            <div
              key={entry.id}
              className={`flex ${entry.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-lg ${
                  entry.type === "user"
                    ? "bg-purple-600 text-white"
                    : entry.type === "ai"
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                }`}
              >
                <p className="whitespace-pre-wrap">{entry.content}</p>
                <p className="text-xs mt-1 opacity-70">
                  {formatDateWithLocale(new Date(entry.timestamp), language, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}

          {/* AI thinking indicator */}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="max-w-[80%] px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    {t("pbl:learn.thinking")}
                  </span>
                  <div className="flex space-x-1">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={conversationEndRef} />
        </div>
      </div>

      {/* Evaluate Button */}
      {showEvaluateButton && !isEvaluating && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <button
            onClick={onEvaluate}
            disabled={isEvaluateDisabled}
            className={`w-full px-4 py-2 rounded-lg transition-colors font-medium ${
              isEvaluateDisabled
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {isEvaluateDisabled
              ? t("pbl:learn.evaluationUpToDate", "Evaluation Up to Date")
              : t("pbl:learn.evaluate", "Evaluate Performance")}
          </button>
        </div>
      )}

      {/* Evaluating indicator */}
      {isEvaluating && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 dark:text-gray-400">
              {t("pbl:learn.evaluating", "Evaluating...")}
            </span>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={userInput}
            onChange={(e) => onUserInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder={t("pbl:learn.inputPlaceholder")}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={onSendMessage}
            disabled={!userInput.trim() || isProcessing}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors h-fit"
          >
            {isProcessing ? t("pbl:learn.sending") : t("pbl:learn.send")}
          </button>
        </div>
        {/* Bottom safe area */}
        <div className="h-8"></div>
      </div>
    </div>
  );
}
