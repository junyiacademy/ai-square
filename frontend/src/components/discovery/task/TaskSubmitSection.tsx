"use client";

import { useState } from "react";
import { CheckCircle, Lightbulb, Trophy, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface TaskSubmitSectionProps {
  userResponse: string;
  onUserResponseChange: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  showHints: boolean;
  onToggleHints: () => void;
  hints: string[];
  feedback: {
    completed: boolean;
    feedback: string;
    xpEarned: number;
    strengths: string[];
    improvements: string[];
  } | null;
  hasPassedBefore: boolean;
  passCount: number;
  interactionCount: number;
}

export function TaskSubmitSection({
  userResponse,
  onUserResponseChange,
  onSubmit,
  submitting,
  showHints,
  onToggleHints,
  hints,
  feedback,
  hasPassedBefore,
  passCount,
  interactionCount,
}: TaskSubmitSectionProps) {
  const getPlaceholder = () => {
    if (interactionCount === 0) return "在這裡寫下你的回答...";
    if (hasPassedBefore) {
      if (passCount > 1)
        return `您已經通過 ${passCount} 次了！想要挑戰更高分嗎？`;
      return "您已經通過了！可以嘗試其他解決方案或繼續優化...";
    }
    return "根據 AI 的回饋，改進你的回答...";
  };

  return (
    <>
      {/* Response Input Section */}
      <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {interactionCount > 0
            ? hasPassedBefore
              ? `繼續挑戰 ${passCount > 1 ? `(已通過 ${passCount} 次)` : "(已通過)"}`
              : "繼續作答"
            : "你的回答"}
        </h3>

        <textarea
          value={userResponse}
          onChange={(e) => onUserResponseChange(e.target.value)}
          placeholder={getPlaceholder()}
          className="w-full h-48 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
        />

        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={onToggleHints}
            className="flex items-center space-x-2 text-purple-600 hover:text-purple-700"
          >
            <Lightbulb className="w-5 h-5" />
            <span>{showHints ? "隱藏提示" : "需要提示？"}</span>
          </button>

          <button
            onClick={onSubmit}
            disabled={!userResponse.trim() || submitting}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all
              ${
                userResponse.trim() && !submitting
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>提交中...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>提交答案</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hints Section */}
      {showHints && hints && hints.length > 0 && (
        <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200 mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <span>提示</span>
          </h4>
          <ul className="space-y-2">
            {hints.map((hint, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-1">💡</span>
                <span className="text-gray-700">{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Feedback Section */}
      {feedback && (
        <div
          className={`rounded-2xl shadow-lg p-8 mb-6 ${
            feedback.completed
              ? "bg-green-50 border-2 border-green-200"
              : "bg-orange-50 border-2 border-orange-200"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              {feedback.completed ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span>任務完成！</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                  <span>需要改進</span>
                </>
              )}
            </h3>
            <div className="flex items-center space-x-2 px-4 py-2 bg-white rounded-full shadow-sm">
              <Trophy className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-purple-700">
                +{feedback.xpEarned} XP
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-gray-700 leading-relaxed prose prose-sm max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900 prose-p:text-gray-700 prose-ul:text-gray-700 prose-ol:text-gray-700">
              <ReactMarkdown>{feedback.feedback}</ReactMarkdown>
            </div>

            {feedback.strengths.length > 0 && (
              <div className="bg-green-100 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">優點</h4>
                <ul className="space-y-1">
                  {feedback.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-green-700">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements.length > 0 && (
              <div className="bg-orange-100 rounded-lg p-4">
                <h4 className="font-semibold text-orange-800 mb-2">改進建議</h4>
                <ul className="space-y-1">
                  {feedback.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-orange-600">•</span>
                      <span className="text-orange-700">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {feedback.completed && !hasPassedBefore && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                任務通過！您現在可以選擇完成任務或繼續改進答案。
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
