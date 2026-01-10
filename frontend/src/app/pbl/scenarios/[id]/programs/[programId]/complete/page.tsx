"use client";

/**
 * PBL Program Complete Page
 *
 * Displays completion summary, qualitative feedback, task evaluations,
 * and certificate for a completed PBL program.
 *
 * Refactored to use extracted components and hooks for maintainability.
 * Original file: 2095 lines -> Target: < 500 lines
 */

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { PBLCompletionSkeleton } from "@/components/pbl/loading-skeletons";
import { useProgramCompletion } from "@/hooks/use-program-completion";
import {
  QualitativeFeedbackSection,
  OverallScoreCard,
  DomainScoresCard,
  KSAScoresCard,
  TaskSummary,
  CertificateView,
} from "@/components/pbl/complete";

// Add print styles
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @media print {
      @page {
        margin: 0;
        size: A4;
        color: color;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        color-scheme: light;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      header, nav, footer, .print\\:hidden {
        display: none !important;
      }

      .no-print {
        display: none !important;
      }

      .certificate-container {
        display: block !important;
        width: 100% !important;
        min-height: 100vh !important;
        page-break-after: avoid !important;
        margin: 0 !important;
        padding: 1cm !important;
        box-shadow: none !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      .certificate-container * {
        visibility: visible !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }

      main {
        padding: 0 !important;
        min-height: auto !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function ProgramCompletePage() {
  const params = useParams();
  const { t } = useTranslation(["pbl", "common", "assessment"]);

  const programId = params.programId as string;
  const scenarioId = params.id as string;

  const [activeTab, setActiveTab] = useState<"results" | "certificate">(
    "results"
  );

  const {
    loading,
    completionData,
    scenarioTitle,
    feedback,
    generatingFeedback,
    allTasksEvaluated,
    formatDuration,
    generateFeedback,
  } = useProgramCompletion({
    programId,
    scenarioId,
  });

  // Detect iPad/tablet for print layout
  useEffect(() => {
    const detectTablet = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /ipad|iphone|ipod/.test(userAgent);
      const isAndroidTablet =
        /android/.test(userAgent) && !/mobile/.test(userAgent);
      const hasTouchPoints =
        navigator.maxTouchPoints && navigator.maxTouchPoints > 2;

      return (
        isIOS || isAndroidTablet || (hasTouchPoints && window.innerWidth >= 768)
      );
    };

    if (detectTablet()) {
      const certificatePrint = document.querySelector(".certificate-print");
      if (certificatePrint) {
        certificatePrint.classList.add("is-tablet");
      }
    }
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <PBLCompletionSkeleton />
        </div>
      </main>
    );
  }

  if (!completionData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {t("pbl:complete.noDataFound")}
          </p>
          <Link
            href={`/pbl/scenarios/${scenarioId}`}
            className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            {t("pbl:complete.backToPBL")}
          </Link>
        </div>
      </div>
    );
  }

  const conversationCount =
    completionData.tasks?.reduce(
      (sum, task) => sum + (task.log?.interactions?.length || 0),
      0
    ) || 0;

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Congratulations Header */}
        <div className="no-print">
          <CelebrationHeader scenarioTitle={scenarioTitle} t={t} />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-8 no-print">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              <button
                onClick={() => setActiveTab("results")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === "results"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                {t("pbl:complete.results")}
              </button>
              <button
                onClick={() => allTasksEvaluated && setActiveTab("certificate")}
                disabled={!allTasksEvaluated}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-2 ${
                  !allTasksEvaluated
                    ? "border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed"
                    : activeTab === "certificate"
                      ? "border-purple-500 text-purple-600 dark:text-purple-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300"
                }`}
              >
                <span>{t("pbl:complete.certificate.title")}</span>
                {!allTasksEvaluated && (
                  <>
                    <span className="text-xs">&#128274;</span>
                    <span className="text-xs text-gray-500 dark:text-gray-500">
                      (
                      {t(
                        "pbl:complete.certificate.requireAllTasks",
                        "Requires all tasks"
                      )}
                      )
                    </span>
                  </>
                )}
              </button>
            </nav>
          </div>
        </div>

        {/* Results Tab Content */}
        {activeTab === "results" && (
          <div className="no-print">
            {/* Qualitative Feedback Section */}
            <QualitativeFeedbackSection
              feedback={feedback}
              isGenerating={generatingFeedback}
              onRegenerate={() => generateFeedback(true)}
              showDevControls={process.env.NODE_ENV === "development"}
            />

            {/* Three Column Layout - Score Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <OverallScoreCard
                score={completionData.overallScore || 0}
                evaluatedTasks={completionData.evaluatedTasks}
                totalTasks={completionData.totalTasks}
                conversationCount={conversationCount}
                totalTimeSeconds={completionData.totalTimeSeconds || 0}
                formatDuration={formatDuration}
              />

              <DomainScoresCard domainScores={completionData.domainScores} />

              <KSAScoresCard ksaScores={completionData.ksaScores} />
            </div>

            {/* Task Summary */}
            <TaskSummary
              tasks={completionData.tasks}
              formatDuration={formatDuration}
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/pbl/scenarios/${scenarioId}`}
                className="px-8 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors text-center"
              >
                {t("pbl:complete.retryScenario")}
              </Link>
            </div>
          </div>
        )}

        {/* Certificate Tab Content */}
        {activeTab === "certificate" && (
          <CertificateView scenarioTitle={scenarioTitle} />
        )}
      </div>
    </main>
  );
}

interface CelebrationHeaderProps {
  scenarioTitle: string;
  t: ReturnType<typeof useTranslation>["t"];
}

function CelebrationHeader({ scenarioTitle, t }: CelebrationHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="mb-4">
        <svg
          className="w-24 h-24 text-green-500 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t("pbl:complete.congratulations")}
      </h1>
      <p className="text-xl text-gray-600 dark:text-gray-400">
        {t("pbl:complete.scenarioCompleted", { title: scenarioTitle })}
      </p>
    </div>
  );
}
