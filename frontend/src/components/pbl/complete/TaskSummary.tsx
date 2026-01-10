"use client";

/**
 * Task Summary Component
 *
 * Displays a summary of all tasks with their evaluations,
 * including domain scores, KSA scores, and conversation insights.
 */

import { useTranslation } from "react-i18next";
import { StarRating } from "@/components/shared/StarRating";
import { getQualitativeRating } from "@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers";
import type {
  CompletionTask,
  TaskEvaluation,
  ConversationInsights,
  ConversationExample,
} from "@/types/pbl-completion";

interface TaskSummaryProps {
  tasks: CompletionTask[] | undefined;
  formatDuration: (seconds: number) => string;
}

export function TaskSummary({ tasks, formatDuration }: TaskSummaryProps) {
  const { t, i18n } = useTranslation(["pbl", "assessment"]);

  if (!tasks || tasks.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
        {t("pbl:complete.taskSummary")}
      </h2>

      <div className="space-y-6">
        {tasks.map((task, index) => {
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
            <div key={task.taskId} className="border-l-4 border-purple-600 pl-6">
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
                    {task.evaluation && (() => {
                      const rating = getQualitativeRating(task.evaluation.score);
                      return (
                        <span className={`font-medium ${rating.color}`}>
                          {t("pbl:learn.overallScore")}: {t(rating.i18nKey)}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Task Evaluation Details - Collapsible */}
                  {task.evaluation && (
                    <TaskEvaluationDetails
                      evaluation={task.evaluation}
                      t={t}
                    />
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

interface TaskEvaluationDetailsProps {
  evaluation: TaskEvaluation;
  t: ReturnType<typeof useTranslation>["t"];
}

function TaskEvaluationDetails({ evaluation, t }: TaskEvaluationDetailsProps) {
  const domains = [
    "engaging_with_ai",
    "creating_with_ai",
    "managing_with_ai",
    "designing_with_ai",
  ];

  return (
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
        {t("pbl:complete.viewEvaluationDetails", "View Evaluation Details")}
      </summary>
      <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
        {/* Two Column Layout for Domain & KSA Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Domain Scores Column */}
          {evaluation.domainScores && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t("pbl:complete.domainScores")}:
              </div>
              <div className="space-y-3">
                {domains
                  .filter(
                    (domain) => evaluation.domainScores?.[domain] !== undefined
                  )
                  .map((domain) => {
                    const score = evaluation.domainScores?.[domain] || 0;
                    return (
                      <div key={domain} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {t(`assessment:domains.${domain}`)}
                        </span>
                        <StarRating score={score} size="sm" />
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* KSA Scores Column */}
          {evaluation.ksaScores && Object.keys(evaluation.ksaScores).length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t("pbl:complete.ksa")}:
              </div>
              <div className="space-y-3">
                {(["knowledge", "skills", "attitudes"] as const).map((ksa) => (
                  <div key={ksa} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {t(`pbl:complete.${ksa}`)}
                    </span>
                    <StarRating
                      score={evaluation.ksaScores?.[ksa] || 0}
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Conversation Insights */}
        {evaluation.conversationInsights && (
          <ConversationInsightsDisplay
            insights={evaluation.conversationInsights}
            t={t}
          />
        )}

        {/* Strengths & Improvements */}
        <StrengthsAndImprovements evaluation={evaluation} t={t} />
      </div>
    </details>
  );
}

interface ConversationInsightsDisplayProps {
  insights: ConversationInsights;
  t: ReturnType<typeof useTranslation>["t"];
}

function ConversationInsightsDisplay({
  insights,
  t,
}: ConversationInsightsDisplayProps) {
  const hasEffectiveExamples =
    insights.effectiveExamples &&
    Array.isArray(insights.effectiveExamples) &&
    insights.effectiveExamples.length > 0;

  const hasImprovementAreas =
    insights.improvementAreas &&
    Array.isArray(insights.improvementAreas) &&
    insights.improvementAreas.length > 0;

  if (!hasEffectiveExamples && !hasImprovementAreas) {
    return null;
  }

  return (
    <div className="mb-3">
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {t("pbl:learn.conversationInsights")}
      </h4>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
        {/* Effective Examples */}
        {hasEffectiveExamples && (
          <div>
            <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
              {t("pbl:learn.effectiveExamples")}
            </p>
            {(insights.effectiveExamples as ConversationExample[]).map(
              (example: ConversationExample, idx: number) => (
                <div
                  key={idx}
                  className="bg-green-50 dark:bg-green-900/20 rounded p-2 mb-1"
                >
                  <p className="text-xs italic border-l-2 border-green-300 dark:border-green-500 pl-2 mb-1">
                    &ldquo;{example.quote}&rdquo;
                  </p>
                  <p className="text-xs">{example.suggestion}</p>
                </div>
              )
            )}
          </div>
        )}

        {/* Improvement Areas */}
        {hasImprovementAreas && (
          <div>
            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              {t("pbl:learn.improvementExamples")}
            </p>
            {(insights.improvementAreas as ConversationExample[]).map(
              (area: ConversationExample, idx: number) => (
                <div
                  key={idx}
                  className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-2 mb-1"
                >
                  <p className="text-xs italic border-l-2 border-yellow-300 dark:border-yellow-500 pl-2 mb-1">
                    &ldquo;{area.quote}&rdquo;
                  </p>
                  <p className="text-xs">{area.suggestion}</p>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface StrengthsAndImprovementsProps {
  evaluation: TaskEvaluation;
  t: ReturnType<typeof useTranslation>["t"];
}

function StrengthsAndImprovements({
  evaluation,
  t,
}: StrengthsAndImprovementsProps) {
  const hasStrengths =
    evaluation.strengths &&
    Array.isArray(evaluation.strengths) &&
    evaluation.strengths.length > 0;

  const hasImprovements =
    evaluation.improvements &&
    Array.isArray(evaluation.improvements) &&
    evaluation.improvements.length > 0;

  if (!hasStrengths && !hasImprovements) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {hasStrengths && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("pbl:complete.strengths")}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {(evaluation.strengths as string[]).map(
              (strength: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-green-500 mr-2">+</span>
                  {strength}
                </li>
              )
            )}
          </ul>
        </div>
      )}
      {hasImprovements && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t("pbl:complete.improvements")}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {(evaluation.improvements as string[]).map(
              (improvement: string, idx: number) => (
                <li key={idx} className="flex items-start">
                  <span className="text-yellow-500 mr-2">-</span>
                  {improvement}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
