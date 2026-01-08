"use client";

import { Sparkles } from "lucide-react";
import type { AssessmentResult, UserProgress } from "@/types/chat";

interface UserProgressCardProps {
  assessmentResult: AssessmentResult;
  userProgress: UserProgress | null;
}

export function UserProgressCard({
  assessmentResult,
  userProgress,
}: UserProgressCardProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
      <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        Your AI Literacy Level
      </h3>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Overall Score</span>
            <span className="font-medium">
              {assessmentResult.overallScore}%
            </span>
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
              <div className="font-medium">
                {userProgress.completedScenarios}/{userProgress.totalScenarios}
              </div>
            </div>
            <div className="bg-white/50 p-2 rounded">
              <div className="text-xs text-gray-500">Learning Hours</div>
              <div className="font-medium">
                {userProgress.learningHours.toFixed(1)}h
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
