"use client";

import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";

export interface AssessmentHistoryItem {
  assessment_id: string;
  timestamp: string;
  scores: {
    overall: number;
    domains: {
      engaging_with_ai: number;
      creating_with_ai: number;
      managing_with_ai: number;
      designing_with_ai: number;
    };
  };
  summary: {
    total_questions: number;
    correct_answers: number;
    level: string;
  };
  duration_seconds: number;
  language: string;
}

interface AssessmentCardProps {
  assessment: AssessmentHistoryItem;
  formatDate: (timestamp: string) => string;
  formatDuration: (seconds: number) => string;
  getLevelColor: (level: string) => string;
  getScoreColor: (score: number) => string;
}

export function AssessmentCard({
  assessment,
  formatDate,
  formatDuration,
  getLevelColor,
  getScoreColor,
}: AssessmentCardProps) {
  const { t } = useTranslation(["navigation", "assessment", "pbl"]);
  const router = useRouter();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300 text-xs font-medium px-2.5 py-0.5 rounded mr-2">
                {t("assessment:title")}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatDate(assessment.timestamp)}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {assessment.assessment_id}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
              <div>
                <span className="font-medium">
                  {t("assessment:history.startTime")}:
                </span>
                <p>{formatDate(assessment.timestamp)}</p>
              </div>
              <div>
                <span className="font-medium">
                  {t("assessment:history.endTime")}:
                </span>
                <p>
                  {formatDate(
                    new Date(
                      new Date(assessment.timestamp).getTime() +
                        assessment.duration_seconds * 1000,
                    ).toISOString(),
                  )}
                </p>
              </div>
            </div>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(assessment.summary.level)}`}
          >
            {t(`assessment:level.${assessment.summary.level}`)}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                {t("assessment:history.overallScore")}
              </p>
              <p
                className={`text-3xl font-bold ${getScoreColor(assessment.scores.overall)}`}
              >
                {assessment.scores.overall}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {assessment.summary.correct_answers}/
                {assessment.summary.total_questions}{" "}
                {t("assessment:history.correct")}
              </p>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              {t("assessment:history.domainScores")}
            </p>
            <div className="space-y-2">
              {Object.entries(assessment.scores.domains).map(
                ([domain, score]) => (
                  <div key={domain} className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-32">
                      {t(`assessment:domains.${domain}`)}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            domain === "engaging_with_ai"
                              ? "bg-blue-600"
                              : domain === "creating_with_ai"
                                ? "bg-green-600"
                                : domain === "managing_with_ai"
                                  ? "bg-yellow-600"
                                  : "bg-purple-600"
                          }`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <span
                        className={`text-sm font-medium ${getScoreColor(score)} min-w-[40px] text-right`}
                      >
                        {score}%
                      </span>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <svg
              className="h-4 w-4 mr-1"
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
            {t("assessment:history.duration")}:{" "}
            {formatDuration(assessment.duration_seconds)}
          </div>
          <button
            onClick={() => router.push(`/assessment`)}
            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium"
          >
            {t("assessment:history.takeNewAssessment")} →
          </button>
        </div>
      </div>
    </div>
  );
}
