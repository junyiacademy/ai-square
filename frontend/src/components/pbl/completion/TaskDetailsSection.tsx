"use client";

import { useTranslation } from "react-i18next";
import { StarRating } from "@/components/shared/StarRating";
import type { CompletionData } from "@/types/pbl-completion";

interface TaskDetailsSectionProps {
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

export function TaskDetailsSection({
  completionData,
  formatDuration,
}: TaskDetailsSectionProps) {
  const { t, i18n } = useTranslation(["pbl", "assessment"]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {t("pbl:complete.taskSummary")}
      </h2>

      <div className="space-y-6">
        {completionData.tasks?.map((task, index) => {
          const taskTitle = (() => {
            const title = task.taskTitle;
            if (
              typeof title === "object" &&
              title !== null &&
              !Array.isArray(title)
            ) {
              const titleObj = title as Record<string, string>;
              return (
                titleObj[i18n.language] ||
                titleObj["en"] ||
                Object.values(titleObj)[0] ||
                task.taskId
              );
            }
            return title || task.taskId;
          })();

          return (
            <div
              key={task.taskId}
              className="border-l-4 border-purple-600 pl-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {task.taskIndex || index + 1}. {taskTitle}
                  </h3>

                  {/* Task Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {formatDuration(task.progress?.timeSpentSeconds || 0)}
                    </span>
                    <span className="flex items-center">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {task.log?.interactions?.filter((i) => i.type === "user")
                        .length || 0}{" "}
                      {t("pbl:complete.conversations")}
                    </span>
                    {task.evaluation &&
                      (() => {
                        const rating = getQualitativeRating(
                          task.evaluation.score,
                        );
                        return (
                          <span className={`font-medium ${rating.color}`}>
                            {t("pbl:learn.overallScore")}: {t(rating.i18nKey)}
                          </span>
                        );
                      })()}
                  </div>

                  {/* Task Evaluation Details - Collapsible */}
                  {task.evaluation && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        {t(
                          "pbl:complete.viewEvaluationDetails",
                          "查看評估詳情",
                        )}
                      </summary>
                      <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                        {/* Two Column Layout for Domain & KSA Scores */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Domain Scores Column */}
                          {task.evaluation.domainScores && (
                            <div>
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                {t("pbl:complete.domainScores")}:
                              </div>
                              <div className="space-y-3">
                                {[
                                  "engaging_with_ai",
                                  "creating_with_ai",
                                  "managing_with_ai",
                                  "designing_with_ai",
                                ]
                                  .filter(
                                    (domain) =>
                                      task.evaluation?.domainScores?.[
                                        domain
                                      ] !== undefined,
                                  )
                                  .map((domain) => {
                                    const score =
                                      task.evaluation?.domainScores?.[domain] ||
                                      0;
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
                            </div>
                          )}

                          {/* KSA Scores Column */}
                          {task.evaluation.ksaScores &&
                            Object.keys(task.evaluation.ksaScores).length >
                              0 && (
                              <div>
                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  {t("pbl:complete.ksa")}:
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t("pbl:complete.knowledge")}
                                      </span>
                                      <StarRating
                                        score={
                                          task.evaluation.ksaScores
                                            ?.knowledge || 0
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t("pbl:complete.skills")}
                                      </span>
                                      <StarRating
                                        score={
                                          task.evaluation.ksaScores?.skills || 0
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {t("pbl:complete.attitudes")}
                                      </span>
                                      <StarRating
                                        score={
                                          task.evaluation.ksaScores
                                            ?.attitudes || 0
                                        }
                                        size="sm"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                        </div>

                        {/* Conversation Insights */}
                        {task.evaluation.conversationInsights && (
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t("pbl:learn.conversationInsights")}
                            </h4>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                              {/* Effective Examples */}
                              {task.evaluation?.conversationInsights
                                ?.effectiveExamples &&
                                Array.isArray(
                                  task.evaluation.conversationInsights
                                    .effectiveExamples,
                                ) &&
                                task.evaluation.conversationInsights
                                  .effectiveExamples.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
                                      {t("pbl:learn.effectiveExamples")}
                                    </p>
                                    {task.evaluation.conversationInsights.effectiveExamples.map(
                                      (example, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-1"
                                        >
                                          <p className="text-xs italic border-l-2 border-green-300 dark:border-green-500 pl-2 mb-1">
                                            &ldquo;{example.quote}&rdquo;
                                          </p>
                                          <p className="text-xs">
                                            {example.suggestion}
                                          </p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}

                              {/* Improvement Areas */}
                              {task.evaluation.conversationInsights
                                .improvementAreas &&
                                Array.isArray(
                                  task.evaluation.conversationInsights
                                    .improvementAreas,
                                ) &&
                                task.evaluation.conversationInsights
                                  .improvementAreas.length > 0 && (
                                  <div>
                                    <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                                      {t("pbl:learn.improvementExamples")}
                                    </p>
                                    {task.evaluation.conversationInsights.improvementAreas.map(
                                      (area, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mb-1"
                                        >
                                          <p className="text-xs italic border-l-2 border-yellow-300 dark:border-yellow-500 pl-2 mb-1">
                                            &ldquo;{area.quote}&rdquo;
                                          </p>
                                          <p className="text-xs">
                                            {area.suggestion}
                                          </p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          </div>
                        )}

                        {/* Strengths */}
                        {task.evaluation.strengths &&
                          Array.isArray(task.evaluation.strengths) &&
                          task.evaluation.strengths.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t("pbl:complete.strengths")}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.strengths.map(
                                  (strength, idx) => (
                                    <li key={idx} className="flex items-start">
                                      <span className="text-green-500 mr-2">
                                        ✓
                                      </span>
                                      {strength}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                        {/* Areas for Improvement */}
                        {task.evaluation.improvements &&
                          Array.isArray(task.evaluation.improvements) &&
                          task.evaluation.improvements.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t("pbl:complete.improvements")}
                              </h4>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {task.evaluation.improvements.map(
                                  (improvement, idx) => (
                                    <li key={idx} className="flex items-start">
                                      <span className="text-yellow-500 mr-2">
                                        •
                                      </span>
                                      {improvement}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </details>
                  )}

                  {/* Practice Records - 做題紀錄 */}
                  {task.log?.interactions &&
                    task.log.interactions.length > 0 && (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-2">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          {t(
                            "pbl:complete.viewPracticeRecords",
                            "查看做題紀錄",
                          )}
                          <span className="text-xs text-gray-500">
                            ({task.log.interactions.length}{" "}
                            {t("pbl:complete.interactions", "次互動")})
                          </span>
                        </summary>
                        <div className="mt-3 space-y-2 max-h-96 overflow-y-auto border-l-2 border-purple-200 dark:border-purple-800 pl-4">
                          {task.log.interactions.map((interaction, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg text-sm ${
                                interaction.type === "user"
                                  ? "bg-blue-50 dark:bg-blue-900/20 ml-4"
                                  : "bg-gray-50 dark:bg-gray-800 mr-4"
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-medium text-xs text-gray-500 dark:text-gray-400">
                                  {interaction.type === "user"
                                    ? "👤 " +
                                      t("pbl:complete.yourAnswer", "你的回答")
                                    : "🤖 " +
                                      t("pbl:complete.aiFeedback", "AI 回饋")}
                                </span>
                                <span className="text-xs text-gray-400">
                                  #{idx + 1}
                                </span>
                              </div>
                              <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {typeof interaction.message === "string"
                                  ? interaction.message
                                  : JSON.stringify(interaction.message)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
