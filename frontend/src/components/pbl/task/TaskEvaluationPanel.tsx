"use client";

import { useTranslation } from "react-i18next";
import { Scenario, DomainType } from "@/types/pbl";
import { TaskEvaluation } from "@/types/pbl-completion";
import { StarRating } from "@/components/shared/StarRating";
import { getQualitativeRating } from "@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers";

interface TaskEvaluationPanelProps {
  evaluation: TaskEvaluation | null;
  scenario: Scenario | null;
  isTranslating: boolean;
  onTranslate: () => void;
  language: string;
}

export function TaskEvaluationPanel({
  evaluation,
  scenario,
  isTranslating,
  onTranslate,
  language,
}: TaskEvaluationPanelProps) {
  const { t } = useTranslation(["pbl", "assessment"]);

  if (!evaluation) return null;

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="font-medium text-gray-900 dark:text-white mb-4">
        {t("pbl:learn.evaluationResults", "Evaluation Results")}
      </h3>

      {/* Section 1: Overall Score */}
      <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("pbl:learn.overallScore")}
          </h4>
          {(() => {
            const rating = getQualitativeRating(evaluation.score);
            return (
              <span className={`text-3xl font-bold ${rating.color}`}>
                {t(rating.i18nKey)}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Section 2: Domain Scores */}
      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          {t("pbl:complete.domainScores")}
        </h4>
        <div className="space-y-2">
          {evaluation.domainScores &&
            (() => {
              const domainOrder: DomainType[] = [
                "engaging_with_ai",
                "creating_with_ai",
                "managing_with_ai",
                "designing_with_ai",
              ];
              const targetDomainsList = scenario?.targetDomains || [];

              // Show all domains, but mark non-target ones as NA
              return domainOrder.map((domain) => {
                const isTargetDomain =
                  targetDomainsList.length === 0 ||
                  targetDomainsList.includes(domain);
                const score = isTargetDomain
                  ? evaluation.domainScores![domain]
                  : undefined;
                const isNA =
                  !isTargetDomain || score === undefined || score === null;
                return (
                  <div
                    key={domain}
                    className={`flex items-center justify-between ${!isTargetDomain ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`text-sm ${!isTargetDomain ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-600 dark:text-gray-400"}`}
                    >
                      {t(`assessment:domains.${domain}`)}
                    </span>
                    <div className="flex items-center">
                      {isNA ? (
                        <span className="text-sm text-gray-400 dark:text-gray-500 w-36 text-right italic">
                          N/A
                        </span>
                      ) : (
                        <StarRating score={Number(score)} size="sm" />
                      )}
                    </div>
                  </div>
                );
              });
            })()}
        </div>
      </div>

      {/* Section 3: KSA Scores */}
      {evaluation.ksaScores && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            {t("pbl:complete.ksaScores", "KSA Scores")}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("pbl:complete.knowledge")}
              </span>
              <StarRating score={evaluation.ksaScores.knowledge} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("pbl:complete.skills")}
              </span>
              <StarRating score={evaluation.ksaScores.skills} size="sm" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t("pbl:complete.attitudes")}
              </span>
              <StarRating score={evaluation.ksaScores.attitudes} size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* Translation Notice & Button */}
      {evaluation?.needsTranslation && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
            {t(
              "pbl:learn.evaluationNeedsTranslation",
              "This evaluation is in a different language.",
            )}
          </p>
          <button
            onClick={onTranslate}
            disabled={isTranslating}
            className="w-full px-3 py-1.5 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 disabled:bg-yellow-400 transition-colors flex items-center justify-center"
          >
            {isTranslating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {t("pbl:learn.translating", "Translating...")}
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
                {t(
                  "pbl:learn.translateToCurrentLanguage",
                  "Translate to Current Language",
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Conversation Insights - Only show if there are meaningful insights */}
      {evaluation.conversationInsights &&
        ((evaluation.conversationInsights.effectiveExamples &&
          Array.isArray(evaluation.conversationInsights.effectiveExamples) &&
          evaluation.conversationInsights.effectiveExamples.length > 0) ||
          (evaluation.conversationInsights.improvementAreas &&
            Array.isArray(evaluation.conversationInsights.improvementAreas) &&
            evaluation.conversationInsights.improvementAreas.length > 0)) && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
              {t("pbl:learn.conversationInsights", "Conversation Insights")}
            </h4>

            {evaluation.conversationInsights.effectiveExamples &&
              Array.isArray(
                evaluation.conversationInsights.effectiveExamples,
              ) &&
              evaluation.conversationInsights.effectiveExamples.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t("pbl:learn.effectiveExamples", "What worked well:")}
                  </h5>
                  <div className="space-y-2">
                    {evaluation.conversationInsights.effectiveExamples.map(
                      (example, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-gray-800 p-2 rounded"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            &ldquo;{example.quote}&rdquo;
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            ✓ {example.suggestion}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

            {evaluation.conversationInsights.improvementAreas &&
              Array.isArray(evaluation.conversationInsights.improvementAreas) &&
              evaluation.conversationInsights.improvementAreas.length > 0 && (
                <div>
                  <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-2">
                    {t(
                      "pbl:learn.improvementExamples",
                      "Areas for improvement:",
                    )}
                  </h5>
                  <div className="space-y-2">
                    {evaluation.conversationInsights.improvementAreas.map(
                      (area, idx) => (
                        <div
                          key={idx}
                          className="bg-white dark:bg-gray-800 p-2 rounded"
                        >
                          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                            &ldquo;{area.quote}&rdquo;
                          </p>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            → {area.suggestion}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
          </div>
        )}

      {/* Strengths & Improvements */}
      <div className="space-y-3">
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("pbl:complete.strengths")}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {evaluation.strengths &&
              evaluation.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  {strength}
                </li>
              ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t("pbl:complete.improvements")}
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            {evaluation.improvements &&
              evaluation.improvements.map((improvement, idx) => (
                <li key={idx} className="flex items-start">
                  <span className="text-yellow-500 mr-2">•</span>
                  {improvement}
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
