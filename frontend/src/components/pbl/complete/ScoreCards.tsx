"use client";

/**
 * Score Cards Components
 *
 * Components for displaying overall score, domain scores, and KSA scores
 * in a three-column layout.
 */

import { useTranslation } from "react-i18next";
import { StarRating } from "@/components/shared/StarRating";
import { getQualitativeRating } from "@/app/pbl/scenarios/[id]/programs/[programId]/tasks/[taskId]/utils/task-helpers";

interface OverallScoreCardProps {
  score: number;
  evaluatedTasks: number;
  totalTasks: number;
  conversationCount: number;
  totalTimeSeconds: number;
  formatDuration: (seconds: number) => string;
}

export function OverallScoreCard({
  score,
  evaluatedTasks,
  totalTasks,
  conversationCount,
  totalTimeSeconds,
  formatDuration,
}: OverallScoreCardProps) {
  const { t } = useTranslation(["pbl"]);
  const rating = getQualitativeRating(score);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("pbl:complete.overallScore")}
      </h3>
      <div className="text-center mb-4">
        <p className={`text-5xl font-bold ${rating.color}`}>
          {t(rating.i18nKey)}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          {evaluatedTasks}/{totalTasks} {t("pbl:history.tasksEvaluated")}
        </p>
      </div>
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("pbl:complete.conversationCount")}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {conversationCount} {t("pbl:history.times")}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t("pbl:complete.totalTimeSpent")}
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatDuration(totalTimeSeconds)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface DomainScoresCardProps {
  domainScores: Record<string, number> | undefined;
}

export function DomainScoresCard({ domainScores }: DomainScoresCardProps) {
  const { t } = useTranslation(["pbl", "assessment"]);

  const domains = [
    "engaging_with_ai",
    "creating_with_ai",
    "managing_with_ai",
    "designing_with_ai",
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("pbl:complete.domainScores")}
      </h3>
      {domainScores && (
        <div className="space-y-4">
          {domains
            .filter((domain) => domainScores[domain] !== undefined)
            .map((domain) => {
              const score = domainScores[domain] || 0;
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
  );
}

interface KSAScores {
  knowledge: number;
  skills: number;
  attitudes: number;
}

interface KSAScoresCardProps {
  ksaScores: KSAScores | undefined;
}

export function KSAScoresCard({ ksaScores }: KSAScoresCardProps) {
  const { t } = useTranslation(["pbl"]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
        {t("pbl:complete.ksaSummary")}
      </h3>
      {ksaScores && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pbl:complete.knowledge")}
            </span>
            <StarRating score={ksaScores.knowledge} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pbl:complete.skills")}
            </span>
            <StarRating score={ksaScores.skills} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t("pbl:complete.attitudes")}
            </span>
            <StarRating score={ksaScores.attitudes} size="sm" />
          </div>
        </div>
      )}
    </div>
  );
}
