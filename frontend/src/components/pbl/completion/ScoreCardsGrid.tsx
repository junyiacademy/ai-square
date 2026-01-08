"use client";

import { useTranslation } from "react-i18next";
import { StarRating } from "@/components/shared/StarRating";
import type { CompletionData } from "@/types/pbl-completion";

interface ScoreCardsGridProps {
  completionData: CompletionData;
  formatDuration: (seconds: number) => string;
}

function getQualitativeRating(score: number): {
  label: "Good" | "Great" | "Perfect";
  color: string;
  i18nKey: string;
} {
  if (score >= 91)
    return {
      label: "Perfect",
      color: "text-purple-600 dark:text-purple-400",
      i18nKey: "pbl:complete.rating.perfect",
    };
  if (score >= 71)
    return {
      label: "Great",
      color: "text-blue-600 dark:text-blue-400",
      i18nKey: "pbl:complete.rating.great",
    };
  return {
    label: "Good",
    color: "text-green-600 dark:text-green-400",
    i18nKey: "pbl:complete.rating.good",
  };
}

export function ScoreCardsGrid({
  completionData,
  formatDuration,
}: ScoreCardsGridProps) {
  const { t } = useTranslation(["pbl", "assessment"]);

  const rating = getQualitativeRating(completionData.overallScore || 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
      {/* Left Column - Overall Score */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("pbl:complete.overallScore")}
        </h3>
        <div className="text-center mb-4">
          <p className={`text-5xl font-bold ${rating.color}`}>
            {t(rating.i18nKey)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {completionData.evaluatedTasks}/{completionData.totalTasks}{" "}
            {t("pbl:history.tasksEvaluated")}
          </p>
        </div>
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pbl:complete.conversationCount")}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {completionData.tasks?.reduce(
                (sum, task) => sum + (task.log?.interactions?.length || 0),
                0,
              ) || 0}{" "}
              {t("pbl:history.times")}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pbl:complete.totalTimeSpent")}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDuration(completionData.totalTimeSeconds || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Middle Column - Domain Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("pbl:complete.domainScores")}
        </h3>
        {completionData.domainScores && (
          <div className="space-y-4">
            {[
              "engaging_with_ai",
              "creating_with_ai",
              "managing_with_ai",
              "designing_with_ai",
            ]
              .filter(
                (domain) => completionData.domainScores?.[domain] !== undefined,
              )
              .map((domain) => {
                const score = completionData.domainScores?.[domain] || 0;
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t(`assessment:domains.${domain}`)}
                      </span>
                      <StarRating score={score} size="sm" />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Right Column - KSA Scores */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {t("pbl:complete.ksaSummary")}
        </h3>
        {completionData.ksaScores && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("pbl:complete.knowledge")}
                </span>
                <StarRating
                  score={completionData.ksaScores.knowledge}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("pbl:complete.skills")}
                </span>
                <StarRating score={completionData.ksaScores.skills} size="sm" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t("pbl:complete.attitudes")}
                </span>
                <StarRating
                  score={completionData.ksaScores.attitudes}
                  size="sm"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
