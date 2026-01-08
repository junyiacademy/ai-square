"use client";

import { BookOpen } from "lucide-react";
import { formatDateWithLocale } from "@/utils/locale";
import { UserProgressCard } from "./UserProgressCard";
import { RecommendationsCard } from "./RecommendationsCard";
import type {
  AssessmentResult,
  UserProgress,
  PBLHistory,
  RecommendedScenario,
  User,
} from "@/types/chat";

interface ResourcePanelProps {
  currentUser: User | null;
  assessmentResult: AssessmentResult | null;
  userProgress: UserProgress | null;
  pblHistory: PBLHistory[];
  recommendedScenarios: RecommendedScenario[];
}

export function ResourcePanel({
  currentUser,
  assessmentResult,
  userProgress,
  pblHistory,
  recommendedScenarios,
}: ResourcePanelProps) {
  return (
    <div className="h-full bg-white/95 backdrop-blur-sm border-l border-gray-100 overflow-y-auto shadow-sm relative">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Learning Resources
        </h2>
        <div className="space-y-4">
          {currentUser && assessmentResult && (
            <UserProgressCard
              assessmentResult={assessmentResult}
              userProgress={userProgress}
            />
          )}

          {pblHistory.length > 0 && (
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Recent Completions
              </h3>
              <div className="space-y-2">
                {pblHistory.slice(0, 3).map((history, index) => (
                  <div
                    key={`${history.scenarioId}-${index}`}
                    className="bg-white/50 p-2 rounded"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {history.scenarioTitle}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateWithLocale(
                            new Date(history.completedAt),
                            "en",
                          )}{" "}
                          • Score: {history.score}%
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
                    <span className="text-orange-500">🔥</span>{" "}
                    {userProgress.currentStreak} day streak!
                  </div>
                )}
              </div>
            </div>
          )}

          <RecommendationsCard scenarios={recommendedScenarios} />

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Quick Links
            </h3>
            <div className="space-y-2 text-sm">
              <a
                href="/assessment"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-900"
              >
                <span>📊</span> Take Assessment
              </a>
              <a
                href="/learning-path"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-900"
              >
                <span>🗺️</span> View Learning Path
              </a>
              <a
                href="/pbl"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-900"
              >
                <span>🎮</span> Browse Scenarios
              </a>
              <a
                href="/dashboard"
                className="flex items-center gap-2 text-amber-700 hover:text-amber-900"
              >
                <span>📈</span> Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
